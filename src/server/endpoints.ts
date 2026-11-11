import { randomUUID } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'
import type { MailData, MailRecord, ResolvedOptions } from '../types.js'
import { MailStore } from './store.js'
import { authorize, checkOrigin } from './permissions.js'
import { boundedBody } from './validation.js'
import { MailError, errorResponse } from './errors.js'
import { saveDraft, queueDraft } from './drafts.js'
import { downloadAttachment, saveAttachment } from './attachments.js'
import { isolatedHtml } from './sanitize.js'
import { listMail, countMail } from './list.js'

function json(value: unknown) {
  return Response.json(value, { headers: { 'Cache-Control': 'private, no-store' } })
}

function managementURL(providerURL: string | undefined) {
  if (!providerURL) return undefined
  try {
    const url = new URL(providerURL)
    if (url.protocol !== 'https:' || url.username || url.password) return undefined
    return url.href
  } catch {
    return undefined
  }
}

/** Public API wrappers share authorization, CSRF, bounds, and privacy-safe errors. */
export function mailEndpoints(o: ResolvedOptions): Endpoint[] {
  const make = (
    path: string,
    method: 'get' | 'post',
    handler: (s: MailStore, req: PayloadRequest) => Promise<Response>,
    callback = false,
  ): Endpoint => ({
    path: `${o.apiPath}${path}`,
    method,
    handler: async (req) => {
      const correlationId = randomUUID()
      try {
        if (!callback) {
          await authorize(req, o)
          if (method === 'post') {
            checkOrigin(req, o)
            await o.rateLimit?.(`send:${req.user!.id}`, req)
          }
        }
        const response = await handler(new MailStore(req.payload, o), req)
        response.headers.set('X-Correlation-ID', correlationId)
        o.onCounter?.('request-ok', correlationId)
        return response
      } catch (error) {
        o.onCounter?.('request-error', correlationId)
        return errorResponse(error, correlationId)
      }
    },
  })
  return [
    make('/config', 'get', async (_s, req) =>
      json({
        mailboxes: await authorize(req, o),
        limits: { ...o.limits },
        language: o.language ?? 'en',
        timeZone: o.timeZone ?? 'UTC',
        calendar: o.calendar ?? 'gregory',
        numberingSystem: o.numberingSystem ?? 'latn',
        providers: o.providers?.map((provider) => ({
          key: provider.key,
          label: provider.label || provider.key,
          inspect: !!provider.inspect,
          managementURL: managementURL(provider.managementURL?.()),
        })),
      }),
    ),
    make('/inbox', 'get', async (s, req) => json(await listMail(s, req))),
    make('/counts', 'get', async (s, req) => json(await countMail(s, req))),
    make('/provider/:id', 'post', async (s, req) => {
      const row = await s.get(o.slugs.messages, String(req.routeParams?.id), req)
      const boxes = await authorize(req, o, String(row.mailbox))
      const box = boxes.find((box) => box.key === row.mailbox)
      const provider = o.providers?.find((provider) => provider.key === row.provider)
      if (!box || !provider?.inspect || row.kind === 'note') throw new MailError('unavailable', 503)
      return json(await provider.inspect(row as unknown as MailRecord, box))
    }),
    make('/conversation/:id', 'get', async (s, req) => {
      const id = String(req.routeParams?.id)
      const conversation = await s.get(o.slugs.conversations, id, req)
      const page = Math.max(
        1,
        Math.min(10000, Number(new URL(req.url!).searchParams.get('page')) || 1),
      )
      const messages = await s.find(
        o.slugs.messages,
        { conversation: { equals: id } },
        o.limits.pageSize,
        req,
        page,
        'createdAt',
      )
      const ids = messages.docs.flatMap((m) => (m.data as MailData).attachments)
      const attachments = ids.length
        ? (
            await s.find(
              o.slugs.attachments,
              { id: { in: ids } },
              o.limits.pageSize * o.limits.attachmentCount,
              req,
            )
          ).docs
        : []
      return json({ conversation, messages, attachments })
    }),
    make('/conversation/:id', 'post', async (s, req) => {
      const row = await s.get(o.slugs.conversations, String(req.routeParams?.id), req)
      const data = JSON.parse(Buffer.from(await boundedBody(req, 1024)).toString('utf8')) as Record<
        string,
        unknown
      >
      if (
        !Object.keys(data).length ||
        Object.keys(data).some((k) => !['unread', 'status'].includes(k)) ||
        (data.unread !== undefined && typeof data.unread !== 'boolean') ||
        (data.status !== undefined && !['open', 'closed'].includes(String(data.status)))
      )
        throw new MailError('invalid')
      await s.mutate(
        o.slugs.conversations,
        row.id,
        () => data as { unread?: boolean; status?: string },
      )
      return json({ updated: true })
    }),
    make('/draft', 'post', async (s, req) =>
      json(
        await saveDraft(
          s,
          req,
          JSON.parse(
            Buffer.from(await boundedBody(req, o.limits.textBytes * 2 + 32768)).toString('utf8'),
          ),
          req.headers.get('idempotency-key') ?? '',
        ),
      ),
    ),
    make('/draft/:id', 'post', async (s, req) =>
      json(
        await saveDraft(
          s,
          req,
          JSON.parse(
            Buffer.from(await boundedBody(req, o.limits.textBytes * 2 + 32768)).toString('utf8'),
          ),
          req.headers.get('idempotency-key') ?? '',
          String(req.routeParams?.id),
        ),
      ),
    ),
    make('/send/:id', 'post', async (s, req) =>
      json(await queueDraft(s, req, String(req.routeParams?.id))),
    ),
    make('/attachment/:id', 'get', async (s, req) =>
      downloadAttachment(s, req, String(req.routeParams?.id)),
    ),
    make('/attachment', 'post', async (s, req) => {
      const input = JSON.parse(
        Buffer.from(await boundedBody(req, o.limits.payloadBytes)).toString('utf8'),
      ) as Record<string, unknown>
      const mailbox = String(input.mailbox)
      await authorize(req, o, mailbox)
      if (
        typeof input.filename !== 'string' ||
        typeof input.data !== 'string' ||
        typeof input.contentType !== 'string'
      )
        throw new MailError('invalid')
      return json({
        id: await saveAttachment(s, mailbox, {
          filename: input.filename,
          data: input.data,
          contentType: input.contentType,
        }),
      })
    }),
    make('/html/:id', 'get', async (s, req) => {
      const row = await s.get(o.slugs.messages, String(req.routeParams?.id), req)
      return json({
        html: isolatedHtml(
          (row.data as MailData).html ?? '',
          new URL(req.url!).searchParams.get('images') === 'true',
        ),
      })
    }),
    ...(o.providers ?? []).flatMap((provider) =>
      (['incoming', 'event'] as const).map((kind) =>
        make(
          `/postal/${provider.key}/${kind}`,
          'post',
          async (s, req) => {
            const { acceptReceipt } = await import('./ingress.js')
            return acceptReceipt(s, req, provider.key, kind)
          },
          true,
        ),
      ),
    ),
  ]
}
