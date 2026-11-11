import type { Payload, PayloadRequest } from 'payload'

export type MailID = number | string
export type Language = 'en' | 'fa'
export type DeliveryState =
  | 'draft'
  | 'queued'
  | 'submitting'
  | 'provider-accepted'
  | 'delivered-to-recipient-server'
  | 'delayed'
  | 'failed'
  | 'bounced'
  | 'ambiguous'
export type Slugs = {
  mailboxes: string
  conversations: string
  messages: string
  attachments: string
  work: string
}
export type Mailbox = {
  key: string
  address: string
  name: string
  allowedFrom?: string[]
  replyTo?: string
  signature?: string
  provider: string
}
export type AttachmentInput = { filename: string; contentType: string; data: string }
export type MailData = {
  fromName?: string
  from: string
  to: string[]
  cc: string[]
  bcc: string[]
  replyTo?: string
  subject: string
  text: string
  html?: string
  messageId: string
  inReplyTo?: string
  references: string[]
  attachments: MailID[]
  autoSubmitted?: string
  bounce?: boolean
  /** Ephemeral, worker-only decoded attachments; never persisted in message data. */
  files?: AttachmentInput[]
  activeProviderIds?: string[]
  participants: string[]
  deliveries?: Record<string, { state: DeliveryState; timestamp: number }>
  history?: { state: DeliveryState; at: string; code?: string }[]
}
export type MailRecord = {
  id: MailID
  dedupKey?: string
  mailbox: string
  conversation?: MailID
  kind: 'incoming' | 'outgoing' | 'note'
  state: DeliveryState
  data: MailData
  revision: number
  attempts: number
  lease?: string | null
  leaseUntil?: number
  nextAttempt?: number
  createdAt: string
  providerIds?: string[]
}
export type Limits = {
  payloadBytes: number
  attachmentBytes: number
  attachmentCount: number
  recipients: number
  textBytes: number
  pageSize: number
  retentionDays: number
  receiptDays: number
  pollingMs: number
  maxAttempts: number
  leaseMs: number
}
export type SubmitResult =
  | { state: 'provider-accepted'; ids: string[] }
  | { state: 'failed'; code: string; retryable?: boolean }
  | { state: 'ambiguous'; code: string }
export type NormalizedIncoming = Omit<MailData, 'attachments'> & {
  attachments: AttachmentInput[]
  providerId?: string
}
export type MailFolder = 'inbox' | 'all' | 'sent' | 'drafts' | 'queued' | 'failed' | 'archived'
export type MailListQuery = {
  folder: MailFolder
  search: string
  sender: string
  recipient: string
  after?: string
  before?: string
  delivery?: DeliveryState
  unread: boolean
  status?: 'open' | 'closed'
  page: number
  pageSize: number
}
export type MailCounts = Record<MailFolder | 'unread', number>
/** Indexed IDs are materialized through the permission-checked Payload Local API. */
export type MailReadStore = {
  list: (
    payload: Payload,
    slugs: Slugs,
    mailboxKeys: string[],
    query: MailListQuery,
  ) => Promise<{
    items: { id: MailID; conversationId: MailID; messageId?: MailID }[]
    totalDocs: number
  }>
  counts: (payload: Payload, slugs: Slugs, mailboxKeys: string[]) => Promise<MailCounts>
}
export type ProviderInspection = {
  messages: {
    id: string
    status: string
    direction: 'incoming' | 'outgoing'
    size?: number
    held: boolean
    spam?: boolean
    receivedWithTLS?: boolean
    headers: Record<string, string[]>
    deliveries: {
      status: string
      timestamp: number
      tls: boolean
      summary: string
      smtpCode?: string
    }[]
  }[]
}
export type DeliveryEvent = { providerId: string; state: DeliveryState; timestamp: number }
export type ProviderReceipt = {
  key: string
  recipient?: string
  kind: 'incoming' | 'event'
  body: unknown
}
export type MailProvider = {
  key: string
  /** Public provider capabilities; credentials remain inside the server closure. */
  label?: string
  managementURL?: () => string | undefined
  inspect?: (message: MailRecord, mailbox: Mailbox) => Promise<ProviderInspection>
  /** Authenticate exact bytes using deployment-trusted keys, then validate bounded input. */
  receive?: (
    body: Uint8Array,
    headers: Headers,
    kind: 'incoming' | 'event',
  ) => Promise<ProviderReceipt>
  parseIncoming?: (body: unknown, limits: Limits) => Promise<NormalizedIncoming>
  parseEvent?: (body: unknown) => DeliveryEvent[]
  submit?: (message: MailData, mailbox: Mailbox, payload: Payload) => Promise<SubmitResult>
}
export type AtomicPatch = Record<string, string | number | boolean | null | object>
/** Internal CAS only; callers must authorize before invoking. No SQL identifiers from requests. */
export type AtomicStore = {
  /** Optional indexed mailbox reads. The supplied SQLite adapter implements these. */
  read?: MailReadStore
  pruneConversation?: (
    payload: Payload,
    slugs: Slugs,
    id: MailID,
    before: string,
  ) => Promise<boolean>
  compareAndSwap: (
    payload: Payload,
    collection: string,
    id: MailID,
    revision: number,
    patch: AtomicPatch,
  ) => Promise<boolean>
}
export type MailOptions = {
  enabled?: boolean
  slugs?: Partial<Slugs>
  adminPath?: `/${string}`
  apiPath?: `/${string}`
  mailboxes: Mailbox[]
  providers?: MailProvider[]
  isStaff?: (req: PayloadRequest) => boolean | Promise<boolean>
  canAccessMailbox?: (req: PayloadRequest, mailbox: Mailbox) => boolean | Promise<boolean>
  /** Must be an atomic, shared implementation. SQLite implementation exported separately. */
  atomic: AtomicStore
  /** Exact trusted origins for cookie-authenticated mutation requests. */
  origins: string[]
  language?: Language
  timeZone?: string
  calendar?: string
  numberingSystem?: string
  limits?: Partial<Limits>
  scanAttachment?: (attachment: AttachmentInput) => Promise<void>
  /** Optional shared admission limiter. Throw to refuse. Never use untrusted forwarding headers. */
  rateLimit?: (scope: string, req: PayloadRequest) => Promise<void>
  onCounter?: (name: string, correlationId: string) => void
}
export type ResolvedOptions = Omit<MailOptions, 'slugs' | 'limits' | 'apiPath' | 'adminPath'> & {
  slugs: Slugs
  limits: Limits
  apiPath: `/${string}`
  adminPath: `/${string}`
}
