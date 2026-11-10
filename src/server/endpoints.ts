import { randomUUID } from 'node:crypto'
import type { Endpoint, PayloadRequest, Where } from 'payload'
import type { MailData, ResolvedOptions } from '../types.js'
import { MailStore } from './store.js'
import { authorize, checkOrigin } from './permissions.js'
import { boundedBody } from './validation.js'
import { MailError, errorResponse } from './errors.js'
import { saveDraft, queueDraft } from './drafts.js'
import { downloadAttachment, saveAttachment } from './attachments.js'
import { isolatedHtml } from './sanitize.js'

function json(value: unknown) {
  return Response.json(value, { headers: { 'Cache-Control': 'private, no-store' } })
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
      }),
    ),
    make('/inbox', 'get', async (s, req) => {
      const q = new URL(req.url!).searchParams
      const page = Math.max(1, Math.min(10000, Number(q.get('page')) || 1))
      if (!Number.isInteger(page)) throw new MailError('invalid')
      const search = (q.get('search') ?? '').slice(0, 120)
      const and: Where[] = []
      if (q.get('mailbox')) and.push({ mailbox: { equals: q.get('mailbox') } })
      if (['open', 'closed'].includes(q.get('status') ?? ''))
        and.push({ status: { equals: q.get('status') } })
      if (q.get('unread') === 'true') and.push({ unread: { equals: true } })
      if (search)
        and.push({ or: [{ subject: { contains: search } }, { sender: { contains: search } }] })
      return json(
        await s.find(
          o.slugs.conversations,
          and.length ? { and } : {},
          o.limits.pageSize,
          req,
          page,
          '-updatedAt',
        ),
      )
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
