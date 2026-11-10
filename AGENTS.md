# Payload Mail contributor map

- `src/index.ts`: config-preserving plugin. `src/collections.ts`: default-deny schema.
- `src/server`: request authorization, validation, durable receipts/outbox, threading, SQLite atomic boundary.
- `src/providers/postal.ts`: pinned Postal 3.3.7 signature/payload adapter; generic workflows must not depend on deployment identities.
- `src/ui`: route-local English/Persian React admin view. Tailwind utilities use `pm:`; compiled CSS has no Preflight.
- `example`: runnable synthetic Payload SQLite app. `scripts/consumer.mjs`: tarball installation proof. `tests`: unit/real SQLite/browser cases.
- Read docs/progress.md and docs/evidence.md before continuing; distinguish implemented/tested/pushed/deployed/recipient-confirmed.

Commands: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm test:consumer`, `pnpm test:e2e`. Chromium: `pnpm exec playwright install chromium`. Node target 22.23.4. Check the ledger for current results; command presence is not a pass.

Use the Graphify skill: query graphify-out/graph.json with its vocabulary first, inspect cited source, then update the scoped source graph with `GRAPHIFY_OUT="$PWD/graphify-out" graphify update src`. Never scan secrets, private mail, attachments, `.private`, traces, dependencies or generated builds. Graphify is not a runtime dependency. The Moftkhar host supplies a reviewed Payload skill at `.agents/skills/payload/SKILL.md`; use it when available, otherwise official installed-version documentation. Do not pretend missing skills exist.

Security invariants: default deny; mailbox scope for every reference/download; user Local API reads use request context and `overrideAccess:false`; endpoint-only validated writes; exact-byte pinned-key callback signatures; database unique receipt keys; atomic conditional SQLite claims; submitting lease expiry becomes ambiguous, never queued; notes never sent; allowed From only; no visible Bcc; bounded parsing/queries; no raw body/provider errors in logs.

All interface messages need en/fa. Use logical layout, auto-direction content, isolated LTR addresses, accessible keyboard focus and controls. Do not global-reset Payload. Preserve host hooks/email/auth/jobs/localization and unrelated work. Disabled mode must return the original config with no feature validation or network calls.

Generated dist and test artifacts stay untracked. Generate host import maps/types/migrations using supported commands. Before deployment, run complete checks, isolated migrations/restore, dependency/license review and resource measurements. Production rollout must preserve route/image checkpoints and durable mail. Route only support after authenticated endpoint readiness. See docs/deployment.md; recipient acceptance is not Inbox verification.
