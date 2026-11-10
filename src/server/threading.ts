import { createHash } from 'node:crypto'
import type { Mailbox, NormalizedIncoming } from '../types.js'
import { MailStore, type Row } from './store.js'

/** Exact headers, mailbox and established participants only; subject alone never links private mail. */
export async function resolveConversation(
  store: MailStore,
  box: Mailbox,
  mail: NormalizedIncoming,
  receiptKey: string,
): Promise<Row> {
  const ids = [
    ...new Set([mail.inReplyTo, ...mail.references].filter((v): v is string => !!v)),
  ].slice(-30)
  if (ids.length) {
    const matches = await store.find(
      store.options.slugs.messages,
      {
        and: [
          { mailbox: { equals: box.key } },
          { messageId: { in: ids } },
          { kind: { not_equals: 'note' } },
        ],
      },
      30,
    )
    const conversationIds = [...new Set(matches.docs.map((m) => String(m.conversation)))]
    const candidates: Row[] = []
    for (const id of conversationIds) {
      const c = await store.get(store.options.slugs.conversations, id)
      const participants = c.participants as string[]
      const external = mail.participants.filter(
        (a) => a !== box.address && !(box.allowedFrom ?? []).includes(a),
      )
      if (participants.includes(mail.from) && external.every((p) => participants.includes(p)))
        candidates.push(c)
    }
    if (candidates.length === 1) return candidates[0]
  }
  // Stable key makes crash/retry creation idempotent. Never use untrusted Message-ID as uniqueness.
  return store.unique(
    store.options.slugs.conversations,
    'threadKey',
    createHash('sha256').update(`${box.key}:${receiptKey}`).digest('hex'),
    {
      mailbox: box.key,
      subject: mail.subject || '(no subject)',
      sender: mail.from,
      participants: [...new Set([...mail.participants, box.address])],
      unread: true,
      status: 'open',
    },
  )
}
