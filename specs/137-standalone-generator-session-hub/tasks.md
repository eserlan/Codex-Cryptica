# Tasks: Standalone Generator Session Hub

**Input**: Design documents from `/specs/137-standalone-generator-session-hub/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/contracts.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- All descriptions include exact file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and validation of workspace dependencies.

- [ ] T001 Verify project structures and package files in packages/generator-engine/package.json and apps/web/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic and shared utilities that must be completed before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Implement context budgeting and title matching helpers in packages/generator-engine/src/session-hub-helpers.ts
- [ ] T003 [P] Add unit tests for budgeting and matching helpers in packages/generator-engine/src/session-hub-helpers.test.ts
- [ ] T004 [P] Export helpers in packages/generator-engine/src/index.ts
- [ ] T005 Implement Svelte 5 store managing session-local drafts in apps/web/src/lib/stores/session-hub.svelte.ts
- [ ] T006 Add unit tests for the session-hub store in apps/web/src/lib/stores/session-hub.svelte.test.ts
- [ ] T007 Update pending import schema and logic to support connection mapping in apps/web/src/lib/services/seo/import-handler.ts
- [ ] T008 Add unit tests for relationships import logic in apps/web/src/lib/services/seo/import-handler.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Generated entities accumulate in a session list (Priority: P1) 🎯 MVP

**Goal**: Automatically add newly generated entities to a temporary session hub, displaying them in a scannable sidebar and allowing details review without state loss.

**Independent Test**: Generate three entities, verify all three are added automatically, click to view detail card, and return to generator options with the active form inputs preserved.

### Tests for User Story 1

- [ ] T009 [P] [US1] Add unit tests for list rendering and item actions in apps/web/src/lib/components/seo/SessionHubWidget.test.ts

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create the session list UI widget in apps/web/src/lib/components/seo/SessionHubWidget.svelte
- [ ] T011 [US1] Integrate session store and trigger auto-saving on generation in apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte
- [ ] T012 [US1] Implement detail review modal and navigation in apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte

**Checkpoint**: User Story 1 is functional and testable as the feature's MVP.

---

## Phase 4: User Story 2 - Later generations reuse marked session entities as context (Priority: P1)

**Goal**: Support toggling reuse on/off for individual session entities and inject active selection into subsequent generation calls.

**Independent Test**: Generate a settlement and check that reuse is ON by default. Generate a faction and verify the AI includes references to the settlement. Toggle reuse OFF for the settlement, generate a new faction, and verify the settlement is excluded.

### Tests for User Story 2

- [ ] T013 [P] [US2] Add unit test cases for prompt context formatting in apps/web/src/lib/services/seo/generator-engine.test.ts

### Implementation for User Story 2

- [ ] T014 [US2] Add checkbox toggles for reuse and pin settings to each item in apps/web/src/lib/components/seo/SessionHubWidget.svelte
- [ ] T015 [US2] Retrieve and format active session context in apps/web/src/lib/services/seo/generator-engine.ts
- [ ] T016 [US2] Render context budgeting trim warning notification in apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte

**Checkpoint**: Core context chaining behavior is complete.

---

## Phase 5: User Story 3 - Each result shows which session entities it actually used (Priority: P2)

**Goal**: Compute post-hoc matching between generated text and offered entities, presenting a clickable provenance line.

**Independent Test**: Generate a character with multiple context items active, confirm the results card displays a "Used: ..." line naming only those actually mentioned, and click each link to inspect details.

### Tests for User Story 3

- [ ] T017 [P] [US3] Add unit tests for provenance display and navigation triggers in apps/web/src/lib/components/seo/ProvenanceBadge.test.ts

### Implementation for User Story 3

- [ ] T018 [P] [US3] Create the provenance badge component in apps/web/src/lib/components/seo/ProvenanceBadge.svelte
- [ ] T019 [US3] Embed provenance badge in the result card layout in apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte

**Checkpoint**: Connection provenance is visible and inspectable.

---

## Phase 6: User Story 4 - Save one, some, or all session entities into a vault (Priority: P2)

**Goal**: Extend the local storage import handoff to support single, multi-selected, or all drafts, while mapping inter-relationships.

**Independent Test**: Select two related entities from the hub, click "Save Selected", open a vault, and verify both entities exist and are connected with the correct relationship.

### Implementation for User Story 4

- [ ] T020 [US4] Add selection checkboxes and action buttons to apps/web/src/lib/components/seo/SessionHubWidget.svelte
- [ ] T021 [US4] Implement selection packaging and connection mapping in apps/web/src/lib/stores/session-hub.svelte.ts

**Checkpoint**: Multi-save capabilities and relationship preservation work end-to-end.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Styling, formatting, and final quality gates.

- [ ] T022 Apply visual styling matching docs/STYLE_GUIDE.md to widgets in apps/web/src/lib/components/seo/SessionHubWidget.svelte
- [ ] T023 Run Vitest test suites via bun run test in repository root
- [ ] T024 Run code linting verification via bun run lint in repository root

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion. Can be worked on sequentially (US1 → US2 → US3 → US4) or in parallel.
- **Polish (Phase 7)**: Depends on all user stories.

### Parallel Opportunities

- Pure helpers design (`T002`, `T003`) and frontend store layout (`T005`, `T006`) can be worked on concurrently.
- User Story tests (`T009`, `T013`, `T017`) can be drafted in parallel with their respective UI components.

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)

1. Setup: Confirm environment packages.
2. Foundation: Context matching logic & SessionHub store.
3. User Story 1: Sidebar list and review detail navigation.
4. **Validation**: Generate a draft, confirm it auto-adds to list, inspect details without losing active state.
