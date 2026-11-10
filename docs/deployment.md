# Deployment and rollback runbook

Before production, record host repository/commit/image digest, Dokploy service/deployment, Postal support route and endpoint/webhook settings, trusted signer fingerprints, volume mounts and a restorable backup. Do not print env or secret values. Check live state; historical infrastructure docs are not proof.

Complete all package and host checks, isolated additive migrations, restoration and resource budgets first. Push through the owner's existing GitHub/Dokploy procedure. Deploy the app and worker scheduling before changing Postal routes. Verify HTTPS, login/staff/cross-mailbox access, private downloads, DB persistence, migration success, authenticated callback rejection/durable acceptance and queue processing.

Only after readiness, change the one authorized support route to the configured incoming HTTP endpoint and add delivery-event callbacks. Preserve bounce/return-path and automated notification identities. Record rollback route/app values before mutation.

Use controlled labeled production messages only with the explicitly authorized addresses. Verify inbound visibility, agent reply, customer reply threading, attachments/access/no duplicates and notification regression. Record provider acceptance, recipient-server delivery and recipient-observed Inbox placement separately. Check deployed en/fa and resource/queue/error state. Never declare success based on build/job status alone.

If verification fails, restore recorded route/app configuration and preserve durably accepted mail/new schema. Stop uncertain resubmissions; reconcile against Postal before retry. Do not delete correspondence or volumes. Keep additive DB tables on app rollback. Complete root-cause repair before another cutover.
