import type { MailOptions, ResolvedOptions } from './types.js'
import { address } from './server/validation.js'

export const defaultLimits = {
  payloadBytes: 12 * 1024 * 1024,
  attachmentBytes: 5 * 1024 * 1024,
  attachmentCount: 8,
  recipients: 20,
  textBytes: 256 * 1024,
  pageSize: 25,
  retentionDays: 365,
  receiptDays: 30,
  pollingMs: 30000,
  maxAttempts: 4,
  leaseMs: 60000,
}

/** Validate configuration without loading providers or performing network calls. */
export function resolveOptions(options: MailOptions): ResolvedOptions {
  const slugs = {
    mailboxes: 'mailboxes',
    conversations: 'mail-conversations',
    messages: 'mail-messages',
    attachments: 'mail-attachments',
    work: 'mail-work',
    ...options.slugs,
  }
  if (
    new Set(Object.values(slugs)).size !== 5 ||
    Object.values(slugs).some((s) => !/^[a-z][a-z0-9-]{0,47}$/.test(s))
  )
    throw new Error('mail:slug-conflict')
  const limits = { ...defaultLimits, ...options.limits }
  if (
    Object.values(limits).some((n) => !Number.isSafeInteger(n) || n <= 0) ||
    limits.pageSize > 100 ||
    limits.pollingMs < 10000 ||
    limits.leaseMs < 60000 ||
    limits.payloadBytes > 25 * 1024 * 1024
  )
    throw new Error('mail:invalid-limits')
  const mailboxes = options.mailboxes.map((box) => ({
    ...box,
    address: address(box.address),
    allowedFrom: box.allowedFrom?.map(address),
    replyTo: box.replyTo ? address(box.replyTo) : undefined,
  }))
  for (const box of mailboxes) {
    if (!/^[a-z][a-z0-9-]{0,47}$/.test(box.key) || !box.provider || /[\r\n\x00]/.test(box.name))
      throw new Error('mail:invalid-mailbox')
  }
  const providers = options.providers ?? []
  if (
    providers.some((p) => !/^[a-z][a-z0-9-]{0,47}$/.test(p.key)) ||
    new Set(providers.map((p) => p.key)).size !== providers.length
  )
    throw new Error('mail:invalid-provider')
  if (
    new Set(options.mailboxes.map((b) => b.key)).size !== options.mailboxes.length ||
    new Set(options.mailboxes.map((b) => b.address)).size !== options.mailboxes.length
  )
    throw new Error('mail:mailbox-conflict')
  const apiPath = options.apiPath ?? '/mail'
  const adminPath = options.adminPath ?? '/mail'
  if (![apiPath, adminPath].every((p) => /^\/[a-z][a-z0-9/-]*$/.test(p) && !p.endsWith('/')))
    throw new Error('mail:invalid-path')
  for (const origin of options.origins)
    if (new URL(origin).origin !== origin) throw new Error('mail:invalid-origin')
  return { ...options, mailboxes, slugs, limits, apiPath, adminPath }
}
