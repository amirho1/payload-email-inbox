import { domainToASCII } from 'node:url'
import addressParser from 'nodemailer/lib/addressparser/index.js'
import { z } from 'zod'
import type { AttachmentInput, Limits } from '../types.js'
import { MailError } from './errors.js'

/** Preserve local-part case and normalize only the domain. */
export function address(value: string): string {
  if (/[\r\n\x00]/.test(value) || value.length > 320) throw new MailError('invalid')
  const at = value.lastIndexOf('@')
  const local = value.slice(0, at)
  const domain = domainToASCII(value.slice(at + 1)).toLowerCase()
  if (
    at < 1 ||
    !domain ||
    !/^[^\s<>(),;:"\\]+$/.test(local) ||
    !/^[a-z0-9.-]+$/.test(domain) ||
    !domain.includes('.')
  )
    throw new MailError('invalid')
  return `${local}@${domain}`
}

/** Parse quoted display names using Nodemailer's maintained RFC address parser. */
export function addresses(value: string | string[] | null | undefined): string[] {
  const text = Array.isArray(value) ? value.join(', ') : (value ?? '')
  if (/[\r\n\x00]/.test(text) || text.length > 8192) throw new MailError('invalid')
  const parsed = addressParser(text, { flatten: true })
  return [...new Set(parsed.map((p) => address(p.address ?? '')))]
}

/** Preserve a bounded Unicode display name from the processed Postal header format. */
export function senderName(value: string): string | undefined {
  addresses(value)
  return addressParser(value, { flatten: true })[0]?.name?.slice(0, 256) || undefined
}

/** Accept a single conservative Message-ID; malformed headers do not thread. */
export function messageId(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 998) return
  const s = value.trim().replace(/^<([^<>]+)>$/, '$1')
  if (!/^[^\s<>@\x00-\x1f]+@[^\s<>@\x00-\x1f]+$/.test(s)) return
  const at = s.lastIndexOf('@')
  return `${s.slice(0, at)}@${s.slice(at + 1).toLowerCase()}`
}

export function references(value: unknown): string[] {
  if (typeof value !== 'string' || value.length > 8192) return []
  return [
    ...new Set((value.match(/<[^<>]+>/g) ?? []).map(messageId).filter((id): id is string => !!id)),
  ].slice(-30)
}

/** Decode bounded base64 once and reject paths/active file names. Download always uses attachment. */
export function attachment(
  input: AttachmentInput,
  limits: Limits,
): { bytes: Buffer; filename: string } {
  if (
    !input.filename ||
    input.filename.length > 180 ||
    /[\/\\\x00-\x1f\x7f]/.test(input.filename) ||
    input.filename === '.' ||
    input.filename === '..'
  )
    throw new MailError('invalid')
  const encoded = input.data.replace(/\s/g, '')
  if (
    encoded.length > Math.ceil(limits.attachmentBytes / 3) * 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)
  )
    throw new MailError('limit', 413)
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.length > limits.attachmentBytes) throw new MailError('limit', 413)
  return { bytes, filename: input.filename.normalize('NFC') }
}

export const draftSchema = z
  .object({
    mailbox: z.string().max(48),
    conversation: z.union([z.string().max(100), z.number()]).optional(),
    kind: z.enum(['outgoing', 'note']).default('outgoing'),
    from: z.string().max(320),
    to: z.array(z.string().max(320)).max(100),
    cc: z.array(z.string().max(320)).max(100).default([]),
    bcc: z.array(z.string().max(320)).max(100).default([]),
    subject: z
      .string()
      .max(998)
      .refine((s) => !/[\r\n\x00]/.test(s)),
    text: z.string().max(256 * 1024),
    html: z
      .string()
      .max(256 * 1024)
      .optional(),
    replyToMessage: z.union([z.string().max(100), z.number()]).optional(),
    attachments: z
      .array(z.union([z.string().max(100), z.number()]))
      .max(20)
      .default([]),
    action: z.enum(['compose', 'reply', 'replyAll', 'forward']).default('compose'),
  })
  .strict()

/** Read exact bytes with a streaming limit; never call unbounded req.json(). */
export async function boundedBody(
  req: { headers: Headers; body?: ReadableStream<Uint8Array> | null },
  max: number,
): Promise<Uint8Array> {
  if (req.headers.get('content-encoding') && req.headers.get('content-encoding') !== 'identity')
    throw new MailError('invalid', 415)
  const length = Number(req.headers.get('content-length') ?? 0)
  if (length > max) throw new MailError('limit', 413)
  if (!req.body) throw new MailError('invalid')
  const reader = req.body.getReader()
  const parts: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > max) {
        await reader.cancel()
        throw new MailError('limit', 413)
      }
      parts.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(parts)
}
