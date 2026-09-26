# Implementation Plan: Session Journal (data model, persistence & lifecycle)

**Branch**: `163-session-journal` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/163-session-journal/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

First of four planned slices of the Session Journal feature (#3402, tracked as #3406). Delivers the `SessionJournal`/`JournalSection`/`JournalEntry` data model, IndexedDB persistence, and a start/resume/end lifecycle, surfaced only via a three-state control in the existing Quicknote/Scratchpad UI. Technical approach: pure lifecycle/validation/ordering logic extracted into a new `packages/session-journal-engine` workspace package (mirroring `packages/chronology-engine`'s split from `calendar.svelte.ts`), glued to a single `$state`-bearing `SessionJournalStore` in `apps/web` that persists to the existing shared `idb`-backed `CodexDB` (mirroring `calendar.svelte.ts`, not Quicknote's separate Dexie database). The store's entry-append API is shaped so slice 3 (#3408, automatic capture) can call it from an `AppEventBus` listener later without a breaking change.

This slice also wires session journals into the existing cloud backup feature (FR-016/FR-017): the personal, opt-in cloud backup a vault can already enable now includes journals in its snapshot and restore, alongside entities/maps/canvases, with the consent screen updated to say so. This does **not** extend to the separate guest/player-facing vault export, which stays exactly as it is today.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `idb` (via `apps/web/src/lib/utils/idb.ts`), existing `vault-registry.svelte.ts`; no new third-party dependency. New internal workspace package `packages/session-journal-engine` (framework-free). Existing `packages/cloud-backup-sync` (bundle/delta payload shape) and `apps/web/src/lib/stores/cloud-backup.svelte.ts` (restore wiring) for FR-016.
**Storage**: Browser-local IndexedDB, via the shared `CodexDB` schema (new `session_journals` object store, `by-vault` index) — not a new database, not Dexie.
**Testing**: Vitest. `session-journal-engine`: plain unit tests, no mocking. `session-journal.svelte.ts`: `getDB()` mocked with an in-memory fake, following `calendar.test.ts`.
**Target Platform**: Browser (existing SvelteKit web app), no server/API component.
**Project Type**: Web application feature — new workspace package + store + Svelte components within the existing `apps/web` app.
**Performance Goals**: No new measurable performance goal beyond SC-005 (adding a journal entry must not perceptibly slow down any other in-progress activity) — this is a small, low-frequency write path (manual notes only in this slice), well within the existing IndexedDB store's demonstrated headroom for similarly-sized records (`canvases`, `dice_history`).
**Constraints**: Must not alter or degrade Quicknote/Scratchpad's existing transient-note behavior (spec FR-015). Must not introduce a second, redundant persistence mechanism (research.md's Alternatives Considered). Cloud backup inclusion (FR-016) must reuse the existing opt-in cloud backup feature's payload/restore/consent surface rather than a parallel sync path, and must not appear in the separate guest/player-facing vault export (FR-016).
**Scale/Scope**: Single vault's worth of journals at a time in the UI; no pagination requirement in this slice (a vault accumulates at most a few dozen journals per year of real play, well within an unpaginated `listJournals()`'s comfortable range).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First** — PASS. Lifecycle/validation/ordering logic extracted into `packages/session-journal-engine`; `apps/web` store is a thin glue layer (see research.md, data-model.md).
- **II. TDD** — PASS (planned). `session-journal-engine`'s pure functions and `session-journal.svelte.ts`'s store methods each get unit tests before/alongside implementation; tasks.md will sequence tests ahead of or alongside their implementation per user story.
- **III. Simplicity & YAGNI** — PASS. No new third-party dependency; reuses the existing `idb` package and `vault-registry` pattern rather than introducing a new persistence library. Explicitly does not build the global indicator, automatic capture, or promote-to-entity in slice 1 (deferred to #3407–#3409, per spec). The global indicator is now planned as slice 2 — see the Slice 2 Addendum below.
- **IV. AI-First Extraction** — N/A. This slice has no Oracle/AI interaction.
- **V. Privacy & Client-Side Processing** — PASS. Journal data is fully browser-local by default (IndexedDB); no remote storage happens unless the user has separately, previously opted into this vault's cloud backup — a pre-existing feature that already satisfies all six conditions of the Narrow Exception. This slice does not invoke the exception itself; it extends an already-compliant surface with one more data type, and re-affirms each condition still holds with journals included: (1) off by default — journals back up only if cloud backup is already enabled, never on their own; (2) informed consent — the consent screen copy is updated to name session journals among what is stored (FR-016), so nothing new is stored silently; (3) reversible — disabling/deleting the existing backup already covers everything in it, journals included, with no separate control needed; (4) local remains authoritative — the store's local IndexedDB copy is unaffected by backup/restore either way; (5) no onward sharing — journals flow through the exact same upload path as entities/maps/canvases, which already satisfies this; (6) internal access — support access to a backup already covers its full content, journals included, under the existing disclosure.
- **VI. Clean Implementation** — PASS (planned). `bun run lint:changed` / `bun run test:changed` and `svelte-check` will gate the PR per this repo's own AGENTS.md rules.
- **VII. User Documentation** — PASS (planned). A help-content entry for Session Journal will be added to `apps/web/src/lib/config/help-content.ts`, plus a `FeatureHint` given the multi-step nature (start → note → optional sections → end) — tracked as a task.
- **VIII. Dependency Injection** — PASS. `SessionJournalStore` takes `vaultRegistry` and DB access via constructor injection with production defaults, matching `QuickNoteStore`/`calendar.svelte.ts`.
- **IX. Natural Language** — PASS (planned). UI copy ("Start Session Journal" / "Open Session Journal" / "Resume Session Journal") already matches this principle's plain-language bar; no jargon introduced.
- **X. Quality & Coverage** — PASS (planned). New package targets the 70% goal for new logic extractions on introduction (Principle X).
- **XI. Agent Operational Protocol** — PASS. This plan states approach and assumptions explicitly (see spec.md Assumptions); scope is deliberately narrow (data model/persistence/lifecycle only).
- **XII. Labels Over Tags** — N/A. No tagging/categorization surface in this slice.

### Discovery Intent Check

N/A — this feature has no public, indexable discovery page. It is an authenticated, in-app tool surface (Quicknote/Scratchpad), not `/for`, `/answers`, `/examples`, `/solutions`, `/vs`, `/import`, a generator/tool landing page, or an evergreen reference post.

### Bounded Responsibility Check

- [x] Files this feature will touch that already exceed 500 lines are listed, excluding tests and data-only modules.
- [x] For each, either the single responsibility it still holds is named, or a decomposition is planned as part of this work.
- [x] New behaviour that does not belong to a listed file's existing responsibility has an extraction target.
- [x] Any planned split carries its tests across, or gains its own.

Files under 500 lines (gate does not trigger): `QuickNoteScratchpad.svelte` (178), `quicknote.svelte.ts` (423), `vault-registry.svelte.ts` (162, read-only — not modified), `idb.ts` (453, gaining one guarded object-store block, consistent with how every other store was added; worth flagging that it's approaching the trigger for whichever future feature adds the _next_ object store, not this one).

Files over 500 lines, touched only for FR-016 (cloud backup inclusion) — each named per its still-held single responsibility, with the change confined to that responsibility (Principle XIV.1/XIV.3), not a new concern:

- `packages/cloud-backup-sync/src/cloud-backup-sync.ts` (920 lines) — responsibility: "build, parse, and reconcile a cloud backup bundle/delta." Adding a `sessionJournals` field alongside the existing `maps`/`canvases` optional bundle fields is the same category of change as those, not a new responsibility. No split planned.
- `apps/web/src/lib/stores/cloud-backup.svelte.ts` (1,162 lines) — responsibility: "client-side orchestration of one vault's cloud backup lifecycle" (enable/disable/attach/backup/restore/auto-sync/conflict-resolution — one class, one cohesive concept per its own method list, not several unrelated concerns). Adding an `importSessionJournals` restore-dependency hook follows the exact existing `importMaps`/`importCanvases` pattern. This file is already known to be over any reasonable line-count budget (flagged in PR #3404's own Fallow audit caveat, pre-existing and unrelated to that PR too) and is a fair decomposition candidate on its own merits — but splitting a 1,162-line file is disproportionate to this slice's one-hook addition and would violate Principle XI.3 (surgical changes only). No split planned as part of this slice; noted here for whichever future change takes on `cloud-backup.svelte.ts` as its primary subject.
- `apps/web/src/lib/components/settings/CloudBackupSettings.svelte` (530 lines) — responsibility: "cloud backup settings UI and consent copy." The FR-016 change is a copy-text update (naming session journals among what's stored), not new behavior. No split planned.
- `apps/web/src/lib/app/init/app-init.ts` (910 lines) — responsibility: "wire production dependencies into stores at app startup." Adding `sessionJournals: sessionJournalStore.allJournals` to the existing `buildPayload` call's third argument is one line, following the existing `maps`/`canvases` wiring immediately above it. No split planned.

## Project Structure

### Documentation (this feature)

```text
specs/163-session-journal/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── session-journal-store-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/session-journal-engine/
├── package.json          # mirrors packages/chronology-engine's shape
├── src/
│   ├── types.ts           # SessionJournal, JournalSection, JournalEntry, JournalEntryInput
│   ├── engine.ts           # startOrResumeJournal, endJournal, appendEntry, createSection,
│   │                       # renameSection, validateSectionName — pure, no I/O
│   └── index.ts            # re-exports
└── tests/
    └── engine.test.ts

apps/web/src/lib/
├── stores/
│   ├── session-journal.svelte.ts       # $state + DI + idb.ts persistence + engine calls
│   ├── session-journal.test.ts          # mocks getDB(), follows calendar.test.ts
│   └── cloud-backup.svelte.ts           # +importSessionJournals restore hook (FR-016)
├── utils/
│   └── idb.ts                           # +session_journals object store, +by-vault index
├── app/init/
│   └── app-init.ts                      # +sessionJournals in buildPayload wiring (FR-016)
└── components/
    ├── quicknote/
    │   ├── QuickNoteScratchpad.svelte      # +three-state Start/Open/Resume control
    │   ├── QuickNoteScratchpad.test.ts      # existing suite, extended for the new control
    │   ├── SessionJournalView.svelte        # new: entry list, add-note field, sections
    │   └── SessionJournalView.test.ts
    └── settings/
        └── CloudBackupSettings.svelte      # consent copy: name session journals (FR-016)

apps/web/src/lib/config/
└── help-content.ts                        # +Session Journal entry (Constitution VII)

packages/cloud-backup-sync/src/
└── cloud-backup-sync.ts                   # +sessionJournals bundle/delta field (FR-016)
```

**Structure Decision**: New pure-logic package `packages/session-journal-engine` (Constitution I), thin store glue in `apps/web/src/lib/stores/session-journal.svelte.ts` persisting through the existing shared `idb.ts` schema, and UI additions confined to the existing `apps/web/src/lib/components/quicknote/` directory (no new top-level UI area — this slice is explicitly Quicknote-only per spec scope; the global indicator is #3407's job). Cloud backup inclusion (FR-016) is wired entirely through existing extension points in `cloud-backup-sync`, `cloud-backup.svelte.ts`, `app-init.ts`, and `CloudBackupSettings.svelte` — no new backup mechanism, no new consent flow.

## Complexity Tracking

_No Constitution Check violations — this section is not needed._

---

## Slice 2 Addendum: Global Session Journal access point (#3407)

**Spec**: User Story 5, FR-018–FR-023, SC-007–SC-008, and the "Slice 2 assumptions" block in [spec.md](./spec.md). Built on the same branch and spec directory as slice 1; slice 1's data model, persistence and cloud backup are unchanged (FR-023).

### Summary

Slice 1 left the journal reachable only via Quicknote/Scratchpad's Notes → Journal tab path. Slice 2 adds a Session Journal control to the app's shared tool chrome that shows the FR-010 state and opens the scratchpad panel directly on its Journal tab.

The panel is already mounted once in `apps/web/src/routes/(app)/+layout.svelte` (`<QuickNoteScratchpad />`) and is toggled from the `quicknote` tool item in `nav-items.ts` and by Ctrl/Cmd+I. So this slice does **not** need a new panel, a new route, or a second view. It needs two things:

1. The panel's selected tab (`"notes" | "journal"`) is currently local `$state` inside `QuickNoteScratchpad.svelte`, which nothing outside can set. Lift it into `QuickNoteStore` so a global control can open the panel on the Journal tab.
2. A new tool item in the shared `nav-items.ts` list. Both the Activity Bar (desktop) and the mobile menu drawer already render from that list, so one item appears in both, and it is left out of guest mode the same way the `quicknote` item is.

### Technical Context (delta from slice 1)

**Dependencies**: None new. Reuses `SessionJournalStore.controlState`/`open()` (contract unchanged), `QuickNoteStore`, `nav-items.ts`, `ActivityBar.svelte`, `MobileMenu.svelte`.
**Storage**: None. No new IndexedDB store, no `DB_VERSION` change, no cloud-backup change. The selected tab is transient in-memory UI state, like `isOpen`.
**Testing**: Vitest. `QuickNoteStore` gets unit tests for the new tab state. `nav-items.test.ts`, `ActivityBar.test.ts` and `MobileMenu.test.ts` get cases for the new item and indicator. A component test covers `QuickNoteScratchpad` reading the store's tab.
**Constraints**: Must not change Notes-tab behaviour or the Ctrl/Cmd+I shortcut (FR-023). The item must not be shown in guest mode (FR-018), matching the `quicknote` item's `!sessionModeStore.isGuestMode` guard. On phones the item is `overflow` (reached via the menu drawer), because the bottom bar does not wrap and each extra item narrows every other tap target (comment on `shellClass` in `ActivityBar.svelte`).

### Design decisions

- **Tab state lives in `QuickNoteStore`, with a single `openJournal()` method.** `openJournal()` sets `isOpen = true` and `activeTab = "journal"` **directly**, and never toggles the panel closed (FR-020, idempotent). It deliberately does not call `open()`: `open()` auto-selects the newest note or calls `startNewNote()` when none is selected (`quicknote.svelte.ts:107-118`), so reusing it would create or select a Notes draft every time the journal is opened, breaking FR-023. `open(note)` for a specific note sets `activeTab = "notes"`, because opening a note while the panel was last left on Journal would otherwise show the wrong tab. A plain `open()`/`toggle()` keeps the last tab, which is what the local state did before, so Ctrl/Cmd+I behaviour is unchanged (FR-023). `activeTab` is not reset by `close()` or by a vault switch (it is panel UI state, not vault state); only `controlState` follows the vault (FR-022).
- **The nav item's action, not the store, decides Resume vs Open.** The action calls `quickNoteStore.openJournal()` and, only when `controlState === "resume"`, `sessionJournalStore.open()` (FR-021), so the Journal view lands on the live journal instead of another Resume screen. In the `start` state it opens the Start screen and never calls `start()` (FR-021; rationale in spec assumptions: no delete exists).
- **Label and title are derived from `controlState`.** `navItems()` is already read inside `$derived`, so reading `sessionJournalStore.controlState` inside it stays reactive. Because that state is per-vault (`activeVaultId` effect in the store), FR-022's vault-switch requirement needs no extra code.
- **Active-state indicator, not colour alone.** `ActivityBar.svelte` and `MobileMenu.svelte` already draw a badge for `quicknote` when `quickNoteStore.count > 0`. The journal item gets the same kind of badge whenever `controlState !== "start"`, and the accessible label carries the state text so the state is not colour-only.
- **`isToolActive` gets a special case** for `session-journal`: active when `quickNoteStore.isOpen && quickNoteStore.activeTab === "journal"`. The default rule (`layoutUIStore.activeSidebarTool === item.id`) would never light it up, the same reason `guest-chat` and `generators` are special-cased today.

### Alternatives considered and rejected

- **A floating always-on journal widget.** Rejected: duplicates the panel, needs its own z-index/overlay handling next to the scratchpad's `z-[100]`/`z-[101]` overlay, and breaks the "same journal view, not a second implementation" rule (FR-020).
- **A new route or sidebar tool for the journal.** Rejected: journal state would then have two homes (panel and route), and the scratchpad is already mounted at layout level, so it survives navigation without help.
- **Clicking the control in the `start` state starts a journal immediately.** Rejected: with no delete capability, a mis-click leaves a permanent empty journal. Two actions (control → Start) is still within SC-001's three.
- **Keeping `activeTab` local and driving it through a DOM event or prop.** Rejected: stores are how this repo shares cross-component UI state, and a store field is directly unit-testable.

### Project Structure (slice 2 changes only)

```text
apps/web/src/lib/
├── stores/
│   └── quicknote.svelte.ts              # +activeTab $state, +openJournal(); open(note) sets tab "notes"
└── components/
    ├── layout/
    │   ├── nav-items.ts                 # +`session-journal` tool item; isToolActive special case
    │   ├── ActivityBar.svelte           # +active-journal indicator
    │   └── MobileMenu.svelte            # +active-journal indicator
    └── quicknote/
        └── QuickNoteScratchpad.svelte   # local activeTab → quickNoteStore.activeTab
apps/web/src/lib/content/help/quicknote.md   # mention the global control
```

Not touched: `SessionJournalView.svelte`, `session-journal.svelte.ts`, `packages/session-journal-engine`, `idb.ts`, cloud-backup files, `+layout.svelte`.

### Constitution Check (slice 2 delta)

- **I. Library-First** — PASS / N/A. No new logic worth extracting: the state derivation stays in `session-journal-engine` via `controlState`; this slice is UI wiring.
- **II. TDD** — PASS (planned). Tests precede implementation in tasks.md Phase 8, with success and negative paths (see tasks T041–T045).
- **III. Simplicity & YAGNI** — PASS. One store field, one method, one nav item, one indicator. No new shortcut, no widget, no route, no persistence.
- **V. Privacy** — PASS / N/A. No new data collected or stored.
- **VII. User Documentation** — PASS (planned). Help content updated for the new entry point (T050).
- **VIII. Dependency Injection** — PASS. `QuickNoteStore` keeps its constructor injection; the nav item reads the existing singletons the same way the `quicknote` item does.
- **IX. Natural Language** — PASS. Labels reuse "Start/Open/Resume Session Journal".
- **X. Quality & Coverage** — PASS (planned), per T041–T045.
- **XI. Agent Operational Protocol** — PASS. Assumptions stated in spec.md; changes are surgical.
- Principles IV, XII and the Discovery Intent check remain N/A (no AI, no tags, no public page).

### Bounded Responsibility Check (slice 2 delta)

No touched file exceeds 500 lines: `nav-items.ts` (256), `ActivityBar.svelte` (103), `MobileMenu.svelte` (280), `QuickNoteScratchpad.svelte` (231), `quicknote.svelte.ts` (423, +~15 lines for the tab state and `openJournal()`). `quicknote.svelte.ts` is the closest to the trigger. Panel-host state (open/close/tab) is still within its single responsibility, "state of the Quicknote/Scratchpad panel and its notes", so no split is planned, but the next feature to add to this file should plan a decomposition.

### Risks

- **`quicknote.svelte.ts` growth.** Mitigated by keeping the addition to a field plus one method.
- **Tab-state semantics for `open(note)`.** Covered by an explicit negative test (T041).
- **Overlay stacking.** The panel is a modal overlay (`z-[100]`/`z-[101]`) and the Activity Bar sits at `z-[80]`, so while the panel is open the global control is behind the backdrop and a pointer user cannot select it. That is acceptable: the control's job is to open the panel, and the panel has its own close button and tab buttons. The spec therefore treats "invoked while already open" as a store-level guarantee (FR-020, tested in T041) for keyboard or programmatic callers, not as a user-visible flow.
- **Popup / fullscreen windows.** Checked in `+layout.svelte`: `<ActivityBar />` renders only when `!isPopup && !isVttFullscreen && !isZenPopout && !guidedModeStore.isGuidedMode`, and the mobile menu is opened from `AppHeader` under the same `!isPopup` gate, while `<QuickNoteScratchpad />` mounts when `!isPopup && !isGuestMode`. So wherever the control is shown the panel is mounted, and the nav item needs only the `!isGuestMode` guard `quicknote` already uses (I2 resolved with no extra gating).
- **Route-navigation survival (FR-022).** This holds structurally: the panel is mounted once in the layout and both stores are singletons, so route changes do not touch them. jsdom cannot simulate routing, so unit tests cover the store guarantees (tab survives close/reopen, state follows vault) and the manual pass (T054) covers actual navigation.

---

## Slice 3 Addendum: Automatic capture of rolls, draws and table results (#3408)

**Spec**: User Story 6, FR-024–FR-035, SC-009–SC-012, and the "Slice 3 assumptions" block in [spec.md](./spec.md). Built on branch `163-session-journal-slice-3`, after slice 1 (#3422) and slice 2 (#3429) merged. Slice 1's persistence and cloud backup are reused unchanged (FR-034).

### Summary

Add a shared "journal capture event" on the existing `@codex/events` bus, a listener that appends those events to the active journal, and one emitter in the place every roll already passes through. The journal view learns to show automatic entries differently from typed notes.

Findings from the code that shape the design:

- Every producer of a dice roll, table roll, deck draw, Oracle chat roll and stat sheet field roll ends in `DiceHistoryStore.addResult` (`apps/web/src/lib/stores/dice-history.svelte.ts`): `DiceVault.svelte` (modal), `TableRoller.svelte` and `DeckView.svelte` (table and deck use views), `features/random/oracle-adapter.svelte.ts` (Oracle table and deck commands), `oracle-engine`'s `dice-executor.ts` (`/roll`), and `utils/stat-sheet-field-actions.ts`. One emitter there covers all of FR-026, and one event per `addResult` call gives "exactly once".
- `AppEventBus` (`packages/events`) swallows and logs listener errors, sync and async, so a failing listener cannot break an emitter (FR-030). Its `reset()` removes unnamed listeners on vault switch and keeps named ones, so the journal's listener MUST subscribe with a name. `CrossTabBroadcaster` relays only events with `metadata.sync` set (`packages/events/src/CrossTabBroadcaster.ts:33`), so a capture event that leaves `sync` unset stays in the tab that made the roll.
- `SessionJournalStore.appendEntry` rejects when no journal is active (slice 1 contract), and serialises writes with a read-merge-write discipline (FR-011). The listener guards on `current?.status === "active"` first, as the #3408 issue note suggested, and relies on FR-011 for bursts.
- The section a typed note goes into is `activeSectionId`, local state inside `SessionJournalView.svelte`. The view is unmounted while the panel is closed, so captures could not know it. It moves into the store (FR-032).
- Adventure-mode rolls and VTT rolls do not use `addResult` (spec assumption), so they are out of scope.

### Technical Context (delta)

**Dependencies**: None new third-party. `session-journal-engine` gains a workspace dependency on `@codex/events` for event types, the same way `oracle-engine` has one.
**Storage**: None new. Captured entries are ordinary `JournalEntry` records (`type`, `content`, `sourceRef` were reserved for this in slice 1, FR-014). No `DB_VERSION` change.
**Testing**: Vitest/bun test. Pure formatting and validation in `session-journal-engine` (no mocks). Store, emitter, listener and view have unit and component tests with success and negative paths.
**Constraints**: Must not change any roll tool's behaviour or UI (FR-035). Must not add a runtime import from tools to the journal. A capture failure must never reach the user (FR-030). No capture in guest mode (FR-033) or from relayed cross-tab events (FR-031).

### Design decisions

- **Event definition and pure logic live in `packages/session-journal-engine`** (Constitution I). New `events.ts` registers `"JOURNAL:CAPTURE"` in the `AppEventRegistry` under domain `"journal"` with payload `{ entryType: string; content: string; sourceRef?: Record<string, unknown> }`, and exports `JOURNAL_EVENTS`. New `capture.ts` holds pure functions: `buildCaptureFromRoll(roll)` turns a recorded result (dice, table or deck) into a payload or `undefined`; its input `CapturableRoll` is defined structurally in the engine with only the fields it reads (`total`, `parts`, `formula`, `label`, `context`, `source`), so the engine depends on no app or `dice-engine` type; `captureToEntryInput(payload)` validates and bounds it (non-empty type and summary; summary capped at 500 characters; `sourceRef` reduced to plain JSON-safe data without the resolution chain, result text capped at 1,000 characters, at most 30 cards, and at most 4 KB serialised, dropping the largest parts first).
- **One emitter, in `DiceHistoryStore.addResult`.** It builds the payload with `buildCaptureFromRoll` and emits on an injected bus (constructor parameter, default `appEventBus`, per Constitution VIII), right after the in-memory push and before persistence, inside try/catch. So an IndexedDB failure does not suppress the capture, and an emit failure does not break the roll. History trimming and `init()` do not emit. Existing one-argument constructor calls keep working. The event carries `metadata: { timestamp }` only, never `sync`.
- **One listener class, `SessionJournalCapture`**, in `apps/web/src/lib/stores/session-journal-capture.ts`. Constructor-injected `store`, `bus`, and an `isCaptureAllowed()` guard (false in guest mode). `start()` subscribes to `"JOURNAL:CAPTURE"` with a fixed name so it survives `bus.reset()`; `stop()` unsubscribes. The handler ignores `metadata.remote`, guards on `store.current?.status === "active"`, validates through `captureToEntryInput`, and calls `store.appendEntry` with `sectionId: store.activeSectionId`. All failures are caught and logged. It knows nothing about dice, tables or decks, which is what makes SC-011 true.
- **`activeSectionId` moves into `SessionJournalStore`** with `setActiveSection(id)`. `createSection` sets it; it is cleared when the journal ends or the vault changes, and an unknown id is ignored. `SessionJournalView` reads and writes the store's value, so typed notes and captures agree. It is in-memory only: after a reload it is `undefined`, as the view's local state is today. The view's section `<select>` (`bind:value` on local state at `SessionJournalView.svelte:238`) becomes `value={store.activeSectionId}` plus an `onchange` that calls `setActiveSection`, since a store getter cannot be bound.
- **Rendering split out of the view.** `SessionJournalView.svelte` is 371 lines. Automatic-entry rendering goes into a new `JournalEntryRow.svelte` (one entry, manual or automatic, icon and label per type from a small lookup, generic fallback) rather than growing the view (Constitution XIV). Icons use the Iconify pattern (`icon-[lucide--dices]` for dice, `icon-[lucide--layers]` for cards, `icon-[lucide--table]` for tables, `icon-[lucide--zap]` generic), each with a text label so meaning is not colour-only.
- **Wiring** follows the Oracle's pattern: `apps/web/src/lib/listeners/session-journal-events.ts` exports `initSessionJournalCapture()`, which builds and starts the listener with `isCaptureAllowed: () => !sessionModeStore.isGuestMode`; `app-init.ts` only calls it beside `initOracleEventListeners()` and stops it on cleanup (two lines and an import).

### Alternatives considered and rejected

- **Each tool emits its own event.** Rejected: six call sites to keep in step, and any new roll path could silently miss capture. The shared history already is the funnel.
- **The journal store subscribes to the bus itself.** Rejected: it would give a store that is about persistence and lifecycle a second responsibility, and make its tests need a bus. A small listener class keeps both simple.
- **Subscribe to the roll history's reactive `history` array instead of an event.** Rejected: it couples the journal to one store's internals, and contradicts the #3408 requirement that new sources need only publish through the shared interface.
- **Store the full table resolution chain in `sourceRef`.** Rejected: unbounded size, and it would ride along into every cloud backup (FR-027).
- **Capture even when no journal is active and store it for later.** Rejected: contradicts FR-029, and would create records the user never asked for.

### Project Structure (slice 3 changes only)

```text
packages/session-journal-engine/
├── package.json                      # +@codex/events workspace dependency
├── src/
│   ├── events.ts                     # NEW: JOURNAL:CAPTURE registration and payload type
│   ├── capture.ts                    # NEW: buildCaptureFromRoll, captureToEntryInput
│   └── index.ts                      # export the two new modules
└── tests/capture.test.ts             # NEW
apps/web/src/lib/
├── stores/
│   ├── dice-history.svelte.ts        # +injected bus, emit once per recorded roll
│   ├── session-journal.svelte.ts     # +activeSectionId, setActiveSection()
│   └── session-journal-capture.ts    # NEW: listener class
├── components/quicknote/
│   ├── SessionJournalView.svelte     # uses store.activeSectionId; renders rows via JournalEntryRow
│   └── JournalEntryRow.svelte        # NEW: one entry, manual or automatic
├── listeners/session-journal-events.ts # NEW: initSessionJournalCapture(), like oracle-events.ts
├── app/init/app-init.ts              # calls it beside initOracleEventListeners() and stops it on cleanup
├── app/event-registrations.ts        # import session-journal-engine so the event type is registered
├── config/help-content.ts            # session-journal entry: mention automatic capture
└── content/help/quicknote.md         # short note on what is captured
```

Not touched: the roll tools' components (`DiceVault`, `TableRoller`, `DeckView`, `dice-executor`, `oracle-adapter`, stat sheet actions), `idb.ts`, cloud-backup files.

### Constitution Check (slice 3 delta)

- **I. Library-First** — PASS. Event contract and all formatting/validation are in `packages/session-journal-engine`; the app has thin glue.
- **II. TDD** — PASS (planned). Tests precede implementation in tasks.md Phase 10, each with success and negative paths.
- **III. Simplicity & YAGNI** — PASS with one flagged addition: a shared event type. That is what #3408 asks for and what SC-011 needs. No settings, no per-source filters, no queueing of events for a later journal.
- **V. Privacy & Client-Side Processing** — PASS. Captured data is local, in the same record as typed notes. Cloud backup is unchanged, and its consent copy already names session journals; the consent surface need not change because the entry content is the same kind of session data. Guest sessions capture nothing.
- **VII. User Documentation** — PASS (planned). Help entry and `quicknote.md` updated (T071).
- **VIII. Dependency Injection** — PASS. `DiceHistoryStore` gains an injected bus; `SessionJournalCapture` takes store, bus and guard in its constructor.
- **IX. Natural Language** — PASS. Labels are "Dice roll", "Card draw", "Table result"; summaries read as sentences.
- **X. Quality & Coverage** — PASS (planned). The new engine module is covered to the 70% goal (T075).
- **XI. Agent Operational Protocol** — PASS. Assumptions are in spec.md; the roll tools are deliberately untouched.
- **XIV. Bounded Responsibility** — see below.
- IV, XII and the Discovery Intent check remain N/A.

### Bounded Responsibility Check (slice 3 delta)

- [x] Files this slice touches that exceed 500 lines are listed, excluding tests.
- [x] For each, the single responsibility it still holds is named.
- [x] New behaviour that does not belong to a listed file has an extraction target.
- [x] Planned splits carry or gain their own tests.

`apps/web/src/lib/app/init/app-init.ts` (938 lines) is touched. Responsibility: "construct and connect the app's stores and services at startup." Adding the listener's construction and `start()` is that responsibility; the listener's behaviour lives in its own file, and the change is a few lines. No split planned in this slice; it remains a decomposition candidate for a change that has app-init as its subject. `SessionJournalView.svelte` (371) would grow past a comfortable size with entry styling, so the rendering is extracted to `JournalEntryRow.svelte` now. `dice-history.svelte.ts` (140) and `session-journal.svelte.ts` (253) stay small.

### Risks

- **Double capture.** Capture events do not set `metadata.sync`, so they are never relayed to other tabs (checked in `CrossTabBroadcaster`), and the emitter test asserts `sync` is unset (T059). The listener still ignores any event marked `metadata.remote` as a safeguard, tested in T060.
- **A roll path that does not use `addResult`** is silently uncaptured. Mitigated by verifying each producer in the live check (T076) and by the assumption that unlisted paths are out of scope.
- **Bursts of events** contend on one IndexedDB record. Mitigated by slice 1's read-merge-write and serialised transactions, with a burst test (T060).
- **`bus.reset()` on vault switch** would drop an unnamed listener. Mitigated by the fixed subscription name, with a test that the capture survives a `reset()`.
- **Payload size.** Table results can be long. Mitigated by the summary cap and by leaving the resolution chain out of `sourceRef` (T058).
