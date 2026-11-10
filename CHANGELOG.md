# Changelog

## 0.1.0-alpha.2 — unreleased

- Minimize authenticated delivery-event receipts before persistence: retain correlation ID, event and timestamp; discard unrelated recipients, subjects and Postal message tokens. Shared-server notification events still receive bounded out-of-order processing without changing notification delivery.

## 0.1.0-alpha.1 — unreleased

- Initial private Payload mail workflow, Postal 3.3.7 integration and SQLite atomic outbox.
- English/Persian admin inbox, composer, internal notes and permission-checked attachments.
- Real persistence tests and packed consumer/browser fixture.

Production and recipient verification remain pending. No npm publication is claimed.
