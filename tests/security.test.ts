import { describe, it, expect } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import { postalProvider, parsePostalIncoming, parsePostalEvent } from '../src/providers/postal.js'
import {
  address,
  addresses,
  messageId,
  references,
  attachment,
  boundedBody,
} from '../src/server/validation.js'
import { defaultLimits } from '../src/config.js'
import { sanitizeMessage, isolatedHtml } from '../src/server/sanitize.js'
import { nextDelivery } from '../src/server/worker.js'

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString()
const postal = postalProvider({ key: 'test', publicKeys: () => [publicKey] })
const input = {
  id: 1,
  rcpt_to: 'support@example.com',
  mail_from: 'customer@example.net',
  from: '"نام، Family" <customer@example.net>',
  to: 'support@example.com',
  subject: 'سلام Hello',
  plain_body: 'متن فارسی',
  message_id: '<one@example.net>',
  attachments: [],
}
function headers(body: Buffer) {
  return new Headers({
    'X-Postal-Signature-256': sign('sha256', body, keys.privateKey).toString('base64'),
  })
}

describe('Postal authenticity and bounded parsing', () => {
  it('authenticates exact bytes with pinned RSA-SHA256 keys', async () => {
    const b = Buffer.from(JSON.stringify(input))
    expect((await postal.receive!(b, headers(b), 'incoming')).recipient).toBe('support@example.com')
  })
  it('rejects tampering and missing signatures', async () => {
    const b = Buffer.from(JSON.stringify(input))
    await expect(
      postal.receive!(Buffer.concat([b, Buffer.from(' ')]), headers(b), 'incoming'),
    ).rejects.toThrow('denied')
    await expect(postal.receive!(b, new Headers(), 'incoming')).rejects.toThrow('denied')
  })
  it('supports trusted rotation and does not use callback key URLs', async () => {
    const b = Buffer.from(JSON.stringify(input))
    const h = headers(b)
    h.set('x-postal-signature-kid', 'https://evil.invalid/key')
    expect((await postal.receive!(b, h, 'incoming')).key).toBe('incoming:1')
  })
  it('rejects malformed IDs and envelopes', async () => {
    const b = Buffer.from(JSON.stringify({ ...input, id: -1 }))
    await expect(postal.receive!(b, headers(b), 'incoming')).rejects.toThrow('invalid')
  })
  it('preserves Persian and quoted display-name addresses', async () => {
    const m = await parsePostalIncoming(input, defaultLimits)
    expect(m.subject).toBe('سلام Hello')
    expect(m.from).toBe('customer@example.net')
    expect(m.text).toBe('متن فارسی')
  })
  it('uses only validated single Message-IDs and bounded References', () => {
    expect(messageId('<abc@EXAMPLE.NET>')).toBe('abc@example.net')
    expect(messageId('<one@x> <two@y>')).toBeUndefined()
    expect(messageId('bad\r\n@x')).toBeUndefined()
    expect(references('<one@X> broken <two@y>')).toEqual(['one@x', 'two@y'])
  })
  it('rejects CRLF and preserves local-part case', () => {
    expect(address('User@EXAMPLE.COM')).toBe('User@example.com')
    expect(() => addresses('a@example.com\r\nBcc: x@y.com')).toThrow()
    expect(addresses('"Last, First" <a@example.com>')).toEqual(['a@example.com'])
  })
  it('rejects oversized, unsafe, invalid-base64 attachments', () => {
    expect(() =>
      attachment({ filename: '../evil', contentType: 'text/plain', data: 'eA==' }, defaultLimits),
    ).toThrow()
    expect(() =>
      attachment({ filename: 'a', contentType: 'text/plain', data: '!' }, defaultLimits),
    ).toThrow()
    expect(() =>
      attachment(
        { filename: 'a', contentType: 'text/plain', data: 'eHh4' },
        { ...defaultLimits, attachmentBytes: 1 },
      ),
    ).toThrow()
  })
  it('enforces streaming/decompression limits', async () => {
    await expect(
      boundedBody(new Request('https://example.com', { method: 'POST', body: '123456' }), 3),
    ).rejects.toThrow('limit')
    await expect(
      boundedBody(
        new Request('https://example.com', {
          method: 'POST',
          headers: { 'content-encoding': 'gzip' },
          body: 'x',
        }),
        30,
      ),
    ).rejects.toThrow('invalid')
  })
  it('validates actual event wrapper and outgoing direction', () => {
    expect(
      parsePostalEvent({
        event: 'MessageBounced',
        timestamp: 123,
        payload: { original_message: { id: 2, direction: 'outgoing' } },
      })[0].state,
    ).toBe('bounced')
    expect(() =>
      parsePostalEvent({
        event: 'MessageSent',
        timestamp: 123,
        payload: { message: { id: 2, direction: 'incoming' } },
      }),
    ).toThrow()
  })
})

describe('malicious HTML and delivery semantics', () => {
  it('removes scripts, forms, handlers, active URLs, embeds and remote tracking', () => {
    const out = sanitizeMessage(
      '<script>alert(1)</script><form><input></form><img src="https://tracker.invalid/p"><a href="javascript:evil()" onclick="evil()">x</a><iframe src="https://evil.invalid"></iframe><p style="background:url(https://tracker.invalid)">سلام</p>',
    )
    expect(out).not.toMatch(/script|form|input|img|iframe|onclick|javascript|style|tracker/)
    expect(out).toContain('سلام')
  })
  it('restricts optional remote images and generates a deny-all CSP', () => {
    expect(isolatedHtml('<img src="https://example.net/p">')).toContain("img-src 'none'")
    expect(
      sanitizeMessage('<img src="https://example.net/p"><img src="data:image/svg+xml,evil">', true),
    ).toContain('https://example.net/p')
    expect(sanitizeMessage('<img src="data:image/svg+xml,evil">', true)).not.toContain('data:')
  })
  it('cannot overwrite terminal failure with older success/delay', () => {
    const old = { state: 'failed' as const, timestamp: 200 }
    expect(nextDelivery(old, { providerId: '1', state: 'delayed', timestamp: 300 })).toEqual(old)
    expect(
      nextDelivery(old, {
        providerId: '1',
        state: 'delivered-to-recipient-server',
        timestamp: 100,
      }),
    ).toEqual(old)
    expect(nextDelivery(old, { providerId: '1', state: 'bounced', timestamp: 150 }).state).toBe(
      'bounced',
    )
  })
})
