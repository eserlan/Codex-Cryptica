# Tasks: Entity Labeling System

**Input**: Design documents from `/specs/029-entity-labeling/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and core schema definition.

- [ ] T001 [P] Create `apps/web/src/lib/components/labels/` directory for label-related UI components
- [ ] T002 Update `Entity` schema in `packages/schema/src/index.ts` to include optional `labels: z.string().array().optional()`
- [ ] T003 [P] Add label-related unit tests in `packages/schema/src/index.test.ts` (if it exists, otherwise create it)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core indexing and persistence logic in the Vault store.

- [ ] T004 Implement label indexing logic in `apps/web/src/lib/stores/vault.svelte.ts` to build a project-wide `labelIndex`
- [ ] T005 Update YAML parsing in `packages/editor-core/src/parser.ts` (or equivalent) to correctly extract and inject labels from frontmatter
- [ ] T006 Add `addLabel` and `removeLabel` methods to `vault` store in `apps/web/src/lib/stores/vault.svelte.ts`
- [ ] T007 [P] Implement `LabelBadge.svelte` component in `apps/web/src/lib/components/labels/LabelBadge.svelte` for consistent tag rendering

**Checkpoint**: Foundation ready - Vault can now index and persist labels.

---

## Phase 3: User Story 1 - Categorizing Entities with Labels (Priority: P1) 🎯 MVP

**Goal**: Allow users to assign and view labels in the Entity Detail Panel.

**Independent Test**: Open an entity, add "Session 1", see it persist after reload.

- [ ] T008 [US1] Implement `LabelInput.svelte` with basic text entry in `apps/web/src/lib/components/labels/LabelInput.svelte`
- [ ] T009 [US1] Integrate `LabelInput` and `LabelBadge` list into `apps/web/src/lib/components/EntityDetailPanel.svelte`
- [ ] T010 [US1] Add label display to `apps/web/src/lib/components/modals/ZenModeModal.svelte`
- [ ] T011 [US1] Create Playwright E2E test for label assignment in `apps/web/tests/labels.spec.ts`

**Checkpoint**: User Story 1 complete - core tagging functionality is functional.

---

## Phase 4: User Story 2 - Filtering the Workspace by Labels (Priority: P1)

**Goal**: Enable graph filtering and label-based search.

**Independent Test**: Select a label in the filter menu; only matching nodes remain on the graph.

- [ ] T012 [P] [US2] Implement `LabelFilter.svelte` component in `apps/web/src/lib/components/labels/LabelFilter.svelte`
- [ ] T013 [US2] Add filtering logic to `apps/web/src/lib/stores/graph.svelte.ts` to filter elements by active labels
- [ ] T014 [US2] Integrate `LabelFilter` into the Graph View overlay in `apps/web/src/lib/components/GraphView.svelte`
- [ ] T015 [US2] Update `apps/web/src/lib/stores/search.ts` to include labels in the FlexSearch index

**Checkpoint**: User Story 2 complete - users can now organize and find entities using labels.

---

## Phase 5: User Story 3 - Label Autocomplete & Reuse (Priority: P2)

**Goal**: Improve UI with suggestions from the existing label index.

**Independent Test**: Typing "War" suggests "Ancient War" if it already exists in the vault.

- [ ] T016 [US3] Enhance `LabelInput.svelte` with autocomplete suggestions from `vault.labelIndex`
- [ ] T017 [US3] Implement case-insensitive matching for autocomplete in `apps/web/src/lib/components/labels/LabelInput.svelte`

---

## Phase 6: User Story 4 - Global Management (Priority: P1)

**Goal**: Project-wide renaming and deletion of labels.

**Independent Test**: Rename "Dead" to "Deceased"; verify all entities update their frontmatter.

- [ ] T018 [US4] Implement `renameLabel` method in `vault.svelte.ts` that batch-updates all affected entity files
- [ ] T019 [US4] Implement `deleteLabel` method in `vault.svelte.ts` that removes a label from all entities
- [ ] T020 [US4] Create "Label Management" UI in `apps/web/src/lib/components/settings/LabelSettings.svelte`
- [ ] T021 [US4] Integrate `LabelSettings` into `SettingsModal.svelte`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T022 [P] Map label badges to semantic theme variables (using --color-theme-accent for badges) in `apps/web/src/app.css`
- [ ] T023 Performance check: verify graph filter application is < 100ms for 500+ nodes
- [ ] T024 **Offline Functionality Verification**: Ensure all label metadata remains editable and searchable without internet
- [x] T025 Final Playwright run covering all label user stories
- [x] T026 Fix runtime error `graph.applyFilter is not a function` in LabelFilter.svelte

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)**
2. **Foundational (Phase 2)** (Blocks US1, US2, US4)
3. **User Story 1 (P1)** (Core tagging)
4. **User Story 2 (P1)** (Filtering) & **User Story 4 (P1)** (Global Mgmt) can proceed in parallel after US1.
5. **User Story 3 (P2)** (UX Enhancement) follows US1.
6. **Polish** (Final Phase)

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Schema + Vault Foundational logic.
2. Complete US1 (Tagging in Detail Panel).
3. Complete US2 (Graph Filtering).
4. **VALIDATE**: User can tag an entity and filter the graph. This constitutes the usable MVP.

### Incremental Delivery

1. Add Global Management (US4) to allow cleanup.
2. Add Autocomplete (US3) to polish the entry experience.
