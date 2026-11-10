import { beforeAll, afterAll, it, expect } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateKeyPairSync, sign } from 'node:crypto'
import { buildConfig, createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { payloadMail } from '../src/index.js'
import { sqliteAtomicStore } from '../src/server/sqlite.js'
import { MailStore } from '../src/server/store.js'
import { resolveOptions } from '../src/config.js'
import { postalProvider } from '../src/providers/postal.js'
import { acceptReceipt } from '../src/server/ingress.js'
import { processMail } from '../src/server/worker.js'
import { saveDraft, queueDraft } from '../src/server/drafts.js'
import { downloadAttachment } from '../src/server/attachments.js'
import { composeMime } from '../src/server/mime.js'
import { mailEndpoints } from '../src/server/endpoints.js'
import { pruneMail } from '../src/server/retention.js'
import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import type { MailData, MailOptions, SubmitResult, MailID } from '../src/types.js'

let payload: Payload,
  store: MailStore,
  dir: string,
  agent: PayloadRequest,
  other: PayloadRequest,
  nonstaff: PayloadRequest,
  anonymous: PayloadRequest
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const provider = postalProvider({
  key: 'postal',
  publicKeys: () => [keys.publicKey.export({ type: 'spki', format: 'pem' }).toString()],
})
const captured: Buffer[] = []
let result: SubmitResult = { state: 'provider-accepted', ids: ['100'] }
let conversation: MailID, message: MailID, attachmentId: MailID
const options: MailOptions = {
  atomic: sqliteAtomicStore(),
  origins: ['https://example.com'],
  mailboxes: [
    { key: 'support', address: 'support@example.com', name: 'Support', provider: 'postal' },
    { key: 'private', address: 'private@example.com', name: 'Private', provider: 'postal' },
  ],
  isStaff: (req) => req.user?.role === 'agent',
  canAccessMailbox: (req, box) => req.user?.mailbox === box.key,
  providers: [
    {
      ...provider,
      submit: async (data, box, p) => {
        captured.push(await composeMime(data, p, box))
        return result
      },
    },
  ],
}
async function request(
  user: Record<string, unknown> | null,
  body?: string,
  headers?: Headers,
  routeParams?: Record<string, string>,
) {
  const req = await createLocalReq(
    { user: (user ?? undefined) as NonNullable<PayloadRequest['user']> },
    payload,
  )
  req.headers = headers ?? new Headers({ origin: 'https://example.com' })
  Object.defineProperty(req, 'url', { value: 'https://example.com/api/mail', configurable: true })
  if (body)
    Object.defineProperty(req, 'body', {
      value: new Request(req.url!, { method: 'POST', body }).body,
      configurable: true,
    })
  req.routeParams = routeParams
  return req
}
async function incoming(id: number, extra: Record<string, unknown> = {}) {
  const body = JSON.stringify({
    id,
    rcpt_to: 'support@example.com',
    mail_from: 'customer@example.net',
    from: '"نام، Family" <customer@example.net>',
    to: 'support@example.com',
    subject: 'سلام Support',
    plain_body: 'متن فارسی',
    message_id: `<incoming-${id}@example.net>`,
    attachments: [
      {
        filename: 'سلام.txt',
        content_type: 'text/plain',
        data: Buffer.from('پیوست').toString('base64'),
      },
    ],
    ...extra,
  })
  return acceptReceipt(
    store,
    await request(
      null,
      body,
      new Headers({
        'X-Postal-Signature-256': sign('sha256', Buffer.from(body), keys.privateKey).toString(
          'base64',
        ),
      }),
    ),
    'postal',
    'incoming',
  )
}
const draft = () => ({
  mailbox: 'support',
  kind: 'outgoing',
  from: 'support@example.com',
  to: ['customer@example.net'],
  cc: [],
  bcc: ['hidden@example.net'],
  subject: 'پاسخ',
  text: 'سلام reply',
  attachments: [],
  action: 'compose',
})

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'payload-mail-'))
  payload = await getPayload({
    config: await buildConfig({
      secret: 'synthetic-test-secret-at-least-32-characters',
      admin: { user: 'users', disable: true },
      db: sqliteAdapter({
        client: { url: `file:${join(dir, 'test.db')}` },
        push: true,
        transactionOptions: {},
        busyTimeout: 5000,
        wal: true,
      }),
      collections: [
        {
          slug: 'users',
          auth: true,
          fields: [
            { name: 'role', type: 'text' },
            { name: 'mailbox', type: 'text' },
          ],
        },
      ],
      plugins: [payloadMail(options)],
      typescript: { autoGenerate: false },
    }),
  })
  store = new MailStore(payload, resolveOptions(options))
  agent = await request({ id: 1, collection: 'users', role: 'agent', mailbox: 'support' })
  other = await request({ id: 2, collection: 'users', role: 'agent', mailbox: 'private' })
  nonstaff = await request({ id: 3, collection: 'users', role: 'customer', mailbox: 'support' })
  anonymous = await request(null)
})
afterAll(async () => {
  await payload?.destroy()
  if (dir) await rm(dir, { recursive: true, force: true })
})

it('denies anonymous/nonstaff Local API reads and direct mutations', async () => {
  for (const req of [anonymous, nonstaff])
    await expect(
      payload.find({ collection: store.options.slugs.messages, req, overrideAccess: false }),
    ).rejects.toThrow('not allowed')
  await expect(
    payload.create({
      collection: store.options.slugs.messages,
      data: {},
      req: agent,
      overrideAccess: false,
    }),
  ).rejects.toThrow()
})
it('durably deduplicates simultaneous authenticated arrivals in SQLite', async () => {
  const responses = await Promise.all(Array.from({ length: 8 }, () => incoming(1)))
  expect(responses.every((r) => r.status === 200)).toBe(true)
  expect((await store.find(store.options.slugs.work, {}, 100)).docs).toHaveLength(1)
  await Promise.all([processMail(payload, options), processMail(payload, options)])
  const messages = await store.find(store.options.slugs.messages, {}, 100)
  expect(messages.docs).toHaveLength(1)
  conversation = String(messages.docs[0].conversation)
  message = messages.docs[0].id
  attachmentId = (messages.docs[0].data as MailData).attachments[0]
  expect((await store.get(store.options.slugs.conversations, conversation)).unread).toBe(true)
})
it('enforces cross-mailbox reads and protected downloads, including hidden bytes', async () => {
  for (const req of [other, nonstaff, anonymous]) {
    await expect(store.get(store.options.slugs.messages, message, req)).rejects.toThrow()
    await expect(downloadAttachment(store, req, attachmentId)).rejects.toThrow()
  }
  const metadata = await store.get(store.options.slugs.attachments, attachmentId, agent)
  expect(metadata.bytes).toBeUndefined()
  const response = await downloadAttachment(store, agent, attachmentId)
  expect(await response.text()).toBe('پیوست')
  expect(response.headers.get('content-disposition')).toContain('attachment;')
})
it('saves drafts, forbids From spoofing/CRLF/cross-mailbox IDs', async () => {
  await expect(
    saveDraft(store, agent, { ...draft(), from: 'spoof@example.net' }, 'abcdefghijklmnop'),
  ).rejects.toThrow('denied')
  await expect(
    saveDraft(store, agent, { ...draft(), subject: 'x\r\nBcc: evil' }, 'abcdefghijklmnop'),
  ).rejects.toThrow('invalid')
  await expect(
    saveDraft(store, other, { ...draft(), conversation }, 'abcdefghijklmnop'),
  ).rejects.toThrow('denied')
  const a = await saveDraft(store, agent, { ...draft(), conversation }, 'durable-draft-key-01')
  const b = await saveDraft(store, agent, { ...draft(), conversation }, 'durable-draft-key-01')
  expect(a.id).toBe(b.id)
  expect(a.state).toBe('draft')
})
it('keeps notes out of every send path', async () => {
  const note = await saveDraft(
    store,
    agent,
    { ...draft(), conversation, kind: 'note', text: 'Private internal note' },
    'internal-note-key-01',
  )
  expect((note.data as MailData).to).toEqual([])
  await expect(queueDraft(store, agent, note.id)).rejects.toThrow('invalid')
})
it('sends exactly one application submission for concurrent clicks/workers and keeps Bcc private', async () => {
  const d = await saveDraft(
    store,
    agent,
    {
      ...draft(),
      conversation,
      attachments: [attachmentId],
      replyToMessage: message,
      action: 'reply',
    },
    'send-concurrency-key-01',
  )
  await Promise.allSettled(Array.from({ length: 8 }, () => queueDraft(store, agent, d.id)))
  await Promise.all([
    processMail(payload, options),
    processMail(payload, options),
    processMail(payload, options),
  ])
  expect(captured).toHaveLength(1)
  expect(captured[0].toString()).not.toMatch(/^Bcc:/im)
  const { simpleParser } = await import('mailparser')
  const mime = await simpleParser(captured[0])
  expect(mime.text).toContain('سلام reply')
  expect(mime.inReplyTo).toBe('<incoming-1@example.net>')
  expect(mime.attachments[0].content.toString()).toBe('پیوست')
  expect((await store.get(store.options.slugs.messages, d.id)).state).toBe('provider-accepted')
})
it('links legitimate replies and isolates forged headers and new participants', async () => {
  const sent = (
    await store.find(store.options.slugs.messages, { state: { equals: 'provider-accepted' } }, 1)
  ).docs[0]
  const mid = (sent.data as MailData).messageId
  await incoming(2, { in_reply_to: `<${mid}>` })
  await processMail(payload, options)
  expect(
    (
      await store.find(
        store.options.slugs.messages,
        { dedupKey: { equals: 'postal:support:incoming:2' } },
        1,
      )
    ).docs[0].conversation,
  ).toBe(conversation)
  await incoming(3, { from: 'attacker@example.net', in_reply_to: `<${mid}>` })
  await processMail(payload, options)
  expect(
    (
      await store.find(
        store.options.slugs.messages,
        { dedupKey: { equals: 'postal:support:incoming:3' } },
        1,
      )
    ).docs[0].conversation,
  ).not.toBe(conversation)
  await incoming(4, { cc: 'stranger@example.net', in_reply_to: `<${mid}>` })
  await processMail(payload, options)
  expect(
    (
      await store.find(
        store.options.slugs.messages,
        { dedupKey: { equals: 'postal:support:incoming:4' } },
        1,
      )
    ).docs[0].conversation,
  ).not.toBe(conversation)
})
it('makes timeout acceptance ambiguous and never automatically resends it', async () => {
  result = { state: 'ambiguous', code: 'postal-network' }
  const d = await saveDraft(store, agent, { ...draft(), conversation }, 'ambiguous-draft-key-01')
  await queueDraft(store, agent, d.id)
  await processMail(payload, options)
  expect((await store.get(store.options.slugs.messages, d.id)).state).toBe('ambiguous')
  const count = captured.length
  await processMail(payload, options)
  await queueDraft(store, agent, d.id)
  await processMail(payload, options)
  expect(captured).toHaveLength(count)
})
it('recovers expired submitting leases as unknown without sending', async () => {
  const d = await saveDraft(store, agent, { ...draft(), conversation }, 'restart-crash-key-01')
  await store.cas(store.options.slugs.messages, d, {
    state: 'submitting',
    leaseUntil: Date.now() - 1000,
  })
  const count = captured.length
  await processMail(payload, options)
  expect((await store.get(store.options.slugs.messages, d.id)).state).toBe('ambiguous')
  expect(captured).toHaveLength(count)
})
it('returns redacted endpoint errors and rejects session CSRF', async () => {
  const endpoint = mailEndpoints(store.options).find((e) => e.path === '/mail/send/:id')!
  const req = await request(
    { id: 1, collection: 'users', role: 'agent', mailbox: 'support' },
    undefined,
    new Headers({ origin: 'https://evil.invalid' }),
    { id: String(message) },
  )
  const response = await endpoint.handler(req)
  expect(response.status).toBe(403)
  expect(await response.text()).not.toContain('customer@example.net')
})

it('persists out-of-order events, deduplicates replays and preserves bounce over stale delay', async () => {
  const sendEvent = async (event: string, timestamp: number, uuid: string) => {
    const body = JSON.stringify({
      event,
      timestamp,
      uuid,
      payload:
        event === 'MessageBounced'
          ? { original_message: { id: 100, direction: 'outgoing' } }
          : { message: { id: 100, direction: 'outgoing' } },
    })
    return acceptReceipt(
      store,
      await request(
        null,
        body,
        new Headers({
          'X-Postal-Signature-256': sign('sha256', Buffer.from(body), keys.privateKey).toString(
            'base64',
          ),
        }),
      ),
      'postal',
      'event',
    )
  }
  const sent = (
    await store.find(store.options.slugs.messages, { state: { equals: 'provider-accepted' } }, 1)
  ).docs[0]
  await sendEvent('MessageDelayed', 100, 'event-delay-00001')
  await processMail(payload, options)
  expect((await store.get(store.options.slugs.messages, sent.id)).state).toBe('delayed')
  await sendEvent('MessageBounced', 200, 'event-bounce-00001')
  await sendEvent('MessageBounced', 200, 'event-bounce-00001')
  await processMail(payload, options)
  await sendEvent('MessageDelayed', 50, 'event-stale-00001')
  await processMail(payload, options)
  expect((await store.get(store.options.slugs.messages, sent.id)).state).toBe('bounced')
  expect(
    (
      await store.find(
        store.options.slugs.work,
        { key: { equals: 'postal:events:event:event-bounce-00001' } },
        10,
      )
    ).docs,
  ).toHaveLength(1)
})
it('retries definitely rejected transient work with bounded attempts and exposes definite failure retry', async () => {
  result = { state: 'failed', code: 'temporary-rejection', retryable: true }
  const d = await saveDraft(store, agent, { ...draft(), conversation }, 'definite-retry-key-01')
  await queueDraft(store, agent, d.id)
  for (let attempt = 1; attempt <= 4; attempt++) {
    await processMail(payload, options)
    const row = await store.get(store.options.slugs.messages, d.id)
    expect(row.attempts).toBe(attempt)
    expect(row.state).toBe(attempt < 4 ? 'queued' : 'failed')
    if (attempt < 4) await store.cas(store.options.slugs.messages, row, { nextAttempt: 0 })
  }
  await queueDraft(store, agent, d.id)
  expect((await store.get(store.options.slugs.messages, d.id)).state).toBe('queued')
  result = { state: 'failed', code: 'definite-rejection' }
  await processMail(payload, options)
  expect((await store.get(store.options.slugs.messages, d.id)).state).toBe('failed')
})
it('recovers a crashed receipt lease without duplicating message or attachment', async () => {
  await incoming(9)
  const work = (
    await store.find(store.options.slugs.work, { key: { equals: 'postal:support:incoming:9' } }, 1)
  ).docs[0]
  await store.cas(store.options.slugs.work, work as import('../src/server/store.js').Row, {
    state: 'processing',
    leaseUntil: Date.now() - 1,
  })
  await processMail(payload, options)
  await processMail(payload, options)
  expect(
    (
      await store.find(
        store.options.slugs.messages,
        { dedupKey: { equals: 'postal:support:incoming:9' } },
        10,
      )
    ).docs,
  ).toHaveLength(1)
})
it('rejects authenticated provider input for unconfigured envelope recipient', async () => {
  await expect(
    incoming(10, { rcpt_to: 'stranger@example.com', mailbox: 'support' }),
  ).rejects.toThrow('denied')
})

it('rehearses a consistent SQLite backup/restore with private bytes and unknown states intact', async () => {
  const backup = join(dir, 'restored.db')
  const db = payload.db as unknown as SQLiteAdapter
  await db.client.execute({ sql: 'VACUUM INTO ?', args: [backup] })
  const restored = await getPayload({
    key: 'mail-restore-rehearsal',
    config: await buildConfig({
      secret: 'synthetic-test-secret-at-least-32-characters',
      admin: { user: 'users', disable: true },
      db: sqliteAdapter({
        client: { url: `file:${backup}` },
        push: false,
        transactionOptions: {},
        busyTimeout: 5000,
        wal: true,
      }),
      collections: [
        {
          slug: 'users',
          auth: true,
          fields: [
            { name: 'role', type: 'text' },
            { name: 'mailbox', type: 'text' },
          ],
        },
      ],
      plugins: [payloadMail(options)],
      typescript: { autoGenerate: false },
    }),
  })
  try {
    const original = await payload.count({
      collection: store.options.slugs.messages,
      overrideAccess: true,
    })
    expect(
      (await restored.count({ collection: store.options.slugs.messages, overrideAccess: true }))
        .totalDocs,
    ).toBe(original.totalDocs)
    const bytes = await restored.findByID({
      collection: store.options.slugs.attachments,
      id: attachmentId,
      overrideAccess: true,
      showHiddenFields: true,
    })
    expect(Buffer.from(String(bytes.bytes), 'base64').toString()).toBe('پیوست')
    const before = captured.length
    await processMail(restored, options)
    expect(captured).toHaveLength(before)
    expect(
      (
        await restored.count({
          collection: store.options.slugs.messages,
          where: { state: { equals: 'ambiguous' } },
          overrideAccess: true,
        })
      ).totalDocs,
    ).toBeGreaterThanOrEqual(2)
  } finally {
    await restored.destroy()
  }
})

it('applies bounded transactional retention only to old closed non-pending correspondence', async () => {
  const c = await store.create(store.options.slugs.conversations, {
    mailbox: 'support',
    threadKey: 'retention-closed',
    subject: 'Synthetic retention',
    sender: 'customer@example.net',
    participants: [],
    unread: false,
    status: 'closed',
  })
  const m = await store.create(store.options.slugs.messages, {
    mailbox: 'support',
    conversation: String(c.id),
    dedupKey: 'retention-message',
    provider: 'postal',
    kind: 'incoming',
    state: 'delivered-to-recipient-server',
    messageId: 'retention@example.net',
    data: { ...draft(), messageId: 'retention@example.net', references: [], participants: [] },
  })
  const db = payload.db as unknown as SQLiteAdapter
  await db.client.execute({
    sql: 'UPDATE mail_conversations SET updated_at = ? WHERE id = ?',
    args: [new Date(Date.now() - 3 * 86400000).toISOString(), c.id],
  })
  const config = { ...options, limits: { retentionDays: 1 } }
  expect((await pruneMail(payload, config)).candidates).toBe(1)
  expect((await pruneMail(payload, config, false)).deleted).toBe(1)
  await expect(store.get(store.options.slugs.messages, m.id)).rejects.toThrow('notFound')
  expect((await store.get(store.options.slugs.attachments, attachmentId)).id).toBe(attachmentId)
  const pending = await saveDraft(store, agent, draft(), 'retention-pending-key-01')
  await db.client.execute({
    sql: "UPDATE mail_conversations SET status = 'closed', updated_at = ? WHERE id = ?",
    args: [new Date(Date.now() - 3 * 86400000).toISOString(), String(pending.conversation)],
  })
  expect((await pruneMail(payload, config, false)).deleted).toBe(0)
  expect((await store.get(store.options.slugs.messages, pending.id)).state).toBe('draft')
})
