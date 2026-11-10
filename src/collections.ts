import type { CollectionConfig, Field } from 'payload'
import type { ResolvedOptions } from './types.js'
import { mailAccess } from './server/permissions.js'

const deny = () => false
const revision: Field = { name: 'revision', type: 'number', required: true, defaultValue: 0 }
const mailbox: Field = { name: 'mailbox', type: 'text', required: true, index: true }
const leaseFields: Field[] = [
  revision,
  { name: 'lease', type: 'text' },
  { name: 'leaseUntil', type: 'number', index: true },
  { name: 'attempts', type: 'number', defaultValue: 0 },
  { name: 'nextAttempt', type: 'number', defaultValue: 0, index: true },
]

/** Collections expose permission-filtered reads; all writes go through validated services. */
export function mailCollections(o: ResolvedOptions): CollectionConfig[] {
  const common = {
    admin: { hidden: true },
    timestamps: true,
    lockDocuments: false,
    access: { read: mailAccess(o), create: deny, update: deny, delete: deny },
  } satisfies Partial<CollectionConfig>
  return [
    {
      ...common,
      slug: o.slugs.mailboxes,
      access: { ...common.access, read: mailAccess(o, true) },
      fields: [
        { name: 'key', type: 'text', unique: true, required: true },
        { name: 'address', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
      ],
    },
    {
      ...common,
      slug: o.slugs.conversations,
      fields: [
        mailbox,
        revision,
        { name: 'threadKey', type: 'text', required: true, unique: true },
        { name: 'subject', type: 'text', required: true, index: true },
        { name: 'sender', type: 'text', index: true },
        { name: 'participants', type: 'json', required: true },
        {
          name: 'status',
          type: 'select',
          options: ['open', 'closed'],
          defaultValue: 'open',
          index: true,
        },
        { name: 'unread', type: 'checkbox', defaultValue: true, index: true },
      ],
    },
    {
      ...common,
      slug: o.slugs.messages,
      fields: [
        mailbox,
        ...leaseFields,
        { name: 'dedupKey', type: 'text', unique: true, required: true },
        { name: 'conversation', type: 'text', required: true, index: true },
        { name: 'messageId', type: 'text', index: true },
        { name: 'provider', type: 'text', required: true, index: true },
        { name: 'providerIds', type: 'text', hasMany: true, index: true },
        { name: 'kind', type: 'select', options: ['incoming', 'outgoing', 'note'], required: true },
        { name: 'state', type: 'text', required: true, index: true },
        { name: 'data', type: 'json', required: true },
      ],
    },
    {
      ...common,
      slug: o.slugs.attachments,
      fields: [
        mailbox,
        { name: 'key', type: 'text', unique: true, required: true },
        { name: 'filename', type: 'text', required: true },
        { name: 'size', type: 'number', required: true },
        { name: 'contentType', type: 'text', required: true },
        { name: 'bytes', type: 'textarea', required: true, hidden: true, access: { read: deny } },
      ],
    },
    {
      ...common,
      slug: o.slugs.work,
      access: { read: deny, create: deny, update: deny, delete: deny },
      fields: [
        mailbox,
        ...leaseFields,
        { name: 'key', type: 'text', required: true, unique: true },
        { name: 'provider', type: 'text', required: true, index: true },
        { name: 'kind', type: 'select', options: ['incoming', 'event'], required: true },
        { name: 'state', type: 'text', required: true, defaultValue: 'queued', index: true },
        { name: 'digest', type: 'text', required: true },
        { name: 'data', type: 'json' },
      ],
    },
  ]
}
