# Tasks: Map Page Decomposition

**Input**: Design documents from `/specs/103-map-page-decomposition/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`

**Tests**: Required. The spec requires controller unit coverage and preservation of existing Map/VTT integration behavior, and the repository constitution requires tests for changed behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the feature task surface and shared test targets.

- [x] T001 Review and update the implementation target inventory in `specs/103-map-page-decomposition/plan.md`
- [x] T002 Create the controller test file scaffold in `apps/web/src/lib/stores/map/map-page-controller.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the controller and component seams that every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create the route controller in `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`
- [x] T004 [P] Create the upload overlay component shell in `apps/web/src/lib/components/map/MapUploadOverlay.svelte`
- [x] T005 [P] Create the top HUD component shell in `apps/web/src/lib/components/map/MapHUD.svelte`
- [x] T006 [P] Create the VTT controls HUD component shell in `apps/web/src/lib/components/map/MapVTTControlsHUD.svelte`
- [x] T007 [P] Create the VTT sidebar component shell in `apps/web/src/lib/components/vtt/MapVTTSidebar.svelte`
- [x] T008 Refactor `apps/web/src/routes/(app)/map/+page.svelte` to instantiate `MapPageController` and delegate rendering to extracted child components without changing behavior

**Checkpoint**: The route has a stable controller-driven structure and story work can proceed against it.

---

## Phase 3: User Story 1 - Centralized Interaction Management (Priority: P1) 🎯 MVP

**Goal**: Move drag-and-drop orchestration and upload session state into `MapPageController` so the route becomes a thin layout shell.

**Independent Test**: Drag an entity onto the map and verify the controller still adds a pin in Standard mode or a token in VTT mode, and dropping files still opens the upload flow.

### Tests for User Story 1

- [x] T009 [P] [US1] Add unit tests for drag state, upload session state, and vault-switch reset behavior in `apps/web/src/lib/stores/map/map-page-controller.test.ts`
- [x] T010 [P] [US1] Extend entity drop and file drop regression coverage in `apps/web/src/lib/stores/map/map-page-controller.test.ts`
- [x] T011 [P] [US1] Add guest-mode regression coverage for blocked GM-only drops and guest-safe messaging in `apps/web/src/lib/stores/map/map-page-controller.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement controller reactive state, derived state, and constructor DI in `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`
- [x] T013 [US1] Move entity drag start/end helpers and drag preview coordination from `apps/web/src/routes/(app)/map/+page.svelte` into `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`
- [x] T014 [US1] Move unified drop, dragover, and dragleave logic from `apps/web/src/routes/(app)/map/+page.svelte` into `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`
- [x] T015 [US1] Implement guest restriction handling and notification messaging for GM-only mutations in `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`
- [x] T016 [US1] Implement upload session lifecycle, upload submit flow, and vault-switch reset behavior in `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`
- [x] T017 [US1] Wire the route to controller handlers and state in `apps/web/src/routes/(app)/map/+page.svelte`
- [x] T018 [US1] Implement the extracted upload UI using controller state in `apps/web/src/lib/components/map/MapUploadOverlay.svelte`

**Checkpoint**: User Story 1 is functional when the route delegates all transient map-page orchestration to the controller.

---

## Phase 4: User Story 2 - Modular Map Toolbars (Priority: P2)

**Goal**: Extract the map HUD and GM controls into focused components while preserving responsive VTT controls and layout behavior.

**Independent Test**: Toggle Fog of War and Grid settings through the extracted HUD controls and verify the underlying `mapStore` and VTT state still update correctly.

### Tests for User Story 2

- [x] T019 [P] [US2] Add component tests for toolbar rendering and emitted actions in `apps/web/src/lib/components/map/MapHUD.test.ts`
- [x] T020 [P] [US2] Add component tests for GM control interactions in `apps/web/src/lib/components/map/MapVTTControlsHUD.test.ts`
- [x] T021 [P] [US2] Extend existing VTT control regressions for extracted composition in `apps/web/src/lib/components/map/VTTControls.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] Move top-level route toolbar markup and actions from `apps/web/src/routes/(app)/map/+page.svelte` into `apps/web/src/lib/components/map/MapHUD.svelte`
- [x] T023 [US2] Move GM fog, measurement, grid, and sharing controls into `apps/web/src/lib/components/map/MapVTTControlsHUD.svelte`
- [x] T024 [US2] Replace hardcoded sidebar offset logic by reading derived layout offsets from `layoutUIStore` in `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`
- [x] T025 [US2] Update `apps/web/src/routes/(app)/map/+page.svelte` to compose `MapHUD` and `MapVTTControlsHUD` and remove inlined toolbar markup

**Checkpoint**: Toolbar behavior remains intact while route markup is reduced and layout offsets are store-driven.

---

## Phase 5: User Story 3 - Streamlined VTT Sidebar (Priority: P3)

**Goal**: Extract the VTT sidebar into a dedicated component that owns token management and initiative presentation logic instead of bloating the route.

**Independent Test**: Expand the extracted sidebar, select a token, and open the initiative panel while confirming detail state and token list behavior remain correct.

### Tests for User Story 3

- [x] T026 [P] [US3] Add component tests for collapsed and expanded sidebar states in `apps/web/src/lib/components/vtt/MapVTTSidebar.test.ts`
- [x] T027 [P] [US3] Add regression coverage for initiative-panel and token-selection wiring in `apps/web/src/lib/components/vtt/MapVTTSidebar.test.ts`
- [x] T028 [P] [US3] Extend existing chat sidebar coverage for extracted composition boundaries in `apps/web/src/lib/components/vtt/VTTChatSidebar.test.ts`

### Implementation for User Story 3

- [x] T029 [US3] Extract VTT sidebar layout and localized selection logic from `apps/web/src/routes/(app)/map/+page.svelte` into `apps/web/src/lib/components/vtt/MapVTTSidebar.svelte`
- [x] T030 [US3] Move token detail, entity list, and initiative panel composition into `apps/web/src/lib/components/vtt/MapVTTSidebar.svelte`
- [x] T031 [US3] Wire sidebar collapse state through `layoutUIStore` and controller coordination in `apps/web/src/lib/components/vtt/MapVTTSidebar.svelte`
- [x] T032 [US3] Update `apps/web/src/routes/(app)/map/+page.svelte` to consume the extracted `MapVTTSidebar` and remove duplicated VTT sidebar markup

**Checkpoint**: The VTT sidebar is independently testable and the route no longer owns its internal nesting.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish parity validation, documentation, and quality gates across all stories.

- [x] T033 [P] Reduce `apps/web/src/routes/(app)/map/+page.svelte` to the planned thin-view target and remove dead helpers/imports
- [x] T034 [P] Document the new map page architecture and controller/component ownership in `docs/reports/MAP_PAGE_ANALYSIS.md`
- [ ] T035 Run `pnpm run lint` and fix any issues caused by the refactor
- [ ] T036 Run `pnpm test` and resolve regressions across map and VTT suites
- [x] T037 Verify there are no "State Referenced Locally" or "State Referenced Outside Closure" warnings in `apps/web/src/routes/(app)/map/+page.svelte`, `apps/web/src/lib/stores/map/map-page-controller.svelte.ts`, `apps/web/src/lib/components/map/MapHUD.svelte`, `apps/web/src/lib/components/map/MapVTTControlsHUD.svelte`, `apps/web/src/lib/components/map/MapUploadOverlay.svelte`, and `apps/web/src/lib/components/vtt/MapVTTSidebar.svelte`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2; establishes the controller behavior needed by later stories
- **User Story 2 (Phase 4)**: Depends on Phase 3 because toolbar extraction consumes controller and layout seams
- **User Story 3 (Phase 5)**: Depends on Phase 3 and can proceed after controller seams are stable
- **Polish (Phase 6)**: Depends on all targeted user stories being complete

### User Story Dependencies

- **US1**: No dependency on other stories after Foundational; this is the MVP
- **US2**: Depends on US1 controller state and route delegation
- **US3**: Depends on US1 controller state; independent of US2 aside from final route composition

### Within Each User Story

- Tests for the story should be written first and fail before implementation
- Controller and state work precede route wiring
- Route wiring precedes markup cleanup
- Story checkpoints should be validated before advancing to the next phase

### Parallel Opportunities

- `T004`-`T007` can run in parallel after `T003`
- `T009`-`T011` can run in parallel within US1
- `T019`-`T021` can run in parallel within US2
- `T026`-`T028` can run in parallel within US3
- `T033` and `T034` can run in parallel once implementation is complete

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together:
Task: "Add unit tests for drag state, upload session state, and vault-switch reset behavior in apps/web/src/lib/stores/map/map-page-controller.test.ts"
Task: "Extend entity drop and file drop regression coverage in apps/web/src/lib/components/map/map-page-actions.test.ts"
Task: "Add guest-mode regression coverage for blocked GM-only drops and guest-safe messaging in apps/web/src/lib/stores/map/map-page-controller.test.ts"

# Launch foundational component shells together:
Task: "Create the upload overlay component shell in apps/web/src/lib/components/map/MapUploadOverlay.svelte"
Task: "Create the top HUD component shell in apps/web/src/lib/components/map/MapHUD.svelte"
Task: "Create the VTT controls HUD component shell in apps/web/src/lib/components/map/MapVTTControlsHUD.svelte"
Task: "Create the VTT sidebar component shell in apps/web/src/lib/components/vtt/MapVTTSidebar.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate entity drop, file drop, guest restriction, and vault-switch reset behavior

### Incremental Delivery

1. Deliver the controller extraction and thin route shell in US1
2. Add modular HUD controls in US2
3. Add the dedicated VTT sidebar in US3
4. Finish with route slimming, documentation, lint, and full test validation

### Parallel Team Strategy

1. One developer builds the controller seam (`T003`, `T008`, `T012`-`T017`)
2. One developer prepares extracted map HUD components (`T004`-`T006`, `T022`-`T025`)
3. One developer prepares VTT sidebar extraction (`T007`, `T029`-`T032`)
4. Merge after controller contracts stabilize
