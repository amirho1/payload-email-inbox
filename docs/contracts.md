# Configuration, API and provider contracts

Public types are exported from `payload-plugin-mail`. All server methods require trusted application code; do not serialize options/providers/keys into client props.

Required configuration: `mailboxes`, `atomic`, `origins`. `isStaff` is optional in types to support default-deny startup, but must be supplied to grant access. `canAccessMailbox` can further restrict staff. Identities use exact local parts and normalized domains; From is restricted to each mailbox's address/allowedFrom. `replyTo`, `signature`, slugs and admin/API paths are configurable. Providers are keyed by a stable unique server/trust boundary. No deployment domain is embedded in library behavior.

Limits default to 12 MiB HTTP body, 5 MiB decoded attachment, 8 attachments/message, 20 recipients, 256 KiB combined text/HTML, 25 rows/page, 365 day correspondence retention eligibility, 30 day completed-receipt eligibility, 30 second polling, 4 definite-work attempts and 60 second lease. Maximum body cap is 25 MiB, page cap 100, polling minimum 10 seconds. Raw receipt storage is transient and cleared on successful processing; long-term raw retention is intentionally not implemented.

`language` provides a configuration default; Payload's authenticated admin language is authoritative. `timeZone`, `calendar`, `numberingSystem` configure Intl date display. Defaults: UTC, gregory, latn. Only en/fa labels are shipped.

## Staff API (default prefix /api/mail)

| Method/path                  | Behavior                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------- |
| GET /config                  | Authorized public identities and display/limit settings                         |
| GET /inbox                   | page/search/mailbox/status/unread; bounded list and counts                      |
| GET /conversation/:id?page=1 | Scoped conversation, ordered messages and attachment metadata                   |
| POST /conversation/:id       | Set unread boolean and/or open/closed status                                    |
| POST /draft                  | Durable draft/note; Idempotency-Key required                                    |
| POST /draft/:id              | Edit existing draft; all referenced IDs reauthorized                            |
| POST /send/:id               | Queue outgoing draft or definitively failed send; concurrent transition guarded |
| POST /attachment             | Bounded mailbox/filename/contentType/base64 data                                |
| GET /attachment/:id          | Permission-checked octet-stream attachment download                             |
| GET /html/:id?images=true    | Sanitized sandbox source; optional image opt-in                                 |

Mutation APIs use existing session cookies and exact Origin allowlist. Errors are redacted codes plus correlationId, with no raw parser/DB/provider exception. `denied`, `invalid`, `limit`, `conflict`, `notFound`, `unavailable` have English/Persian UI translations. Provider ingress is documented separately. No public export bypass exists; Payload collection reads retain mailbox access.

Draft data: mailbox, optional conversation, kind outgoing/note, allowed from, to/cc/bcc arrays, subject, text, optional sanitized HTML, attachment IDs, optional replyToMessage and action compose/reply/replyAll/forward. Notes erase all recipients. Reply references come from the authorized source message, not client-supplied arbitrary headers. API callers must deliberately choose recipients; reply-all UI excludes own identities and never includes Bcc.

## Server API

- `processMail(payload, options, batchSize=10)`: recover stale leases, process bounded receipts then submissions. Safe for concurrent processes on the supported adapter. Scheduler is host-owned.
- `pruneMail(payload, options, dryRun=true, batchSize=25)`: inspect retention candidates; explicit deletion is opt-in. Read operations documentation before enabling.
- `sqliteAtomicStore()`: SQLite-specific CAS implementation. Custom implementations must coordinate processes and support conditional revision/scalar/JSON updates atomically.

Provider interface separates exact-byte `receive`, asynchronous `parseIncoming`, event normalization and `submit`. Submission returns accepted IDs, definitely failed with optional retryable flag, or ambiguous. Never classify an unknown network outcome as retryable. Unknown IDs/events stay durably queued until matching submission IDs exist or bounded retries exhaust. Provider error codes must be fixed redacted identifiers, never remote response text.
