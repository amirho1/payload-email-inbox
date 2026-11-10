# Graph Report - src  (2026-11-10)

## Corpus Check
- 28 files · ~10,850 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 136 nodes · 448 edges · 6 communities
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- inbox.tsx
- endpoints.ts
- worker.ts
- postal.ts
- types.ts
- server/index.ts

## God Nodes (most connected - your core abstractions)
1. `MailError` - 25 edges
2. `mailEndpoints()` - 19 edges
3. `MailStore` - 17 edges
4. `saveDraft()` - 13 edges
5. `parsePostalIncoming()` - 10 edges
6. `authorize()` - 10 edges
7. `processMail()` - 10 edges
8. `MailID` - 10 edges
9. `resolveOptions()` - 9 edges
10. `address()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `resolveOptions()` --calls--> `address()`  [EXTRACTED]
  src/config.ts → src/server/validation.ts
- `processMail()` --calls--> `resolveOptions()`  [EXTRACTED]
  src/server/worker.ts → src/config.ts
- `payloadMail()` --calls--> `mailEndpoints()`  [EXTRACTED]
  src/index.ts → src/server/endpoints.ts
- `saveAttachment()` --calls--> `attachment()`  [EXTRACTED]
  src/server/attachments.ts → src/server/validation.ts
- `mailEndpoints()` --calls--> `saveAttachment()`  [EXTRACTED]
  src/server/endpoints.ts → src/server/attachments.ts

## Import Cycles
- None detected.

## Communities (6 total, 0 thin omitted)

### Community 0 - "inbox.tsx"
Cohesion: 0.16
Nodes (17): Language, Mailbox, MailRecord, mailRequest(), Button, Composer(), save(), ComposeSeed (+9 more)

### Community 1 - "endpoints.ts"
Cohesion: 0.24
Nodes (14): downloadAttachment(), queueDraft(), saveDraft(), json(), mailEndpoints(), errorResponse(), authorize(), checkOrigin() (+6 more)

### Community 2 - "worker.ts"
Cohesion: 0.21
Nodes (16): saveAttachment(), acceptReceipt(), MailStore, Row, resolveConversation(), claim(), history(), nextDelivery() (+8 more)

### Community 3 - "postal.ts"
Cohesion: 0.22
Nodes (14): object(), parsePostalEvent(), parsePostalIncoming(), PostalOptions, postalProvider(), string(), MailError, address() (+6 more)

### Community 4 - "types.ts"
Cohesion: 0.13
Nodes (12): submitWithPayload(), composeMime(), mailOptions(), AtomicStore, AttachmentInput, DeliveryEvent, DeliveryState, MailData (+4 more)

### Community 5 - "server/index.ts"
Cohesion: 0.21
Nodes (11): deny(), leaseFields, mailbox, mailCollections(), revision, defaultLimits, resolveOptions(), payloadMail() (+3 more)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MailError` connect `postal.ts` to `endpoints.ts`, `worker.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `mailEndpoints()` (e.g. with `.find()` and `.get()`) actually correct?**
  _`mailEndpoints()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._
- **Why does `MailID` connect `endpoints.ts` to `inbox.tsx`, `worker.ts`, `types.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `saveDraft()` (e.g. with `.cas()` and `.get()`) actually correct?**
  _`saveDraft()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Why does `MailStore` connect `worker.ts` to `endpoints.ts`, `server/index.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._