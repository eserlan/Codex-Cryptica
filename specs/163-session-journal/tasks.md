---
description: "Task list for Session Journal (data model, persistence & lifecycle)"
---

# Tasks: Session Journal (data model, persistence & lifecycle)

**Input**: Design documents from `/specs/163-session-journal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/session-journal-store-api.md, quickstart.md

**Tests**: Included as first-class tasks — this repo's Constitution (Principle II, TDD) and AGENTS.md ("Do not commit implementation changes without tests for the affected behavior... cover both the expected success path and at least one meaningful negative, cancellation, or failure path") require them, not an optional add-on.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

## Path Conventions

Per plan.md's Project Structure: a new pure-logic package `packages/session-journal-engine/`, a thin store + UI in `apps/web/src/lib/`, and touch points in the existing cloud-backup surface for US4.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the new workspace package before any logic is written into it.

- [ ] T001 Create `packages/session-journal-engine/package.json`, mirroring `packages/chronology-engine/package.json`'s shape (name `session-journal-engine`, `main`/`types` at `./src/index.ts`, `test`/`test:coverage`/`lint` scripts, `devDependencies` matching `chronology-engine`'s, no runtime `dependencies` — this package is framework-free)
- [ ] T002 Run `bun install` from the repo root so the new workspace package (already covered by the root `packages/*` glob) resolves for other workspaces to import

**Checkpoint**: `packages/session-journal-engine` exists and is installable; no discovery-page task applies (this feature has no public, indexable page — Discovery Intent Governance is N/A per plan.md).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared types, persistence schema, and store skeleton every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [P] Define `SessionJournal`, `JournalSection`, `JournalEntry`, `JournalEntryInput` types in `packages/session-journal-engine/src/types.ts` per data-model.md's field tables
- [ ] T004 [P] Add the `session_journals` object store (`keyPath: "id"`, `by-vault` index on `vaultId`) to `CodexDB` in `apps/web/src/lib/utils/idb.ts`, bumping `DB_VERSION` by 1 and guarding the addition with `objectStoreNames.contains("session_journals")` exactly like the existing `canvases` store (data-model.md's Persistence Mapping)
- [ ] T005 Create `packages/session-journal-engine/src/index.ts` re-exporting `types.ts` (depends on T003)
- [ ] T006 Create the `SessionJournalStore` skeleton in `apps/web/src/lib/stores/session-journal.svelte.ts`: constructor-injected `vaultRegistry` (default: the real singleton) and `idb.ts` access, `$state` holding the loaded journal(s) for the active vault, an `$effect` that reloads on `vaultRegistry.activeVaultId` change — no lifecycle methods yet (depends on T004, T005)
- [ ] T007 [P] Unit test the vault-scoped load in `apps/web/src/lib/stores/session-journal.test.ts`, mocking `getDB()` from `../utils/idb` with an in-memory `Map`-backed fake per `calendar.test.ts`'s pattern: success — a journal stored under vault A is not visible after switching to vault B (FR-012); failure/negative — no journal stored for a vault resolves to `undefined`/empty rather than throwing (depends on T006)

**Checkpoint**: Foundation ready — every user story phase below can now proceed.

---

## Phase 3: User Story 1 - Start a session journal and add notes as play happens (Priority: P1) 🎯 MVP

**Goal**: A user can start a journal from Quicknote/Scratchpad and add manual, timestamped notes without leaving it.

**Independent Test**: Open Quicknote/Scratchpad with no journal active, start one, add two or three notes, confirm they render in order with timestamps (quickstart.md's Story 1 verification).

### Tests for User Story 1 ⚠️

> Write these tests FIRST; confirm they fail before implementing T012–T014.

- [ ] T008 [P] [US1] Unit test `startOrResumeJournal` in `packages/session-journal-engine/tests/engine.test.ts`: success — creates a new active journal when none exists for the vault; negative — calling it again while one is already active returns that same journal rather than creating a second one (FR-013, needed by US1's own "start" affordance even before US3 formalizes end/resume)
- [ ] T009 [P] [US1] Unit test `appendEntry` in `packages/session-journal-engine/tests/engine.test.ts`: success — entries are inserted in chronological order by `timestamp`; negative — appending to a journal whose `status` is `"ended"` is rejected (FR-007's guard, exercised here even though `endJournal` itself lands in US3)
- [ ] T010 [P] [US1] Unit test `SessionJournalStore.start()`/`appendEntry()` in `apps/web/src/lib/stores/session-journal.test.ts` (mocked `getDB()`): success — starting then appending persists and reloads correctly; negative — `appendEntry()` with no active journal for the vault rejects (contract's documented behavior)
- [ ] T011 [P] [US1] Component test for the Start control and note entry in `apps/web/src/lib/components/quicknote/SessionJournalView.test.ts`: success — clicking "Start Session Journal" then submitting a note shows it in the list; negative — the add-note field is not shown/usable before a journal exists

### Implementation for User Story 1

- [ ] T012 [US1] Implement `startOrResumeJournal` and `appendEntry` in `packages/session-journal-engine/src/engine.ts`, pure functions per data-model.md's invariants (depends on T003; makes T008, T009 pass)
- [ ] T013 [US1] Implement `SessionJournalStore.start()`, `.appendEntry()`, and the `controlState` derivation's `"start"`/`"open"` cases in `apps/web/src/lib/stores/session-journal.svelte.ts` (depends on T006, T012; makes T010 pass)
- [ ] T014 [US1] Add the Start/Open control and a new `apps/web/src/lib/components/quicknote/SessionJournalView.svelte` (entry list + add-note field) to `apps/web/src/lib/components/quicknote/QuickNoteScratchpad.svelte`, keeping Quicknote's own transient-note UI untouched (FR-015) (depends on T013; makes T011 pass)
- [ ] T015 [US1] Add a Session Journal entry to `apps/web/src/lib/config/help-content.ts` and a `FeatureHint` in `SessionJournalView.svelte` (Constitution VII — user documentation for a multi-step feature)

**Checkpoint**: User Story 1 is fully functional and testable on its own.

---

## Phase 4: User Story 2 - Organize a long session into sections (Priority: P2)

**Goal**: A user can create and rename optional sections within an active journal.

**Independent Test**: Start a journal, create a section, rename it, add entries, confirm a journal with zero sections still works exactly as US1 (quickstart.md's Story 2 verification).

### Tests for User Story 2 ⚠️

- [ ] T016 [P] [US2] Unit test `createSection`, `renameSection`, `validateSectionName` in `packages/session-journal-engine/tests/engine.test.ts`: success — create then rename a section; negative — renaming to an empty or whitespace-only name is rejected and the prior name is kept (FR-005)
- [ ] T017 [P] [US2] Unit test `SessionJournalStore.createSection()`/`renameSection()` in `apps/web/src/lib/stores/session-journal.test.ts`: success — a created section persists and reloads; negative — `renameSection()` with an empty name rejects without mutating the section
- [ ] T018 [P] [US2] Component test for section create/rename in `apps/web/src/lib/components/quicknote/SessionJournalView.test.ts`: success — creating and renaming a section updates the view; negative — submitting an empty rename shows the rejection and keeps the old name displayed

### Implementation for User Story 2

- [ ] T019 [US2] Implement `createSection`, `renameSection`, `validateSectionName` in `packages/session-journal-engine/src/engine.ts` (depends on T003; makes T016 pass)
- [ ] T020 [US2] Implement `SessionJournalStore.createSection()`/`renameSection()` in `session-journal.svelte.ts` (depends on T013, T019; makes T017 pass)
- [ ] T021 [US2] Add section create/rename controls to `SessionJournalView.svelte`, including the empty-name rejection feedback (depends on T014, T020; makes T018 pass)

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - End a session and come back to it later (Priority: P1)

**Goal**: A user can end a journal (preserving it) and later resume an unfinished one or browse past ended journals.

**Independent Test**: End a journal with entries, reload, confirm it's still there and read-only; separately, leave a journal active, reload, confirm "Resume Session Journal" picks up every entry/section (quickstart.md's Story 3 verification).

### Tests for User Story 3 ⚠️

- [ ] T022 [P] [US3] Unit test `endJournal` in `packages/session-journal-engine/tests/engine.test.ts`: success — sets `status: "ended"` and `endedAt`, including for a journal with zero entries (spec Edge Case: ending an empty session is valid); negative — `endJournal` on an already-ended journal is rejected/no-op rather than double-transitioning
- [ ] T023 [P] [US3] Unit test `SessionJournalStore.end()`, `.listJournals()`, and the `controlState`'s `"resume"` case in `apps/web/src/lib/stores/session-journal.test.ts`: success — ending marks the journal ended and `listJournals()` still returns it; negative — `.end()` with no active journal for the vault rejects
- [ ] T024 [P] [US3] Component test for the End Session action and the post-reload Resume state in `apps/web/src/lib/components/quicknote/SessionJournalView.test.ts`/`QuickNoteScratchpad.test.ts`: success — ending shows the journal as read-only and starting a new one creates a separate journal (FR-008's "ended content untouched"); negative — the add-note field is not available on an ended journal

### Implementation for User Story 3

- [ ] T025 [US3] Implement `endJournal` (and its interaction with `appendEntry`'s already-in-place ended-journal guard from T012) in `packages/session-journal-engine/src/engine.ts` (depends on T012; makes T022 pass)
- [ ] T026 [US3] Implement `SessionJournalStore.end()`, `.listJournals()`, and the `controlState`'s `"resume"` derivation in `session-journal.svelte.ts` (depends on T013, T025; makes T023 pass)
- [ ] T027 [US3] Add the End Session action and a simple past-journals list (FR-008's "browsable afterward") to `SessionJournalView.svelte` (depends on T021, T026; makes T024 pass)

**Checkpoint**: User Stories 1–3 are complete — this is the full local-only scope of the original request.

---

## Phase 6: User Story 4 - Keep the journal when moving to a new device or restoring a cloud backup (Priority: P2)

**Goal**: A vault with cloud backup enabled includes session journals in its backup/restore, with the consent screen updated to say so.

**Independent Test**: Enable cloud backup on a vault with a journal, back up, restore into a new vault, confirm the journal (entries and sections intact) is present (quickstart.md's Story 4 verification).

### Tests for User Story 4 ⚠️

- [ ] T028 [P] [US4] Unit test the `sessionJournals` bundle/delta field in `packages/cloud-backup-sync/src/cloud-backup-sync.test.ts`: success — a bundle including `sessionJournals` round-trips through build/parse; negative — a bundle with `sessionJournals` absent/`undefined` (an old backup, or a vault with no journals) parses exactly as it did before this change, with no crash and no spurious empty-array insertion
- [ ] T029 [P] [US4] Unit test the `importSessionJournals` restore path in `apps/web/src/lib/stores/cloud-backup.svelte.test.ts`, following the existing `importMaps`/`importCanvases` test cases: success — `restoreIntoNewVault` calls `importSessionJournals` when the bundle has journals; negative — restore does not fail when `importSessionJournals` is undefined (optional dependency, same as `importMaps`/`importCanvases` today)

### Implementation for User Story 4

- [ ] T030 [US4] Add `sessionJournals?: SessionJournal[]` to the bundle/delta type and gather/parse logic in `packages/cloud-backup-sync/src/cloud-backup-sync.ts`, alongside the existing `maps`/`canvases` fields (depends on T003; makes T028 pass)
- [ ] T031 [US4] Add an `importSessionJournals?: (vaultId: string, journals: unknown[]) => Promise<void>` hook to the `restore` dependency object and call it from `restoreIntoNewVault` in `apps/web/src/lib/stores/cloud-backup.svelte.ts`, mirroring `importMaps`/`importCanvases` exactly (depends on T030; makes T029 pass)
- [ ] T032 [US4] Add the `SessionJournalStore.allJournals` accessor (contracts/session-journal-store-api.md) to `session-journal.svelte.ts`, then wire `sessionJournals: sessionJournalStore.allJournals` into the `buildPayload` call and provide the production `importSessionJournals` implementation in `apps/web/src/lib/app/init/app-init.ts`, next to the existing `maps`/`canvases` lines (depends on T013, T031)
- [ ] T033 [P] [US4] Update the "What gets stored" consent copy in `apps/web/src/lib/components/settings/CloudBackupSettings.svelte` to name session journals alongside entities, labels, notes, maps, canvases and images

**Checkpoint**: All four user stories are complete — the full scope of this slice, including cross-device/cloud durability.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Repo-wide gates this AGENTS.md requires before a PR, plus the manual pass quickstart.md describes.

- [ ] T034 [P] Run `bun run lint:changed` (or `bun scripts/lint-changed.mjs`) and fix any findings across all files touched by T001–T033
- [ ] T035 [P] Run `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web` and fix any errors
- [ ] T036 Run `bun run test:changed` (or `bun scripts/test-changed.mjs`) and confirm everything from T007–T029 passes together, not just in isolation
- [ ] T037 Manually walk through quickstart.md's four story verifications end-to-end in a running app (not just unit tests) — this is the only step that actually exercises the Quicknote UI, IndexedDB, and (for US4) a real cloud-backup enable/backup/restore cycle together
- [ ] T038 Run `bunx fallow audit --format json --quiet --explain --gate-marker agent --base staging` and resolve any introduced findings before opening the PR (AGENTS.md's Fallow local gate)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Story 1 (Phase 3)**: Depends on Foundational only.
- **User Story 2 (Phase 4)**: Depends on Foundational; in practice also depends on US1's `session-journal.svelte.ts`/`SessionJournalView.svelte` existing as files to extend (T020 extends T013, T021 extends T014) — sequential in this codebase, even though the user-facing behavior is independently testable per spec.
- **User Story 3 (Phase 5)**: Same shape — extends the same store/view files US1 and US2 already created.
- **User Story 4 (Phase 6)**: Depends on Foundational's types (T003) and US1's `allJournals`-ready store shape (T013); otherwise touches an entirely different part of the codebase (`packages/cloud-backup-sync`, `cloud-backup.svelte.ts`, `app-init.ts`, `CloudBackupSettings.svelte`) and has no file overlap with US2/US3.
- **Polish (Phase 7)**: Depends on every user story phase being complete.

### Parallel Opportunities

- T003 and T004 (Phase 2) touch different files and can run in parallel.
- Within each user story's Tests block, every `[P]`-marked task touches a different file and can run in parallel — but all of them must be written and failing before that story's Implementation tasks begin.
- US4 (Phase 6) has no file overlap with US2 or US3 and could be built in parallel with either by a second contributor, once Foundational and US1 are done.
- T034 and T035 (Polish) can run in parallel; T036–T038 are sequential (each depends on the previous succeeding).

---

## Parallel Example: User Story 1

```bash
# Tests for User Story 1 — different files, run together, confirm all fail first:
Task: "Unit test startOrResumeJournal in packages/session-journal-engine/tests/engine.test.ts"
Task: "Unit test appendEntry in packages/session-journal-engine/tests/engine.test.ts"
Task: "Unit test SessionJournalStore.start()/appendEntry() in apps/web/src/lib/stores/session-journal.test.ts"
Task: "Component test for Start control + note entry in apps/web/src/lib/components/quicknote/SessionJournalView.test.ts"
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
