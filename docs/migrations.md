# Migrations, upgrades and uninstall

The library declares collections; the host owns additive migrations. For the tested SQLite adapter, generate migrations after installing/configuring the package using `pnpm payload migrate:create`. Inspect SQL for only intended new mail tables/indexes; preserve historical migrations and unrelated collections. Apply to an isolated restored snapshot first, verify row counts and host auth/email regressions, then back up production before deployment. Never let development schema push run against production.

Keep slugs stable after first deployment. Renaming slugs/paths does not migrate data. Write explicit reviewed migrations preserving records/indexes and update configured routes only after readiness. Keep Payload/Next/UI/React versions pinned to the tested matrix until new packed-consumer/browser/migration tests pass.

Upgrade: snapshot config/image/route, stop destructive retention, drain/reconcile submissions, apply additive migration, deploy app, verify authorization/worker/storage and then callbacks. Do not destroy correspondence on migration failure. Roll back the app and route while retaining new data; destructive down migrations are not a rollback strategy for accepted mail.

Uninstall: restore Postal route to its recorded checkpoint, stop worker scheduling and disable plugin (`enabled:false` returns original config). Keep DB mail tables/backups for export/recovery. Remove import-map entries by regeneration after removing the config/plugin. Explicitly authorize and rehearse eventual data deletion separately. No automatic deletion is performed by disabling/removing the package.
