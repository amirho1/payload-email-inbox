import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import type {
  DeliveryEvent,
  DeliveryState,
  MailData,
  MailID,
  MailOptions,
  MailProvider,
} from '../types.js'
import { resolveOptions } from '../config.js'
import { MailStore, type Row } from './store.js'
import { resolveConversation } from './threading.js'
import { saveAttachment } from './attachments.js'
import { submitWithPayload } from '../providers/postal.js'

const terminal = new Set(['failed', 'bounced', 'delivered-to-recipient-server'])

/** Terminal failures survive delayed/older events; late bounces can supersede delivery. */
export function nextDelivery(
  previous: { state: DeliveryState; timestamp: number } | undefined,
  event: DeliveryEvent,
) {
  if (
    previous &&
    (previous.state === 'bounced' ||
      (previous.state === 'failed' && event.state !== 'bounced') ||
      (event.timestamp < previous.timestamp && event.state !== 'bounced') ||
      (terminal.has(previous.state) && !terminal.has(event.state)))
  )
    return previous
  return { state: event.state, timestamp: event.timestamp }
}

function history(data: MailData, state: DeliveryState, code?: string): MailData {
  return {
    ...data,
    history: [
      ...(data.history ?? []).slice(-49),
      { state, at: new Date().toISOString(), ...(code ? { code } : {}) },
    ],
  }
}

async function claim(
  store: MailStore,
  collection: string,
  row: Row,
  state: string,
): Promise<Row | undefined> {
  const token = randomUUID()
  const now = Date.now()
  if (
    !(await store.cas(collection, row, {
      state,
      lease: token,
      leaseUntil: now + store.options.limits.leaseMs,
      attempts: Number(row.attempts ?? 0) + 1,
    }))
  )
    return
  return {
    ...row,
    state,
    lease: token,
    leaseUntil: now + store.options.limits.leaseMs,
    revision: row.revision + 1,
    attempts: Number(row.attempts ?? 0) + 1,
  }
}

async function processIncoming(store: MailStore, work: Row, provider: MailProvider): Promise<void> {
  const box = store.options.mailboxes.find(
    (b) => b.key === work.mailbox && b.provider === work.provider,
  )
  if (!box || !provider.parseIncoming) throw new Error('mail:configuration')
  const mail = await provider.parseIncoming(work.data, store.options.limits)
  const conversation = await resolveConversation(store, box, mail, String(work.key))
  // Reopen before inserting: retention atomically checks closed+old. A deleted candidate retries
  // from the durable receipt, while an active conversation is no longer retention-eligible.
  await store.mutate(store.options.slugs.conversations, conversation.id, () => ({ status: 'open' }))
  const attachments: MailID[] = []
  for (const [index, file] of mail.attachments.entries())
    attachments.push(await saveAttachment(store, box.key, file, `${work.key}:${index}`))
  const { providerId, ...normalized } = mail
  const data: MailData = { ...normalized, attachments }
  await store.unique(store.options.slugs.messages, 'dedupKey', String(work.key), {
    mailbox: box.key,
    conversation: String(conversation.id),
    kind: 'incoming',
    state: 'delivered-to-recipient-server',
    provider: box.provider,
    ...(providerId ? { providerIds: [providerId] } : {}),
    messageId: data.messageId,
    data,
  })
  await store.mutate(store.options.slugs.conversations, conversation.id, (row) => ({
    unread: true,
    status: 'open',
    participants: [...new Set([...(row.participants as string[]), ...data.participants])],
  }))
}

async function processEvent(store: MailStore, work: Row, provider: MailProvider): Promise<boolean> {
  if (!provider.parseEvent) throw new Error('mail:configuration')
  for (const event of provider.parseEvent(work.data)) {
    const matches = await store.find(
      store.options.slugs.messages,
      {
        and: [
          { provider: { equals: provider.key } },
          { providerIds: { equals: event.providerId } },
          { kind: { equals: 'outgoing' } },
        ],
      },
      2,
    )
    if (matches.docs.length !== 1) return false // Out of order: retain and retry after acceptance persistence.
    const active = (matches.docs[0].data as MailData).activeProviderIds ?? []
    if (!active.includes(event.providerId)) return false
    await store.mutate(store.options.slugs.messages, matches.docs[0].id, (row) => {
      const data = row.data as MailData
      const delivery = nextDelivery(data.deliveries?.[event.providerId], event)
      const deliveries = { ...data.deliveries, [event.providerId]: delivery }
      const all = Object.values(deliveries)
      const ids = row.providerIds as string[]
      const state = all.some((d) => d.state === 'bounced')
        ? 'bounced'
        : all.some((d) => d.state === 'failed')
          ? 'failed'
          : all.length === ids.length &&
              all.every((d) => d.state === 'delivered-to-recipient-server')
            ? 'delivered-to-recipient-server'
            : 'delayed'
      return { state, data: history({ ...data, deliveries }, state) }
    })
  }
  return true
}

async function processReceipt(store: MailStore, row: Row): Promise<void> {
  const work = await claim(store, store.options.slugs.work, row, 'processing')
  if (!work) return
  try {
    const provider = store.options.providers?.find((p) => p.key === work.provider)
    if (!provider) throw new Error('mail:configuration')
    const done =
      work.kind === 'incoming'
        ? (await processIncoming(store, work, provider), true)
        : await processEvent(store, work, provider)
    if (!done) {
      await store.cas(store.options.slugs.work, work, {
        state: Number(work.attempts) >= 20 ? 'failed' : 'queued',
        nextAttempt: Date.now() + Math.min(3600000, 1000 * 2 ** Number(work.attempts)),
        lease: null,
      })
      return
    }
    // Remove full raw receipt after normalized durable message persistence. No raw retention by default.
    await store.cas(store.options.slugs.work, work, { state: 'done', data: {}, lease: null })
  } catch {
    await store.cas(store.options.slugs.work, work, {
      state: Number(work.attempts) >= store.options.limits.maxAttempts ? 'failed' : 'queued',
      nextAttempt: Date.now() + 1000 * 2 ** Number(work.attempts),
      lease: null,
    })
    store.options.onCounter?.('receipt-failure', randomUUID())
  }
}

async function sendMessage(store: MailStore, row: Row): Promise<void> {
  if (row.kind !== 'outgoing') return
  const box = store.options.mailboxes.find((b) => b.key === row.mailbox)
  if (!box) return
  if (![box.address, ...(box.allowedFrom ?? [])].includes((row.data as MailData).from)) {
    await store.cas(store.options.slugs.messages, row, {
      state: 'failed',
      data: history(row.data as MailData, 'failed', 'sender-no-longer-allowed'),
    })
    return
  }
  const message = await claim(store, store.options.slugs.messages, row, 'submitting')
  if (!message) return
  // From here onward, any interruption may have happened after submission. Never reclaim for sending.
  const data = message.data as MailData
  try {
    const files = []
    for (const id of data.attachments) {
      const file = await store.payload.findByID({
        collection: store.options.slugs.attachments,
        id,
        overrideAccess: true,
        showHiddenFields: true,
        depth: 0,
      })
      if (file.mailbox !== box.key) throw new Error('mail:attachment-permission')
      files.push({
        filename: String(file.filename),
        contentType: String(file.contentType),
        data: String(file.bytes),
      })
    }
    const provider = store.options.providers?.find((p) => p.key === box.provider)
    const result = await (provider?.submit ?? submitWithPayload)(
      { ...data, text: `${data.text}${box.signature ? `\n\n${box.signature}` : ''}`, files },
      box,
      store.payload,
    )
    let state: DeliveryState = result.state
    let nextAttempt = 0
    if (
      result.state === 'failed' &&
      result.retryable &&
      Number(message.attempts) < store.options.limits.maxAttempts
    ) {
      state = 'queued'
      nextAttempt = Date.now() + 1000 * 2 ** Number(message.attempts)
    }
    if (result.state === 'provider-accepted') {
      // Retain provider IDs before exposing acceptance. If this write crashes, lease expiry is ambiguous.
      await store.payload.update({
        collection: store.options.slugs.messages,
        id: row.id,
        data: { providerIds: result.ids },
        overrideAccess: true,
        disableTransaction: true,
        depth: 0,
      })
    }
    await store.cas(store.options.slugs.messages, message, {
      state,
      nextAttempt,
      lease: null,
      data: history(
        {
          ...data,
          ...(result.state === 'provider-accepted' ? { activeProviderIds: result.ids } : {}),
        },
        state,
        'code' in result ? result.code.replace(/[^a-z0-9-]/gi, '').slice(0, 60) : undefined,
      ),
    })
    if (result.state === 'provider-accepted')
      await store.mutate(store.options.slugs.conversations, String(message.conversation), (c) => ({
        participants: [...new Set([...(c.participants as string[]), ...data.participants])],
      }))
  } catch {
    await store.cas(store.options.slugs.messages, message, {
      state: 'ambiguous',
      lease: null,
      data: history(data, 'ambiguous', 'submission-interrupted'),
    })
    store.options.onCounter?.('submission-unknown', randomUUID())
  }
}

/** Bounded scheduler tick, safe across processes. Returns counters with no message contents. */
export async function processMail(payload: Payload, options: MailOptions, batchSize = 10) {
  if (options.enabled === false) return { receipts: 0, submissions: 0 }
  const store = new MailStore(payload, resolveOptions(options))
  // Initialization belongs to explicit post-migration processing, never host startup hooks.
  for (const box of store.options.mailboxes) {
    const existing = await store.find(
      store.options.slugs.mailboxes,
      { key: { equals: box.key } },
      1,
    )
    if (!existing.docs.length)
      await store.unique(store.options.slugs.mailboxes, 'key', box.key, {
        address: box.address,
        name: box.name,
      })
  }
  const max = Math.max(1, Math.min(100, batchSize))
  const now = Date.now()
  const stale = await store.find(
    store.options.slugs.messages,
    { and: [{ state: { equals: 'submitting' } }, { leaseUntil: { less_than: now } }] },
    max,
  )
  for (const row of stale.docs)
    await store.cas(store.options.slugs.messages, row as Row, {
      state: 'ambiguous',
      lease: null,
      data: history(row.data as MailData, 'ambiguous', 'lease-expired'),
    })
  const staleWork = await store.find(
    store.options.slugs.work,
    { and: [{ state: { equals: 'processing' } }, { leaseUntil: { less_than: now } }] },
    max,
  )
  for (const row of staleWork.docs)
    await store.cas(store.options.slugs.work, row as Row, { state: 'queued', lease: null })
  const work = await store.find(
    store.options.slugs.work,
    { and: [{ state: { equals: 'queued' } }, { nextAttempt: { less_than_equal: now } }] },
    max,
  )
  for (const row of work.docs) await processReceipt(store, row as Row)
  const messages = await store.find(
    store.options.slugs.messages,
    { and: [{ state: { equals: 'queued' } }, { nextAttempt: { less_than_equal: now } }] },
    max,
  )
  for (const row of messages.docs) await sendMessage(store, row as Row)
  return { receipts: work.docs.length, submissions: messages.docs.length }
}
