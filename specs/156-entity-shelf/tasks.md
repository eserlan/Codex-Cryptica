# Tasks: Entity Shelf

**Input**: Design documents from `/specs/156-entity-shelf/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ports.md, quickstart.md

**Tests**: Included and written first. Constitution principle II makes TDD mandatory — no logic
is committed without tests, following Red-Green-Refactor.

**Organization**: Grouped by user story so each is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3 — maps to the user stories in spec.md

## Path Conventions

Workspace monorepo: logic in `packages/entity-shelf/src/`, adapters and UI in
`apps/web/src/lib/`. Tests are co-located with sources, per repository convention.

---

## Phase 1: Setup

**Purpose**: Scaffold the new package so logic tasks have somewhere to land.

- [ ] T001 Create `packages/entity-shelf/` scaffold — `package.json`, `tsconfig.json`, vitest config — matching the conventions in `packages/generator-engine/` and registered in the workspace
- [ ] T002 [P] Define stored and in-memory shapes in `packages/entity-shelf/src/types.ts` — `ShelfEntry`, `ShelfAsset`, `ShelfGroup`, `ImportJournal`, `ImportPlan`, `ImportOutcome` — per `data-model.md`
- [ ] T003 [P] Define the four ports in `packages/entity-shelf/src/ports.ts` — `ShelfStore`, `VaultReader`, `VaultWriter`, `Clock`, `IdFactory` — per `contracts/ports.md`
- [ ] T004 [P] Build in-memory port fakes in `packages/entity-shelf/src/test-helpers.ts` for use by every unit test, following the pattern of `packages/generator-engine/src/llm/test-helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage and adapters every user story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Bump `DB_VERSION` to 23 and add `shelf_entries` (keyed by `id`, index `by-group`) and `shelf_journal` (keyed by `importId`) to the schema and upgrade callback in `apps/web/src/lib/utils/idb.ts`, each behind an `if (!db.objectStoreNames.contains(...))` guard as every other store there does
- [ ] T006 Verify the v22 → v23 upgrade against a **populated** database, not a fresh one — the version-history comment in `idb.ts` records a previously consumed no-op version, and this is the one step in the feature whose failure mode is other people's data
- [ ] T007 [P] Implement the `ShelfStore` port over IndexedDB in `apps/web/src/lib/features/shelf/idb-shelf-store.ts`, ensuring `listEntries` reads denormalised summary fields only and never loads blobs
- [ ] T008 [P] Implement `VaultReader`/`VaultWriter` factories over OPFS and the template stores in `apps/web/src/lib/features/shelf/web-shelf-vault.ts`, reusing `AssetManager.saveImageToVault` rather than writing new asset-write logic (principle III)
- [ ] T009 Write adapter tests in `apps/web/src/lib/features/shelf/idb-shelf-store.test.ts` covering: `listEntries` returns newest first without loading blobs; `putEntry` replaces an existing entry for the same `(sourceVaultId, sourceEntityId)`; `removeEntry` and `clear` release blob storage
- [ ] T010 Write adapter tests in `apps/web/src/lib/features/shelf/web-shelf-vault.test.ts` covering: `readAsset` returns `null` for a missing file rather than throwing; every `delete*` is idempotent against an absent artifact

**Checkpoint**: Storage exists and is reachable from any vault. User story work can begin.

---

## Phase 3: User Story 1 — Carry one entity to another vault (Priority: P1) 🎯 MVP

**Goal**: A finished entity moves from one vault to another complete — stat sheet, its templates, image, sound bite, and every authored field.

**Independent Test**: Author a creature with a stat sheet on a custom template, an image and a sound bite. Shelve it, switch vaults, import it, and compare field by field against the source. Only the identifier should differ.

### Tests for User Story 1 ⚠️

> Write these first and confirm they fail before implementing.

- [ ] T011 [P] [US1] Title collision tests in `packages/entity-shelf/src/titles.test.ts` — no collision leaves the title untouched (US1-6); exact, differing-case, and surrounding-whitespace collisions all suffix (FR-013a, research R5); suffixes increment past `(2)`
- [ ] T012 [P] [US1] Template comparison tests in `packages/entity-shelf/src/templates.test.ts` — identical templates reuse silently with no prompt; templates differing only in `vaultId` are treated as identical (research R6); genuinely differing templates raise a conflict; a template absent from the target is brought in
- [ ] T013 [P] [US1] Shelving tests in `packages/entity-shelf/src/shelve.test.ts` — all three asset roles are collected **including sound bite audio**; a referenced-but-missing asset shelves without it rather than throwing; re-shelving replaces the prior entry (invariant I2); templates are stored `vaultId`-stripped (I3)
- [ ] T014 [P] [US1] Import and rollback tests in `packages/entity-shelf/src/import.test.ts` — a failure injected at each write stage leaves no entity, asset, or template behind (FR-020); rollback is idempotent (J3); a journal found at startup is replayed as deletes; templates reused from the target vault are never rolled back
- [ ] T015 [P] [US1] Losslessness test in `packages/entity-shelf/src/shelve.test.ts` — an entity carrying `statSheet`, `connections`, `soundBite`, `date`, `status`, `kind`, `visibility`, `languageProfile` and `imageArtDirection` survives a shelve/import round trip with every field intact (FR-004, SC-002)

### Implementation for User Story 1

- [ ] T016 [P] [US1] Implement case-insensitive, trimmed collision detection and `Title (2)` suffixing in `packages/entity-shelf/src/titles.ts`
- [ ] T017 [P] [US1] Implement template comparison in `packages/entity-shelf/src/templates.ts`, reusing `exportPresentationTemplate()` from `@codex/stat-sheet-engine` for the presentation projection and stripping `vaultId` for schema templates
- [ ] T018 [US1] Implement entry construction in `packages/entity-shelf/src/shelve.ts` — read the entity record via `stringifyEntity` output, collect `image`, `thumbnail` **and sound bite** assets, attach both templates, compute `byteSize`
- [ ] T019 [US1] Implement `plan()` in `packages/entity-shelf/src/import.ts` — title assignments and template decisions resolved before any write
- [ ] T020 [US1] Implement the journalled write phase and compensating rollback in `packages/entity-shelf/src/import.ts` — journal before first artifact, mark each write, delete journal on success, replay as deletes on failure (research R1)
- [ ] T021 [US1] Implement `recoverCrashedImports()` in `packages/entity-shelf/src/import.ts`, replaying any journal found at startup
- [ ] T022 [US1] Assemble `EntityShelfService` and the public surface in `packages/entity-shelf/src/index.ts` — constructor injection with production defaults, exporting both class and singleton per ADR 007 (principle VIII)
- [ ] T023 [US1] Create the Svelte store in `apps/web/src/lib/features/shelf/shelf.svelte.ts` — entry list state, shelve and import actions, progress reporting for operations exceeding 1 second (SC-009)
- [ ] T024 [US1] Call `recoverCrashedImports()` during application startup so a crashed import is cleaned up before the shelf is usable
- [ ] T025 [P] [US1] Build `apps/web/src/lib/components/shelf/ShelfPanel.svelte` — flat list, newest first, no search or grouping (FR-026)
- [ ] T026 [P] [US1] Build `apps/web/src/lib/components/shelf/ShelfEntryCard.svelte` showing title, type, source vault name and shelved date (FR-022)
- [ ] T027 [P] [US1] Build `apps/web/src/lib/components/shelf/ImportOutcomeSummary.svelte` reporting entities created, any title renamed, template resolutions, and dropped connections and parent references (FR-019)
- [ ] T028 [US1] Add "Send to Shelf" to `apps/web/src/lib/components/entity-detail/DetailHeader.svelte` (FR-001)
- [ ] T029 [US1] Add component tests in `apps/web/src/lib/components/shelf/ShelfPanel.test.ts` covering the empty state and newest-first ordering

**Checkpoint**: User Story 1 is fully functional. This is a shippable MVP that resolves issue #2101 on its own.

---

## Phase 4: User Story 2 — Move a connected group in one go (Priority: P2)

**Goal**: Several selected entities move together with the relationships among them intact.

**Independent Test**: Select four mutually connected entities in the graph, shelve them, import all four into an empty vault, and verify every connection among the four survives.

### Tests for User Story 2 ⚠️

- [ ] T030 [P] [US2] Connection resolution tests in `packages/entity-shelf/src/connections.test.ts` — edges within the imported batch always reconnect (US2-2); an edge to an entity matched by title in the target reconnects (US2-3); an edge matched by alias reconnects; two matching candidates yield `ambiguous` and the edge is dropped, never guessed at; an unresolved edge never fails the import (FR-018)
- [ ] T031 [P] [US2] Parent resolution tests in `packages/entity-shelf/src/connections.test.ts` — an entity whose parent was not shelved and is absent from the target imports parentless, with the dropped reference reported
- [ ] T032 [P] [US2] Consolidated conflict tests in `packages/entity-shelf/src/import.test.ts` — importing four entities sharing two conflicting templates produces exactly two decisions, not eight (FR-016a); abandoning the conflict step writes nothing

### Implementation for User Story 2

- [ ] T033 [US2] Implement batch-first, then target-vault resolution by title and alias in `packages/entity-shelf/src/connections.ts`, classifying every failure as `not-found` or `ambiguous`, sharing the comparison used by `titles.ts` so the two can never disagree (research R5)
- [ ] T034 [US2] Extend `plan()` in `packages/entity-shelf/src/import.ts` to produce `connectionResolutions` and `parentResolutions`, and gather all template conflicts into a single decision set
- [ ] T035 [US2] Write resolved connections during the import write phase in `packages/entity-shelf/src/import.ts`, mapping shelved target identifiers onto the freshly created ones
- [ ] T036 [US2] Build `apps/web/src/lib/components/shelf/TemplateConflictStep.svelte` presenting each conflicting template once, before any write begins (FR-016a)
- [ ] T037 [P] [US2] Add "Send to Shelf" to the existing multi-selection in `apps/web/src/lib/components/table/TableContextMenu.svelte` (FR-002)
- [ ] T038 [P] [US2] Add "Send to Shelf" to the existing multi-selection in `apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts` (FR-002)
- [ ] T039 [US2] Extend `ImportOutcomeSummary.svelte` to list dropped connections with their reason, distinguishing "no match found" from "more than one match"

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 — Keep a reusable stock and understand its limits (Priority: P3)

**Goal**: Entries persist across imports, show their provenance, stay in step across tabs, and make their browser-local nature plain.

**Independent Test**: Import one entry into three vaults in succession, confirming it survives each. Delete a source vault, then import its entry — images and templates still arrive.

### Tests for User Story 3 ⚠️

- [ ] T040 [P] [US3] Reuse tests in `packages/entity-shelf/src/import.test.ts` — importing an entry leaves it on the shelf (FR-021); the same entry imported into one vault three times yields three independent entities, the later two suffixed
- [ ] T041 [P] [US3] Source-vault-deleted test in `packages/entity-shelf/src/import.test.ts` — an entry whose source vault no longer exists imports completely, assets and templates included (SC-006)
- [ ] T042 [P] [US3] Cross-tab tests in `apps/web/src/lib/features/shelf/shelf.svelte.test.ts` — a shelf-changed event triggers a re-read; the emitted event carries **no entry payload**, since `CrossTabBroadcaster` serialises with `JSON.stringify` and would silently drop blobs (research R2)

### Implementation for User Story 3

- [ ] T043 [US3] Emit a payload-free shelf-changed event on the existing `AppEventBus` from `apps/web/src/lib/features/shelf/shelf.svelte.ts`, and re-read entries on receipt, reusing `CrossTabBroadcaster` from `packages/events` rather than adding a second broadcast mechanism (FR-023a)
- [ ] T044 [P] [US3] Add remove-entry and clear-shelf actions to `ShelfPanel.svelte`, releasing the storage the entries occupied (FR-023)
- [ ] T045 [P] [US3] Show shelf storage usage and warn when approaching the browser's limit, in `ShelfPanel.svelte` using `totalBytes()` (FR-025)
- [ ] T046 [US3] Add the first-use disclosure that shelf contents live in this browser and are neither a backup nor a way to send an entity to another person — as a `FeatureHint`, per principle VII (FR-024, SC-008)
- [ ] T047 [US3] Add a Shelf entry to `apps/web/src/lib/config/help-content.ts` (principle VII)
- [ ] T048 [US3] Handle storage exhaustion during shelving in `packages/entity-shelf/src/shelve.ts` — fail with a clear message leaving no partial entry behind

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T049 Audit every user-facing string added by this feature for the word "tags" — principle XII forbids exposing it, and the `tags` field is preserved in data while never surfacing in copy. Related debt is tracked in issue #2218
- [ ] T050 Confirm `packages/entity-shelf` meets the 70% coverage goal required of new packages (principle X)
- [ ] T051 Verify SC-009 by hand — ten entities with images shelve in under 5 seconds and import in under 5 seconds, with progress shown beyond 1 second
- [ ] T052 Walk `quickstart.md` end to end, exercising every acceptance scenario in `spec.md`
- [ ] T053 Run `bun run lint` and `bun run test` clean across the workspace (principle VI)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**
- **User Story 1 (Phase 3)**: depends on Foundational. No dependency on US2 or US3
- **User Story 2 (Phase 4)**: depends on Foundational. Independently testable, though it extends `plan()` from US1
- **User Story 3 (Phase 5)**: depends on Foundational. Independently testable
- **Polish (Phase 6)**: depends on the stories being delivered

### Notable within-story ordering

- T005 → T006: verify the schema upgrade before anything writes to the new stores
- T011–T015 (tests) → T016–T021 (implementation): Red-Green-Refactor, principle II
- T016/T017 → T019: planning consumes title and template rules
- T019 → T020: nothing is written until the plan is complete, which is what keeps a dialog out of the journalled write phase (FR-016a)
- T033 → T034 → T035: resolution rules, then planning, then writing
- T023 → T043: the store exists before cross-tab wiring hangs off it

### Parallel Opportunities

- T002, T003, T004 in parallel once T001 lands
- T007 and T008 in parallel — different adapter files
- T011–T015: all five US1 test files in parallel
- T016 and T017 in parallel — `titles.ts` and `templates.ts` are independent
- T025, T026, T027 in parallel — separate components
- T037 and T038 in parallel — table and graph menus are separate files
- Once Phase 2 completes, the three user stories can be staffed in parallel

## Parallel Example: User Story 1 tests

```bash
# Write all five test files first; each must fail before its implementation exists
packages/entity-shelf/src/titles.test.ts       # T011
packages/entity-shelf/src/templates.test.ts    # T012
packages/entity-shelf/src/shelve.test.ts       # T013, T015
packages/entity-shelf/src/import.test.ts       # T014
```

---

## Implementation Strategy

**MVP is Phase 1 + Phase 2 + Phase 3.** User Story 1 alone resolves issue #2101 as reported —
an author can move a fully authored entity between vaults. Stopping there would ship something
genuinely useful, and every subsequent phase adds value without being required for it.

Increment in story order after that: US2 makes moving a group worth doing, US3 turns a one-shot
move into reusable stock.

### Task counts

| Phase             | Tasks  |
| ----------------- | ------ |
| Setup             | 4      |
| Foundational      | 6      |
| User Story 1 (P1) | 19     |
| User Story 2 (P2) | 10     |
| User Story 3 (P3) | 9      |
| Polish            | 5      |
| **Total**         | **53** |

### Watch for

- **Sound bite audio is a third asset type** alongside image and thumbnail (T013, T018).
  Entities otherwise arrive looking correct and fail only when someone presses play.
- **Blobs cannot cross the cross-tab channel** (T042, T043).
- **`plan` and `import` stay separate** — no dialog may open inside the journalled write phase,
  or a closed tab strands a journal behind it.
- **T006 is the one task whose failure mode is other people's data.** Test the schema upgrade
  against a populated profile.
