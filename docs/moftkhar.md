# Moftkhar integration (deployment-specific)

Owner: Amir Hossein Salighedar. Site: https://moftkhar.ir. Support identity: **Moftkhar Support <support@moftkhar.ir>**. Controlled maintainer inbox: **amirhosseinsalighedar@gmail.com**. Preserve notification identity **noreply@notify.moftkhar.ir**.

Discovered app origin `git@github.com:amirho1/moftkhar.git`, base `1bbc519753bd594960db5b6de75e37ddda198c2d`. Isolated integration worktree `/Users/amirho/Projects/moftkhar-payload-mail`, branch `feat/payload-mail`; original app/dev workspaces have unrelated edits and remain untouched. Infrastructure origin `git@github.com:amirho1/moftkhar-mail.git`; do not turn it into an application.

Read-only live Dokploy discovery on 2026-11-10 found project service `eccomerce`, appName `moftkhar-eccomerce-ts6dae`, Compose ID `uJc3HTht1qsRWrN_ZlPQp`, GitHub owner/repository amirho1/moftkhar, branch main, status done. Latest completed deployment at that check: `bmCqerVi_AOtVNZ_YS_jN`, 12:49:17 UTC. Revalidate before rollout; do not assume the older 77778ce email recovery release is still current.

Existing workflow builds/publishes `ghcr.io/amirho1/moftkhar:main` and commit tag, then triggers the configured Dokploy webhook. Integration must preserve this flow and existing authentication/notification mail. SQLite adapter uses WAL, transactionOptions and busyTimeout; production schema push is disabled. Host access uses admin roles. Use Asia/Tehran as display default with explicit gregory/latn preferences.

Postal: https://mail.moftkhar.ir, API https://mail.moftkhar.ir/api/v1, organization/server moftkhar/transactional. Historical support route was accept-with-no-endpoint. Its current settings and installed signer/version must be revalidated and checkpointed before any mutation. Keep bounce/return-path routing and current SPF/DKIM/MX unchanged unless a concrete verified issue requires a narrow fix.

The existing inbox is https://moftkhar.ir/admin/mail. Support incoming route is active at `/api/mail/postal/moftkhar-transactional/incoming`; signed event callbacks are enabled at `/api/mail/postal/moftkhar-transactional/event`. Current release identity and outstanding checks are maintained in [progress.md](progress.md) and [evidence.md](evidence.md).

The real controlled support/Gmail round trip is recipient-verified. Do not repeat it. Alpha.5 OCI6690356 is deployed and healthy; its signed-in UI and controlled notification recipient checks remain incomplete. Postal7 is the single notification test and must not be resent. Preserve the healthy owner release and correspondence volumes. The established Dokploy encrypted backup workflow passed; the earlier custom SSH backup rejection was not bypassed.

Use Brave only; leave Safari untouched. Only the two controlled addresses above are authorized live test correspondents. Never infer Gmail receipt from provider acceptance. Do not round-trip redacted management-connector environment values; existing image tag is already main.
