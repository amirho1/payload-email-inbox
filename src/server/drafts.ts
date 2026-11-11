import { randomUUID } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import type { MailData, MailID } from '../types.js'
import { draftSchema, addresses, address } from './validation.js'
import { authorize } from './permissions.js'
import { MailError } from './errors.js'
import { MailStore } from './store.js'
import { sanitizeMessage } from './sanitize.js'

/** Authorize every referenced ID before constructing a durable draft or internal note. */
export async function saveDraft(
  store: MailStore,
  req: PayloadRequest,
  input: unknown,
  idempotencyKey: string,
  id?: MailID,
) {
  const parsed = draftSchema.safeParse(input)
  if (!parsed.success || !/^[a-zA-Z0-9-]{16,100}$/.test(idempotencyKey))
    throw new MailError('invalid')
  const draft = parsed.data
  const boxes = await authorize(req, store.options, draft.mailbox)
  const box = boxes.find((b) => b.key === draft.mailbox)!
  const from = address(draft.from)
  if (![box.address, ...(box.allowedFrom ?? [])].includes(from)) throw new MailError('denied', 403)
  const to = addresses(draft.to),
    cc = addresses(draft.cc),
    bcc = addresses(draft.bcc)
  if (
    to.length + cc.length + bcc.length > store.options.limits.recipients ||
    Buffer.byteLength(draft.text) + Buffer.byteLength(draft.html ?? '') >
      store.options.limits.textBytes ||
    draft.attachments.length > store.options.limits.attachmentCount
  )
    throw new MailError('limit', 413)
  let conversation = draft.conversation
    ? await store.get(store.options.slugs.conversations, draft.conversation, req)
    : undefined
  if (conversation && conversation.mailbox !== box.key) throw new MailError('denied', 403)
  let reply: MailData | undefined
  if (draft.replyToMessage) {
    const original = await store.get(store.options.slugs.messages, draft.replyToMessage, req)
    if (
      original.mailbox !== box.key ||
      !conversation ||
      String(original.conversation) !== String(conversation.id) ||
      original.kind === 'note'
    )
      throw new MailError('denied', 403)
    reply = original.data as MailData
  }
  if (['reply', 'replyAll', 'forward'].includes(draft.action) && !reply)
    throw new MailError('invalid')
  if (draft.kind === 'note' && !conversation) throw new MailError('invalid')
  if (draft.action === 'forward' && !draft.text.includes('----------'))
    draft.text = `---------- Forwarded message ----------\n${draft.text}`
  for (const attachmentId of draft.attachments) {
    const file = await store.get(store.options.slugs.attachments, attachmentId, req)
    if (file.mailbox !== box.key) throw new MailError('denied', 403)
  }
  const participants = [...new Set([from, ...to, ...cc])]
  if (!conversation)
    conversation = await store.unique(
      store.options.slugs.conversations,
      'threadKey',
      `draft:${box.key}:${req.user!.id}:${idempotencyKey}`,
      {
        mailbox: box.key,
        subject: draft.subject || '(no subject)',
        sender: from,
        participants,
        unread: false,
        status: 'open',
      },
    )
  const data: MailData = {
    fromName: box.name,
    from,
    to: draft.kind === 'note' ? [] : to,
    cc: draft.kind === 'note' ? [] : cc,
    bcc: draft.kind === 'note' ? [] : bcc,
    subject: draft.subject,
    text: draft.text,
    html: draft.html ? sanitizeMessage(draft.html) : undefined,
    messageId: `${randomUUID()}@${box.address.split('@')[1]}`,
    attachments: draft.attachments,
    inReplyTo: reply && draft.action !== 'forward' ? reply.messageId : undefined,
    references:
      reply && draft.action !== 'forward' ? [...reply.references, reply.messageId].slice(-30) : [],
    participants,
  }
  if (id) {
    const original = await store.get(store.options.slugs.messages, id, req)
    if (
      original.mailbox !== box.key ||
      original.state !== 'draft' ||
      original.kind !== draft.kind ||
      String(original.conversation) !== String(conversation.id)
    )
      throw new MailError('conflict', 409)
    data.messageId = (original.data as MailData).messageId
    if (draft.action === 'compose' && !draft.replyToMessage) {
      data.inReplyTo = (original.data as MailData).inReplyTo
      data.references = (original.data as MailData).references
    }
    if (!(await store.cas(store.options.slugs.messages, original, { data })))
      throw new MailError('conflict', 409)
    return { ...original, data, revision: original.revision + 1 }
  }
  await store.mutate(store.options.slugs.conversations, conversation.id, () => ({ status: 'open' }))
  return store.unique(
    store.options.slugs.messages,
    'dedupKey',
    `draft:${box.key}:${req.user!.id}:${idempotencyKey}`,
    {
      mailbox: box.key,
      conversation: String(conversation.id),
      kind: draft.kind,
      state: 'draft',
      provider: box.provider,
      messageId: data.messageId,
      data,
    },
  )
}

/** One conditional transition makes repeated and concurrent send clicks harmless. */
export async function queueDraft(store: MailStore, req: PayloadRequest, id: MailID) {
  const row = await store.get(store.options.slugs.messages, id, req)
  await authorize(req, store.options, String(row.mailbox))
  if (row.kind !== 'outgoing') throw new MailError('invalid')
  const data = row.data as MailData
  if (!data.to.length && !data.cc.length && !data.bcc.length) throw new MailError('invalid')
  if (row.state !== 'draft' && row.state !== 'failed') return row
  if (
    !(await store.cas(store.options.slugs.messages, row, {
      state: 'queued',
      nextAttempt: 0,
      attempts: 0,
      data: {
        ...data,
        deliveries: {},
        activeProviderIds: [],
        history: [
          ...(data.history ?? []).slice(-49),
          { state: 'queued', at: new Date().toISOString() },
        ],
      },
    }))
  )
    throw new MailError('conflict', 409)
  return { ...row, state: 'queued' }
}
