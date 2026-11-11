# Configuration, API and provider contracts

Public types are exported from `payload-plugin-mail`. All server methods require trusted application code; do not serialize options/providers/keys into client props.

Required configuration: `mailboxes`, `atomic`, `origins`. `isStaff` is optional in types to support default-deny startup, but must be supplied to grant access. `canAccessMailbox` can further restrict staff. Identities use exact local parts and normalized domains; From is restricted to each mailbox's address/allowedFrom. `replyTo`, `signature`, slugs and admin/API paths are configurable. Providers are keyed by a stable unique server/trust boundary. No deployment domain is embedded in library behavior.

Limits default to 12 MiB HTTP body, 5 MiB decoded attachment, 8 attachments/message, 20 recipients, 256 KiB combined text/HTML, 25 rows/page, 365 day correspondence retention eligibility, 30 day completed-receipt eligibility, 30 second polling, 4 definite-work attempts and 60 second lease. Maximum body cap is 25 MiB, page cap 100, polling minimum 10 seconds. Raw receipt storage is transient and cleared on successful processing; long-term raw retention is intentionally not implemented.

`language` provides a configuration default; Payload's authenticated admin language is authoritative. `timeZone`, `calendar`, `numberingSystem` configure Intl date display. Defaults: UTC, gregory, latn. Only en/fa labels are shipped.

## Staff API (default prefix /api/mail)

| Method/path                  | Behavior                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| GET /config                  | Authorized public identities and display/limit settings                                       |
| GET /inbox                   | page/search/mailbox/status/unread/folder/sender/recipient/delivery/after/before; bounded list |
| GET /counts                  | Authorized folder and unread counts                                                           |
| POST /provider/:id           | Inspect only an authorized owned message; CSRF protected, read-only provider RPCs             |
| GET /conversation/:id?page=1 | Scoped conversation, ordered messages and attachment metadata                                 |
| POST /conversation/:id       | Set unread boolean and/or open/closed status                                                  |
| POST /draft                  | Durable draft/note; Idempotency-Key required                                                  |
| POST /draft/:id              | Edit existing draft; all referenced IDs reauthorized                                          |
| POST /send/:id               | Queue outgoing draft or definitively failed send; concurrent transition guarded               |
| POST /attachment             | Bounded mailbox/filename/contentType/base64 data                                              |
| GET /attachment/:id          | Permission-checked octet-stream attachment download                                           |
| GET /html/:id?images=true    | Sanitized sandbox source; optional image opt-in                                               |

Mutation APIs use existing session cookies and exact Origin allowlist. Errors are redacted codes plus correlationId, with no raw parser/DB/provider exception. `denied`, `invalid`, `limit`, `conflict`, `notFound`, `unavailable` have English/Persian UI translations. Provider ingress is documented separately. No public export bypass exists; Payload collection reads retain mailbox access.

Draft data: mailbox, optional conversation, kind outgoing/note, allowed from, to/cc/bcc arrays, subject, text, optional sanitized HTML, attachment IDs, optional replyToMessage and action compose/reply/replyAll/forward. Notes erase all recipients. Reply references come from the authorized source message, not client-supplied arbitrary headers. API callers must deliberately choose recipients; reply-all UI excludes own identities and never includes Bcc.

## Server API

- `processMail(payload, options, batchSize=10)`: recover stale leases, process bounded receipts then submissions. Safe for concurrent processes on the supported adapter. Scheduler is host-owned.
- `pruneMail(payload, options, dryRun=true, batchSize=25)`: inspect retention candidates; explicit deletion is opt-in. Read operations documentation before enabling.
- `sqliteAtomicStore()`: SQLite-specific CAS implementation. Custom implementations must coordinate processes and support conditional revision/scalar/JSON updates atomically.

Provider interface separates exact-byte `receive`, asynchronous `parseIncoming`, event normalization and `submit`. Submission returns accepted IDs, definitely failed with optional retryable flag, or ambiguous. Never classify an unknown network outcome as retryable. Unknown IDs/events stay durably queued until matching submission IDs exist or bounded retries exhaust. Provider error codes must be fixed redacted identifiers, never remote response text.

## Indexed read and provider inspection extensions

The SQLite atomic store supplies `read.list` and `read.counts`. Custom atomic adapters need these methods for the redesigned inbox. Indexed selection binds all filter values; the endpoint then materializes collection IDs with the caller request and `overrideAccess:false`. Pages are capped at configured page size; UTC date inputs are strict Gregorian YYYY-MM-DD, with an inclusive through-date converted to an exclusive following midnight. Recipient filtering considers visible To recipients; Bcc is not a searchable summary field.

Folders: `inbox` (open threads with incoming mail), `all` (all conversations), `archived` (closed threads), `drafts`, `sent` (accepted/delivered/delayed outgoing messages), `queued` (queued/submitting/delayed), `failed` (failed/bounced/ambiguous). Delayed messages intentionally appear in sent and queue. Note drafts are part of conversations, never the send outbox.

An optional provider `inspect(message, mailbox)` returns normalized status, TLS, bounded delivery attempts and allowlisted headers. Public `label` and `managementURL()` are optional; only credential-free HTTPS dashboard links are exposed. API keys remain server-only. Inspection failure never changes durable delivery state and cannot queue or resend an ambiguous submission. See postal-capabilities.md for concrete Postal limits.
