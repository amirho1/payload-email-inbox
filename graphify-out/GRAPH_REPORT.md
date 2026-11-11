# Graph Report - src  (2026-11-11)

## Corpus Check
- 54 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 271 nodes · 1014 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea7478a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Postal MIME boundary
- Conversation message dialogs
- Permission scoped lists
- SQLite claims and queries
- Durable mail workers
- Responsive pane layout
- Plugin configuration access
- Staff mail endpoints
- Mailbox navigation settings
- Scoped UI surfaces
- HTML isolation
- Inbox composer state
- Accessible mailbox selectors
- Scoped style utilities

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
- `MailError` --calls--> `inspectPostal()`  [EXTRACTED]
  server/errors.ts → providers/postal-inspect.ts
- `MailError` --calls--> `read()`  [EXTRACTED]
  server/errors.ts → providers/postal-inspect.ts
- `MailError` --calls--> `record()`  [EXTRACTED]
  server/errors.ts → providers/postal-inspect.ts
- `MailError` --calls--> `object()`  [EXTRACTED]
  server/errors.ts → providers/postal.ts
- `MailError` --calls--> `parsePostalEvent()`  [EXTRACTED]
  server/errors.ts → providers/postal.ts

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "Postal MIME boundary"
Cohesion: 0.10
Nodes (26): PostalOptions, AttachmentInput, DeliveryEvent, Limits, MailProvider, NormalizedIncoming, ProviderInspection, SubmitResult (+18 more)

### Community 1 - "Conversation message dialogs"
Cohesion: 0.16
Nodes (21): Language, MailRecord, DialogFooter(), DialogHeader(), DialogPortal(), DropdownMenu(), IconButton(), MailFilters() (+13 more)

### Community 11 - "Permission scoped lists"
Cohesion: 0.31
Nodes (9): MailData, countMail(), day(), listMail(), listQuery(), materialize(), scope(), deliveryStates (+1 more)

### Community 2 - "SQLite claims and queries"
Cohesion: 0.10
Nodes (17): AtomicStore, DeliveryState, Mailbox, MailCounts, MailFolder, MailListQuery, MailReadStore, ProviderReceipt (+9 more)

### Community 3 - "Durable mail workers"
Cohesion: 0.23
Nodes (15): MailStore, Row, AtomicPatch, MailID, saveAttachment(), resolveConversation(), claim(), history() (+7 more)

### Community 4 - "Responsive pane layout"
Cohesion: 0.18
Nodes (16): SheetContentProps, Conversation, ResizableHandle(), ResizablePanel(), ResizablePanelGroup(), SheetFooter(), SheetHeader(), SheetPortal() (+8 more)

### Community 5 - "Plugin configuration access"
Cohesion: 0.16
Nodes (14): MailOptions, ResolvedOptions, deny(), mailCollections(), resolveOptions(), payloadMail(), checkOrigin(), mailAccess() (+6 more)

### Community 7 - "Staff mail endpoints"
Cohesion: 0.33
Nodes (13): MailError, downloadAttachment(), queueDraft(), saveDraft(), json(), mailEndpoints(), managementURL(), errorResponse() (+5 more)

### Community 8 - "Mailbox navigation settings"
Cohesion: 0.24
Nodes (10): BadgeProps, ButtonProps, MailState, Badge(), MailNavigation(), MailSettings(), badgeVariants, Button (+2 more)

### Community 10 - "Scoped UI surfaces"
Cohesion: 0.36
Nodes (4): useMailSurface(), ScrollArea, ScrollBar, TooltipContent

### Community 6 - "Inbox composer state"
Cohesion: 0.26
Nodes (12): mailRequest(), Skeleton(), Tabs(), Composer(), save(), MailList(), useMail(), Input (+4 more)

### Community 9 - "Accessible mailbox selectors"
Cohesion: 0.23
Nodes (9): Select(), Choice(), SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator (+1 more)

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Responsive pane layout` to `Conversation message dialogs`, `Inbox composer state`, `Mailbox navigation settings`, `Accessible mailbox selectors`, `Scoped UI surfaces`, `Scoped style utilities`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `mailEndpoints()` (e.g. with `.mutate()` and `.get()`) actually correct?**
  _`mailEndpoints()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `Postal MIME boundary` be split into smaller, more focused modules?**
  _Cohesion score 0.10420168067226891 - nodes in this community are weakly interconnected._
- **Why does `MailID` connect `Durable mail workers` to `Conversation message dialogs`, `SQLite claims and queries`, `Inbox composer state`, `Staff mail endpoints`, `Permission scoped lists`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `SQLite claims and queries` be split into smaller, more focused modules?**
  _Cohesion score 0.10098522167487685 - nodes in this community are weakly interconnected._
- **Why does `MailError` connect `Staff mail endpoints` to `Postal MIME boundary`, `Durable mail workers`, `Permission scoped lists`, `Plugin configuration access`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._