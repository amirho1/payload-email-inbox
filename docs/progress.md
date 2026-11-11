# Payload Mail progress ledger

## Current checkpoint — 2026-11-11, alpha.5 release verification

This section supersedes historical checkpoints below. Full production completion is not claimed.

- Alpha.5 shadcn/Radix redesign is implemented, packed and pushed: library ea7478a206f4c8d8e36246b0dc509fb58a298ad5 on main and feat/shadcn-mail. Remote CI42967597868/42967597814 both passed. Package payload-plugin-mail@0.1.0-alpha.5; no npm publication.
- Verified target: Node22.23.4 / Payload-UI-SQLite3.90.2 / Next16.4.1 / React19.2.6. Library format/lint/types,51 tests/six files, eight packed-consumer browser journeys/1.7min, clean installation and production build pass.18 direct/98 non-peer runtime packages, permissive license review, zero plugin production advisories.
- Artifact SHA256 0f2ea26130adb9574c214d172165d3de1c77d712f0f8603ba63e25a6874b238f;76,831 packed bytes/295,406 unpacked/114 files. All budgets pass:95,837 gzip client bytes including primitives,25,360 CSS bytes,5,472,256 RSS delta, inboxp95 20.46ms/four SQL statements at1000 conversations+messages/concurrency5, maximum in-process durable ACK9.91ms for100 signed receipts. Handler timings exclude network/proxy/browser latency.
- Host669035640f053ec462468dc24d80b742ef28df78 is pushed to main and feat/payload-mail, preserving owner fcec2db/9353fa2 catalog/recovery changes. Final merged checks:776 tests/101 files/108.97sec, nine catalog browser cases/1.9min, types, lint0 errors/82 existing warnings, production build, isolated additive migrations and backup/restore all pass. Matched host delta +79,797 gzip JS/+22,764 CSS bytes (host-alpha5-comparison.json).
- Host security review: published runtime updates plus maintained zod/v3 compatibility patch. No critical/high/moderate audit findings; one low deepmerge4.3.1 remains. Suggested4.3.2 is unpublished and primary advisory has no patched version. No audit suppression. Plugin graph has zero findings.
- Fresh source-only Graphify evidence:271 nodes/1014 edges/14 communities; no missing endpoints/self-loops, source commit ea7478a. No private data/dependencies/builds scanned. CSS/export barrels inspected directly.
- Latest verified healthy production checkpoint remains OCI9353fa2bb542e343cbce5b1f9a0686f890e0fc49, image sha256:d0c6896a734bb18d10a3f2d307557479197b076ba345ebf57a8c79177796b698. MOFTKHAR_IMAGE_TAG already main; no env change made. Intended6690356 image/deployed redesign remain unconfirmed. Preserve current volumes and unrelated owner releases; do not use alpha.4-only recovery Dockerfile for the new dependency graph.
- Established fresh encrypted backup succeeded: moftkhar-app-sqlite-20261111T054743Z-130907.zip.gpg, SHA256 7b4b0fe25ac46390f7981b61e0402920d696ddcaa97629984f2018d44cb56aa5. Production archive not independently decrypted/restored here; isolated restore passes.
- Signed incoming replay200/200 and support endpoint remain intact. Five signed event callbacks enabled at /api/mail/postal/moftkhar-transactional/event (MessageSent/Delayed/DeliveryFailed/Held/Bounced). Only support routing changed; other routes preserved.
- Historical controlled outgoing Postal5 delivery replay succeeded200/200 TLS, UUID b87aeb23-018c-4edb-9674-acd3ae662116, job tzaEl2MnVxcNE3rWQr5he. No SMTP resubmission. Original attempt failed before persistence because Postal YAML serialization rejects BigDecimal; JSON-normalized native delivery payload fixed the controlled replay. Worker completion remains unverified: immediate existing observer still showed provider-accepted; follow-up SSH database inspection was denied by the approval gate. Do not bypass that denial through another wrapper.
- Core real support/Gmail production round trip, Persian text/signature/attachment and continuous three-message thread were already recipient-verified. Do not resend. Notification marker was absent at06:50UTC; notification-send has NOT run. Final noreply notification recipient proof remains required.
- Brave capture repeatedly returns cgWindowNotFound; owner asked to bring Brave forward. Safari must remain untouched. gh CLI has no authenticated session. Dokploy MCP intermittently times out; inspect actual logs/state before retrying any operation. Postal operator KQpXncItbD2hT3I7DCIZk restored to disabled/read-only plan. Image operator DpwBKhAhfGz_rBFLjluiV also disabled/read-only.
- Local preview restarted with updated dependencies; pnpm dev session59421, orchestrator27907, log /tmp/payload-mail-live-dev.log, loopback4101, preserved synthetic dev-data. Login agent@example.com / Synthetic-password-123! (public fixture credentials). Temporary verification Redis stopped; unrelated services untouched.
- Remaining: actual6690356 image/CI rollout verification, deployed en/fa/RTL/attachments/access/provider UI, event worker completion/no duplicates, one controlled notification send plus Gmail Inbox observation, final operational logs/resource check and final release evidence. Do not call the complete objective finished while these remain unverified.

## Current status audit — 2026-11-10

This checkpoint supersedes older current/pending statements below; subsequent sections preserve the chronological audit trail. The full objective is not complete.

- Package is `payload-plugin-mail` 0.1.0-alpha.5 in progress on `feat/shadcn-mail`, local HEAD `23c10eb1ccc7556268e92df8b879e925d1da9956`. Redesign changes remain uncommitted. Remote library main/feat-payload-mail remain `eafbbd66088f3e09194c740e994efaf6fd0aa5d9`; no redesign branch has been pushed or deployed, and no npm publication occurred.
- Read-only production Docker inspection confirms healthy alpha.3 image `sha256:0de1fd9a08228bbacf7182d988265c595ca7f856b1413aad15c680ed50577cfa`, OCI revision `e78dd7630a624855c97a4a2c280cd566da1ef23c`. Host integration branch remains pushed at alpha.4 `686d55c7ea0b029e09688f5858d741a23206bad4`; remote host main has independently advanced to `a2bad82ffb6667b8a6fe3d24b40661f8a01aa8d4`. Preserve newer host work before further integration. A pushed image/release is not evidence of deployment.
- The controlled support/Gmail production round trip and original Test subject visibility are verified as recorded below. Do not repeat those sends. Delivery-event hook activation, notification recipient verification, and final redesigned production access/language/attachment checks remain outstanding.
- Local preview responds HTTP 200 at http://127.0.0.1:4101/admin/mail; this probe confirms availability only. Earlier actual login/HMR checks remain separately recorded below. Brave only; leave Safari untouched.
- Fresh Node 22.23.4 checks: `pnpm test` passes 48 tests across five files in 5.01 seconds; `pnpm typecheck`, `pnpm lint`, and `pnpm format:check` pass. These checks do not replace the pending full redesigned browser/host validation.
- Full redesigned browser suite, final packed-consumer production build, revised dependency/license and resource measurements, documentation/source-graph reconciliation, host integration checks, commit/push/deploy and final production verification remain required. Alpha.4 measurements and full browser/host test results are historical evidence, not alpha.5 certification. The graph reports its older node-ID scheme; refresh it as part of final implementation evidence.

## Current checkpoint — incoming cutover and final event validation

- Deployed image is healthy and its OCI revision is a7ecf24c9f3fb6d7e51ca6fcc875c19dedb253a1 (alpha.2), image ID sha256:66c9b080e6cf259a5dce5d1c8152cb952c7c0b62826542c68a463358d31870d3. This is deployment proof, not final workflow/recipient proof.
- Alpha.3 fixes a real early-Compose settings race and restores host navigation by forwarding initPageResult.permissions/locale to Payload DefaultTemplate. Configuration transport failures show a recoverable alert; Refresh retries the real API, and stale configuration responses cannot replace newer state.
- Local alpha.3: 39 unit/integration tests, five packed-consumer browser journeys (49.5 seconds), clean installation, consumer production build, format/lint/types and measured budgets pass. Real host build/types/lint pass; final host release checks are continuing.
- Remote CI now uses Ubuntu 24.04 and pinned Node 24 actions. Chromium installation passes. Previous remote run exposed the Compose race (3 browser journeys passed, one timed out); alpha.3 adds deterministic delayed-settings and recovery regressions and must pass remotely before cutover.
- Owner sent controlled "Test subject" from Gmail to support. Postal screenshot confirms receipt and Accept-only processing with no endpoint. It is retained in Postal; do not claim it is in Payload yet. Redeliver only that controlled test after authenticated ingress is ready. Support route and event callbacks remain unchanged.
- Production backup and signer provisioning are verified (details below). Native Brave admin session is available again. Signed readiness/replay and transactional support-only Postal cutover/rollback operator are prepared in a disabled Dokploy task KQpXncItbD2hT3I7DCIZk. Only its read-only plan has run; no fixture was posted, route changed or test mail sent by this agent.

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

- Alpha.2 actual host format/lint/types/build and isolated restore passed. Full host suite: **733 tests across 97 files**, 103.34 seconds, no skips or unhandled errors. Upstream subsequently added an auth regression test at b494b42; preserve it in the final integration and validate that added test.
- GitHub library Actions was disabled (confirmed in its Actions UI). Enabled the committed read-only-permissions CI workflow through the owner session; UI confirmed "Actions Enabled." Added workflow_dispatch for repeatable manual verification. Prior local checks were not remote CI runs; monitor the new push before claiming remote success.

- Host alpha.2 integration a00b038ef61010465f6091eb9730398e4959def8 is pushed to main and feat/payload-mail. Preserves b494b42; its seven auth tests pass. Existing queued Dokploy deployment mYtadh0s0MebIWa7ttSjV was still running when inspected. No support-route cutover yet.
- First actual remote library runs 42854272166 / 42854272036 passed install, format/lint/types, all unit tests and clean consumer initialization; failed at Chromium system-dependency installation, so browser/build steps did not run remotely. ubuntu-latest had migrated to Ubuntu 26, while pinned Playwright 1.58.2 nativeDeps defines Ubuntu 22/24. Pin CI to Ubuntu 24.04 and rerun every check. Updated official actions to verified Node 24 releases pinned by commit; previous Node 20 actions were producing deprecation warnings. This is a runner compatibility correction, not skipped validation.

## Incoming status protocol and live test recovery

- Alpha.3 library CI runs 42860492580 and 42860491333 passed the full workflow on 5463a35. Host full suite passed 734/734 tests, 97 files, 100.83 seconds; restore rehearsal and both production builds pass.
- Host main e78dd7630a624855c97a4a2c280cd566da1ef23c includes alpha.3 and preserves upstream footer refactor 52f7809. After that merge, host format/lint/types/build passed. Image is published with manifest sha256:0de1fd9a08228bbacf7182d988265c595ca7f856b1413aad15c680ed50577cfa; Dokploy rollout was already active, so no duplicate manual deploy was requested. Verify the running OCI revision before cutover.
- Latest observed stable app before this rollout: 52f7809186d2c169114be88beaee0c3d7ac6217b, image sha256:9fe988f0f50180788b5ab28da8b319747f5bb570416ce3c996fc6ae7de46d558, healthy. Preserve newer upstream website work.
- Fresh existing SQLite backup job completed again: moftkhar-app-sqlite-20261110T171012Z-114027.zip.gpg, SHA-256 c3ba7ff5cde252f0d229a5ce09a2c914b1b54318239a538f902f585b97fde5d6. Native schedule deployment MnSKAHkS_5FhPvhnrCvlf; online snapshot check/encrypted delivery succeeded.
- Retained owner test located through a narrowly filtered read: Postal ID 4, 2026-11-10T16:50:39Z, raw available, not queued. No message body/token exported. Source confirms redelivery uses add_to_message_queue(manual:true), and a message with no stored endpoint resolves the current support route. Queue only ID 4 after readiness/cutover.
- Running 3.3.7 Delivery.create sends webhooks for incoming HTTP delivery as well as outgoing SMTP. Alpha.4 authenticates/minimizes/deduplicates these legitimate incoming events and completes them without outgoing-history changes. Unknown directions still reject. Real SQLite concurrent replay/completion regression added. Local alpha.4: 41 tests, five browser journeys (46.9 seconds), packed consumer/build, lint/types/format and measured budgets pass. All compiled UI JS files are byte-identical to alpha.3. Remote alpha.4 CI remains to verify.
- Incoming content can be enabled independently after alpha.3 readiness. Keep delivery-event hook disabled until alpha.4 is verified, then test incoming-event acknowledgement and controlled outbound delivery. No SMTP test sent by agent and no route change yet at this checkpoint.

## Support routing correction — 2026-11-10 17:51 UTC

- Owner reported retained Gmail test absent in admin. Postal screenshot explicitly said accepted without endpoints; located only controlled Postal message 4.
- Signed readiness posted twice: 200/200. Read-only exact synthetic diagnostics prove one done receipt, one normalized message, one 51-byte attachment, preserved Persian and Message-ID, raw receipt cleared. Attachment SHA-256 fb077aebbe1be2398afefc93851bc2e5e6a5ae8428d1b6f09226ece7aa175d8c. This is processing evidence, not staff UI proof.
- Native Dokploy job aDMHBXuRzkabLPFmumfKl changed only support route 1 to HTTP endpoint 1. BodyAsJSON/RawMessage, attachments enabled, five-second timeout. Other routes digest unchanged. Private rollback checkpoint retained; no data deleted. Delivery event hook remains disabled/uncreated until alpha.4 runtime is verified.
- First redelivery request lost MCP connection before any job log appeared. Exact owner receipt still absent at diagnostic checkpoint; inspect state before another attempt. Do not claim redelivery from the request alone.
- Host alpha.4 686d55c7ea0b029e09688f5858d741a23206bad4 committed and pushed main/feat after all local checks passed: 734 tests/97 files/95.92 seconds, lint0 errors82 existing warnings, types/build/restore pass. Library CI 42865628742/42865628345 complete success. Release rolling out; actual new image still pending.
- Browser capture again reports cgWindowNotFound. Owner UI confirmation pending; do not forge staff credentials or treat SQL diagnostics as permission/UI evidence. Temporary dedicated Redis verification container stopped.

- Redelivery job wnl8bqJ8hsIxzrc8Qfs0B queued only Postal ID4; subsequent read-only Postal status TaCfaHXkGmPy2DL42iS0q confirms Sent, no queue remaining, correct endpoint, other routes unchanged. App observer GXkDVVA9klHYUXlFXBWa2 confirms one done owner receipt, one incoming message (2) in conversation 2, correct subject, raw receipt cleared, first-attempt processing. Owner asked to refresh/clear filters and confirm UI. No SMTP reply sent yet.
- Public production probes: anonymous inbox and private attachment1 return403/no-store; unsigned incoming and event callbacks return401/no-store, no redirects. Staff download/cross-mailbox production verification still pending.

- Final turn checkpoint: support test processing is proven; owner admin-display confirmation still pending. Alpha.4 app release 686d55c is pushed but no new Dokploy deployment was visible at latest poll (previous healthy e78dd76 remains active). Delivery-event hook still absent. No agent SMTP test was sent. A read-only notification adapter plan was prepared; native MCP run lost its connection before a job log appeared, so no production notification verification is claimed. Release operator remains disabled in notification-plan mode; observer remains disabled/read-only. Do not run notification-send without first reconciling its private attempted marker. Existing adapter import was checked locally with entirely synthetic credentials and no network call.

## Controlled production round trip and redesign steering

- Owner confirmed Test subject visible. Native Safari authorized administrator view independently shows exactly the controlled readiness and owner test. Host nav preserved; Persian/RTL detail opens. Brave ordinary session separately showed Access denied. No privileges minted or cookies extracted.
- Through real production UI, replied in Test subject from support to the explicitly controlled Gmail only, Cc/Bcc empty. Saved durable draft before send with a 146-byte synthetic attachment (SHA-256 80d2dfd426a91b0cbc001bd0aa9868c88ce6c062f42cd04242ec629222648d54). App attachment2; one outgoing submission, UI provider-accepted at one attempt.
- Native Gmail scoped search verified actual Inbox receipt in same original Gmail thread, support From/Reply-To, Persian content, configured signature, attachment, mailed-by psrp.moftkhar.ir, signed-by moftkhar.ir, TLS. This proves recipient-side receipt, not just Postal acceptance.
- Sent an explicitly labeled controlled return reply from Gmail to support with the same synthetic attachment. Gmail confirmed Message sent. Real Payload detail now shows original incoming + outgoing + returned incoming together, preserving Persian and attachment3. Core production round trip is verified. Do not resend either message. Actual credentials/headers/live screenshots remain private/uncommitted.
- Alpha.4 deployment C8b9juDB2wc9CvQXE1XG3 is running but image pull is very slow; old e78dd76 remains healthy and receiving. Do not overlap/cancel release. Delivery-event hook remains off pending verified new runtime. Native notification adapter plan XJvo6ZpKLSj9TjwRH9_QV confirms configured postal/noreply identity without a network call; notification send still pending.
- Owner supplied new redesign brief at attachment f6e35fb9-ead9-49f0-84bf-61eb52ebd7e7/Pasted text.txt: faithfully recreate v3.shadcn.com/examples/mail, maximize actual shadcn reuse, resizable navigation/list/detail panes, real supported Postal capabilities, responsive en/fa/access, tests/docs/commit. This expands the existing task; preserve prior verified workflows. No unrelated screenshot was supplied for this redesign; the live shadcn reference is available.
- Owner now requires Brave only and is working in Safari. Leave Safari untouched from this point forward. CUA round-trip part closed with Verified production mail roundtrip. Rebind Brave by /Applications/Brave Browser.app (bundle ID is ambiguous due cached updater copy). Need authorized admin session in Brave if its ordinary session is still denied.

## shadcn redesign implementation plan and budgets

- Preserve alpha.4 release branch/runtime checkpoint while developing a new branch. Reuse reviewed official v3/new-york registry source and existing host shadcn patterns; preserve MIT notices. No global Tailwind reset/theme override. Route-local client primitives only.
- Implement navigation + paginated list + detail as three resizable panes; mobile single pane with accessible navigation/dialog. Reuse real shadcn Button/Input/Textarea/Badge/Skeleton/Separator/Tabs/Dialog/Tooltip/Select/DropdownMenu/Avatar/ScrollArea/Resizable/Sonner where used. Keep en/fa, RTL, reduced motion and keyboard focus.
- Add indexed, permission-checked message folders and richer conversation summaries, date/sender/recipient/delivery filtering, bounded shared-count reads and safe header/provider delivery inspection. Reuse durable backend for drafts/reply/all/forward/notes; add optional lightweight HTML source composer with server sanitization and isolated preview. No fake folders/actions.
- Installed Postal source app/controllers/legacy_api/{messages,send}\_controller.rb confirms only message/details, deliveries, send/raw and send/message routes. No native list/search/requeue/delete/admin routes. Keep archive/read/drafts/counts in existing app persistence; expose only owned provider IDs via permission-checked server proxy. No credential/domain/webhook mutation UI. Document limitation matrix.
- Existing alpha.4 baseline: tar 41,212 bytes; own compiled client8,064 gzip/CSS4,191; host client delta6,766 gzip/CSS4,044; idle RSS10,665,984 bytes; inboxp95 12.16ms/2 SQLs at1000 conversations/concurrency5.
- New UI budgets before implementation: packed tarball <=225 KiB, own compiled UI+bundled primitive client <=110 KiB gzip excluding React/Payload peers, compiled scoped CSS <=25 KiB; <=20 direct runtime dependencies and <=160 non-peer production packages; idle RSS delta <=50 MiB; enriched inbox <=5 SQL statements and p95<=250ms at same dataset/concurrency; signed burst ACK<5sec. Component accessibility/reuse adds justified client dependencies; measure total graph/host deltas rather than claiming old four-dependency budget.
- Validate real packed consumer, unit/SQLite integration, Playwright desktop/mobile en/fa/resizing/keyboard/axe/malicious mail/provider errors, production builds, dependency/license audit and source graph update. Then integrate reviewed tarball into host, full checks, commit/push/deploy through existing release workflow without overlapping active job.

## Live preview and local sign-in checkpoint

- Current branch feat/shadcn-mail; alpha.5 redesign is in progress and uncommitted. Official shadcn source adapted with MIT notices and source hashes. New typed indexed folder/list/count reads materialize IDs via req + overrideAccess:false; optional Postal inspection uses only owned provider IDs, documented read RPCs and bounded/redacted responses. No new database columns or destructive mutations.
- New three-pane UI, mobile sheet, Radix direction-aware Select/Tabs/menus, scoped portal theme, composer Dialog/inline reply, HTML save-and-preview, safe metadata and provider dialogs are implemented but not yet through the full packed-consumer browser suite. Current backend suite43 tests/4 files passes; types pass. Original alpha.4 full browser/host evidence remains historical, not proof of this redesign.
- Added pnpm dev orchestrator: loopback4101, separate .private/dev and .private/dev-data, initial tarball consumer install, mirrored compiled dist outside node_modules for Fast Refresh, TypeScript/Tailwind watchers, scoped CSS on every change, signed synthetic receipts and durable draft, five-second local provider tick, no external SMTP. Private data survives restart; Ctrl+C stops owned process groups. Playwright test app4100/.private/fixture remains separate.
- Live dev process60327, unified exec session6923, log /tmp/payload-mail-live-dev.log. URL http://127.0.0.1:4101/admin/mail. Synthetic account agent@example.com / Synthetic-password-123! (public disposable fixture credentials). Only that local app uses cookiePrefix payload-mail-dev to avoid other localhost Payload sessions.
- Headless real-app HMR check: six rows, two resize handles, no page errors; saved source translation appears without navigation, then a new Tailwind font-size class resolves to the expected19.5px (from16.25px). Temporary source markers restored. Both TypeScript and CSS watch pipelines are proven.
- Owner saw Access denied when anonymous. Updated server view to redirect anonymous callers to configured Payload login with a trusted return path; authenticated nonstaff still denied and can explicitly sign out. Real browser test signs in through actual form and returns to mail with six rows; customer remains denied and API403. No authorization bypass. Added Next peer for the server redirect import.
- Brave local tab is at corrected login URL; owner asked for username/password and received the fixture values. Leave Safari untouched. Native CUA part closed Opened local preview login. Own headless dev screenshots and scripts remain .private, synthetic only. No redesign deployment or publication is claimed.
- Still required: full UI/browser/RTL/a11y/resize/provider tests, source/license cleanup, package/host measurement updates, clean package/host production builds and integration, full docs/graph update, coherent commits/push/deploy. Original production alpha.4 image/event callback and notification-regression checkpoints also remain to reconcile; core support/Gmail return thread is already recipient-verified.
