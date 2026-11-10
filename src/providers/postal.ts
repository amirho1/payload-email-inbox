import { createHash, createPublicKey, verify } from 'node:crypto'
import type { MailProvider, MailData, Limits, NormalizedIncoming, DeliveryEvent } from '../types.js'
import { MailError } from '../server/errors.js'
import { address, addresses, attachment, messageId, references } from '../server/validation.js'

export type PostalOptions = {
  key: string
  /** PEM public keys provisioned out of band. Keys are never fetched from callback input. */
  publicKeys: () => Promise<string[]> | string[]
  apiURL?: () => string
  apiKey?: () => string
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MailError('invalid')
  return value as Record<string, unknown>
}

function string(value: unknown, max = 8192): string {
  if (typeof value !== 'string' || value.length > max) throw new MailError('invalid')
  return value
}

/** Postal 3.3.7: both incoming JSON and event envelopes use this exact-byte signature. */
export function postalProvider(options: PostalOptions): MailProvider {
  return {
    key: options.key,
    async receive(body, headers, kind) {
      const signature = headers.get('x-postal-signature-256')
      if (!signature || signature.length > 2048 || !/^[A-Za-z0-9+/]+=*$/.test(signature))
        throw new MailError('denied', 401)
      const keys = await options.publicKeys()
      if (
        !keys.length ||
        keys.length > 4 ||
        !keys.some((pem) =>
          verify('RSA-SHA256', body, createPublicKey(pem), Buffer.from(signature, 'base64')),
        )
      )
        throw new MailError('denied', 401)
      let data: Record<string, unknown>
      try {
        data = object(JSON.parse(Buffer.from(body).toString('utf8')))
      } catch {
        throw new MailError('invalid')
      }
      if (kind === 'incoming') {
        if (!Number.isSafeInteger(data.id) || Number(data.id) < 1) throw new MailError('invalid')
        return {
          key: `incoming:${data.id}`,
          recipient: address(string(data.rcpt_to, 320)),
          kind,
          body: data,
        }
      }
      const uuid = string(data.uuid, 100)
      if (!/^[a-zA-Z0-9-]{8,100}$/.test(uuid) || !Number.isFinite(data.timestamp))
        throw new MailError('invalid')
      // Validate supported event and provider ids before accepting durable work.
      parsePostalEvent(data)
      return { key: `event:${uuid}`, kind, body: data }
    },
    parseIncoming: parsePostalIncoming,
    parseEvent: parsePostalEvent,
    async submit(message, box, payload) {
      if (!options.apiURL || !options.apiKey) return submitWithPayload(message, box, payload)
      const endpoint = new URL(`${options.apiURL().replace(/\/$/, '')}/send/raw`)
      if (
        endpoint.protocol !== 'https:' ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash
      )
        throw new MailError('invalid')
      const { composeMime } = await import('../server/mime.js')
      const composed = await composeMime(message, payload, box)
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
          headers: { 'X-Server-API-Key': options.apiKey(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mail_from: message.from,
            rcpt_to: [...message.to, ...message.cc, ...message.bcc],
            data: composed.toString('base64'),
          }),
        })
        const { boundedBody } = await import('../server/validation.js')
        // Read a bounded provider response without leaking errors/body/API keys.
        const data = object(
          JSON.parse(
            Buffer.from(
              await boundedBody(
                new Request('https://provider.invalid', {
                  method: 'POST',
                  body: response.body,
                  duplex: 'half',
                } as RequestInit),
                65536,
              ),
            ).toString('utf8'),
          ),
        )
        if (response.ok && data.status === 'success') {
          const messages = object(object(data.data).messages)
          const recipients = [...new Set([...message.to, ...message.cc, ...message.bcc])]
          if (recipients.length !== Object.keys(messages).length)
            return { state: 'ambiguous', code: 'postal-response' }
          const ids = recipients.map((r) => object(messages[r]).id)
          if (!ids.every((i) => Number.isSafeInteger(i) && Number(i) > 0))
            return { state: 'ambiguous', code: 'postal-response' }
          return { state: 'provider-accepted', ids: ids.map(String) }
        }
        const code = object(data.data ?? {}).code
        if (
          data.status === 'parameter-error' ||
          (data.status === 'error' &&
            [
              'InvalidServerAPIKey',
              'UnauthenticatedFromAddress',
              'NoRecipients',
              'TooManyRecipients',
              'InvalidMessage',
            ].includes(String(code)))
        )
          return { state: 'failed', code: 'postal-rejected' }
        return { state: 'ambiguous', code: 'postal-response' }
      } catch {
        return { state: 'ambiguous', code: 'postal-network' }
      }
    },
  }
}

/** RawMessage preserves MIME and envelope routing; Hash is also supported for 3.3.7 fixtures. */
export async function parsePostalIncoming(
  input: unknown,
  limits: Limits,
): Promise<NormalizedIncoming> {
  const data = object(input)
  if (typeof data.message === 'string') {
    if (
      data.base64 !== true ||
      data.message.length > limits.payloadBytes ||
      !/^[A-Za-z0-9+/=\s]+$/.test(data.message)
    )
      throw new MailError('invalid')
    const { simpleParser } = await import('mailparser')
    const parsed = await simpleParser(Buffer.from(data.message, 'base64'), {
      skipHtmlToText: true,
      skipTextToHtml: true,
      maxHtmlLengthToParse: limits.textBytes,
    })
    const id =
      messageId(parsed.messageId) ??
      `${createHash('sha256').update(data.message).digest('hex')}@missing.invalid`
    const from = addresses(parsed.from?.text)
    if (from.length !== 1) throw new MailError('invalid')
    const to = addresses(Array.isArray(parsed.to) ? parsed.to.map((v) => v.text) : parsed.to?.text)
    const cc = addresses(Array.isArray(parsed.cc) ? parsed.cc.map((v) => v.text) : parsed.cc?.text)
    if (to.length + cc.length > limits.recipients) throw new MailError('limit', 413)
    const text = parsed.text ?? ''
    const html = parsed.html || undefined
    if (
      Buffer.byteLength(text) + Buffer.byteLength(html ?? '') > limits.textBytes ||
      parsed.attachments.length > limits.attachmentCount
    )
      throw new MailError('limit', 413)
    const attachments = parsed.attachments.map((a) => ({
      filename: a.filename ?? 'attachment.bin',
      contentType: a.contentType,
      data: a.content.toString('base64'),
    }))
    for (const a of attachments) attachment(a, limits)
    return {
      fromName: parsed.from?.value[0]?.name?.slice(0, 256),
      from: from[0],
      to,
      cc,
      bcc: [],
      subject: parsed.subject?.slice(0, 998) || '(no subject)',
      text,
      html,
      messageId: id,
      inReplyTo: messageId(parsed.inReplyTo),
      references: (Array.isArray(parsed.references) ? parsed.references : [parsed.references])
        .map(messageId)
        .filter((v): v is string => !!v)
        .slice(-30),
      replyTo: addresses(parsed.replyTo?.text)[0],
      attachments,
      participants: [...new Set([...from, ...to, ...cc])],
      autoSubmitted: String(parsed.headers.get('auto-submitted') ?? ''),
      bounce: data.mail_from === '',
    }
  }
  const from = addresses(string(data.from, 1024))
  if (from.length !== 1) throw new MailError('invalid')
  const to = addresses(typeof data.to === 'string' ? data.to : '')
  const cc = addresses(typeof data.cc === 'string' ? data.cc : '')
  if (to.length + cc.length > limits.recipients) throw new MailError('limit', 413)
  const text = typeof data.plain_body === 'string' ? data.plain_body : ''
  const html = typeof data.html_body === 'string' ? data.html_body : undefined
  if (Buffer.byteLength(text) + Buffer.byteLength(html ?? '') > limits.textBytes)
    throw new MailError('limit', 413)
  const attachments = (Array.isArray(data.attachments) ? data.attachments : []).map((a) => {
    const v = object(a)
    const result = {
      filename: string(v.filename, 180),
      contentType: string(v.content_type, 100),
      data: string(v.data, limits.payloadBytes),
    }
    attachment(result, limits)
    return result
  })
  if (attachments.length > limits.attachmentCount) throw new MailError('limit', 413)
  return {
    from: from[0],
    to,
    cc,
    bcc: [],
    subject: typeof data.subject === 'string' ? data.subject.slice(0, 998) : '(no subject)',
    text,
    html,
    messageId:
      messageId(data.message_id) ??
      `${createHash('sha256').update(JSON.stringify(data)).digest('hex')}@missing.invalid`,
    inReplyTo: messageId(data.in_reply_to),
    references: references(data.references),
    attachments,
    participants: [...new Set([...from, ...to, ...cc])],
    autoSubmitted: typeof data.auto_submitted === 'string' ? data.auto_submitted : '',
    bounce: data.bounce === true || data.mail_from === '',
  }
}

export function parsePostalEvent(input: unknown): DeliveryEvent[] {
  const envelope = object(input)
  const states = {
    MessageSent: 'delivered-to-recipient-server',
    MessageDelayed: 'delayed',
    MessageDeliveryFailed: 'failed',
    MessageHeld: 'delayed',
    MessageBounced: 'bounced',
  } as const
  const event = string(envelope.event, 100) as keyof typeof states
  if (!states[event]) throw new MailError('invalid')
  const payload = object(envelope.payload)
  const message = object(event === 'MessageBounced' ? payload.original_message : payload.message)
  if (
    !Number.isSafeInteger(message.id) ||
    Number(message.id) < 1 ||
    message.direction !== 'outgoing' ||
    !Number.isFinite(envelope.timestamp)
  )
    throw new MailError('invalid')
  return [
    { providerId: String(message.id), state: states[event], timestamp: Number(envelope.timestamp) },
  ]
}

/** A host adapter result proves submission only; errors are conservatively ambiguous. */
export async function submitWithPayload(
  message: MailData,
  box: { replyTo?: string; name?: string },
  payload: Parameters<NonNullable<MailProvider['submit']>>[2],
) {
  const { mailOptions } = await import('../server/mime.js')
  try {
    await payload.sendEmail(await mailOptions(message, payload, box))
    return { state: 'provider-accepted' as const, ids: [] }
  } catch {
    return { state: 'ambiguous' as const, code: 'adapter-error' }
  }
}
