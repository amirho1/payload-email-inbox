import { afterEach, expect, it, vi } from 'vitest'
import { postalProvider } from '../src/providers/postal.js'
import { redactPostalDiagnostic } from '../src/providers/postal-inspect.js'
import type { MailRecord } from '../src/types.js'

const box = { key: 'support', address: 'support@example.com', name: 'Support', provider: 'postal' }
const options = {
  key: 'postal',
  publicKeys: () => [],
  apiURL: () => 'https://postal.example.com/api/v1',
  apiKey: () => 'synthetic-private-key',
}
const message: MailRecord = {
  id: 7,
  mailbox: 'support',
  kind: 'outgoing',
  state: 'provider-accepted',
  revision: 1,
  attempts: 1,
  createdAt: '2026-11-10T00:00:00.000Z',
  providerIds: ['41'],
  data: {
    from: box.address,
    to: ['customer@example.net'],
    cc: [],
    bcc: ['hidden@example.net'],
    subject: 'Synthetic inspect',
    text: 'Synthetic only',
    messageId: 'inspect@example.com',
    references: [],
    participants: [],
    attachments: [],
    activeProviderIds: ['41'],
  },
}
const detail = {
  id: 41,
  token: 'private-provider-token',
  status: { status: 'Sent', held: false },
  details: { direction: 'outgoing', rcpt_to: 'customer@example.net', size: 512 },
  inspection: { spam: false },
  headers: {
    from: [box.address],
    to: ['customer@example.net'],
    bcc: ['hidden@example.net'],
    'x-server-api-key': ['synthetic-private-key'],
    'message-id': ['<inspect@example.com>'],
  },
}
const response = (data: unknown) =>
  new Response(JSON.stringify({ status: 'success', data }), {
    status: 200,
    headers: { 'Content-Encoding': 'gzip' },
  })
afterEach(() => vi.restoreAllMocks())

it('inspects only the owned ID using the real read RPCs and excludes tokens/Bcc/arbitrary headers', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    String(url).endsWith('/message')
      ? response(detail)
      : response([
          {
            status: 'Sent',
            timestamp: 1794268800,
            sent_with_ssl: true,
            details: '250 2.0.0 Accepted customer@example.net',
            output: 'https://example.net/reset?token=private token=private password=private',
          },
        ]),
  )
  const inspected = await postalProvider(options).inspect!(message, box)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
    'https://postal.example.com/api/v1/messages/message',
    'https://postal.example.com/api/v1/messages/deliveries',
  ])
  for (const [, init] of fetcher.mock.calls) {
    expect(init?.redirect).toBe('error')
    expect(JSON.parse(String(init?.body)).id).toBe(41)
  }
  const projection = JSON.stringify(inspected)
  expect(projection).not.toMatch(
    /private-provider-token|hidden@example.net|synthetic-private-key|token=private|password=private|reset\?token/,
  )
  expect(inspected.messages[0].headers).toEqual({
    from: [box.address],
    to: ['customer@example.net'],
    'message-id': ['<inspect@example.com>'],
  })
  expect(inspected.messages[0].deliveries[0]).toMatchObject({
    tls: true,
    smtpCode: '250',
    summary: expect.stringContaining('[address]'),
  })
})

it('rejects absent, unsafe, internal-note and wrong-recipient provider IDs', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(detail))
  for (const data of [
    { ...message, kind: 'note' as const },
    { ...message, data: { ...message.data, activeProviderIds: ['41 OR 1=1'] } },
    { ...message, providerIds: [], data: { ...message.data, activeProviderIds: [] } },
  ])
    await expect(postalProvider(options).inspect!(data, box)).rejects.toThrow('invalid')
  expect(fetcher).not.toHaveBeenCalled()
  fetcher.mockImplementation(async (url) =>
    String(url).endsWith('/message')
      ? response({ ...detail, details: { ...detail.details, rcpt_to: 'unrelated@example.org' } })
      : response([]),
  )
  await expect(postalProvider(options).inspect!(message, box)).rejects.toThrow('unavailable')
})

it('inspects legacy incoming IDs only from the trusted mailbox/provider receipt namespace', async () => {
  const incoming = {
    ...message,
    kind: 'incoming' as const,
    providerIds: [],
    dedupKey: 'postal:support:incoming:41',
    data: { ...message.data, activeProviderIds: [] },
  }
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    String(url).endsWith('/message')
      ? response({
          ...detail,
          details: { ...detail.details, direction: 'incoming', rcpt_to: box.address },
        })
      : response([]),
  )
  expect((await postalProvider(options).inspect!(incoming, box)).messages[0].id).toBe('41')
  fetcher.mockClear()
  for (const dedupKey of [
    'postal:private:incoming:41',
    'other:support:incoming:41',
    'postal:support:incoming:41/unsafe',
  ])
    await expect(postalProvider(options).inspect!({ ...incoming, dedupKey }, box)).rejects.toThrow(
      'invalid',
    )
  expect(fetcher).not.toHaveBeenCalled()
})

it('bounds provider errors and responses without leaking fetch credentials or response bodies', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('secret-api-key with private mail body'))
  await expect(postalProvider(options).inspect!(message, box)).rejects.toThrow('unavailable')
  fetcher.mockResolvedValue(new Response('x'.repeat(512 * 1024 + 1)))
  await expect(postalProvider(options).inspect!(message, box)).rejects.toThrow('unavailable')
  fetcher.mockResolvedValue(
    new Response(
      JSON.stringify({ status: 'error', data: { code: 'InvalidServerAPIKey', token: 'private' } }),
    ),
  )
  await expect(postalProvider(options).inspect!(message, box)).rejects.toThrow('unavailable')
  expect(
    redactPostalDiagnostic(
      'password=hunter token=private https://example.net/reset customer@example.net',
    ),
  ).toBe('password=[redacted] token=[redacted] [link] [address]')
})
