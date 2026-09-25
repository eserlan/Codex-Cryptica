---
description: "Task list for Session Journal (slice 1: data model, persistence & lifecycle; slice 2: global access point)"
---

# Tasks: Session Journal (data model, persistence & lifecycle)

**Input**: Design documents from `/specs/163-session-journal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/session-journal-store-api.md, quickstart.md

**Tests**: Included as first-class tasks — this repo's Constitution (Principle II, TDD) and AGENTS.md ("Do not commit implementation changes without tests for the affected behavior... cover both the expected success path and at least one meaningful negative, cancellation, or failure path") require them, not an optional add-on.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

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
- [ ] T054 Manually walk through quickstart.md's Story 5 verification in a running app (desktop and phone-width, guest mode, vault switch, reload → Resume). This is also where FR-022's route-navigation survival is verified — jsdom cannot route — so navigate the journal control between at least two different routes with the panel closed and reopened, and confirm journal content, control state and last-selected tab are unchanged. Unit tests cannot show that the control is reachable and correctly stacked against the panel overlay
- [x] T055 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent --base staging` and resolve any introduced findings before pushing
- [x] T056 Run the `codex-review` specialist review on the slice 2 changes (AGENTS.md PR Quality Gate) and address findings
- [ ] T057 Update PR #3422's description, and check off #3407's acceptance criteria once verified, so the issue and PR match what shipped

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

### Parallel Opportunities

- T003 and T004 (Phase 2) touch different files and can run in parallel.
- Within each user story's Tests block, every `[P]`-marked task touches a different file and can run in parallel — but all of them must be written and failing before that story's Implementation tasks begin.
- US4 (Phase 6) has no file overlap with US2 or US3 and could be built in parallel with either by a second contributor, once Foundational and US1 are done.
- T035 and T036 (Polish) can run in parallel; T037–T040 are sequential (each depends on the previous succeeding).
- Phase 8: T041–T045 (tests) touch different files and can be written in parallel; T050 (help content) is independent of T046–T049. T051 and T052 (slice 2 Polish) can run in parallel; T053–T057 are sequential.

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
