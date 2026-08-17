# Tasks: AI-Generated World-Aware Random Tables

**Feature**: `159-ai-world-aware-tables`  
**Input**: Design documents from `/specs/159-ai-world-aware-tables/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

## Organization

Tasks are organized strictly by phase and user story to enable independent implementation, rigorous TDD testing, and verifiable increments.

---

## Phase 1: Setup & Primitives

**Purpose**: Type definitions and generator registry configuration

- [x] T001 [P] Define transient generation types and candidate entry interfaces in `packages/generator-engine/src/campaign-generator-types.ts`
- [x] T002 [P] Register `random-table` generator metadata and defaults in `packages/generator-engine/src/campaign-generator-registry.ts`

---

## Phase 2: Foundational Engine Logic (Prompt Builder & Parser)

**Purpose**: Core LLM prompt construction, proper noun grounding, sub-table reference discovery, and response parsing in `generator-engine`

- [x] T003 [P] Write unit tests for table prompt generation and response parsing in `packages/generator-engine/src/public-random-table.test.ts`
- [x] T004 Implement `buildRandomTablePrompt`, `parseRandomTableResponse`, and `generateRandomTableLocal` in `packages/generator-engine/src/public-random-table.ts`
- [x] T005 Export `public-random-table` functions and types from `packages/generator-engine/src/index.ts`

---

## Phase 3: User Story 1 - World-Grounded Table Generation (Priority: P1) 🎯 MVP

**Goal**: Enable users to generate thematic table rows grounded in their active vault's entities and prioritized by their campaign instructions.

**Independent Test**: Trigger `TableGenerationService` with a mock search service and active vault; verify generated candidate rows incorporate top search entities and observe prompt constraints.

### Tests for User Story 1

- [x] T006 [P] [US1] Unit test `TableGenerationService` with mocked search and AI client in `apps/web/src/lib/services/table-generation-service.test.ts`

### Implementation for User Story 1

- [x] T007 [US1] Implement `TableGenerationService` with constructor DI taking `aiClientManager`, `searchService`, `randomSources`, and `vault` in `apps/web/src/lib/services/table-generation-service.ts`
- [x] T008 [US1] Create `TableGenerateDialog.svelte` modal supporting topic input, dice presets (d6, d8, d10, d12, d20), custom count input (2–50), and campaign context in `apps/web/src/lib/components/random/TableGenerateDialog.svelte`
- [x] T009 [US1] Add "Generate entries" action button in `apps/web/src/lib/components/random/TableEditor.svelte` and `apps/web/src/lib/components/random/SourceWorkspace.svelte`

**Checkpoint**: Users can open the generation dialog, submit a prompt, and receive AI-generated candidate entries grounded in their vault entities.

---

## Phase 4: User Story 2 - Sub-Table Reference Emission (Priority: P1)

**Goal**: Automatically supply existing random table and deck names in prompt context so the generator emits valid `{table_name}` tokens for nested sub-tables.

**Independent Test**: Run generation in a vault with known tables (`weather`, `loot`); verify the prompt includes available tables and output produces matching `{table_name}` tokens that resolve during rolls.

### Tests for User Story 2

- [x] T010 [P] [US2] Add unit test in `packages/generator-engine/src/public-random-table.test.ts` validating `{sub_table}` emission and parsing when `availableTables` are provided

### Implementation for User Story 2

- [x] T011 [US2] Update `buildRandomTablePrompt` in `packages/generator-engine/src/public-random-table.ts` to instruct the model to produce `{table_name}` tokens for matching available sources
- [x] T012 [US2] Update `TableGenerationService.ts` to fetch all available table and deck names from `randomSources` and feed them into `buildRandomTablePrompt`

**Checkpoint**: Generated tables automatically wire into existing tables via nested `{sub_table}` references.

---

## Phase 5: User Story 3 - Interactive Row Review & Staging (Priority: P1)

**Goal**: Allow users to inspect, edit, toggle, or exclude candidate rows in an interactive staging preview before committing to the vault.

**Independent Test**: Load generated rows into `TableStagingPreview.svelte`, edit a row, toggle off another row, and accept into a table; verify only checked, updated rows are saved.

### Tests for User Story 3

- [x] T013 [P] [US3] Add unit test for staging preview selection, inline editing, and range calculation in `apps/web/src/lib/components/random/TableStagingPreview.test.ts`

### Implementation for User Story 3

- [x] T014 [US3] Create `TableStagingPreview.svelte` component displaying candidate rows with checkboxes, inline editable text, weight/range badges, and select/deselect all actions in `apps/web/src/lib/components/random/TableStagingPreview.svelte`
- [x] T015 [US3] Connect `TableGenerateDialog.svelte` to `TableStagingPreview.svelte`, supporting both new table creation and appending to the active table
- [x] T016 [US3] Compute contiguous numeric ranges automatically when accepting candidate rows into a ranged table

**Checkpoint**: 100% of generated rows pass through human curation before being written to the vault.

---

## Phase 6: User Story 4 - Entity Mention Recognition in Roll Results (Priority: P2)

**Goal**: Recognize vault entity mentions in roll result text and render them as interactive clickable chips to view entity lore.

**Independent Test**: Roll a table result mentioning an existing entity; verify the entity name renders as a link and clicking it triggers navigation or entity inspection.

### Tests for User Story 4

- [x] T017 [P] [US4] Add unit test in `apps/web/src/lib/components/random/SourceResultMessage.test.ts` asserting entity mention detection and link rendering

### Implementation for User Story 4

- [x] T018 [US4] Enhance `SourceResultMessage.svelte` or `TableRoller.svelte` to match recognized entity titles against vault entities and render interactive chips in `apps/web/src/lib/components/random/SourceResultMessage.svelte`

**Checkpoint**: Rolled table outcomes provide one-click lore navigation to mentioned characters and locations.

---

## Phase 7: User Story 5 - Anti-Determinism & Variety Quality (Priority: P2)

**Goal**: Ensure repeated generation runs with the same prompt exhibit varied sentence structures, archetypes, and phrasing.

**Independent Test**: Generate consecutive batches with identical prompts and verify anti-determinism guidelines and varied temperature/instructions prevent identical row templates.

### Implementation for User Story 5

- [x] T019 [US5] Add anti-determinism guidelines, temperature scaling, and variety directives to `public-random-table.ts`
- [x] T020 [P] [US5] Add test in `packages/generator-engine/src/public-random-table.test.ts` verifying variety instructions and local fallback diversity

---

## Phase 8: Polish, Documentation & Verification

**Purpose**: Offline feedback, user help documentation, and end-to-end quality validation

- [x] T021 [P] Add user-facing help documentation for AI random table generation in `apps/web/src/lib/config/help-content.ts`
- [x] T022 Ensure disabled/offline tooltip handling on the "Generate entries" button when AI is disabled or client is offline
- [x] T023 Run full lint, type check, and unit test suites: `bun run lint && bun run lint:types && bun run test`
