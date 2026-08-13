# Tasks: Entity Shelf

**Input**: Design documents from `/specs/156-entity-shelf/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ports.md, quickstart.md

**Tests**: Included and written first. Constitution principle II makes TDD mandatory — no logic
is committed without tests, following Red-Green-Refactor. Every phase below places its test
tasks ahead of the implementation they cover.

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

- [x] T001 Create `packages/entity-shelf/` scaffold — `package.json`, `tsconfig.json`, vitest config — matching the conventions in `packages/generator-engine/` and registered in the workspace
- [x] T002 [P] Define stored and in-memory shapes in `packages/entity-shelf/src/types.ts` — `ShelfEntry`, `ShelfAsset`, `ShelfGroup`, `ImportJournal`, `ImportPlan`, `ImportOutcome` — per `data-model.md`. Note that `ShelfGroup` is assembled in memory from entries sharing a `groupId`; it has no store of its own
- [x] T003 [P] Define the four ports in `packages/entity-shelf/src/ports.ts` — `ShelfStore`, `VaultReader`, `VaultWriter`, `Clock`, `IdFactory` — per `contracts/ports.md`
- [x] T004 [P] Build in-memory port fakes in `packages/entity-shelf/src/test-helpers.ts` for use by every unit test, following the pattern of `packages/generator-engine/src/llm/test-helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage and adapters every user story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Bump `DB_VERSION` to 23 and add `shelf_entries` (keyed by `id`, index `by-group`) and `shelf_journal` (keyed by `importId`) to the schema and upgrade callback in `apps/web/src/lib/utils/idb.ts`, each behind an `if (!db.objectStoreNames.contains(...))` guard as every other store there does
- [x] T006 Verify the v22 → v23 upgrade against a **populated** database, not a fresh one — automated as `apps/web/tests/shelf-db-upgrade.spec.ts` — the version-history comment in `idb.ts` records a previously consumed no-op version, and this is the one step in the feature whose failure mode is other people's data

### Tests for the adapters ⚠️

> Write these before the adapters exist and confirm they fail.

- [x] T007 [P] Write `ShelfStore` tests in `apps/web/src/lib/features/shelf/idb-shelf-store.test.ts` covering: `listEntries` returns newest first without loading blobs; `putEntry` replaces an existing entry for the same `(sourceVaultId, sourceEntityId)` (invariant I2); `removeEntry` and `clear` release blob storage (FR-023); **`listEntries` returns identical results regardless of which vault is currently open (FR-003)**
- [x] T008 [P] Write vault adapter tests in `apps/web/src/lib/features/shelf/web-shelf-vault.test.ts` covering: `readAsset` returns `null` for a missing file rather than throwing; every `delete*` is idempotent against an absent artifact (invariant J3)

### Implementation of the adapters

- [x] T009 [P] Implement the `ShelfStore` port over IndexedDB in `apps/web/src/lib/features/shelf/idb-shelf-store.ts`, ensuring `listEntries` reads denormalised summary fields only and never loads blobs
- [x] T010 [P] Implement `VaultReader`/`VaultWriter` factories over OPFS and the template stores in `apps/web/src/lib/features/shelf/web-shelf-vault.ts`, reusing `AssetManager.saveImageToVault` rather than writing new asset-write logic (principle III)

**Checkpoint**: Storage exists and is reachable from any vault. User story work can begin.

---

## Phase 3: User Story 1 — Carry one entity to another vault (Priority: P1) 🎯 MVP

**Goal**: A finished entity moves from one vault to another complete — stat sheet, its templates, image, sound bite, and every authored field.

**Independent Test**: Author a creature with a stat sheet on a custom template, an image and a sound bite. Shelve it, switch vaults, import it, and compare field by field against the source. Only the identifier should differ.

### Tests for User Story 1 ⚠️

> Write these first and confirm they fail before implementing.

- [x] T011 [P] [US1] Title collision tests in `packages/entity-shelf/src/titles.test.ts` — no collision leaves the title untouched (US1-6); exact, differing-case, and surrounding-whitespace collisions all suffix (FR-013a, research R5); suffixes increment past `(2)`
- [x] T012 [P] [US1] Template comparison tests in `packages/entity-shelf/src/templates.test.ts` — identical templates reuse silently with no prompt; templates differing only in `vaultId` are treated as identical (research R6); genuinely differing templates raise a conflict; a template absent from the target is brought in (FR-015)
- [x] T013 [P] [US1] Shelving tests in `packages/entity-shelf/src/shelve.test.ts` — all three asset roles are collected **including sound bite audio** (FR-005); a referenced-but-missing asset shelves without it rather than throwing; re-shelving replaces the prior entry (I2, FR-009); templates are stored `vaultId`-stripped (I3, FR-006); **every entry records the `groupId` of the shelving action that produced it, a lone entity included (FR-008)**; `sourceVaultName` is captured at shelving time (FR-007)
- [x] T014 [P] [US1] Import and rollback tests in `packages/entity-shelf/src/import.test.ts` — a failure injected at each write stage leaves no entity, asset, or template behind (FR-020, SC-007); rollback is idempotent (J3); a journal found at startup is replayed as deletes; templates reused from the target vault are never rolled back; **the entry's assets are written into the target vault and referenced by the created entity (FR-014)**
- [x] T015 [P] [US1] Losslessness test in `packages/entity-shelf/src/shelve.test.ts` — an entity carrying `statSheet`, `connections`, `soundBite`, `date`, `status`, `kind`, `visibility`, `languageProfile` and `imageArtDirection` survives a shelve/import round trip with every field intact (FR-004, SC-002)
- [x] T016 [P] [US1] Source-immutability test in `packages/entity-shelf/src/shelve.test.ts` — after shelving, the source entity record, its assets, and its templates are unchanged, and no write of any kind was issued against the source vault (FR-010)
- [x] T017 [P] [US1] No-overwrite test in `packages/entity-shelf/src/import.test.ts` — importing into a vault already holding entities with the same titles and the same source identifiers creates new entities and leaves **every** pre-existing entity byte-identical (FR-013, SC-004). This invariant is what makes rollback safe rather than destructive (data-model J2), so it is verified directly rather than inferred
- [x] T018 [P] [US1] Storage-exhaustion test in `packages/entity-shelf/src/shelve.test.ts` — a quota failure part-way through shelving leaves no partial entry on the shelf and surfaces a clear message (SC-007)
- [x] T019 [P] [US1] Component tests in `apps/web/src/lib/components/shelf/ShelfPanel.test.ts` covering the empty state and newest-first ordering (FR-026)

### Implementation for User Story 1

- [x] T020 [P] [US1] Implement case-insensitive, trimmed collision detection and `Title (2)` suffixing in `packages/entity-shelf/src/titles.ts`
- [x] T021 [P] [US1] Implement template comparison in `packages/entity-shelf/src/templates.ts`, reusing `exportPresentationTemplate()` from `@codex/stat-sheet-engine` for the presentation projection and stripping `vaultId` for schema templates
- [x] T022 [US1] Implement entry construction in `packages/entity-shelf/src/shelve.ts` — read the entity record via `stringifyEntity` output, collect `image`, `thumbnail` **and sound bite** assets, attach both templates, assign `groupId`, capture `sourceVaultName`, compute `byteSize`
- [x] T023 [US1] Handle storage exhaustion during shelving in `packages/entity-shelf/src/shelve.ts` — fail with a clear message leaving no partial entry behind. Shelving ships in this MVP, so this belongs here rather than with the later shelf-management work
- [x] T024 [US1] Implement `plan()` in `packages/entity-shelf/src/import.ts` — title assignments and template decisions resolved before any write
- [x] T025 [US1] Implement the journalled write phase and compensating rollback in `packages/entity-shelf/src/import.ts` — journal before first artifact, mark each write, delete journal on success, replay as deletes on failure (research R1)
- [x] T026 [US1] Implement `recoverCrashedImports()` in `packages/entity-shelf/src/import.ts`, replaying any journal found at startup
- [x] T027 [US1] Assemble `EntityShelfService` and the public surface in `packages/entity-shelf/src/index.ts` — constructor injection with production defaults, exporting both class and singleton per ADR 007 (principle VIII)
- [x] T028 [US1] Create the Svelte store in `apps/web/src/lib/features/shelf/shelf.svelte.ts` — entry list state, shelve and import actions, progress reporting for operations exceeding 1 second (SC-009)
- [x] T029 [US1] Call `recoverCrashedImports()` during application startup so a crashed import is cleaned up before the shelf is usable
- [x] T030 [P] [US1] Build `apps/web/src/lib/components/shelf/ShelfPanel.svelte` — flat list, newest first, no search or grouping (FR-026)
- [x] T031 [P] [US1] Build `apps/web/src/lib/components/shelf/ShelfEntryCard.svelte` showing title, type, source vault name and shelved date (FR-022)
- [x] T032 [P] [US1] Build `apps/web/src/lib/components/shelf/ImportOutcomeSummary.svelte` reporting entities created, any title renamed, template resolutions, and dropped connections and parent references (FR-019)
- [x] T033 [US1] Add "Send to Shelf" to `apps/web/src/lib/components/entity-detail/DetailHeader.svelte` (FR-001)

**Checkpoint**: User Story 1 is fully functional. This is a shippable MVP that resolves issue #2101 on its own.

---

## Phase 4: User Story 2 — Move a connected group in one go (Priority: P2)

**Goal**: Several selected entities move together with the relationships among them intact.

**Independent Test**: Select four mutually connected entities in the graph, shelve them, import all four into an empty vault, and verify every connection among the four survives.

### Tests for User Story 2 ⚠️

- [x] T034 [P] [US2] Connection resolution tests in `packages/entity-shelf/src/connections.test.ts` — edges within the imported batch always reconnect (US2-2, SC-003); an edge to an entity matched by title in the target reconnects (US2-3); an edge matched by alias reconnects; two matching candidates yield `ambiguous` and the edge is dropped, never guessed at; an unresolved edge never fails the import (FR-018, SC-005)
- [x] T035 [P] [US2] Parent resolution tests in `packages/entity-shelf/src/connections.test.ts` — an entity whose parent was not shelved and is absent from the target imports parentless, with the dropped reference reported
- [x] T036 [P] [US2] Consolidated conflict tests in `packages/entity-shelf/src/import.test.ts` — importing four entities sharing two conflicting templates produces exactly two decisions, not eight (FR-016a); abandoning the conflict step writes nothing

### Implementation for User Story 2

- [x] T037 [US2] Implement batch-first, then target-vault resolution by title and alias in `packages/entity-shelf/src/connections.ts`, classifying every failure as `not-found` or `ambiguous`, sharing the comparison used by `titles.ts` so the two can never disagree (research R5)
- [x] T038 [US2] Extend `plan()` in `packages/entity-shelf/src/import.ts` to produce `connectionResolutions` and `parentResolutions`, and gather all template conflicts into a single decision set (FR-016a)
- [x] T039 [US2] Write resolved connections during the import write phase in `packages/entity-shelf/src/import.ts`, mapping shelved target identifiers onto the freshly created ones (FR-012)
- [x] T040 [US2] Build `apps/web/src/lib/components/shelf/TemplateConflictStep.svelte` presenting each conflicting template once, before any write begins (FR-016)
- [x] T041 [P] [US2] Add "Send to Shelf" to the existing multi-selection in `apps/web/src/lib/components/table/TableContextMenu.svelte` (FR-002)
- [x] T042 [P] [US2] Add "Send to Shelf" to the existing multi-selection in `apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts` (FR-002)
- [x] T043 [US2] Extend `ImportOutcomeSummary.svelte` to list dropped connections with their reason, distinguishing "no match found" from "more than one match" (FR-019)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 — Keep a reusable stock and understand its limits (Priority: P3)

**Goal**: Entries persist across imports, show their provenance, stay in step across tabs, and make their browser-local nature plain.

**Independent Test**: Import one entry into three vaults in succession, confirming it survives each. Delete a source vault, then import its entry — images and templates still arrive.

### Tests for User Story 3 ⚠️

- [x] T044 [P] [US3] Reuse tests in `packages/entity-shelf/src/import.test.ts` — importing an entry leaves it on the shelf (FR-021); the same entry imported into one vault three times yields three independent entities, the later two suffixed
- [x] T045 [P] [US3] Source-vault-deleted test in `packages/entity-shelf/src/import.test.ts` — an entry whose source vault no longer exists imports completely, assets and templates included (FR-007, SC-006)
- [x] T046 [P] [US3] Cross-tab tests in `apps/web/src/lib/features/shelf/shelf.svelte.test.ts` — a shelf-changed event triggers a re-read; the emitted event carries **no entry payload**, since `CrossTabBroadcaster` serialises with `JSON.stringify` and would silently drop blobs (research R2, FR-023a)

### Implementation for User Story 3

- [x] T047 [US3] Emit a payload-free shelf-changed event on the existing `AppEventBus` from `apps/web/src/lib/features/shelf/shelf.svelte.ts`, and re-read entries on receipt, reusing `CrossTabBroadcaster` from `packages/events` rather than adding a second broadcast mechanism (FR-023a)
- [x] T048 [P] [US3] Add remove-entry and clear-shelf actions to `ShelfPanel.svelte`, releasing the storage the entries occupied (FR-023)
- [x] T049 [P] [US3] Show shelf storage usage in `ShelfPanel.svelte` using `totalBytes()`, warning once the shelf exceeds 80% of the browser's reported storage allowance and naming clearing entries as the remedy (FR-025)
- [x] T050 [US3] Add the first-use disclosure that shelf contents live in this browser and are neither a backup nor a way to send an entity to another person — as a `FeatureHint`, per principle VII (FR-024, SC-008)
- [x] T051 [US3] Add a Shelf entry to `apps/web/src/lib/config/help-content.ts` (principle VII)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T052 Audit every user-facing string added by this feature for the word "tags" — principle XII forbids exposing it, and the `tags` field is preserved in data while never surfacing in copy. Related debt is tracked in issue #2218
- [x] T053 Confirm `packages/entity-shelf` meets the 70% coverage goal required of new packages (principle X)
- [ ] T054 Verify SC-009 by hand — ten entities with images shelve in under 5 seconds and import in under 5 seconds, with progress shown beyond 1 second — and SC-001, that a single entity moves between vaults in under 30 seconds
- [x] T055 Walk `quickstart.md` end to end — the round trip is automated as `apps/web/tests/shelf-round-trip.spec.ts` (two real vaults, real OPFS, stat sheet verified). The remaining manual scenarios are the ones needing images, sound bites, and two open tabs
- [x] T056 Run `bun run lint` and `bun run test` clean across the workspace (principle VI)

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
- T007/T008 → T009/T010: adapter tests precede adapter implementations (principle II)
- T011–T019 → T020–T033: story tests precede story implementation (principle II)
- T020/T021 → T024: planning consumes title and template rules
- T024 → T025: nothing is written until the plan is complete, which is what keeps a dialog out of the journalled write phase (FR-016a)
- T034/T035/T036 → T037 → T038 → T039: tests, then resolution rules, then planning, then writing
- T028 → T047: the store exists before cross-tab wiring hangs off it

### Parallel Opportunities

- T002, T003, T004 in parallel once T001 lands
- T007 and T008 in parallel — different test files
- T009 and T010 in parallel — different adapter files
- T011–T019: all nine US1 test tasks in parallel
- T020 and T021 in parallel — `titles.ts` and `templates.ts` are independent
- T030, T031, T032 in parallel — separate components
- T034, T035, T036 in parallel — US2 tests
- T041 and T042 in parallel — table and graph menus are separate files
- T048 and T049 in parallel — separate concerns within the panel
- Once Phase 2 completes, the three user stories can be staffed in parallel

## Parallel Example: User Story 1 tests

```bash
# Write all nine test tasks first; each must fail before its implementation exists
packages/entity-shelf/src/titles.test.ts        # T011
packages/entity-shelf/src/templates.test.ts     # T012
packages/entity-shelf/src/shelve.test.ts        # T013, T015, T016, T018
packages/entity-shelf/src/import.test.ts        # T014, T017
apps/web/src/lib/components/shelf/ShelfPanel.test.ts  # T019
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
| User Story 1 (P1) | 23     |
| User Story 2 (P2) | 10     |
| User Story 3 (P3) | 8      |
| Polish            | 5      |
| **Total**         | **56** |

### Watch for

- **Sound bite audio is a third asset type** alongside image and thumbnail (T013, T022).
  Entities otherwise arrive looking correct and fail only when someone presses play.
- **T017 guards the assumption the rollback design rests on.** Invariant J2 holds that rollback
  is safe _because_ import never overwrites. If that ever stops being true, rollback quietly
  becomes destructive rather than merely incomplete, so it is tested directly.
- **Blobs cannot cross the cross-tab channel** (T046, T047).
- **`plan` and `import` stay separate** — no dialog may open inside the journalled write phase,
  or a closed tab strands a journal behind it.
- **T006 is the one task whose failure mode is other people's data.** Test the schema upgrade
  against a populated profile.
