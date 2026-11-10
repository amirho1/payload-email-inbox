import { createHash, randomUUID } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import type { AttachmentInput, MailID } from '../types.js'
import { attachment } from './validation.js'
import { authorize } from './permissions.js'
import { MailStore } from './store.js'

/** Bytes live once in private database storage, never under a public static directory. */
export async function saveAttachment(
  store: MailStore,
  mailbox: string,
  input: AttachmentInput,
  stableKey: string = randomUUID(),
): Promise<MailID> {
  const { bytes, filename } = attachment(input, store.options.limits)
  if (store.options.scanAttachment) await store.options.scanAttachment(input)
  const row = await store.unique(
    store.options.slugs.attachments,
    'key',
    createHash('sha256').update(`${mailbox}:${stableKey}`).digest('hex'),
    {
      mailbox,
      filename,
      size: bytes.length,
      contentType: /^[\w.+-]+\/[\w.+-]+$/.test(input.contentType)
        ? input.contentType
        : 'application/octet-stream',
      bytes: bytes.toString('base64'),
    },
  )
  return row.id
}

export async function downloadAttachment(
  store: MailStore,
  req: PayloadRequest,
  id: MailID,
): Promise<Response> {
  const metadata = await store.get(store.options.slugs.attachments, id, req)
  await authorize(req, store.options, String(metadata.mailbox))
  const row = await store.payload.findByID({
    collection: store.options.slugs.attachments,
    id,
    overrideAccess: true,
    showHiddenFields: true,
    depth: 0,
  })
  const filename = encodeURIComponent(String(row.filename)).replaceAll("'", '%27')
  return new Response(Buffer.from(String(row.bytes), 'base64'), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="attachment"; filename*=UTF-8''${filename}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}
