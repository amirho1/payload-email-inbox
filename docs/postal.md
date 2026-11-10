# Postal 3.3.7 setup

These contracts were inspected in the upstream 3.3.7 source. Revalidate against the actual deployed source before changing routes. The current online HTTP-payload docs disagree with this version's retry mapping.

## Paths and formats

For provider key `postal`, default paths are:

- Incoming content: `https://app.example.com/api/mail/postal/postal/incoming`
- Delivery/bounce events: `https://app.example.com/api/mail/postal/postal/event`

Configure one provider key per Postal server. Add the receiving mailbox identity and matching envelope recipient to plugin configuration. The incoming URL does not accept a claimed mailbox ID. For the HTTP endpoint choose **BodyAsJSON** and **RawMessage**, include attachments and leave reply stripping disabled. RawMessage in 3.3.7 includes id, rcpt_to, mail_from, message/base64/size. Hash/processed JSON is also parsed, but RawMessage is preferred for Unicode/MIME/reply preservation. FormData is not supported by this adapter.

Add an event webhook for MessageSent, MessageDelayed, MessageDeliveryFailed, MessageHeld and MessageBounced. Events have the wrapper `{event,timestamp,payload,uuid}`, not just the inner payload shown in some documentation examples. Disable tracking; click/open events are not mail delivery proof and are not supported.

After exact-byte authentication, event receipts retain only event UUID/type/time and the outgoing Postal message ID/direction. Recipient addresses, subjects, message tokens and bounce content are discarded before storage. A shared Postal server may emit events for the host's existing notification adapter: unmatched IDs receive bounded out-of-order retries and remain isolated from inbox messages. They never cause resubmission of notification mail.

Postal 3.3.7 also emits delivery events for incoming HTTP deliveries. Their signatures, envelope and IDs are validated and receipts are durably deduplicated, then completed without changing outgoing delivery history or creating messages. Unknown direction values are rejected. This prevents legitimate incoming status callbacks from entering Postal's failure/retry loop.

## Authentication and rotation

`Postal::HTTP` adds X-Postal-Signature-256 (RSA SHA256 over the exact raw body bytes), a legacy SHA1 signature and a KID. The adapter requires the SHA256 signature and checks only configured PEM public keys. It does not fetch a key from KID, request host or callback URLs. Both incoming sender and webhook service in 3.3.7 use sign:true. Provision the actual Postal signer public key over an authenticated operator channel, compare its fingerprint out of band, then store it in host secret/config management. Public keys are not confidential but their integrity matters.

Rotation: add new trusted PEM alongside old (max four), deploy, rotate Postal signing key through its established supported procedure, verify both callback types, then remove retired PEM after the overlap/retry period. Do not rotate DKIM or tenant API credentials incidentally. No invented shared-secret header/proxy is required for this inspected version.

## Deadline and retry mapping

Incoming deadline defaults to 5 seconds (endpoint timeout configurable 5–60). Authenticate, validate bounded envelope, insert a unique durable receipt, return 200. Heavy MIME/scanning is asynchronous.

Source `app/senders/http_sender.rb` in 3.3.7:

| Result                     | Postal behavior           |
| -------------------------- | ------------------------- |
| 2xx                        | Success                   |
| 5xx or network/TLS/timeout | SoftFail, retry           |
| 429                        | HardFail; suppress bounce |
| Other 4xx                  | HardFail                  |

Therefore transient DB/admission failure returns 503, invalid signature 401, invalid route/input 400/403, oversize 413. Never use 429 for temporary receiving overload on this version. Online docs describe different behavior; pinned source takes precedence. Verify this experimentally in an isolated server before production rerouting.

Event delivery service uses 5 second timeout, accepts any 2xx, and retries failures after 2,3,6,10,15 minutes (initial attempt plus five retries). Persist before 200; monitor failed durable work as well as Postal webhook history.

## Sending

Postal v1 `/send/raw` uses server-scoped X-Server-API-Key, separate from callback signing. Endpoint is configured server-side, requires HTTPS, refuses redirects and bounds response size/time. Nodemailer constructs MIME; Bcc is removed from visible headers while envelope recipients include it. Submission IDs are retained per message; events are provider-scoped and cannot identify arbitrary private rows.

There is no documented v1 idempotent submission key. Network timeout, malformed success, uncertain server response or process interruption is ambiguous. Do not blindly resend. Postal's accepted queue owns SMTP retries. MessageSent proves recipient-server/endpoint delivery, not Inbox placement.

## Primary source references

- https://github.com/postalserver/postal/blob/3.3.7/lib/postal/http.rb
- https://github.com/postalserver/postal/blob/3.3.7/lib/postal/signer.rb
- https://github.com/postalserver/postal/blob/3.3.7/app/senders/http_sender.rb
- https://github.com/postalserver/postal/blob/3.3.7/app/services/webhook_delivery_service.rb
- https://docs.postalserver.io/developer/http-payloads/
- https://docs.postalserver.io/developer/webhooks/

Protocol unit/integration fixtures are synthetic and mirror these envelopes. A successful local signed emulator is not proof that the production Postal process uses an unmodified source tag.
