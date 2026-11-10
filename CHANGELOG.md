# Changelog

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

Production and recipient verification remain pending. No npm publication is claimed.
