# Payload Mail progress ledger

## 2026-11-10 — discovery and implementation in progress

- Package workspace: `/Users/amirho/Projects/payload-email-inbox`, empty origin `https://github.com/amirho1/payload-email-inbox.git`; branch `feat/payload-mail`.
- Host: `amirho1/moftkhar`, isolated worktree `/Users/amirho/Projects/moftkhar-payload-mail`, branch `feat/payload-mail`, base `1bbc519753bd594960db5b6de75e37ddda198c2d`. Original workspaces have unrelated edits; do not reset them.
- Infrastructure: `amirho1/moftkhar-mail`, Postal 3.3.7/MariaDB; preserve services and route. User's untracked prompt preserved.
- Narrow initial target: Node 22.23.4, Payload/SQLite/UI 3.90.2, Next 16.3.3, React 19.2.6. No other adapter/version supported without tests.
- Repository-local Payload skill discovered through Graphify under host `.agents/skills/payload`; reviewed plugin, endpoints, access docs. Graph is stale in parts: source and live state take precedence.
- SSH Git read works. `gh` has no authenticated CLI session; HTTPS origin access works. No publication performed. npm registry returned E404 for provisional name; this does not reserve it.
- Dokploy connector disappeared during discovery; existing reviewed `ops/dokployMcp.py` can read configured MCP directly. Response envelope is `{success,message,data}`. Do not print env/config/secrets.
- Official Postal documentation disagrees with pinned source on retries. 3.3.7 HTTPSender: 2xx accepted; 5xx/network retries; 429 terminal without bounce; other 4xx terminal. Webhook events: initial + five bounded retries. Both use Postal::HTTP signing exact body using RSA-SHA256 and X-Postal-Signature-256, with trusted pinned keys. No callback-selected key retrieval.

## Plan

1. Build strict package, collection boundaries, validation, pinned-key Postal adapter, durable receipts and SQLite atomic claims.
2. Implement inbox/composer/thread/attachment workflows, English/Persian admin view, scoped compiled Tailwind.
3. Prove with real Payload SQLite integration and browser journeys against packed artifact; fix failure modes.
4. Document/review package, dependency licenses, graph, measured resource budgets, and restore rehearsal.
5. Integrate packed artifact into isolated real host, generate additive migrations, run host checks, push reviewed changes.
6. Verify deployment checkpoint, deploy through established pipeline, then configure support route only after ready ingress. Complete controlled round trip; recipient observation is required.

## Decisions

- Reuse Payload auth, adapter, database and admin; no new runtime process or Redis requirement. Host invokes bounded worker tick from existing scheduler/Payload job.
- Three core collections plus a private attachment-bytes collection and durable ingress/event work collection. Messages themselves hold the durable outbox. Notes cannot enter submission states.
- Only SQLite supported initially. Payload bulk update reads then updates by ID, so it is NOT a compare-and-swap. Atomic scalar/JSON updates and leases require one parameterized SQLite UPDATE ... WHERE ... RETURNING via an isolated storage interface.
- Default-deny collections; permission-filtered reads, endpoint-only validated writes. Privileged worker writes are separate from caller authorization. Explicit origin check for staff mutation APIs; provider signature auth separate.
- No automatic replies. Timeout/crash after submission becomes ambiguous; no automatic resend.

## Budgets (before implementation; actual measurements pending)

- Packed tarball <150 KiB; compiled route client entry <35 KiB gzip (excluding host React/Payload UI); compiled CSS <20 KiB.
- Added production direct dependencies <=4; no browser mail parser/provider/sanitizer dependency.
- Inbox 25 rows, <=3 database list queries and p95 <250 ms locally at 1,000 conversations, concurrency 5.
- Idle RSS delta <50 MiB relative to same minimal host; 100 synthetic receipts acknowledged durably within Postal 5 second deadline each, concurrency 5. These are targets, not achieved claims.

## Required evidence still pending

All implementation, tests, measurements, host integration, push, deployment and recipient round trip remain unproven at this initial checkpoint. No production changes or test mail sent.

## Verified incremental results

- 30 unit/real Payload SQLite integration tests passed after adding delivery replay/precedence, definite retry bounds and receipt-lease recovery.
- Packed consumer installs and initializes without source aliases. Latest successful consumer run used compiled scoped CSS and split navigation entry.
- Three browser checks passed (36.3 seconds): en/fa complete persistence journey, RTL/mobile/a11y/XSS, and anonymous/nonstaff/cross-mailbox REST denial. More UI-state coverage being added.
- Running Postal container source was read through authorized SSH run-command: `/opt/postal/app/app/senders/http_sender.rb` and `/opt/postal/app/lib/postal/http.rb`. Confirms SHA256 signature and 5xx soft retry / 429 hard-no-bounce mapping. No production mutations performed.
- Host frozen install must use `pnpm install` without `--ignore-workspace`, because its workspace contains reviewed Payload patches. Install succeeded using existing lockfile; ignoring workspace causes patchedDependencies mismatch.
- Live host is receiving other releases while work proceeds; revalidate current remote/image immediately before integration merge/deploy. Never deploy the older base by overwriting newer commits.

## Release checkpoint — independent work completed, production gate pending

- 37 library tests and four packed-consumer browser journeys pass. Latest consumer production build passes.
- Full host suite: 731/731 tests, 96 files, 109.44 seconds; no skipped tests or unhandled errors in final run. Host lint has 0 errors/82 existing warnings; types/build pass.
- Root dependency audit is clean; fixed earlier vulnerable parser/sanitizer/Nodemailer pins. Permissive dependency/license inventory recorded.
- Fixed startup coupling by moving mailbox metadata synchronization to explicit post-migration worker ticks. Host onInit is preserved unchanged. Pricing partial-migration replay now passes.
- Host fresh test DB requires the already-documented nullable-email schema setup. Applied existing authEmailMigration schema mode with its own verified backup ONLY to /tmp test DB. No production auth changes. Fixed one stale checkout unit-test mock at its real payment API boundary; production checkout behavior unchanged.
- Mail migration is additive/idempotent; rollback preserves mail tables and reapply works. Unrelated historical schema drift was removed from generated UP/DOWN. Host restore rehearsal verifies actual schema and synthetic private bytes/unknown states.
- Remote main advanced from 1bbc519 to 5b217c1 (product overflow fix). Preserve it by rebasing integration branch before release; never overwrite it.
- Trusted signer SPKI SHA256: f244ded19d7c855333cdcab32e94e7beed4420c142f99070fd65594f1b20d482. PEM fetched only from configured HTTPS Postal JWKS after matching independently authenticated SSH fingerprint. Local PEM stays in ignored .private.
- Production support route checkpoint: Postal server 1, route 1, domain 4, support@moftkhar.ir, mode Accept, endpoint null, spam Mark. Current inspected app image ID sha256:4c3862d09c0d9750876fb16a284a623108482fd58bd1da4748ab5e51e58f989c; revalidate before any rollout.
- **Production blocker:** SSH automatic approval rejected creating /app/data/payload-mail-checkpoints/before-20261110-payload-mail.sqlite with APPROVAL_DENIED: User did not approve this command. No backup was created by that command. Do not retry it through alternate execution wrappers. No app deploy, route mutation or live test mail has occurred.
- Browser provider is unavailable; native Brave selection also failed. CUA task closed with browser blocker. Owner was asked asynchronously to confirm Gmail receipt/reply when a live test can be sent. Production recipient verification remains required.

- Final full-host rerun: 731 tests across 96 files passed with no skipped tests or unhandled errors. Fresh test DB was aligned using the existing nullable-email schema tool; no production auth changes.

- Library implementation committed and pushed: 018f93898a8da145bead8456286e5037facb554b, amirho1/payload-email-inbox, main and feat/payload-mail. No npm publish. Exact packed artifact metadata is docs/package-artifact.json.

- Latest artifact adds a tested definite failure when Payload has no configured email adapter (console logging is not acceptance). Library tests: 37 passed; final browser run: 4 passed in 50.1 s. Final host run: 731 passed in 109.44 s after rebasing on upstream 5b217c1.
- Owner restored browser availability. Native Safari verified Gmail signed in as amirhosseinsalighedar@gmail.com, scoped to controlled-test subject search. Recipient observation is now available; no production test has been sent yet. The specialized browser host remains unavailable, but native Safari works.

## Production checkpoint — 2026-11-10 15:59 UTC

- Library pushed on main and feat/payload-mail: e7900b21caba785b8971366d18e2320042c379b9. Host integration pushed at 1a1aa9d5069ee779dbe649b3dd4031cfe82d6e79 before the subsequent upstream merge.
- Owner directed use of Web-Father/Dokploy or Brave. Native Brave successfully signed in to the established Dokploy instance. Used the existing `moftkhar-app-sqlite-backup-12h` schedule, without changing its script or configuration; did not retry the rejected custom checkpoint command.
- Schedule dNbPe3yuTfK8dIjYLdILv completed successfully in 34 seconds. Log: `SQLite backup delivered: moftkhar-app-sqlite-20261110T155849Z-111703.zip.gpg`. Reviewed job uses the online SQLite backup API, requires quick_check=ok, includes media/receipts, validates ZIP, and encrypts before delivery through the established backup workflow.
- Durable encrypted archive: `/etc/dokploy/schedules/moftkhar-backups/moftkhar-app-sqlite-20261110T155849Z-111703.zip.gpg`; SHA-256 e5fc5c2b73db7e1d72c135b6b77e54e02156960199dfa2679c237ff07ee02d67. Archive contents/recovery key remain private. This production archive has not separately been decrypted/restored in this session; the isolated synthetic host restore rehearsal remains the tested restore evidence.
- Upstream advanced through 7c56ea2 (sitemap and phone fixes). Merged origin/main into the already-pushed integration branch, preserving history without force-push: 367300e1e0ade2a518d37ec7d8f1f30e3b608f87. Combined validation is running. Existing production deployment --WpMSuLE1-9CJzlBgAuu was still running when inspected; do not overlap release or revert newer changes.
- Backup gate is now satisfied by the established workflow. Deployment, support-route cutover, and controlled production round trip remain pending; no live test sent yet.

## Release underway — alpha.2 privacy correction

- Host main advanced to 81a1bad through a non-forced push after combined checks. GitHub Actions run 42851893472 is building the release; its build-time migration passed. This is not deployment or recipient proof.
- Previous upstream deployment GhffODmsDnk5n5uXd8L3b completed at 16:13:21 UTC, healthy. Rollback image: ghcr.io/amirho1/moftkhar@sha256:94c878a1816acad537ad5cfc129cd7fb57cb1bd4d5bf5619fbc2508995a3d777.
- Native MCP disabled operator JJM-WvByqXJWB8b2X6fKM first ran a read-only plan (ee73uvFsF-QONuvrrTULp), then applied only PAYLOAD_MAIL_POSTAL_PUBLIC_KEYS after the prior deployment finished (ef89kXnBeu56YKsCMcErr). Verified signer fingerprint and every unrelated environment value before/after persistence. Private rollback metadata stays under /etc/dokploy/schedules/payload-mail-release/signer-before.json. No deployment triggered by this config task. Existing notification settings unchanged.
- Owner supplied an authorized admin browser session, verified at the Payload dashboard. Earlier ordinary session was denied admin access. Gmail recipient observation remains available.
- Source inspection found Postal webhook_hash contains recipients, subject and message token, including unrelated existing notification events. Alpha.2 discards these before durable event storage, preserving only required correlation/event/time fields. Auth still covers exact original bytes; replay digest still covers original request. Two new signed-event minimization regressions cover normal and bounce shapes.
- Code correction a514779: 39 unit/integration tests pass; clean packed alpha.2 consumer passes; all four real Playwright journeys pass in 46.3 seconds. Consumer production build and measured budgets pass. Host alpha.2 artifact/build/restore validation is being finalized before advancing main again. Support route remains Accept, no event callback configured and no controlled live mail sent.
