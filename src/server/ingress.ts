import { createHash } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import { MailError } from './errors.js'
import { MailStore } from './store.js'
import { boundedBody } from './validation.js'

/** Acknowledge only after unique durable persistence. Heavy MIME/scanning runs in worker tick. */
export async function acceptReceipt(
  store: MailStore,
  req: PayloadRequest,
  providerKey: string,
  kind: 'incoming' | 'event',
) {
  const provider = store.options.providers?.find((p) => p.key === providerKey)
  if (!provider?.receive) throw new MailError('notFound', 404)
  const bytes = await boundedBody(req, store.options.limits.payloadBytes)
  const receipt = await provider.receive(bytes, req.headers, kind)
  const box =
    kind === 'incoming'
      ? store.options.mailboxes.find(
          (b) => b.provider === providerKey && b.address === receipt.recipient,
        )
      : undefined
  if (kind === 'incoming' && !box) throw new MailError('denied', 403)
  // Invoke shared admission control only after authentication. Returning 503 keeps 3.3.7 ingress retryable.
  if (store.options.rateLimit)
    await store.options.rateLimit(`receive:${providerKey}:${box?.key ?? 'events'}`, req)
  const digest = createHash('sha256').update(bytes).digest('hex')
  const row = await store.unique(
    store.options.slugs.work,
    'key',
    `${providerKey}:${box?.key ?? 'events'}:${receipt.key}`,
    {
      mailbox: box?.key ?? 'events',
      provider: providerKey,
      kind,
      digest,
      data: receipt.body,
      state: 'queued',
    },
  )
  if (row.digest !== digest) throw new MailError('conflict', 409)
  return Response.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } })
}
