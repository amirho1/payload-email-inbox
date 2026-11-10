# Operations, retention and recovery

Run a bounded `processMail` tick from the host's existing job/scheduler every 10–30 seconds; no Redis is required. Overlapping ticks use SQLite CAS. Monitor queued age, processing leases, failed receipt count, ambiguous submissions, disk and SQLite busy errors. Counter hooks receive only fixed names/correlation IDs, no bodies or addresses. Default telemetry is absent. Polling is bounded and pauses work while the document is hidden.

## Admission and storage limits

Set reverse-proxy body cap at or below plugin payload limit, connection/request timeout, bounded concurrent ingress and worker limits. Configure a shared authenticated `rateLimit` hook backed by the host's existing Redis, SQL reservation table or trusted gateway. It runs after callback/staff authentication. Scope by provider/mailbox or authenticated staff, not arbitrary X-Forwarded-For. Callback overload should return 503 on Postal 3.3.7; 429 permanently fails the incoming delivery. Keep host CSRF/auth intact. The package does not ship a pretend multi-process limiter based on an unbounded Map.

Private attachment bytes are base64 in the existing DB. Apply DB/volume quotas and small attachment limits. No scanner exists unless scanAttachment is configured. Scanner exceptions prevent normalized acceptance; receipt stays durable with bounded retries. Processed raw receipt data is cleared, failed work remains for recovery. Review raw failed records only through trusted operator tools.

## Retention and deletion

Default eligibility is closed conversations untouched for 365 days and completed receipt metadata after 30 days. Retention is opt-in, dry-run first, bounded candidate batches. Draft/queued/submitting/ambiguous correspondence is excluded. Attachments may be shared by forwards; bytes are retained pending an explicit orphan inventory rather than deleting shared content. This alpha does not yet provide an automated orphan-byte sweep or guarantee complete storage reclamation. Receipt deletion shortens replay-memory; existing normalized message unique keys still prevent duplicate messages while retained.

The SQLite retention path rechecks age, closed status and pending work inside a write transaction. Incoming/draft workflows reopen the conversation before inserting so active correspondence is ineligible. Threads over 100 messages are retained for a deliberate export/deletion procedure. Preview candidates, take a consistent backup and preserve failed work. Uninstall never deletes data automatically. Legal retention rules are deployment policy, not library defaults.

## Backup and restore

Back up the host SQLite DB consistently (SQLite backup API or a stopped-writer snapshot including WAL correctness), plus existing upload volumes, plugin configuration, provider key fingerprints and secret-manager recovery metadata. Plugin attachment bytes travel with the DB. Do not copy only the main SQLite file during active WAL writes. Encrypt backups outside the public repository. Keep decryption keys off-server and verify restored checksums.

Rehearse into a new temporary database with no production provider credentials/network email. Disable external submissions; reconcile any restored queued/submitting/accepted items before starting workers. Treat prior submitting states as ambiguous. Verify collection counts, drafts, attachment hashes, access and thread continuity. Snapshot restore can replay accepted mail; never connect a restored outbox to production without reconciliation. Record adapter/schema/version and exact restore commands in the deployment ledger.

## Troubleshooting

- 401 callback: verify pinned key fingerprint and exact-byte signature; do not fetch callback-selected keys.
- 403 UI: verify host staff/mailbox predicate and exact Origin; do not globally disable CSRF.
- Unknown submission: inspect Postal before any new send; do not reset to queued.
- Failed receipt: inspect only redacted code first, preserve raw work, test the same synthetic structure locally.
- SQLite busy: reduce workers/batch, check long transactions and WAL/busyTimeout; never replace DB/volumes.
- Import-map/component failure: install the tarball, import CSS once and regenerate import map with the installed version.
