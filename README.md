# Payload Mail

[فارسی](README.fa.md) · MIT © 2026 Amir Hossein Salighedar · [Moftkhar](https://moftkhar.ir)

Private staff email workflows inside an existing Payload admin. Postal remains the mail server. This package adds a paginated inbox, durable drafts, conversations, replies/reply-all/forward, internal notes, private attachments and delivery history. No IMAP, separate dashboard, Redis requirement, automatic replies, tracking or telemetry.

**Status: experimental alpha; production verification is pending.** `payload-plugin-mail` is provisional: npm returned E404 on 2026-11-10; no name reservation or public npm release is claimed. Use the packed artifact from this repository. See [evidence](docs/evidence.md) for what has actually passed and remaining limitations.

## Compatibility

The initial tested target is Node 22.23.4, Payload/UI/translations/SQLite adapter 3.90.2, Next 16.3.3 and React 19.2.6. Only SQLite is supported initially. Other adapters require a real atomic store implementation and equivalent integration/browser tests; supplying the interface alone does not establish compatibility.

## Install from a packed artifact

```sh
pnpm install --frozen-lockfile
pnpm build
npm pack
# In the host application:
pnpm add /path/to/payload-plugin-mail-0.1.0-alpha.4.tgz
```

Add the plugin to `payload.config.ts`; keep the host email adapter and authentication intact:

```ts
import { payloadMail } from 'payload-plugin-mail'
import { sqliteAtomicStore } from 'payload-plugin-mail/sqlite'
import { postalProvider } from 'payload-plugin-mail/postal'

plugins: [
  // ...existingPlugins,
  payloadMail({
    atomic: sqliteAtomicStore(),
    origins: ['https://app.example.com'],
    isStaff: (req) => req.user?.roles?.includes('support') === true,
    canAccessMailbox: (req, box) => req.user?.mailboxes?.includes(box.key) === true,
    mailboxes: [
      {
        key: 'support',
        address: 'support@example.com',
        name: 'Example Support',
        provider: 'postal',
        signature: 'Example Support',
      },
    ],
    providers: [
      postalProvider({
        key: 'postal',
        publicKeys: () => [process.env.POSTAL_PUBLIC_KEY!],
        apiURL: () => process.env.POSTAL_API_URL!,
        apiKey: () => process.env.POSTAL_API_KEY!,
      }),
    ],
  }),
]
```

Adapt the staff/mailbox predicates to your generated user type. Default access is denied. Secrets and public verification keys are read server-side only when a request uses them. Omit a provider `submit` implementation to use the host's existing `payload.sendEmail`; an adapter exception is conservatively ambiguous.

Import `payload-plugin-mail/styles.css` once from the Payload root layout, alongside Payload vendor CSS. Run `pnpm payload generate:importmap`. The added admin view is `/admin/mail`; the API prefix is `/api/mail`. Custom paths/slugs are supported and conflicts fail clearly. The package ships compiled scoped Tailwind CSS with no Preflight. Host styles and themes remain active.

Invoke `processMail(payload, options, 10)` from an existing scheduler or Payload job every 10–30 seconds. Keep one shared options module. Every tick is bounded; SQLite conditional updates coordinate multiple workers. Do not run a tight unbounded request loop or rely on an in-memory queue.

## Runnable example and checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:consumer
pnpm exec playwright install chromium
pnpm test:e2e
```

The consumer check creates an isolated example in `.private/consumer`, installs the tarball without source aliases, generates the import map, initializes real Payload/SQLite, and seeds synthetic accounts. Browser tests use this installed package and a local signed Postal emulator. The example never sends network email. Test credentials are in [example configuration](example/payload.config.ts); do not copy its synthetic secret, seed logic or emulator endpoints into production.

English/LTR and Persian/RTL use Payload's language preference. Mail text uses `dir="auto"`; addresses and IDs remain isolated LTR. Calendar, numbering system and timezone are explicit options; defaults are Gregorian/Latin/UTC. Stored timestamps are UTC. Language switching changes interface labels, not email data.

## Security and delivery limits

- Configure pinned Postal signing keys before routing mail. Unsigned callbacks are rejected. A claimed mailbox body field cannot route mail.
- HTML is sanitized with `sanitize-html`, shown only on request in a sandbox, and remote images are blocked until an explicit per-message opt-in. Attachments are private DB bytes with protected downloads; no malware scanning is claimed unless you supply `scanAttachment`.
- The outbox distinguishes queued, submitting, accepted, delivered-to-server, delayed, failed, bounced and ambiguous. Acceptance does not prove delivery. Delivery to a recipient server does not prove Inbox placement.
- A timeout or crash after submission becomes ambiguous. The UI provides no automatic retry for it. Inspect Postal and make a deliberate new draft if reconciliation cannot establish the outcome. Exactly-once SMTP delivery is not promised.
- No autonomous replies are sent. Auto-submitted/bounce mail is marked for review.
- Deploy a shared authenticated admission limiter and reverse-proxy byte/concurrency caps. The optional `rateLimit` hook must use shared storage; never use arbitrary forwarded IP headers as identity. See [operations](docs/operations.md).

The following screenshots are from the real packed-package browser fixture using synthetic messages.

[English inbox](docs/screenshots/inbox-en.png) · [Persian inbox](docs/screenshots/inbox-fa.png)

## Documentation

- [Architecture and storage boundaries](docs/architecture.md)
- [Configuration/API/provider contracts](docs/contracts.md)
- [Postal 3.3.7 setup and source-verified retries](docs/postal.md)
- [Threading, Bcc and delivery semantics](docs/semantics.md)
- [Operations, retention, backup and restore](docs/operations.md)
- [Migrations, upgrades and uninstall](docs/migrations.md)
- [Release guide](docs/release.md) · [deployment/rollback](docs/deployment.md)
- [Moftkhar-specific integration](docs/moftkhar.md)
- [Progress ledger](docs/progress.md) · [requirement evidence](docs/evidence.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)
