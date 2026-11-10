import nodemailer from 'nodemailer'
import type { Payload } from 'payload'
import type { MailData } from '../types.js'

/** Build safe Nodemailer options; file and URL access stay disabled. */
export async function mailOptions(
  message: MailData,
  payload: Payload,
  box: { replyTo?: string; name?: string },
) {
  void payload
  return {
    from: { address: message.from, name: box.name ?? '' },
    to: message.to,
    cc: message.cc,
    bcc: message.bcc,
    replyTo: box.replyTo || message.from,
    subject: message.subject,
    text: message.text,
    html: message.html,
    messageId: `<${message.messageId}>`,
    inReplyTo: message.inReplyTo ? `<${message.inReplyTo}>` : undefined,
    references: message.references.map((id) => `<${id}>`),
    headers: { 'Auto-Submitted': 'no', 'X-Auto-Response-Suppress': 'All' },
    attachments: (message.files ?? []).map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: Buffer.from(a.data, 'base64'),
    })),
    disableFileAccess: true,
    disableUrlAccess: true,
  }
}

/** Nodemailer encodes Unicode/multipart/reply headers and omits Bcc from visible MIME. */
export async function composeMime(
  message: MailData,
  payload: Payload,
  box: { replyTo?: string; name?: string },
): Promise<Buffer> {
  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'windows',
    disableFileAccess: true,
    disableUrlAccess: true,
  })
  const result = await transport.sendMail(await mailOptions(message, payload, box))
  if (!Buffer.isBuffer(result.message)) throw new Error('mail:mime')
  // Stream transport deliberately keeps Bcc. Remove only that folded header; preserve binary MIME.
  const boundary = result.message.indexOf('\r\n\r\n')
  if (boundary < 0) throw new Error('mail:mime')
  const kept: string[] = []
  let blind = false
  for (const line of result.message.subarray(0, boundary).toString('latin1').split('\r\n')) {
    if (!/^[ \t]/.test(line)) blind = /^bcc:/i.test(line)
    if (!blind) kept.push(line)
  }
  return Buffer.concat([
    Buffer.from(kept.join('\r\n'), 'latin1'),
    result.message.subarray(boundary),
  ])
}
