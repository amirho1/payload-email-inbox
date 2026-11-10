# Graph Report - src  (2026-11-10)

## Corpus Check
- 28 files · ~11,044 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 136 nodes · 449 edges · 5 communities
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5463a35b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- inbox.tsx
- endpoints.ts
- worker.ts
- postal.ts
- types.ts

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
- `object()` --calls--> `MailError`  [EXTRACTED]
  src/providers/postal.ts → src/server/errors.ts
- `string()` --calls--> `MailError`  [EXTRACTED]
  src/providers/postal.ts → src/server/errors.ts

## Import Cycles
- None detected.

## Communities (5 total, 0 thin omitted)

### Community 0 - "inbox.tsx"
Cohesion: 0.16
Nodes (18): Language, Mailbox, MailID, MailRecord, mailRequest(), Button, Composer(), save() (+10 more)

### Community 1 - "endpoints.ts"
Cohesion: 0.26
Nodes (16): downloadAttachment(), queueDraft(), saveDraft(), json(), mailEndpoints(), errorResponse(), MailError, acceptReceipt() (+8 more)

### Community 2 - "worker.ts"
Cohesion: 0.20
Nodes (17): saveAttachment(), MailStore, Row, resolveConversation(), claim(), history(), nextDelivery(), processEvent() (+9 more)

### Community 3 - "postal.ts"
Cohesion: 0.13
Nodes (18): object(), parsePostalEvent(), parsePostalIncoming(), PostalOptions, postalProvider(), string(), submitWithPayload(), composeMime() (+10 more)

### Community 5 - "types.ts"
Cohesion: 0.14
Nodes (15): deny(), leaseFields, mailbox, mailCollections(), revision, defaultLimits, resolveOptions(), payloadMail() (+7 more)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MailError` connect `endpoints.ts` to `worker.ts`, `postal.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `mailEndpoints()` (e.g. with `.find()` and `.get()`) actually correct?**
  _`mailEndpoints()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `postal.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13230769230769232 - nodes in this community are weakly interconnected._
- **Why does `MailID` connect `inbox.tsx` to `endpoints.ts`, `worker.ts`, `types.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `saveDraft()` (e.g. with `.cas()` and `.get()`) actually correct?**
  _`saveDraft()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13846153846153847 - nodes in this community are weakly interconnected._
- **Why does `MailStore` connect `worker.ts` to `endpoints.ts`, `types.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._