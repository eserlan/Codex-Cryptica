---
description: "Actionable, dependency-ordered tasks for the Entity Alias Support feature"
---

# Tasks: Entity Alias Support

**Input**: Design documents from `/specs/090-entity-aliases/`
**Prerequisites**: Core entity store and search engine functionality must be active.

---

## Phase 1: Setup

**Goal**: Prepare the codebase and environment for alias support.

- [x] T001 Initialize the feature branch `089-entity-aliases` and verify local development environment
- [x] T002 Update `packages/schema/src/entity.ts` to add `aliases: z.array(z.string()).default([])` to `EntitySchema`
- [x] T003 [P] Add unit tests for `EntitySchema` alias validation in `packages/schema/src/schema.test.ts`

---

## Phase 2: Foundational

**Goal**: Implement the core search weighting and indexing logic.

- [x] T004 Update `packages/search-engine/src/index.ts` to include a weighted `aliases` field in `SearchEngine.initIndex`
- [x] T005 [P] Update `SearchStore.indexEntity` in `apps/web/src/lib/stores/vault/search-store.svelte.ts` to include aliases in the search payload
- [x] T006 Add unit tests for weighted alias search in `packages/search-engine/src/index.test.ts` (or equivalent)

---

## Phase 3: User Story 1 - Manage Entity Aliases (Priority: P1)

**Goal**: Implement the UI for adding and removing aliases in Zen Edit Mode.

**Independent Test**: Edit an entity, add "Alias 1" and "Alias 2", save, and confirm they appear in the entity's frontmatter and UI upon reload.

### Implementation for US1

- [x] T007 [US1] Create `apps/web/src/lib/components/labels/AliasInput.svelte` following the `LabelInput` pattern
- [x] T008 [US1] Implement pill rendering and removal logic in `AliasInput.svelte`
- [x] T009 [US1] Implement input handling for `Enter` and `,` delimiters in `AliasInput.svelte`
- [x] T010 [US1] Integrate `AliasInput` into the edit mode section of `apps/web/src/lib/components/zen/ZenHeader.svelte`
- [x] T011 [US1] Ensure `entity.aliases` is correctly passed to and updated by `EntityStore.updateEntity` in `apps/web/src/lib/stores/vault/entity-store.svelte.ts`
- [x] T012 [P] [US1] Add unit tests for `AliasInput.svelte` in `apps/web/src/lib/components/labels/AliasInput.test.ts`

---

## Phase 4: User Story 2 - View Aliases At-a-Glance (Priority: P2)

**Goal**: Display aliases in the Entity Explorer and Zen Header.

**Independent Test**: Navigate to the Entity Explorer and confirm aliases are visible beneath the title as `aka: Alias 1, Alias 2`.

### Implementation for US2

- [x] T013 [US2] Update `apps/web/src/lib/components/explorer/EntityList.svelte` to display truncated alias list beneath the entity title
- [x] T014 [US2] Update `apps/web/src/lib/components/zen/ZenHeader.svelte` to display all aliases beneath the main title in read-only mode
- [x] T015 [US2] Implement the "+N more" logic for explorer truncation in `EntityList.svelte` per FR-003

---

## Phase 5: User Story 3 - Discover Entities by Alias (Priority: P3)

**Goal**: Enable searching for entities using their aliases.

**Independent Test**: Type an entity's alias into the global search and confirm the entity appears in results.

### Implementation for US3

- [x] T016 [US3] Verify search indexing for aliases is active and respects weighting in `apps/web/src/lib/stores/vault/search-store.svelte.ts`
- [x] T017 [US3] Update `filteredEntities` derivation in `apps/web/src/lib/components/explorer/EntityList.svelte` to match search query against the `aliases` array

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Finalize documentation and verify performance.

- [x] T018 Update `apps/web/src/lib/config/help-content.ts` to include alias-based discovery in the Entity Explorer help entry
- [x] T019 [P] Verify list scroll performance in Entity Explorer with entities having many aliases
- [x] T020 Run final validation using `specs/090-entity-aliases/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Must be completed first to enable data persistence.
- **Foundational (Phase 2)**: Depends on Phase 1 for schema availability.
- **US1 (Phase 3)**: Depends on Phase 1 for schema and store integration.
- **US2 (Phase 4)**: Depends on US1 completion (need data to display).
- **US3 (Phase 5)**: Depends on Phase 2 (search engine config) and US1 (data creation).
- **Polish (Phase 6)**: Final verification step.

### Parallel Opportunities

- T003 can be done in parallel with T002.
- T005 and T006 can be worked on in parallel after T004.
- T012 can be written while T007-T011 are in progress.
- T019 can be validated as soon as US2 is implemented.

---

## Implementation Strategy

1. **MVP**: Deliver US1 first to allow users to capture aliases in their vault data.
2. **Incremental Delivery**: Ship US2 and US3 together to provide the visibility and discovery value.
3. **Verification**: Each user story will be verified using the independent test criteria before moving to the next.
