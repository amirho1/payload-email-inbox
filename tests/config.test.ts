import { it, expect } from 'vitest'
import type { Config } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
const base = { secret: 'synthetic', db: sqliteAdapter({ client: { url: 'file:unused.db' } }) }
import { payloadMail } from '../src/index.js'
import type { MailOptions } from '../src/types.js'
const options: MailOptions = {
  atomic: { compareAndSwap: async () => false },
  origins: ['https://example.com'],
  mailboxes: [],
}
it('disabled mode returns the exact config and validates nothing', () => {
  const config = {} as Config
  expect(payloadMail({ ...options, enabled: false, slugs: { messages: 'bad!' } })(config)).toBe(
    config,
  )
})
it('preserves host email, collections, endpoints, hooks, jobs and localization', async () => {
  const config = {
    ...base,
    collections: [{ slug: 'users', fields: [] }],
    endpoints: [
      { path: '/health', method: 'get', handler: async () => Response.json({ ok: true }) },
    ],
    email: () => ({
      name: 'host',
      defaultFromAddress: 'a@example.com',
      defaultFromName: 'Host',
      sendEmail: async () => undefined,
    }),
    jobs: { tasks: [] },
    localization: { locales: ['en'], defaultLocale: 'en' },
    hooks: { afterError: [] },
  } satisfies Config
  const out = await payloadMail(options)(config)
  expect(out.email).toBe(config.email)
  expect(out.jobs).toBe(config.jobs)
  expect(out.hooks).toBe(config.hooks)
  expect(out.localization).toBe(config.localization)
  expect(out.collections?.[0]).toBe(config.collections[0])
  expect(out.endpoints?.[0]).toBe(config.endpoints[0])
  expect(out.i18n?.supportedLanguages).toHaveProperty('fa')
})
it('rejects slug, endpoint, and admin conflicts clearly', () => {
  expect(() =>
    payloadMail({ ...options, slugs: { messages: 'users' } })({
      ...base,
      collections: [{ slug: 'users', fields: [] }],
    }),
  ).toThrow('collection-conflict')
  expect(() =>
    payloadMail(options)({
      ...base,
      endpoints: [{ path: '/mail/inbox', method: 'get', handler: async () => Response.json({}) }],
    }),
  ).toThrow('endpoint-conflict')
  expect(() => payloadMail({ ...options, slugs: { messages: 'mailboxes' } })({ ...base })).toThrow(
    'slug-conflict',
  )
})
