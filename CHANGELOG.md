# Changelog

## 0.1.0-alpha.5 — unreleased

- Reuse official shadcn/Radix components for resizable desktop mail panes, mobile navigation/dialogs, keyboard controls, scoped themes and en/fa RTL/LTR.
- Add permission-scoped indexed folders/counts and sender/recipient/delivery/date filters.
- Add optional bounded Postal message/header/delivery inspection using owned provider IDs; no invented management or requeue API.
- Add HTML source save-and-preview, reopened reply-draft header preservation, anonymous login redirects, and isolated hot-reloading local development.
- Isolate Tailwind property defaults and variables from host styles; retain upstream component licenses.

## 0.1.0-alpha.4 — unreleased

- Authenticate and durably deduplicate Postal incoming-delivery status events, then complete them without changing outgoing history or creating correspondence.
- Verify real SQLite receipt completion and concurrent replay handling for this actual Postal 3.3.7 event shape.

## 0.1.0-alpha.3 — unreleased

- Keep Compose and conversation actions unavailable until mailbox settings load; show configuration failures and recover through Refresh.
- Add deterministic slow-settings and transport-failure browser coverage using real authenticated API responses.
- Forward Payload's actual view permissions/locale to DefaultTemplate so the host collection navigation remains available; verify the host Users link in both language journeys.

## 0.1.0-alpha.2 — unreleased

- Minimize authenticated delivery-event receipts before persistence: retain correlation ID, event and timestamp; discard unrelated recipients, subjects and Postal message tokens. Shared-server notification events still receive bounded out-of-order processing without changing notification delivery.

## 0.1.0-alpha.1 — unreleased

- Initial private Payload mail workflow, Postal 3.3.7 integration and SQLite atomic outbox.
- English/Persian admin inbox, composer, internal notes and permission-checked attachments.
- Real persistence tests and packed consumer/browser fixture.

Core controlled production recipient verification is recorded in docs/progress.md. Each new release still requires its own checks and deployment identity verification. No npm publication is claimed.
