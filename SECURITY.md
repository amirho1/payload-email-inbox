# Security policy

Report vulnerabilities privately to **amirhosseinsalighedar@gmail.com**. Include affected version, minimal synthetic reproduction and impact. Do not attach customer mail, private keys, session cookies, reset links or executable attachments. Do not use a public issue for an unpatched vulnerability.

Only the latest alpha on the exact tested compatibility matrix receives fixes; no stable-release or older-major support promise exists yet. Production verification is pending; check docs/evidence.md.

## Trust boundaries

Host user/staff/mailbox predicates are the source of authority. Default is deny. Browser mutations require an explicit trusted Origin, and all collection writes are denied through ordinary REST/Local API access. Service reads pass the request and `overrideAccess:false`; elevated writes occur only after explicit authorization or authenticated worker receipt validation. Host code using privileged Payload Local API is trusted application code and can bypass collection access; do not expose it to clients.

Postal signatures prove that a trusted configured Postal instance forwarded those exact bytes. They do not prove that an SMTP sender or visible From header is authentic. Message-ID and References are attacker-controlled; mailbox and established participants also gate threading. Sender authentication policies remain the host/mail server's responsibility. Never create users from email senders.

Raw callbacks and attachments can be malicious. Request bytes, text, recipients and decoded attachments are bounded. Compressed request bodies are refused. No attachment is executed; downloads use octet-stream, attachment disposition, nosniff and no-store. HTML is sanitized, sandboxed and isolated with deny-all CSP. No server-side remote image fetching occurs. Enable a real `scanAttachment` hook before claiming scanning. Operators should use isolated viewers for suspicious downloads.

No secrets or bodies are intentionally logged. Operational callbacks contain counter names and correlation IDs only. Example Playwright traces may contain synthetic credentials/bodies; never run fixtures with production credentials. Public graph input excludes private mail, keys, attachments and build output.

Configure shared rate limiting and bounded ingress concurrency at the reverse proxy before production. Trust forwarding headers only from a configured proxy. Keep trusted public keys out of callback-selected URLs. Rotate keys with overlapping pinned keys; revoke old keys after Postal changes.

Availability and correspondence integrity depend on the host database, backups, disk limits, scheduler and tested migrations. Unknown submissions require operator reconciliation; neither exactly-once SMTP nor Inbox placement is guaranteed.
