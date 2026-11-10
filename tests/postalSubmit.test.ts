import { afterEach, it, expect, vi } from 'vitest'
import type { Payload } from 'payload'
import { postalProvider, parsePostalIncoming, submitWithPayload } from '../src/providers/postal.js'
import { composeMime } from '../src/server/mime.js'
import { defaultLimits } from '../src/config.js'
import type { MailData } from '../src/types.js'

const box = {
  key: 'support',
  address: 'support@example.com',
  name: 'پشتیبانی Example',
  provider: 'postal',
}
const data: MailData = {
  from: box.address,
  to: ['customer@example.net'],
  cc: [],
  bcc: ['hidden@example.net'],
  subject: 'سلام multipart',
  text: 'متن فارسی',
  html: '<p>سلام</p>',
  messageId: 'test@example.com',
  inReplyTo: 'parent@example.net',
  references: ['parent@example.net'],
  participants: [box.address, 'customer@example.net'],
  attachments: [],
  files: [
    {
      filename: 'سلام.txt',
      contentType: 'text/plain',
      data: Buffer.from('پیوست').toString('base64'),
    },
  ],
}
const payload = {} as Payload
const provider = postalProvider({
  key: 'postal',
  publicKeys: () => [],
  apiURL: () => 'https://postal.example.com/api/v1',
  apiKey: () => 'synthetic-test-key',
})
afterEach(() => vi.restoreAllMocks())

it('submits concrete Postal raw MIME with private envelope recipients and verified acceptance IDs', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        status: 'success',
        data: {
          message_id: 'test@example.com',
          messages: { 'customer@example.net': { id: 1 }, 'hidden@example.net': { id: 2 } },
        },
      }),
      { status: 200 },
    ),
  )
  expect(await provider.submit!(data, box, payload)).toEqual({
    state: 'provider-accepted',
    ids: ['1', '2'],
  })
  const [url, options] = fetcher.mock.calls[0]
  expect(String(url)).toBe('https://postal.example.com/api/v1/send/raw')
  expect(options?.redirect).toBe('error')
  const body = JSON.parse(String(options?.body))
  expect(body.rcpt_to).toEqual(['customer@example.net', 'hidden@example.net'])
  expect(Buffer.from(body.data, 'base64').toString()).not.toMatch(/^bcc:/im)
})
it('classifies explicit rejection separately from timeout, malformed success and uncertain failure', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch')
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ status: 'parameter-error', data: {} }), { status: 400 }),
  )
  expect((await provider.submit!(data, box, payload)).state).toBe('failed')
  fetcher.mockRejectedValueOnce(new Error('synthetic network timeout'))
  expect((await provider.submit!(data, box, payload)).state).toBe('ambiguous')
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ status: 'success', data: { messages: {} } }), { status: 200 }),
  )
  expect((await provider.submit!(data, box, payload)).state).toBe('ambiguous')
  fetcher.mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
  expect((await provider.submit!(data, box, payload)).state).toBe('ambiguous')
})
it('round-trips incoming raw Unicode/multipart/MIME attachment and validated reply headers', async () => {
  const raw = await composeMime(data, payload, box)
  const parsed = await parsePostalIncoming(
    {
      id: 1,
      rcpt_to: box.address,
      mail_from: box.address,
      base64: true,
      message: raw.toString('base64'),
    },
    defaultLimits,
  )
  expect(parsed.fromName).toBe(box.name)
  expect(parsed.subject).toBe(data.subject)
  expect(parsed.text).toContain('متن فارسی')
  expect(parsed.html).toContain('سلام')
  expect(Buffer.from(parsed.attachments[0].data, 'base64').toString()).toBe('پیوست')
  expect(parsed.inReplyTo).toBe('parent@example.net')
  expect(parsed.bcc).toEqual([])
})
it('treats errors from the unchanged host email adapter as ambiguous', async () => {
  const fake = {
    config: { email: () => undefined },
    sendEmail: async () => {
      throw new Error('synthetic private provider error')
    },
  } as unknown as Payload
  expect(await submitWithPayload(data, box, fake)).toEqual({
    state: 'ambiguous',
    code: 'adapter-error',
  })
})

it('does not mistake Payload console-only mail for provider acceptance', async () => {
  const sendEmail = vi.fn()
  const fake = { config: {}, sendEmail } as unknown as Payload
  expect(await submitWithPayload(data, box, fake)).toEqual({
    state: 'failed',
    code: 'adapter-not-configured',
  })
  expect(sendEmail).not.toHaveBeenCalled()
})
