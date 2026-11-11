# Postal capability boundary

Verified against the deployed open-source Postal 3.3.7 source, especially `app/controllers/legacy_api/messages_controller.rb`, `send_controller.rb` and `base_controller.rb`. This is not postal.so.

| Capability                               | Source of truth                         | Plugin behavior                                                                     |
| ---------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| Incoming content                         | Signed HTTP endpoint                    | Durable authenticated receipt, asynchronous MIME normalization                      |
| Delivery/bounce changes                  | Signed webhooks                         | Durable minimized events, deduplication and terminal-state precedence               |
| Compose/reply/forward                    | `POST /api/v1/send/raw`                 | Maintained MIME construction, envelope Bcc, configured From identities              |
| Native details/headers                   | `POST /api/v1/messages/message`         | Explicit owned-message inspection with status/details/inspection/headers expansions |
| Native delivery attempts                 | `POST /api/v1/messages/deliveries`      | Explicit owned-message inspection, redacted SMTP summaries and TLS                  |
| Inbox/list/search/counts                 | Application SQLite collections          | Permission-scoped indexed pagination, visible previews and filters                  |
| Read/unread, drafts, archive, notes      | Application collections                 | Durable local workflow, not claims of native Postal folders                         |
| Definite failed-send retry               | Application durable outbox              | New guarded attempt; no requeue RPC invented                                        |
| Ambiguous submission                     | Application state + operator inspection | No automatic resend; inspection does not establish idempotency                      |
| Delete/cancel/requeue                    | No supported v1 mutation API verified   | No provider mutation action exposed                                                 |
| Domains, servers, keys, webhooks, routes | Postal dashboard                        | Optional trusted HTTPS dashboard link; no fake API/settings controls                |
| Spam/Trash/marketing folders             | No corresponding plugin workflow        | Not displayed as nonfunctional controls                                             |

Inspection authenticates through the configured server API key, refuses redirects, requires HTTPS, limits each response to 512 KiB decoded and five seconds, limits owned provider IDs to ten and performs at most two RPCs concurrently. Only whitelisted visible headers are returned. Bcc, credentials, tokens and arbitrary extension headers are omitted; SMTP diagnostic links/addresses/credential-looking values are redacted. Incoming legacy IDs can be recovered only from the persisted provider/mailbox receipt namespace. The client never supplies an arbitrary Postal ID or URL.

Local emulator inspections say Captured and expose no external SMTP delivery. Automated inspection tests intercept transport only; route authorization and all browser persistence remain real. Production configuration and retained test-message verification are documented separately in moftkhar.md and progress.md.
