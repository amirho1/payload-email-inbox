# Release guide

Provisional package payload-plugin-mail, alpha 0.1.0-alpha.4. npm name lookup is not ownership. Public npm publication is a separate release step requiring authenticated maintainer destination and credentials; no publish is performed by implementation checks.

1. Run format/lint/types/unit/real SQLite/packed consumer/browser/accessibility/production build checks; repair failures.
2. Rehearse host migrations and backup restoration; inspect dependency licenses/security advisories and package contents.
3. Measure package, compiled client/CSS, host build/RSS/latency/burst against documented budgets and record hardware/dataset/concurrency.
4. Update changelog, evidence, supported versions and scoped Graphify architecture output. Review artifacts for secrets/private messages/traces.
5. Commit a coherent version and push the reviewed branch. Tag only according to owner release workflow; never force-push unrelated history.
6. `npm pack --dry-run` and clean consumer must show dist declarations/public exports/CSS/license. Do not ship test keys, example DBs or private fixtures.
7. Only an explicit authorized npm release should run npm publish. Protect signing provenance/access tokens using existing release secret management.
