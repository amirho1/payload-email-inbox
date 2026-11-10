import type { Access, PayloadRequest, Where } from 'payload'
import type { Mailbox, ResolvedOptions } from '../types.js'
import { MailError } from './errors.js'

export async function permittedMailboxes(
  req: PayloadRequest,
  options: ResolvedOptions,
): Promise<Mailbox[]> {
  if (!req.user || !options.isStaff || !(await options.isStaff(req))) return []
  const result: Mailbox[] = []
  for (const box of options.mailboxes)
    if (!options.canAccessMailbox || (await options.canAccessMailbox(req, box))) result.push(box)
  return result
}

export function mailAccess(options: ResolvedOptions, mailboxCollection = false): Access {
  return async ({ req }) => {
    const boxes = await permittedMailboxes(req, options)
    if (!boxes.length) return false
    return {
      [mailboxCollection ? 'key' : 'mailbox']: { in: boxes.map((b) => b.key) },
    } satisfies Where
  }
}

export async function authorize(
  req: PayloadRequest,
  options: ResolvedOptions,
  mailbox?: string,
): Promise<Mailbox[]> {
  const boxes = await permittedMailboxes(req, options)
  if (!boxes.length || (mailbox && !boxes.some((b) => b.key === mailbox)))
    throw new MailError('denied', 403)
  return boxes
}

/** Require a trusted Origin for session mutations; never change the host's global CSRF policy. */
export function checkOrigin(req: PayloadRequest, options: ResolvedOptions): void {
  const origin = req.headers.get('origin')
  if (!origin || !options.origins.includes(origin)) throw new MailError('denied', 403)
}
