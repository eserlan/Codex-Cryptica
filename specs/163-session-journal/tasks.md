---
description: "Task list for Session Journal (slice 1: data model, persistence & lifecycle; slice 2: global access point; slice 3: automatic capture; slice 4: promote to entity)"
---

# Tasks: Session Journal (data model, persistence & lifecycle)

**Input**: Design documents from `/specs/163-session-journal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/session-journal-store-api.md, quickstart.md

**Tests**: Included as first-class tasks — this repo's Constitution (Principle II, TDD) and AGENTS.md ("Do not commit implementation changes without tests for the affected behavior... cover both the expected success path and at least one meaningful negative, cancellation, or failure path") require them, not an optional add-on.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

**Slice 4 note**: Phases 12–13 (T080–T100) add User Story 7 / slice 4 (#3409) on branch `163-session-journal-slice-4`.

**Slice 3 note**: Phases 10–11 (T058–T079) add User Story 6 / slice 3 (#3408) on branch `163-session-journal-slice-3`.

**Slice 2 note**: Phases 8–9 (T041–T057) add User Story 5 / slice 2 (#3407) on this same branch. Phases 1–7 are slice 1 and are complete.

**Revision note**: This version incorporates `/speckit-analyze`'s findings — F1 (FR-011's cross-tab guarantee needed a read-merge-write discipline the original draft's storage shape alone didn't provide), E1 (the `open()` method and its UI wiring had no owning task), E2 (no task verified Constitution X's coverage goal), and E3 (FR-006's "sections are optional" had no explicit assertion). See T012, T014, T018, T037 below and `data-model.md`/`contracts/session-journal-store-api.md`'s updated Concurrency Guarantee sections.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

## Path Conventions

Per plan.md's Project Structure: a new pure-logic package `packages/session-journal-engine/`, a thin store + UI in `apps/web/src/lib/`, and touch points in the existing cloud-backup surface for US4.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the new workspace package before any logic is written into it.

- [x] T001 Create `packages/session-journal-engine/package.json`, mirroring `packages/chronology-engine/package.json`'s shape (name `session-journal-engine`, `main`/`types` at `./src/index.ts`, `test`/`test:coverage`/`lint` scripts, `devDependencies` matching `chronology-engine`'s, no runtime `dependencies` — this package is framework-free)
- [x] T002 Run `bun install` from the repo root so the new workspace package (already covered by the root `packages/*` glob) resolves for other workspaces to import

**Checkpoint**: `packages/session-journal-engine` exists and is installable; no discovery-page task applies (this feature has no public, indexable page — Discovery Intent Governance is N/A per plan.md).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared types, persistence schema, and store skeleton every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 [P] Define `SessionJournal`, `JournalSection`, `JournalEntry`, `JournalEntryInput` types in `packages/session-journal-engine/src/types.ts` per data-model.md's field tables
- [x] T004 [P] Add the `session_journals` object store (`keyPath: "id"`, `by-vault` index on `vaultId`) to `CodexDB` in `apps/web/src/lib/utils/idb.ts`, bumping `DB_VERSION` by 1 and guarding the addition with `objectStoreNames.contains("session_journals")` exactly like the existing `canvases` store (data-model.md's Persistence Mapping)
- [x] T005 Create `packages/session-journal-engine/src/index.ts` re-exporting `types.ts` (depends on T003)
- [x] T006 Create the `SessionJournalStore` skeleton in `apps/web/src/lib/stores/session-journal.svelte.ts`: constructor-injected `vaultRegistry` (default: the real singleton) and `idb.ts` access, `$state` holding the loaded journal(s) for the active vault, an `$effect` that reloads on `vaultRegistry.activeVaultId` change, and a private `readLatest(id)` helper (fetches one record fresh from `session_journals` by id) that every mutating method added in later phases will call before merging its change — this is the seam that satisfies FR-011 (depends on T004, T005)
- [x] T007 [P] Unit test the vault-scoped load in `apps/web/src/lib/stores/session-journal.test.ts`, mocking `getDB()` from `../utils/idb` with an in-memory `Map`-backed fake per `calendar.test.ts`'s pattern: success — a journal stored under vault A is not visible after switching to vault B (FR-012); failure/negative — no journal stored for a vault resolves to `undefined`/empty rather than throwing (depends on T006)

**Checkpoint**: Foundation ready — every user story phase below can now proceed.

---

## Phase 3: User Story 1 - Start a session journal and add notes as play happens (Priority: P1) 🎯 MVP

**Goal**: A user can start a journal from Quicknote/Scratchpad and add manual, timestamped notes without leaving it.

**Independent Test**: Open Quicknote/Scratchpad with no journal active, start one, add two or three notes, confirm they render in order with timestamps (quickstart.md's Story 1 verification).

### Tests for User Story 1 ⚠️

> Write these tests FIRST; confirm they fail before implementing T013–T015.

- [x] T008 [P] [US1] Unit test `startOrResumeJournal` in `packages/session-journal-engine/tests/engine.test.ts`: success — creates a new active journal when none exists for the vault; negative — calling it again while one is already active returns that same journal rather than creating a second one (FR-013, needed by US1's own "start" affordance even before US3 formalizes end/resume)
- [x] T009 [P] [US1] Unit test `appendEntry` in `packages/session-journal-engine/tests/engine.test.ts`: success — entries are inserted in chronological order by `timestamp`; negative — appending to a journal whose `status` is `"ended"` is rejected (FR-007's guard, exercised here even though `endJournal` itself lands in US3)
- [x] T010 [P] [US1] Unit test `SessionJournalStore.start()`/`appendEntry()` in `apps/web/src/lib/stores/session-journal.test.ts` (mocked `getDB()`): success — starting then appending persists and reloads correctly; negative — `appendEntry()` with no active journal for the vault rejects (contract's documented behavior)
- [x] T011 [P] [US1] Component test for the Start control and note entry in `apps/web/src/lib/components/quicknote/SessionJournalView.test.ts`: success — clicking "Start Session Journal" then submitting a note shows it in the list; negative — the add-note field is not shown/usable before a journal exists
- [x] T012 [P] [US1] **Concurrency test** (closes analysis finding F1) for `SessionJournalStore.appendEntry()` in `apps/web/src/lib/stores/session-journal.test.ts`: create two `SessionJournalStore` instances sharing the same fake `getDB()`-backed in-memory map (simulating two browser tabs on the same vault); both `start()` against the same pre-existing active journal, then each calls `appendEntry()` once _without_ reloading the other's state in between; assert the persisted record (read via either store's `readLatest`/a fresh third read) contains **both** entries — this is the executable proof that FR-011's "never silently overwritten by another tab's save" guarantee actually holds for this storage shape

### Implementation for User Story 1

- [x] T013 [US1] Implement `startOrResumeJournal` and `appendEntry` in `packages/session-journal-engine/src/engine.ts`, pure functions per data-model.md's invariants (depends on T003; makes T008, T009 pass)
- [x] T014 [US1] Implement `SessionJournalStore.start()`, `.open()`, `.appendEntry()`, and the `controlState` derivation's `"start"`/`"open"` cases in `apps/web/src/lib/stores/session-journal.svelte.ts` (closes analysis finding E1 — `open()` previously had no owning task). `.appendEntry()` MUST call the `readLatest(id)` helper from T006 immediately before merging the new entry and writing back, never merging against `$state` alone (closes F1; see `contracts/session-journal-store-api.md`'s Concurrency Guarantee section) (depends on T006, T013; makes T010, T012 pass)
- [x] T015 [US1] Add the Start/Open control and a new `apps/web/src/lib/components/quicknote/SessionJournalView.svelte` (entry list + add-note field) to `apps/web/src/lib/components/quicknote/QuickNoteScratchpad.svelte`, keeping Quicknote's own transient-note UI untouched (FR-015); the "Open Session Journal" control MUST call `sessionJournalStore.open()` on click, not just read `controlState` (closes E1) (depends on T014; makes T011 pass)
- [x] T016 [US1] Add a Session Journal entry to `apps/web/src/lib/config/help-content.ts` and a `FeatureHint` in `SessionJournalView.svelte` (Constitution VII — user documentation for a multi-step feature)

**Checkpoint**: User Story 1 is fully functional and testable on its own.

---

## Phase 4: User Story 2 - Organize a long session into sections (Priority: P2)

**Goal**: A user can create and rename optional sections within an active journal.

**Independent Test**: Start a journal, create a section, rename it, add entries, confirm a journal with zero sections still works exactly as US1 (quickstart.md's Story 2 verification).

### Tests for User Story 2 ⚠️

- [x] T017 [P] [US2] Unit test `createSection`, `renameSection`, `validateSectionName` in `packages/session-journal-engine/tests/engine.test.ts`: success — create then rename a section; negative — renaming to an empty or whitespace-only name is rejected and the prior name is kept (FR-005)
- [x] T018 [P] [US2] Unit test `SessionJournalStore.createSection()`/`renameSection()` in `apps/web/src/lib/stores/session-journal.test.ts`: success — a created section persists and reloads; negative — `renameSection()` with an empty name rejects without mutating the section; **explicit FR-006 assertion** (closes analysis finding E3) — a journal that never calls `createSection()` at all round-trips through start/append/reload identically to how it behaved in US1's own tests, proving sections are additive and never required
- [x] T019 [P] [US2] Component test for section create/rename in `apps/web/src/lib/components/quicknote/SessionJournalView.test.ts`: success — creating and renaming a section updates the view; negative — submitting an empty rename shows the rejection and keeps the old name displayed

### Implementation for User Story 2

- [x] T020 [US2] Implement `createSection`, `renameSection`, `validateSectionName` in `packages/session-journal-engine/src/engine.ts` (depends on T003; makes T017 pass)
- [x] T021 [US2] Implement `SessionJournalStore.createSection()`/`renameSection()` in `session-journal.svelte.ts`, both using the same `readLatest`-before-merge discipline as `appendEntry()` (FR-011/F1) (depends on T014, T020; makes T018 pass)
- [x] T022 [US2] Add section create/rename controls to `SessionJournalView.svelte`, including the empty-name rejection feedback (depends on T015, T021; makes T019 pass)

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - End a session and come back to it later (Priority: P1)

**Goal**: A user can end a journal (preserving it) and later resume an unfinished one or browse past ended journals.

**Independent Test**: End a journal with entries, reload, confirm it's still there and read-only; separately, leave a journal active, reload, confirm "Resume Session Journal" picks up every entry/section (quickstart.md's Story 3 verification).

### Tests for User Story 3 ⚠️

- [x] T023 [P] [US3] Unit test `endJournal` in `packages/session-journal-engine/tests/engine.test.ts`: success — sets `status: "ended"` and `endedAt`, including for a journal with zero entries (spec Edge Case: ending an empty session is valid); negative — `endJournal` on an already-ended journal is rejected/no-op rather than double-transitioning
- [x] T024 [P] [US3] Unit test `SessionJournalStore.end()`, `.listJournals()`, and the `controlState`'s `"resume"` case in `apps/web/src/lib/stores/session-journal.test.ts`: success — ending marks the journal ended and `listJournals()` still returns it; negative — `.end()` with no active journal for the vault rejects
- [x] T025 [P] [US3] Component test for the End Session action and the post-reload Resume state in `apps/web/src/lib/components/quicknote/SessionJournalView.test.ts`/`QuickNoteScratchpad.test.ts`: success — ending shows the journal as read-only and starting a new one creates a separate journal (FR-008's "ended content untouched"); negative — the add-note field is not available on an ended journal

### Implementation for User Story 3

- [x] T026 [US3] Implement `endJournal` (and its interaction with `appendEntry`'s already-in-place ended-journal guard from T013) in `packages/session-journal-engine/src/engine.ts` (depends on T013; makes T023 pass)
- [x] T027 [US3] Implement `SessionJournalStore.end()`, `.listJournals()`, and the `controlState`'s `"resume"` derivation in `session-journal.svelte.ts`; `.end()` uses the same `readLatest`-before-merge discipline as the other mutators (FR-011/F1) (depends on T014, T026; makes T024 pass)
- [x] T028 [US3] Add the End Session action and a simple past-journals list (FR-008's "browsable afterward") to `SessionJournalView.svelte` (depends on T022, T027; makes T025 pass)

**Checkpoint**: User Stories 1–3 are complete — this is the full local-only scope of the original request.

---

## Phase 6: User Story 4 - Keep the journal when moving to a new device or restoring a cloud backup (Priority: P2)

**Goal**: A vault with cloud backup enabled includes session journals in its backup/restore, with the consent screen updated to say so.

**Independent Test**: Enable cloud backup on a vault with a journal, back up, restore into a new vault, confirm the journal (entries and sections intact) is present (quickstart.md's Story 4 verification).

### Tests for User Story 4 ⚠️

- [x] T029 [P] [US4] Unit test the `sessionJournals` bundle/delta field in `packages/cloud-backup-sync/src/cloud-backup-sync.test.ts`: success — a bundle including `sessionJournals` round-trips through build/parse; negative — a bundle with `sessionJournals` absent/`undefined` (an old backup, or a vault with no journals) parses exactly as it did before this change, with no crash and no spurious empty-array insertion
- [x] T030 [P] [US4] Unit test the `importSessionJournals` restore path in `apps/web/src/lib/stores/cloud-backup.svelte.test.ts`, following the existing `importMaps`/`importCanvases` test cases: success — `restoreIntoNewVault` calls `importSessionJournals` when the bundle has journals; negative — restore does not fail when `importSessionJournals` is undefined (optional dependency, same as `importMaps`/`importCanvases` today)

### Implementation for User Story 4

- [x] T031 [US4] Add `sessionJournals?: SessionJournal[]` to the bundle/delta type and gather/parse logic in `packages/cloud-backup-sync/src/cloud-backup-sync.ts`, alongside the existing `maps`/`canvases` fields (depends on T003; makes T029 pass)
- [x] T032 [US4] Add an `importSessionJournals?: (vaultId: string, journals: unknown[]) => Promise<void>` hook to the `restore` dependency object and call it from `restoreIntoNewVault` in `apps/web/src/lib/stores/cloud-backup.svelte.ts`, mirroring `importMaps`/`importCanvases` exactly (depends on T031; makes T030 pass)
- [x] T033 [US4] Add the `SessionJournalStore.allJournals` accessor (contracts/session-journal-store-api.md) to `session-journal.svelte.ts`, then wire `sessionJournals: sessionJournalStore.allJournals` into the `buildPayload` call and provide the production `importSessionJournals` implementation in `apps/web/src/lib/app/init/app-init.ts`, next to the existing `maps`/`canvases` lines (depends on T014, T032)
- [x] T034 [P] [US4] Update the "What gets stored" consent copy in `apps/web/src/lib/components/settings/CloudBackupSettings.svelte` to name session journals alongside entities, labels, notes, maps, canvases and images

**Checkpoint**: All four user stories are complete — the full scope of this slice, including cross-device/cloud durability.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Repo-wide gates this AGENTS.md requires before a PR, plus the manual pass quickstart.md describes.

- [x] T035 [P] Run `bun run lint:changed` (or `bun scripts/lint-changed.mjs`) and fix any findings across all files touched by T001–T034
- [x] T036 [P] Run `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web` and fix any errors
- [x] T037 Run `bun run test:coverage` inside `packages/session-journal-engine` and confirm it meets Constitution X's 70% goal for a newly-introduced package (closes analysis finding E2); add targeted cases for any uncovered branch before proceeding
- [x] T038 Run `bun run test:changed` (or `bun scripts/test-changed.mjs`) and confirm everything from T007–T030 passes together, not just in isolation
- [x] T039 Manually walk through quickstart.md's four story verifications end-to-end in a running app (not just unit tests) — this is the only step that actually exercises the Quicknote UI, IndexedDB, and (for US4) a real cloud-backup enable/backup/restore cycle together
- [x] T040 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent --base staging` and resolve any introduced findings before opening the PR (AGENTS.md's Fallow local gate)

---

## Phase 8: User Story 5 - Reach the journal from anywhere in the app during play (Priority: P1) — Slice 2, #3407

**Goal**: A Session Journal control in the app's shared tool chrome shows the FR-010 state and opens the scratchpad panel straight onto its Journal tab from any in-app view.

**Independent Test**: Start a journal, navigate to several views, and from each select the global control; confirm the live, editable journal opens on the Journal tab each time (quickstart.md's Story 5 verification).

**Prerequisite**: Phases 1–6 complete (this branch already has them). No dependency on Phase 7's gates re-running first, but Phase 9 re-runs them for the new changes.

### Tests for User Story 5 ⚠️

> Write these first and confirm they fail before the implementation tasks.

- [x] T041 [P] [US5] Unit test the new tab state in `apps/web/src/lib/stores/quicknote.svelte.test.ts`: success — `openJournal()` from closed opens the panel with `activeTab === "journal"`; `openJournal()` while open on Notes switches the tab without closing; calling it twice leaves the panel open (idempotent, FR-020); `close()` then a plain `open()`/`toggle()` keeps `activeTab === "journal"` (FR-022); negative — `openJournal()` does not create or select a note (`currentNote` stays `null` and `activeNotes` is unchanged, `startNewNote` not called; FR-020/FR-023); `open(note)` for a specific note sets `activeTab === "notes"` even when the panel was last left on Journal; plain `open()` from a fresh state still auto-selects/creates a note exactly as before (FR-023)
- [x] T042 [P] [US5] Unit test the new item in `apps/web/src/lib/components/layout/nav-items.test.ts`: success — a `session-journal` tool item exists outside guest mode, and its label is "Start Session Journal" / "Open Session Journal" / "Resume Session Journal" for each `controlState` (FR-018, FR-019); its action calls `quickNoteStore.openJournal()`; in the `resume` state the action also calls `sessionJournalStore.open()`; `isToolActive` is true only while the panel is open on the Journal tab; negative — the item is absent in guest mode; in the `start` state the action does **not** call `sessionJournalStore.start()` and no journal is created (FR-021); in the `open` state the action does not call `open()` again
- [x] T043 [P] [US5] Component tests for the indicator in `apps/web/src/lib/components/layout/ActivityBar.test.ts` and `MobileMenu.test.ts`: success — an indicator with accessible state text renders for the journal item when `controlState` is `open` or `resume`; negative — no indicator in the `start` state, and none at all in guest mode where the item is absent
- [x] T044 [P] [US5] Component test in a new `apps/web/src/lib/components/quicknote/QuickNoteScratchpad.test.ts` (no test file exists for this component yet): success — the panel renders the Journal view when `quickNoteStore.activeTab === "journal"`, and clicking a tab button updates the store's `activeTab`; negative/regression — the Notes tab still renders and behaves as before (FR-023)
- [x] T045 [P] [US5] Store test in `apps/web/src/lib/stores/session-journal.svelte.test.ts`: success — after a vault switch, `controlState` reflects the new vault's journal (FR-022); negative — a vault with no journal reports `"start"` even when the previous vault had an active one

### Implementation for User Story 5

- [x] T046 [US5] Add `activeTab = $state<"notes" | "journal">("notes")` and `openJournal()` to `QuickNoteStore` in `apps/web/src/lib/stores/quicknote.svelte.ts`. `openJournal()` sets `isOpen = true` and `activeTab = "journal"` directly and must **not** call `open()` (which auto-selects/creates a note, `quicknote.svelte.ts:107-118`). Make `open(note)` with a note set the tab to `"notes"`, and leave plain `open()`/`toggle()`/`close()` tab-preserving (makes T041 pass; contract: contracts/session-journal-store-api.md "Panel host API")
- [x] T047 [US5] In `apps/web/src/lib/components/quicknote/QuickNoteScratchpad.svelte`, replace the local `activeTab` `$state` with `quickNoteStore.activeTab`, keeping the existing tab buttons and the FR-015 comment (depends on T046; makes T044 pass)
- [x] T048 [US5] In `apps/web/src/lib/components/layout/nav-items.ts`, add the `session-journal` tool item: `icon-[lucide--book-open]`, `group: "tool"`, `placement: "overflow"`, only when `!sessionModeStore.isGuestMode`, label/title derived from `sessionJournalStore.controlState`, action per the contract's "Global control wiring"; add the `isToolActive` special case (depends on T046; makes T042 pass)
- [x] T049 [US5] Add the active-journal indicator to `apps/web/src/lib/components/layout/ActivityBar.svelte` and `MobileMenu.svelte`, mirroring the existing `quicknote` count badge: shown when `tool.id === "session-journal"` and `sessionJournalStore.controlState !== "start"`, with the state carried in the accessible label, not colour alone (depends on T048; makes T043 pass)
- [x] T050 [P] [US5] Update the copy for the new entry point, in plain language (Constitution VII, IX): (a) the `session-journal` entry in `apps/web/src/lib/config/help-content.ts` (~line 764), whose text currently says to "Start a Session Journal from the Quicknote panel" and is stale once the toolbar control exists; the `FeatureHint hintId="session-journal"` in `SessionJournalView.svelte` reads from this same entry, so it is fixed by the same edit; (b) `apps/web/src/lib/content/help/quicknote.md`, which does not mention the journal yet — add a short pointer to the Session Journal control and its Start/Open/Resume states

**Checkpoint**: User Story 5 is complete — the journal is reachable in one action from any in-app view, and slice 2's scope (#3407) is done.

---

## Phase 9: Slice 2 Polish & Cross-Cutting Concerns

**Purpose**: The repo gates AGENTS.md requires before pushing slice 2, plus the manual pass.

- [x] T051 [P] Run `bun run lint:changed` (or `bun scripts/lint-changed.mjs`) and fix any findings in the files touched by T041–T050
- [x] T052 [P] Run `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web` and fix any errors
- [x] T053 Run `bun run test:changed` (or `bun scripts/test-changed.mjs`) and confirm T041–T045 pass together with the slice 1 tests, not just in isolation
- [x] T054 Manually walk through quickstart.md's Story 5 verification in a running app (desktop and phone-width, guest mode, vault switch, reload → Resume). This is also where FR-022's route-navigation survival is verified — jsdom cannot route — so navigate the journal control between at least two different routes with the panel closed and reopened, and confirm journal content, control state and last-selected tab are unchanged. Unit tests cannot show that the control is reachable and correctly stacked against the panel overlay
- [x] T055 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent --base staging` and resolve any introduced findings before pushing
- [x] T056 Run the `codex-review` specialist review on the slice 2 changes (AGENTS.md PR Quality Gate) and address findings
- [x] T057 Update the slice 2 PR (#3429) description, and check off #3407's acceptance criteria once verified, so the issue and PR match what shipped

---

## Phase 10: User Story 6 - Rolls, draws and table results land in the journal by themselves (Priority: P1) — Slice 3, #3408

**Goal**: Every dice roll, card draw and table or oracle result the app records is added, once, to the active journal as a distinct automatic entry, through one shared event interface, with no change to the roll tools.

**Independent Test**: Start a journal, make a roll, a draw and a table roll with the panel closed, open the journal, and confirm each appears once, in order, marked as automatic (quickstart.md's Story 6 verification).

**Prerequisite**: Phases 1–9 are merged into staging (slices 1 and 2). Slice 3 lives on branch `163-session-journal-slice-3`.

### Tests for User Story 6 ⚠️

> Write these first and confirm they fail before the implementation tasks.

- [x] T058 [P] [US6] Unit test the pure capture logic in `packages/session-journal-engine/tests/capture.test.ts` (no mocks; the input is the structural `CapturableRoll` from the contract, so the tests need no app types). Assert that the summary contains the formula and total, not its exact wording: success — a dice result becomes a `dice-roll` payload with a summary containing the formula and total and a `sourceRef` with formula, total and parts; a table result becomes `table-result` with source id, name, kind and the result text; a deck draw becomes `card-draw` naming each card and marking reversed ones; `captureToEntryInput` passes a valid payload through with the given `sectionId`; negative — a blank summary or blank type yields `undefined`/`{ ok: false }`; a summary over 500 characters is cut to 500 ending in an ellipsis (and exactly 500 is left alone); a result text over 1,000 characters, a draw of more than 30 cards, and a reference over 4 KB serialised are each bounded as FR-027 says; a `sourceRef` carrying a resolution chain, a function or a circular value is reduced to plain JSON-safe data without the chain and without throwing (FR-027)
- [x] T059 [P] [US6] Unit test the emitter in `apps/web/src/lib/stores/dice-history.test.ts` with an injected bus spy: success — `addResult` emits exactly one `JOURNAL:CAPTURE` for each of a modal roll, a chat roll, a table roll and a deck draw, with the right `entryType` and payload (FR-026), and the emitted event's `metadata` has a `timestamp` and no `sync` (FR-031); negative — a bus whose `emit` throws does not stop the roll being pushed to history or persisted (FR-030); an IndexedDB write failure still emits the capture (the roll happened); history trimming past 100 entries and `init()` emit nothing; the existing one-argument constructor still works
- [x] T060 [P] [US6] Unit test the listener in a new `apps/web/src/lib/stores/session-journal-capture.test.ts` with a fake store and a real `AppEventBus`: success — an event with an active journal calls `appendEntry` with the right type, content, `sourceRef` and `sectionId: store.activeSectionId` (FR-025, FR-032); ten events emitted back to back are appended in order, none dropped (FR-031); an entry type the listener has never seen is appended unchanged with no listener code change (SC-011); the subscription survives `bus.reset()` (named); `stop()` unsubscribes; negative — no journal, an ended journal, or an unloaded store appends nothing and does not throw (FR-029); `isCaptureAllowed() === false` appends nothing (FR-033); an event with `metadata.remote` appends nothing (FR-031, a safeguard: capture events are never relayed because they do not set `sync`); a malformed payload appends nothing; `appendEntry` rejecting is caught and logged and nothing is thrown or surfaced (FR-030)
- [x] T061 [P] [US6] Store test in `apps/web/src/lib/stores/session-journal.svelte.test.ts` for `activeSectionId`: success — `createSection` makes the new section active; `setActiveSection` switches to another existing section; negative — `setActiveSection` with an unknown id is ignored; `end()` and a vault change clear it; an id whose section no longer exists reads as `undefined`; a freshly constructed store over a journal that has sections starts with `undefined`, i.e. it is not persisted across a reload (FR-032)
- [x] T062 [P] [US6] Component tests in `apps/web/src/lib/components/quicknote/SessionJournalView.test.ts` and a new `JournalEntryRow.test.ts`: success — `dice-roll`, `card-draw` and `table-result` entries render with their own label and icon and differ from a `manual-note`; a manual note renders exactly as before; the section chosen in the view is read from and written to the store, so it survives the view being unmounted and remounted; negative — an entry with an unknown `type` still renders, in the generic automatic style, and a captured entry's text is rendered as text, not as HTML (FR-028)

### Implementation for User Story 6

- [x] T063 [US6] Add `@codex/events` (`workspace:*`) to `packages/session-journal-engine/package.json`, run `bun install`, and create `packages/session-journal-engine/src/events.ts` with `JOURNAL_EVENTS` and the `AppEventRegistry` registration per contracts/session-journal-store-api.md; export it from `src/index.ts`
- [x] T064 [US6] Create `packages/session-journal-engine/src/capture.ts` with `buildCaptureFromRoll` and `captureToEntryInput` (pure, no I/O, never throws), and export it from `src/index.ts` (depends on T063; makes T058 pass)
- [x] T065 [US6] Add the injected `bus` (default `appEventBus`) to `DiceHistoryStore` in `apps/web/src/lib/stores/dice-history.svelte.ts` and emit one capture per recorded roll inside `addResult`, after the in-memory push and before persistence, in try/catch (depends on T064; makes T059 pass)
- [x] T066 [US6] Add `activeSectionId` and `setActiveSection()` to `SessionJournalStore` in `apps/web/src/lib/stores/session-journal.svelte.ts`: set by `createSection`, cleared by `end()` and a vault change, unknown ids ignored (makes T061 pass)
- [x] T067 [US6] Create `apps/web/src/lib/stores/session-journal-capture.ts` with the `SessionJournalCapture` class per the contract: named subscription, guards in the documented order, all failures caught and logged (depends on T064, T066; makes T060 pass)
- [x] T068 [US6] Create `apps/web/src/lib/components/quicknote/JournalEntryRow.svelte` (one entry, manual or automatic, with a label and Iconify icon per type and a generic fallback, text rendered as text) and change `SessionJournalView.svelte` to render entries through it and to use `store.activeSectionId`/`setActiveSection` instead of its local `activeSectionId`; the section `<select>` at `SessionJournalView.svelte:238` changes from `bind:value` on local state to `value={store.activeSectionId}` plus an `onchange` that calls `setActiveSection`, because a store getter cannot be bound (depends on T066; makes T062 pass)
- [x] T069 [US6] Wire the listener the way the Oracle's is wired: a new `apps/web/src/lib/listeners/session-journal-events.ts` exports `initSessionJournalCapture()` (with its own test in `session-journal-events.test.ts`), which constructs and starts the `SessionJournalCapture` with `isCaptureAllowed: () => !sessionModeStore.isGuestMode`; `app-init.ts` calls it beside `initOracleEventListeners()` and stops it in its cleanup, and `app/event-registrations.ts` imports `session-journal-engine` so the event type is registered (depends on T067)
- [x] T070 [US6] In a new `apps/web/src/lib/stores/session-journal-capture.integration.test.ts` (its own file, so the IndexedDB fake does not leak into T060), add the end-to-end and durability tests. Wiring: a real `DiceHistoryStore` and `AppEventBus` with a real `SessionJournalCapture` over a fake store — one `addResult` produces one appended entry (success), and the same call with no active journal produces none and does not throw (negative). Durability (FR-034): a captured entry, appended through a real `SessionJournalStore` over the in-memory IndexedDB fake used in `session-journal.svelte.test.ts`, survives constructing a fresh store for the same vault, keeps its order relative to typed notes, appears in an ended journal, is refused after `end()`, and reaches the cloud backup payload builder input (`allJournals`) with its `sourceRef` intact
- [x] T071 [P] [US6] Update the copy in plain language (Constitution VII, IX): the `session-journal` entry in `apps/web/src/lib/config/help-content.ts` and the Session Journal section of `apps/web/src/lib/content/help/quicknote.md` to say that rolls, card draws and table results are added automatically while a journal is running, and what each looks like

**Checkpoint**: User Story 6 is complete — slice 3's scope (#3408) is done.

---

## Phase 11: Slice 3 Polish & Cross-Cutting Concerns

- [x] T072 [P] Run `bun run lint:changed` and fix any findings in the files touched by T058–T071
- [x] T073 [P] Run `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web` and fix any errors; also type-check `packages/session-journal-engine`
- [x] T074 Run `bun run test:changed` and confirm T058–T070 pass together with the slice 1 and 2 tests, and that the roll tools' own existing tests (dice roller, table and deck views, Oracle dice executor, oracle adapter, stat sheet actions) pass unchanged, which is the regression check for FR-035
- [x] T075 Run `bun run test:coverage` inside `packages/session-journal-engine` and confirm the new `capture.ts` and `events.ts` meet Constitution X's 70% goal; add cases for any uncovered branch
- [x] T076 Manually walk through quickstart.md's Story 6 verification in a running app, checking each producer path in FR-026 by hand (dice roller, Oracle `/roll`, table roll and re-roll, deck draw, Oracle table and deck commands, stat sheet field roll), plus burst rolls, ended journal, no journal, reload, and a second tab open on the same vault (no double capture). Also confirm the roll tools show no new buttons, prompts or messages and that their roll history and chat output are unchanged (FR-035)
- [x] T077 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent --base staging` and resolve any introduced findings
- [x] T078 Run the `codex-review` specialist review on the slice 3 changes and address findings
- [x] T079 Open the slice 3 PR, and check off #3408's acceptance criteria once verified, so the issue and PR match what shipped

---

## Phase 12: User Story 7 - Turn journal content into vault entities (Priority: P1) — Slice 4, #3409

**Goal**: A user can turn one entry, one section, the whole journal, or a chosen set of parts into a draft vault entity with the text filled in, from any journal (active or ended), with the journal left exactly as it was, and ending a session offers this without requiring it.

**Independent Test**: Finish a journal with typed notes, a section and automatic entries; turn an entry, a section and the whole journal into entities; confirm each draft's type and text, that the journal is unchanged, and that ending the session forces nothing (quickstart.md's Story 7 verification).

**Prerequisite**: Slices 1–3 are merged into staging. Slice 4 lives on branch `163-session-journal-slice-4`.

### Tests for User Story 7 ⚠️

> Write these first and confirm they fail before the implementation tasks.

- [x] T080 [P] [US7] Unit test `buildPromotion` in `packages/session-journal-engine/tests/promote.test.ts` (no mocks; a fixed `formatTime` such as `(t) => "T" + t`; journals are deep-frozen so any write throws): success — an entry gives its content as the body (typed note) or `<Label> — <content>` (automatic entry) with the default name from the contract's rules (short text kept, long text cut at a word boundary with `…`, blank text gives `Journal entry`); a section gives its entries as `- <time> — <content>` lines in journal order and the section name as the title; the whole journal gives `# <title>`, entries in order, and `## <section>` headings only where the section changes, including `## No section` after a sectioned entry, and none for a journal without sections; the first entry has no previous entry, so a sectioned first entry gets its heading and an unsectioned first entry gets none; automatic entries use only their `content`, never their `sourceRef`; a selection of entries and sections gives each entry once in journal order without a `#` title, and its title is `<journal title> — selection`; multi-line entries indent continuation lines; the `source` tag is right for each scope; negative — an unknown entry or section id gives "That part of the journal no longer exists."; an empty journal, an empty section and an empty selection give "There is nothing here to turn into an entity yet."; the input journal is unchanged after every call (SC-014); the same input twice gives identical output (FR-038)
- [x] T081 [P] [US7] Unit test `SessionJournalPromoter` in a new `apps/web/src/lib/stores/session-journal-promoter.test.ts` with injected fakes: success — `promote` calls `createEntity` once with the chosen type, the chosen name, and exactly `{ status: "draft", content, discoverySource }` for each scope, then `openEntity` with the new id, then `closePanel`, in that order, and returns `{ ok: true, entityId }` (FR-039, FR-040); negative — a blank or whitespace name and a blank type return `{ ok: false }` with a plain message and call nothing; `createEntity` rejecting returns `{ ok: false, error }` in plain language, calls the logger once, and calls neither `openEntity` nor `closePanel` (FR-045); a scope with nothing to make returns `{ ok: false }` and creates nothing; the journal passed in (deep-frozen) is unchanged in every case (FR-041); calling `promote` twice for the same entry creates two entities (FR-041)
- [x] T082 [P] [US7] Unit test the state class in a new `apps/web/src/lib/components/quicknote/journal-promotion.svelte.test.ts`: success — starting selection mode, toggling an entry and a section on and off, `selectionScope()` returning the chosen ids, `hasSelection`, choosing a section and choosing one of its entries staying independent (neither changes the other's state, FR-036), opening and closing the form with a scope, `reset()` clearing everything; negative — opening the form for an empty selection is refused; toggling in a mode that is not selecting does nothing; stopping selection mode clears the choices
- [x] T083 [P] [US7] Component test for the form in a new `JournalPromoteSheet.test.ts`: success — the name is pre-filled from the engine's default and the type select lists the categories passed in through the `categories` prop with Note chosen; changing the type and pressing "Create draft" calls the handler with that type and name; the preview shows the first 600 characters of the body, with `…` when it is longer and none when it is shorter; the name input has focus when the form opens; Cancel calls the cancel handler; every field has a label; negative — a blank name shows a plain-language message and does not call the handler; a handler result of `{ ok: false, error }` shows the message in an `alert`, keeps the typed values and re-enables the buttons; the Create button is disabled while a request is in flight and a second press does nothing; a scope with nothing to make shows the reason and disables Create
- [x] T084 [P] [US7] Extend `JournalEntryRow.test.ts`: success — an optional "Make entity" button calls `onPromote` with the entry, for a typed note and for an automatic entry alike (FR-049); in selection mode a checkbox labelled with the entry's opening words toggles selection; negative — with no `onPromote` and not in selection mode neither control renders (rows behave exactly as in slices 1–3, FR-047); every button is `type="button"` and has an accessible name
- [x] T085 [P] [US7] Extend `SessionJournalView.test.ts` (uses a real store over the fake IndexedDB, plus a fake promoter passed in through the view's `promoter` prop): success — the header offers "Turn journal into a Note", which opens the form with type Note and the journal title, and Create calls the promoter with the whole-journal scope; a section's "Make entity" opens the form for that section; "Choose parts" shows checkboxes, ticking an entry and a section enables the action, and Create passes a selection scope; ending the session shows the post-end offer with "Turn into a Note" and "Choose parts", ignoring it changes nothing, and dismissing hides it; the promote choices are also present on a past journal opened from history and on a reloaded ended journal (FR-042, FR-043); after a successful promote the journal deep-equals what it was (SC-014); after Cancel and after a successful Create, focus is back on the control that opened the form (FR-046); ticking a section leaves its entries' checkboxes unticked and enabled, and ticking one of them as well still gives one entry in the result (FR-036); turning one entry into an entity takes at most three clicks (Make entity, optionally the type, Create; SC-013); negative — an empty journal disables "Turn journal into a Note" with a visible reason; "Choose parts" with nothing ticked is disabled with a reason; a promoter failure shows its message, keeps the form open and leaves the journal untouched; ending a session still needs exactly one action and no choice (SC-015)

### Implementation for User Story 7

- [x] T086 [US7] Create `packages/session-journal-engine/src/promote.ts` with `buildPromotion` and its types per contracts/session-journal-store-api.md ("Promotion"), pure and never throwing, and export it from `src/index.ts` (makes T080 pass)
- [x] T087 [US7] Create `apps/web/src/lib/stores/session-journal-promoter.ts` with the `SessionJournalPromoter` class and a default singleton wired to `vault.createEntity`, `vault.selectedEntityId` and `quickNoteStore.close()`; user-facing errors in plain language (depends on T086; makes T081 pass)
- [x] T088 [US7] Create `apps/web/src/lib/components/quicknote/journal-promotion.svelte.ts` (selection mode, chosen entry and section ids, form scope) (makes T082 pass)
- [x] T089 [US7] Create `JournalPromoteSheet.svelte`: props `journal`, `scope`, `categories` (default `categories.list`), `onSubmit`, `onCancel`, `formatTime`; labelled type select (Note default), name input focused on open, read-only preview of the first 600 characters of the body, Create draft and Cancel buttons (`type="button"`), an `alert` region for errors, disabled while creating (depends on T086; makes T083 pass)
- [x] T090 [US7] Extend `JournalEntryRow.svelte` with the optional `onPromote` button and the selection checkbox, rendering neither when not given (makes T084 pass)
- [x] T091 [US7] (Also extracted `JournalComposer.svelte`, `JournalStartScreen.svelte`, `JournalHeader.svelte`, `JournalPromoteActions.svelte`, `JournalPromoteSections.svelte` and `JournalPromoteToggle.svelte` to keep the view under the complexity gate and the 500-line trigger; the promote controls sit behind a "Make entity" toggle, per the live check.) Create `JournalEndedActions.svelte` (the post-end offer, dismissible) and integrate everything in `SessionJournalView.svelte`, which takes an optional `promoter` prop defaulting to the `sessionJournalPromoter` singleton: header actions, per-section "Make entity", selection mode with a section checkbox and entry checkboxes that stay independent, the form, focus returning to the opener on close, remembering the id of the journal just ended so the offer shows for it, and formatting times with the user's local time of day (depends on T087–T090; makes T085 pass)
- [x] T092 [P] [US7] Update the copy in plain language (Constitution VII, IX): the `session-journal` entry in `apps/web/src/lib/config/help-content.ts` and the Session Journal section of `apps/web/src/lib/content/help/quicknote.md` to explain turning entries, sections or the whole journal into draft entities, that the journal is left as it is, and that the draft is reviewed like any other

**Checkpoint**: User Story 7 is complete — slice 4's scope (#3409) is done, and with it the whole of #3402's MVP.

---

## Phase 13: Slice 4 Polish & Cross-Cutting Concerns

- [x] T093 [P] Run `bun run lint:changed` and fix any findings in the files touched by T080–T092
- [x] T094 [P] Run `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web` and fix any errors; also type-check `packages/session-journal-engine`
- [x] T095 Run `bun run test:changed` and confirm T080–T085 pass together with the slice 1–3 tests (FR-048 needs no test of its own: the journal is unreachable in guest mode, which slice 2's nav-item tests already assert), and that the Quicknote and entity-draft tests that the promoter's collaborators have (`quicknote.svelte.test.ts`, the draft-review tests) pass unchanged
- [x] T096 Run `bun run test:coverage` inside `packages/session-journal-engine` and confirm the new `promote.ts` meets Constitution X's 70% goal; add cases for any uncovered branch
- [x] T097 Manually walk through quickstart.md's Story 7 verification in a running app: every scope, ending the session and ignoring the offer, a past journal, blank name, empty journal, a keyboard-only promotion with focus returning, approve and discard of a resulting draft, and reload to confirm the journal is unchanged
- [x] T098 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent --base staging` and resolve any introduced findings
- [x] T099 Run the `codex-review` specialist review on the slice 4 changes and address findings
- [x] T100 Open the slice 4 PR, and check off #3409's acceptance criteria once verified, so the issue and PR match what shipped

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational only.
- **User Story 2 (Phase 4)**: Depends on Foundational; in practice also depends on US1's `session-journal.svelte.ts`/`SessionJournalView.svelte` existing as files to extend (T021 extends T014, T022 extends T015) — sequential in this codebase, even though the user-facing behavior is independently testable per spec.
- **User Story 3 (Phase 5)**: Same shape — extends the same store/view files US1 and US2 already created.
- **User Story 4 (Phase 6)**: Depends on Foundational's types (T003) and US1's store shape (T014); otherwise touches an entirely different part of the codebase (`packages/cloud-backup-sync`, `cloud-backup.svelte.ts`, `app-init.ts`, `CloudBackupSettings.svelte`) and has no file overlap with US2/US3.
- **Polish (Phase 7)**: Depends on every user story phase being complete.
- **User Story 5 (Phase 8, slice 2)**: Depends on US1's `SessionJournalStore`/`SessionJournalView` and US3's `open()`/`controlState` (all already built). Touches `quicknote.svelte.ts`, `QuickNoteScratchpad.svelte`, `nav-items.ts`, `ActivityBar.svelte`, `MobileMenu.svelte` and help content, with no file overlap with US2, US3 or US4. Inside the phase: T046 → T047/T048 → T049.
- **Slice 2 Polish (Phase 9)**: Depends on Phase 8.
- **User Story 6 (Phase 10, slice 3)**: Depends on US1's `appendEntry`, US3's `current`/`end()` and US2's sections (all built). Touches the engine package (`events.ts`, `capture.ts`), `dice-history.svelte.ts`, `session-journal.svelte.ts`, `SessionJournalView.svelte`, new `JournalEntryRow.svelte` and `session-journal-capture.ts`, `app-init.ts` and help content, with no overlap with the roll tools' own components. Inside the phase: T063 → T064 → T065/T067; T066 → T067/T068; T067 → T069.
- **Slice 3 Polish (Phase 11)**: Depends on Phase 10.
- **User Story 7 (Phase 12, slice 4)**: Depends on the journal view and rows from US1–US3 and US6 (all merged). Touches the engine package (`promote.ts`), a new promoter store, new view components, `JournalEntryRow.svelte`, `SessionJournalView.svelte` and help content, with no change to the journal store, storage or cloud backup. Inside the phase: T086 → T087 and T089; T088 and T090 are independent; T091 needs T087–T090.
- **Slice 4 Polish (Phase 13)**: Depends on Phase 12.

### Parallel Opportunities

- T003 and T004 (Phase 2) touch different files and can run in parallel.
- Within each user story's Tests block, every `[P]`-marked task touches a different file and can run in parallel — but all of them must be written and failing before that story's Implementation tasks begin.
- US4 (Phase 6) has no file overlap with US2 or US3 and could be built in parallel with either by a second contributor, once Foundational and US1 are done.
- T035 and T036 (Polish) can run in parallel; T037–T040 are sequential (each depends on the previous succeeding).
- Phase 8: T041–T045 (tests) touch different files and can be written in parallel; T050 (help content) is independent of T046–T049. T051 and T052 (slice 2 Polish) can run in parallel; T053–T057 are sequential.
- Phase 10: T058–T062 (tests) touch different files and can be written in parallel; T066 is independent of T063–T065; T071 is independent of T070; T070 follows T060 because they share a file.
- Phase 12: T080–T085 (tests) touch different files and can be written in parallel, except that T084 and the row part of T085 both touch existing test files and should not be edited at the same time as T090/T091. T088, T090 and T092 are independent of each other. T093 and T094 (slice 4 Polish) can run in parallel; T095–T100 are sequential. T072 and T073 (slice 3 Polish) can run in parallel; T074–T079 are sequential.

---

## Parallel Example: User Story 1

```bash
# Tests for User Story 1 — different files, run together, confirm all fail first:
Task: "Unit test startOrResumeJournal in packages/session-journal-engine/tests/engine.test.ts"
Task: "Unit test appendEntry in packages/session-journal-engine/tests/engine.test.ts"
Task: "Unit test SessionJournalStore.start()/appendEntry() in apps/web/src/lib/stores/session-journal.test.ts"
Task: "Component test for Start control + note entry in apps/web/src/lib/components/quicknote/SessionJournalView.test.ts"
Task: "Concurrency test for appendEntry (two tabs) in apps/web/src/lib/stores/session-journal.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1).
3. **STOP and VALIDATE**: run quickstart.md's Story 1 check by hand.
4. This alone is a usable, if minimal, persistent play log — sections, end/resume, and cloud durability all layer on top without changing what's already shipped.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate → this is the MVP.
3. US2 (sections) → validate → still fully backward compatible with a journal that has none.
4. US3 (end/resume) → validate → completes the original GitHub issue's local-only slice.
5. US4 (cloud backup durability) → validate → closes the gap this plan was widened for; independent of US2/US3 internally, sequenced last here because it was scoped in last.
6. Polish (Phase 7) → repo gates + manual end-to-end pass → ready for PR.
