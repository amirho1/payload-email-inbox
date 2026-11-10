import { getPayload, buildConfig, createLocalReq } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateKeyPairSync, sign } from 'node:crypto'
const enabled = process.argv[2] === 'enabled'
const dir = await mkdtemp(join(tmpdir(), 'payload-mail-measure-'))
let options, plugin
if (enabled) {
  const { payloadMail } = await import('../dist/index.js')
  const { sqliteAtomicStore } = await import('../dist/server/sqlite.js')
  const { postalProvider } = await import('../dist/providers/postal.js')
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
  options = {
    atomic: sqliteAtomicStore(),
    origins: ['https://example.com'],
    isStaff: (req) => req.user?.role === 'agent',
    mailboxes: [
      { key: 'support', address: 'support@example.com', name: 'Support', provider: 'postal' },
    ],
    providers: [
      postalProvider({
        key: 'postal',
        publicKeys: () => [keys.publicKey.export({ type: 'spki', format: 'pem' }).toString()],
      }),
    ],
  }
  options.testPrivateKey = keys.privateKey
  plugin = payloadMail(options)
}
const payload = await getPayload({
  config: await buildConfig({
    secret: 'synthetic-measurement-secret-32-characters',
    admin: { disable: true, user: 'users' },
    db: sqliteAdapter({
      client: { url: `file:${join(dir, 'measure.db')}` },
      push: true,
      wal: true,
      busyTimeout: 5000,
      transactionOptions: {},
    }),
    collections: [{ slug: 'users', auth: true, fields: [{ name: 'role', type: 'text' }] }],
    plugins: plugin ? [plugin] : [],
    typescript: { autoGenerate: false },
    email: () => ({
      name: 'no-network',
      defaultFromAddress: 'support@example.com',
      defaultFromName: 'Example',
      sendEmail: async () => {
        throw new Error('disabled')
      },
    }),
  }),
})
global.gc?.()
const result = {
  mode: enabled ? 'enabled' : 'baseline',
  idleRssBytes: process.memoryUsage().rss,
  node: process.version,
}
if (enabled) {
  const { MailStore, resolveOptions, acceptReceipt, processMail } = await import(
    '../dist/server/index.js'
  )
  const { mailEndpoints } = await import('../dist/server/endpoints.js')
  const store = new MailStore(payload, resolveOptions(options))
  for (let i = 0; i < 1000; i++)
    await store.create(store.options.slugs.conversations, {
      mailbox: 'support',
      threadKey: `perf-${i}`,
      subject: `Synthetic conversation ${i}`,
      sender: `sender-${i}@example.net`,
      participants: ['support@example.com'],
      status: 'open',
      unread: true,
    })
  const req = await createLocalReq({ user: { id: 1, collection: 'users', role: 'agent' } }, payload)
  Object.defineProperty(req, 'url', {
    value: 'https://example.com/api/mail/inbox',
    configurable: true,
  })
  const endpoint = mailEndpoints(store.options).find((e) => e.path === '/mail/inbox')
  const samples = []
  let queries = 0
  {
    const original = payload.db.client.execute.bind(payload.db.client)
    payload.db.client.execute = async (...args) => {
      queries++
      return original(...args)
    }
  }
  for (let i = 0; i < 10; i++)
    await Promise.all(
      Array.from({ length: 5 }, async () => {
        const start = performance.now()
        const response = await endpoint.handler(req)
        if (response.status !== 200) throw new Error('inbox failed')
        const data = await response.json()
        if (data.docs.length !== 25) throw new Error('pagination failed')
        samples.push(performance.now() - start)
      }),
    )
  samples.sort((a, b) => a - b)
  Object.assign(result, {
    datasetConversations: 1000,
    concurrency: 5,
    inboxSamples: 50,
    inboxP95ms: samples[Math.ceil(samples.length * 0.95) - 1],
    sqlStatementsPerInbox: queries / 50,
  })
  const ack = []
  for (let i = 0; i < 20; i++)
    await Promise.all(
      Array.from({ length: 5 }, async (_, n) => {
        const id = i * 5 + n + 1
        const body = JSON.stringify({
          id,
          rcpt_to: 'support@example.com',
          mail_from: 'customer@example.net',
          from: 'customer@example.net',
          to: 'support@example.com',
          subject: 'Synthetic burst',
          plain_body: 'Synthetic only',
          message_id: `<burst-${id}@example.net>`,
        })
        const receipt = await createLocalReq({}, payload)
        receipt.headers = new Headers({
          'x-postal-signature-256': sign(
            'sha256',
            Buffer.from(body),
            options.testPrivateKey,
          ).toString('base64'),
        })
        Object.defineProperty(receipt, 'body', {
          value: new Request('https://example.com', { method: 'POST', body }).body,
          configurable: true,
        })
        const start = performance.now()
        const response = await acceptReceipt(store, receipt, 'postal', 'incoming')
        if (response.status !== 200) throw new Error('burst failed')
        ack.push(performance.now() - start)
      }),
    )
  const start = performance.now()
  await processMail(payload, options, 100)
  Object.assign(result, {
    burstReceipts: 100,
    burstMaxAckMs: Math.max(...ack),
    burstProcessingMs: performance.now() - start,
    normalizedMessages: (
      await payload.count({ collection: store.options.slugs.messages, overrideAccess: true })
    ).totalDocs,
  })
}
await payload.destroy()
await rm(dir, { recursive: true, force: true })
await writeFile(
  join(process.cwd(), '.private', `measure-${enabled ? 'enabled' : 'baseline'}.json`),
  JSON.stringify(result, null, 2),
)
console.log(JSON.stringify(result))
