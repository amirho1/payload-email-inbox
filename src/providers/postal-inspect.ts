import type { Mailbox, MailRecord, ProviderInspection } from '../types.js'
import type { PostalOptions } from './postal.js'
import { MailError } from '../server/errors.js'
import { boundedBody } from '../server/validation.js'

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new MailError('unavailable', 503)
  return value as Record<string, unknown>
}

/** Only documented read RPCs, configured HTTPS origin, exact owned IDs and bounded responses. */
async function read(options: PostalOptions, action: 'message' | 'deliveries', id: string) {
  if (!options.apiURL || !options.apiKey) throw new MailError('unavailable', 503)
  const url = new URL(`${options.apiURL().replace(/\/$/, '')}/messages/${action}`)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search)
    throw new MailError('unavailable', 503)
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: { 'X-Server-API-Key': options.apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: Number(id),
      ...(action === 'message'
        ? { _expansions: ['status', 'details', 'inspection', 'headers'] }
        : {}),
    }),
  })
  if (!response.ok || !response.body) throw new MailError('unavailable', 503)
  const bytes = await boundedBody({ headers: new Headers(), body: response.body }, 512 * 1024)
  const data = record(JSON.parse(Buffer.from(bytes).toString('utf8')))
  if (data.status !== 'success') throw new MailError('unavailable', 503)
  return data.data
}

/** Provider diagnostics are bounded and strip addresses, links and credential-looking values. */
export function redactPostalDiagnostic(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .slice(0, 4096)
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/(?:https?:\/\/|mailto:)[^\s<>]+/gi, '[link]')
    .replace(/[^\s<>(),;]+@[^\s<>(),;]+/g, '[address]')
    .replace(/\b(token|password|api[-_ ]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 500)
}

/** Exclude Bcc, authentication, DKIM, Postal tokens and arbitrary extension headers. */
function safeHeaders(input: unknown) {
  const output: Record<string, string[]> = {}
  const source = record(input || {})
  for (const key of [
    'from',
    'to',
    'cc',
    'reply-to',
    'subject',
    'date',
    'message-id',
    'in-reply-to',
    'references',
    'auto-submitted',
    'mime-version',
    'content-type',
  ]) {
    const values = source[key]
    if (Array.isArray(values))
      output[key] = values
        .filter((value): value is string => typeof value === 'string')
        .slice(0, 4)
        .map((value) => value.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 2000))
  }
  return output
}

/** Inspection never queues, retries, deletes, fetches callback URLs or rewrites delivery history. */
export async function inspectPostal(
  options: PostalOptions,
  message: MailRecord,
  mailbox: Mailbox,
): Promise<ProviderInspection> {
  const active = message.data.activeProviderIds?.length
    ? message.data.activeProviderIds
    : message.providerIds || []
  const legacyPrefix = `${options.key}:${mailbox.key}:incoming:`
  const legacyIncomingId =
    message.kind === 'incoming' && message.dedupKey?.startsWith(legacyPrefix)
      ? message.dedupKey.slice(legacyPrefix.length)
      : undefined
  const ids = [...new Set(active.length ? active : legacyIncomingId ? [legacyIncomingId] : [])]
  if (
    !ids.length ||
    ids.length > 10 ||
    message.kind === 'note' ||
    ids.some((id) => !/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))
  )
    throw new MailError('invalid')
  const messages: ProviderInspection['messages'] = []
  try {
    // At most two in-flight requests, including the two RPCs for each provider message.
    for (const id of ids) {
      const [raw, attempts] = await Promise.all([
        read(options, 'message', id),
        read(options, 'deliveries', id),
      ])
      const data = record(raw),
        details = record(data.details),
        status = record(data.status)
      const inspection = record(data.inspection || {})
      const allowed =
        message.kind === 'incoming'
          ? [mailbox.address]
          : [...message.data.to, ...message.data.cc, ...message.data.bcc]
      if (
        String(data.id) !== id ||
        details.direction !== message.kind ||
        !allowed.includes(String(details.rcpt_to))
      )
        throw new MailError('unavailable', 503)
      if (!Array.isArray(attempts) || attempts.length > 100) throw new MailError('unavailable', 503)
      messages.push({
        id,
        direction: message.kind,
        status: String(status.status || '').slice(0, 64),
        held: !!status.held,
        ...(typeof details.size === 'number' ? { size: details.size } : {}),
        ...(typeof inspection.spam === 'boolean' ? { spam: inspection.spam } : {}),
        receivedWithTLS: !!details.received_with_ssl,
        headers: safeHeaders(data.headers),
        deliveries: attempts.slice(-50).map((attempt) => {
          const delivery = record(attempt)
          if (
            !Number.isFinite(delivery.timestamp) ||
            Number(delivery.timestamp) < 0 ||
            Number(delivery.timestamp) > 7258118400
          )
            throw new MailError('unavailable', 503)
          const summary = redactPostalDiagnostic(
            [delivery.details, delivery.output]
              .filter((value) => typeof value === 'string')
              .join(' · '),
          )
          const smtpCode = summary.match(/(?:^|\s)([245]\d\d)(?=[\s-]|$)/)?.[1]
          return {
            status: String(delivery.status || '').slice(0, 64),
            timestamp: Number(delivery.timestamp),
            tls: !!delivery.sent_with_ssl,
            summary,
            ...(smtpCode ? { smtpCode } : {}),
          }
        }),
      })
    }
    return { messages }
  } catch {
    // Fetch/JSON errors can contain provider bodies and credentials. Do not log or propagate them.
    throw new MailError('unavailable', 503)
  }
}
