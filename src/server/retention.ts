import type { Payload } from 'payload'
import type { MailOptions } from '../types.js'
import { resolveOptions } from '../config.js'

/** Explicit opt-in bounded pruning. Pending/failed receipts and unknown submissions are preserved. */
export async function pruneMail(
  payload: Payload,
  options: MailOptions,
  dryRun = true,
  batchSize = 25,
) {
  if (options.enabled === false) return { candidates: 0, deleted: 0 }
  const o = resolveOptions(options)
  const before = new Date(Date.now() - o.limits.retentionDays * 86400000).toISOString()
  const limit = Math.max(1, Math.min(100, batchSize))
  const candidates = await payload.find({
    collection: o.slugs.conversations,
    where: { and: [{ status: { equals: 'closed' } }, { updatedAt: { less_than: before } }] },
    limit,
    depth: 0,
    overrideAccess: true,
  })
  let deleted = 0
  for (const conversation of candidates.docs) {
    const pending = await payload.count({
      collection: o.slugs.messages,
      where: {
        and: [
          { conversation: { equals: String(conversation.id) } },
          { kind: { equals: 'outgoing' } },
          { state: { in: ['queued', 'submitting', 'ambiguous', 'draft'] } },
        ],
      },
      overrideAccess: true,
    })
    if (pending.totalDocs || dryRun) continue
    // Attachments can be referenced by forwarded messages in another conversation. Keep bytes until
    // an explicit orphan sweep; this protects shared references and keeps pruning bounded.
    if (!o.atomic.pruneConversation) throw new Error('mail:atomic-retention-unavailable')
    if (await o.atomic.pruneConversation(payload, o.slugs, conversation.id, before)) deleted++
  }
  const receiptBefore = new Date(Date.now() - o.limits.receiptDays * 86400000).toISOString()
  const receipts = await payload.find({
    collection: o.slugs.work,
    where: { and: [{ state: { equals: 'done' } }, { updatedAt: { less_than: receiptBefore } }] },
    limit,
    depth: 0,
    overrideAccess: true,
  })
  if (!dryRun)
    for (const row of receipts.docs)
      await payload.delete({ collection: o.slugs.work, id: row.id, overrideAccess: true })
  return { candidates: candidates.docs.length, deleted, receiptCandidates: receipts.docs.length }
}
