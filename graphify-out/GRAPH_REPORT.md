# Graph Report - src  (2026-11-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 271 nodes · 1014 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `23c10eb1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- postal.ts
- message.tsx
- types.ts
- worker.ts
- cn
- permissions.ts
- composer.tsx
- MailError
- navigation.tsx
- controls.tsx
- ref_react
- list.ts
- utils.ts
- server/index.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 61 edges
2. `MailError` - 35 edges
3. `MailInbox()` - 23 edges
4. `mailEndpoints()` - 22 edges
5. `useMailSurface()` - 19 edges
6. `Button` - 19 edges
7. `MailStore` - 18 edges
8. `Message()` - 17 edges
9. `IconButton()` - 15 edges
10. `Composer()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `inspectPostal()` --calls--> `MailError`  [EXTRACTED]
  providers/postal-inspect.ts → server/errors.ts
- `read()` --calls--> `MailError`  [EXTRACTED]
  providers/postal-inspect.ts → server/errors.ts
- `record()` --calls--> `MailError`  [EXTRACTED]
  providers/postal-inspect.ts → server/errors.ts
- `object()` --calls--> `MailError`  [EXTRACTED]
  providers/postal.ts → server/errors.ts
- `parsePostalEvent()` --calls--> `MailError`  [EXTRACTED]
  providers/postal.ts → server/errors.ts

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "postal.ts"
Cohesion: 0.10
Nodes (26): inspectPostal(), read(), record(), redactPostalDiagnostic(), safeHeaders(), object(), parsePostalEvent(), parsePostalIncoming() (+18 more)

### Community 1 - "message.tsx"
Cohesion: 0.16
Nodes (21): Language, MailRecord, Avatar, AvatarFallback, AvatarImage, DialogContent, DialogDescription, DialogFooter() (+13 more)

### Community 2 - "types.ts"
Cohesion: 0.10
Nodes (17): sqliteMailQueries(), states, sqliteAtomicStore(), AtomicStore, DeliveryState, Mailbox, MailCounts, MailFolder (+9 more)

### Community 3 - "worker.ts"
Cohesion: 0.23
Nodes (15): saveAttachment(), MailStore, Row, resolveConversation(), claim(), history(), nextDelivery(), processEvent() (+7 more)

### Community 4 - "cn"
Cohesion: 0.18
Nodes (16): ResizableHandle(), ResizablePanel(), ResizablePanelGroup(), SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader() (+8 more)

### Community 5 - "permissions.ts"
Cohesion: 0.16
Nodes (14): deny(), leaseFields, mailbox, mailCollections(), revision, defaultLimits, resolveOptions(), payloadMail() (+6 more)

### Community 6 - "composer.tsx"
Cohesion: 0.26
Nodes (12): mailRequest(), Input, Skeleton(), Tabs(), TabsContent, TabsList, TabsTrigger, Textarea (+4 more)

### Community 7 - "MailError"
Cohesion: 0.33
Nodes (13): downloadAttachment(), queueDraft(), saveDraft(), json(), mailEndpoints(), managementURL(), errorResponse(), MailError (+5 more)

### Community 8 - "navigation.tsx"
Cohesion: 0.24
Nodes (10): Badge(), BadgeProps, badgeVariants, Button, ButtonProps, buttonVariants, Separator, MailNavigation() (+2 more)

### Community 9 - "controls.tsx"
Cohesion: 0.23
Nodes (9): Select(), SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger (+1 more)

### Community 10 - "ref_react"
Cohesion: 0.36
Nodes (4): ScrollArea, ScrollBar, TooltipContent, useMailSurface()

### Community 11 - "list.ts"
Cohesion: 0.31
Nodes (9): countMail(), day(), deliveryStates, folders, listMail(), listQuery(), materialize(), scope() (+1 more)

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `message.tsx`, `composer.tsx`, `navigation.tsx`, `controls.tsx`, `ref_react`, `utils.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `mailEndpoints()` (e.g. with `.find()` and `.get()`) actually correct?**
  _`mailEndpoints()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `postal.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10420168067226891 - nodes in this community are weakly interconnected._
- **Why does `MailID` connect `worker.ts` to `message.tsx`, `types.ts`, `composer.tsx`, `MailError`, `list.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._
- **Why does `MailError` connect `MailError` to `postal.ts`, `worker.ts`, `list.ts`, `permissions.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._