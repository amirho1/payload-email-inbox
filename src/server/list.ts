import type { PayloadRequest } from 'payload'
import type { DeliveryState, MailData, MailFolder, MailID, MailListQuery } from '../types.js'
import { MailError } from './errors.js'
import { authorize } from './permissions.js'
import { MailStore, type Row } from './store.js'

const folders: MailFolder[] = ['inbox', 'all', 'sent', 'drafts', 'queued', 'failed', 'archived']
const deliveryStates: DeliveryState[] = [
  'draft',
  'queued',
  'submitting',
  'provider-accepted',
  'delivered-to-recipient-server',
  'delayed',
  'failed',
  'bounced',
  'ambiguous',
]

/** Dates use explicit Gregorian ISO input and UTC boundaries, independent of display language. */
function day(value: string | null, end = false) {
  if (!value) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new MailError('invalid')
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new MailError('invalid')
  if (end) date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

/** Validate every SQL-bound filter before invoking the configured index adapter. */
export function listQuery(params: URLSearchParams, pageSize: number): MailListQuery {
  const folder = (params.get('folder') || 'all') as MailFolder
  const page = Number(params.get('page') || 1)
  const delivery = params.get('delivery') || undefined
  const status = params.get('status') || undefined
  if (status && status !== 'open' && status !== 'closed') throw new MailError('invalid')
  if (
    !folders.includes(folder) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    (delivery && !deliveryStates.includes(delivery as DeliveryState))
  )
    throw new MailError('invalid')
  const text = (name: string) => {
    const value = params.get(name) || ''
    if (value.length > 120 || /[\r\n\0]/.test(value)) throw new MailError('invalid')
    return value.trim()
  }
  const after = day(params.get('after'))
  const before = day(params.get('before'), true)
  if (after && before && after >= before) throw new MailError('invalid')
  return {
    folder,
    search: text('search'),
    sender: text('sender'),
    recipient: text('recipient'),
    after,
    before,
    delivery: delivery as DeliveryState | undefined,
    unread: params.get('unread') === 'true',
    status: status as MailListQuery['status'],
    page,
    pageSize,
  }
}

/** Mailbox authorization is shared with collection reads and applied before indexed selection. */
async function scope(store: MailStore, req: PayloadRequest, params: URLSearchParams) {
  const boxes = await authorize(req, store.options)
  const selected = params.get('mailbox') || ''
  if (selected && !boxes.some((box) => box.key === selected)) throw new MailError('denied', 403)
  return boxes.filter((box) => !selected || box.key === selected).map((box) => box.key)
}

/** Materialize selected IDs with the caller context; Local API never bypasses collection access. */
async function materialize(
  store: MailStore,
  req: PayloadRequest,
  collection: string,
  ids: MailID[],
) {
  if (!ids.length) return [] as Row[]
  return (
    await store.payload.find({
      collection,
      where: { id: { in: [...new Set(ids)] } },
      limit: ids.length,
      pagination: false,
      depth: 0,
      req,
      overrideAccess: false,
    })
  ).docs as Row[]
}

/** Paginated real threads/message folders with one indexed summary per visible row. */
export async function listMail(store: MailStore, req: PayloadRequest) {
  const read = store.options.atomic.read
  if (!read) throw new MailError('unavailable', 503)
  const params = new URL(req.url!).searchParams
  const keys = await scope(store, req, params)
  const query = listQuery(params, store.options.limits.pageSize)
  const index = await read.list(store.payload, store.options.slugs, keys, query)
  const conversations = await materialize(
    store,
    req,
    store.options.slugs.conversations,
    index.items.map((item) => item.conversationId),
  )
  const messages = await materialize(
    store,
    req,
    store.options.slugs.messages,
    index.items.flatMap((item) => (item.messageId ? [item.messageId] : [])),
  )
  const docs = index.items.flatMap((item) => {
    const conversation = conversations.find((row) => String(row.id) === String(item.conversationId))
    const message = messages.find((row) => String(row.id) === String(item.messageId))
    if (!conversation || (item.messageId && !message)) return []
    const data = message?.data as MailData | undefined
    return [
      {
        ...conversation,
        id: item.id,
        conversationId: conversation.id,
        messageId: message?.id,
        subject: data?.subject || conversation.subject,
        sender: data?.from || conversation.sender,
        fromName: data?.fromName,
        recipient: data?.to.join(', ') || '',
        preview: data?.text.slice(0, 240) || '',
        state: message?.state,
        kind: message?.kind,
        timestamp: message?.createdAt || conversation.createdAt,
        hasAttachments: !!data?.attachments.length,
      },
    ]
  })
  return {
    docs,
    totalDocs: index.totalDocs,
    page: query.page,
    hasNextPage: query.page * query.pageSize < index.totalDocs,
    hasPrevPage: query.page > 1,
  }
}

/** Counts include only configured mailboxes the current staff user may access. */
export async function countMail(store: MailStore, req: PayloadRequest) {
  if (!store.options.atomic.read) throw new MailError('unavailable', 503)
  return store.options.atomic.read.counts(
    store.payload,
    store.options.slugs,
    await scope(store, req, new URL(req.url!).searchParams),
  )
}
