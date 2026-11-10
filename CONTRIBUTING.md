# Contributing

Use Node 22.23.4 and the pnpm version pinned in package.json. Install with `pnpm install --frozen-lockfile`. Keep strict TypeScript and focused modules. Format with `pnpm format`; check with `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:consumer` and `pnpm test:e2e`. Consumer/browser checks require the packed artifact and real SQLite persistence, not source aliases. Install Chromium using `pnpm exec playwright install chromium`.

Use only synthetic fixtures under reserved example domains. Never commit mailboxes, raw production mail, attachments, credentials, keys, private recovery exports or browser traces. Example accounts are disposable. Security bugs go to the private contact in SECURITY.md; ordinary bugs should include version, reproduction and redacted results in a GitHub issue. Pull requests should state the behavior change, validation and limits.

Preserve host configuration, authentication and email adapters. Staff/mailbox checks must run on the server. Payload Local API defaults to bypassing access: explicitly disable bypass for user reads. Never substitute read-then-write for an atomic claim. Never automatically retry ambiguous submissions. Notes must stay outside send paths; Bcc never belongs in visible MIME.

Every UI string needs English and Persian entries. Use logical spacing, LTR address isolation and auto-direction message content. Run browser journeys in both languages and at 320/390/768/1440 pixels; test keyboard focus and accessibility. Keep Tailwind compiled/scoped with no global reset. Accessible native controls are preferred over unnecessary packages; retain MIT notices for any copied upstream component.

Changing collections requires an additive migration rehearsal in a disposable database and backup/restore evidence. Do not alter historical migrations to match a new schema. Test supported adapters/versions explicitly before expanding peer ranges.

Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`). Alpha releases use SemVer prereleases; security/correctness changes may break alpha APIs but must be documented. Stable versions require a migration policy and proven compatibility matrix. Submit contributions under the repository MIT license; there is no CLA.

New runtime dependencies need a concrete purpose, license review and bundle/package measurement. Graphify is a development tool only. Update the scoped source graph after implementation and review output before committing; generated `dist/`, node_modules, traces and `.private/` are ignored.
