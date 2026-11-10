import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { en } from '@payloadcms/translations/languages/en'
import { fa } from '@payloadcms/translations/languages/fa'
import { payloadMail, type MailOptions } from 'payload-plugin-mail'
import { sqliteAtomicStore } from 'payload-plugin-mail/sqlite'
import { postalProvider } from 'payload-plugin-mail/postal'
import { processMail, composeMime } from 'payload-plugin-mail/server'
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const fixture = process.env.MAIL_FIXTURE_DIR
if (!fixture)
  throw new Error(
    'Set MAIL_FIXTURE_DIR to an isolated example directory. Never use a production database.',
  )
const options: MailOptions = {
  atomic: sqliteAtomicStore(),
  origins: ['http://localhost:4100', 'http://127.0.0.1:4100'],
  timeZone: 'Asia/Tehran',
  mailboxes: [
    {
      key: 'support',
      address: 'support@example.com',
      name: 'Example support',
      provider: 'emulator',
      signature: 'Example team',
    },
    {
      key: 'private',
      address: 'private@example.com',
      name: 'Private example',
      provider: 'emulator',
    },
  ],
  isStaff: (req) => req.user?.role === 'agent',
  canAccessMailbox: (req, box) => req.user?.mailbox === box.key,
  providers: [
    {
      ...postalProvider({
        key: 'emulator',
        publicKeys: async () => [await readFile(join(fixture, 'public.pem'), 'utf8')],
      }),
      async submit(data, box, payload) {
        const mime = await composeMime(data, payload, box)
        // The emulator captures what a real provider receives, including envelope Bcc, in private files.
        const id = String(Date.now())
        await mkdir(join(fixture, 'captured'), { recursive: true })
        await writeFile(
          join(fixture, 'captured', `${id}-${randomUUID()}.json`),
          JSON.stringify({
            id,
            data: { ...data, files: undefined },
            mime: mime.toString('base64'),
          }),
          { mode: 0o600 },
        )
        if (data.subject.includes('[ambiguous]'))
          return { state: 'ambiguous', code: 'emulated-timeout' }
        if (data.subject.includes('[failed]'))
          return { state: 'failed', code: 'emulated-rejection' }
        return { state: 'provider-accepted', ids: [id] }
      },
    },
  ],
}

export default buildConfig({
  secret: 'example-only-synthetic-secret-32-characters',
  admin: { user: 'users', importMap: { baseDir: root } },
  db: sqliteAdapter({
    client: { url: `file:${join(fixture, 'example.db')}` },
    push: true,
    transactionOptions: {},
    busyTimeout: 5000,
    wal: true,
  }),
  collections: [
    {
      slug: 'users',
      auth: true,
      admin: { useAsTitle: 'email' },
      access: { create: () => false },
      fields: [
        { name: 'role', type: 'select', options: ['agent', 'customer'], required: true },
        { name: 'mailbox', type: 'text', required: true },
      ],
    },
  ],
  plugins: [payloadMail(options)],
  i18n: { fallbackLanguage: 'en', supportedLanguages: { en, fa } },
  typescript: { autoGenerate: false },
  email: () => ({
    name: 'example-no-network',
    defaultFromAddress: 'support@example.com',
    defaultFromName: 'Example',
    sendEmail: async () => {
      throw new Error('Use the local example provider')
    },
  }),
  endpoints: [
    {
      path: '/emulator/tick',
      method: 'post',
      handler: async (req) => {
        if (
          req.user?.role !== 'agent' ||
          !options.origins.includes(req.headers.get('origin') ?? '')
        )
          return Response.json({ error: 'denied' }, { status: 403 })
        return Response.json(await processMail(req.payload, options))
      },
    },
    {
      path: '/emulator/captured',
      method: 'get',
      handler: async (req) => {
        if (req.user?.role !== 'agent') return Response.json({ error: 'denied' }, { status: 403 })
        let names: string[] = []
        try {
          names = await readdir(join(fixture, 'captured'))
        } catch {}
        return Response.json(
          await Promise.all(
            names.map(async (n) =>
              JSON.parse(await readFile(join(fixture, 'captured', n), 'utf8')),
            ),
          ),
        )
      },
    },
  ],
  onInit: async (payload) => {
    for (const account of [
      { email: 'agent@example.com', role: 'agent', mailbox: 'support' },
      { email: 'other@example.com', role: 'agent', mailbox: 'private' },
      { email: 'customer@example.com', role: 'customer', mailbox: 'support' },
    ]) {
      const found = await payload.count({
        collection: 'users',
        where: { email: { equals: account.email } },
        overrideAccess: true,
      })
      if (!found.totalDocs)
        await payload.create({
          collection: 'users',
          data: { ...account, password: 'Synthetic-password-123!' },
          overrideAccess: true,
        })
    }
  },
})
