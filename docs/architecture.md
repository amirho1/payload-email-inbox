# Architecture decisions

The plugin transforms the host Payload config, preserving email/auth/hooks/jobs/localization and existing collections/endpoints/views. It has no network calls at import time. Disabled mode returns the original config before validation. Next/Payload render the admin route; providers and MIME parser are server-side. The client entry imports neither database nor provider/parser/sanitizer code.

## Storage

| Collection         | Purpose                                                                         | Access                                                 |
| ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| mailboxes          | Reserved mailbox metadata schema; identities configured by host                 | Staff mailbox-filtered read; no direct writes          |
| mail-conversations | Indexed mailbox, sender/subject, open/closed, unread, participants              | Staff mailbox-filtered read; validated endpoint writes |
| mail-messages      | Incoming/outgoing/note, indexed headers, durable draft/outbox, delivery history | Same mailbox access; notes cannot queue                |
| mail-attachments   | One bounded base64 representation in private DB storage                         | Metadata is scoped; bytes hidden; protected download   |
| mail-work          | Durable signed incoming/event receipt, digest, unique key, lease, retry         | No direct user access                                  |

Attachments deliberately use a private non-upload collection rather than a public upload/static folder. This reuses the host database, survives backups with mail and avoids adding storage infrastructure. It costs base64 overhead and is limited to small attachments; no streaming large-file or malware-scanning claim is made.

Messages are the outbox; no separate outbox collection or Redis queue exists. Receipts need their own collection because the HTTP deadline must not include MIME parsing/scanning and events can precede submission persistence. Raw receipt data is cleared after normalized persistence; only receipt key/digest/status metadata remains. Failed work retains its bounded payload for operator recovery. Do not log it.

## Atomicity and claims

Payload 3.90.2's update-many code selects IDs and later updates each by ID. That is not compare-and-swap. The SQLite implementation performs one parameterized conditional UPDATE with `revision` and RETURNING. Table identifiers come from validated plugin slugs and Payload's tableNameMap; request data cannot choose identifiers. JSON/scalar fields share a revision so concurrent delivery/read/outbox updates retry safely.

The worker transitions queued → submitting before provider submission. Expired submitting leases become ambiguous, never queued. Receipt leases can be reclaimed because normalized records and attachments have stable database-unique keys. Duplicate signed receipts are atomically deduplicated by provider/server-key/mailbox/provider ID; equal keys with changed digest are refused. Configure one provider key per Postal server/trust boundary.

SQLite is the only tested implementation. Other adapters require a real atomic store, race tests and a narrow documented matrix. Graphify is a source inspection tool, excluded from runtime dependencies.

## Request boundaries

Staff endpoints authenticate the existing Payload session; mutations require an exact trusted Origin. Reads use `req` and `overrideAccess:false`. Writes are denied through ordinary collection APIs and exposed only through service methods after authorization and referenced-ID checks. Worker writes are privileged by design after signed receipt validation. Provider endpoints have independent pinned-key authentication and do not disable CSRF globally.

No autonomous response is ever triggered. Operators review auto-submitted/bounce mail. Postal owns retries after acceptance; the plugin owns only definitely unaccepted retryable attempts. Correlation IDs and operational counters exclude mail data.

## UI

Plain-text-first React composer, native accessible controls, compiled prefixed Tailwind utilities, no Preflight/global theme replacement. Host Payload language/session/theme are reused. Message HTML is a server-sanitized sandboxed opt-in view. Remote images require another explicit per-message action and are never fetched by the server.

## Admin read model and provider inspection

The shadcn client is split into navigation, paginated list, conversation messages, composer and bounded provider details. Radix portals are attached to the mail surface so scoped theme variables and RTL/LTR survive dialogs and menus. Keyed resizable panes remain mounted across mobile/desktop changes; inline draft state is not discarded by a breakpoint. CSS property defaults and Tailwind internal variables are isolated from host styles. Only used registry variants are shipped; source provenance and MIT notices are retained.

The optional atomic read interface supplies indexed list/count operations. SQLite binds all request values and scopes by authorized mailbox before selection; returned IDs are materialized through Payload with `req` and `overrideAccess:false`. Folder counts are real application aggregates; there is no fake Postal inbox/list API. Inspecting a provider message first authorizes its persisted application row, then invokes the configured provider's read-only, bounded RPCs. No client-supplied provider ID, callback URL or API credential is trusted.
