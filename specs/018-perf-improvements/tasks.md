# Tasks: Performance Improvements

**Input**: Design documents from `/specs/018-perf-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by User Story (from spec.md) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish performance baseline and prepare workspace.

- [ ] T001 Record baseline idle CPU and memory usage in `apps/web` using Chrome DevTools per `quickstart.md`
- [x] T002 [P] Create 100+ entity stress test vault per `quickstart.md` for manual profiling

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model and utility updates required for optimizations.

- [x] T003 [P] Add `lastUpdated: number` to `OracleStore` state and sync payload in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T004 [P] Implement `addInboundConnection` and `removeInboundConnection` helpers in `apps/web/src/lib/stores/vault.svelte.ts`

**Checkpoint**: Foundation ready - User Story implementation can begin.

---

## Phase 3: User Story 1 - Smooth Graph Navigation (Priority: P1)

**Goal**: Keep the graph responsive during interaction by optimizing heavy operations.

**Independent Test**: Pan/zoom a large graph; verify no "Long Tasks" in DevTools Performance tab.

### Implementation for User Story 1

- [x] T006 [US1] Implement chunked resolution (chunks of 20) using `Promise.all` for node images in `apps/web/src/lib/components/GraphView.svelte`
- [x] T007 [US1] Add a 100ms debounce to the image resolution `$effect` block in `apps/web/src/lib/components/GraphView.svelte`
- [x] T008 [P] [US1] Unit test incremental adjacency map logic in `apps/web/tests/unit/vault-store.test.ts`
- [x] T009 [US1] Update `addConnection` to use the `addInboundConnection` helper in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T010 [US1] Update `removeConnection` to use the `removeInboundConnection` helper in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T011 [US1] Delete the `updateInboundConnections()` method in `apps/web/src/lib/stores/vault.svelte.ts`

---

## Phase 4: User Story 2 - Battery-Efficient Background Tasks (Priority: P1)

**Goal**: Eliminate wasteful polling in the Minimap.

**Independent Test**: Monitor CPU usage in DevTools while idle; verify no frames are triggered by the minimap.

### Implementation for User Story 2

- [x] T014 [US2] Remove the `requestAnimationFrame` polling loop from `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T015 [US2] Attach listeners to `cy.on('pan zoom resize add remove position')` in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T016 [US2] Implement a RAF-throttled `draw()` call (max 30fps) triggered by listeners in `apps/web/src/lib/components/graph/Minimap.svelte`

---

## Phase 5: User Story 3 - Low-Latency Lore Synchronization (Priority: P1)

**Goal**: Avoid expensive deep comparisons during cross-tab sync.

**Independent Test**: Open two tabs; verify messages sync instantly with reduced CPU overhead.

### Implementation for User Story 3

- [x] T017 [P] [US3] Unit test Oracle sync check logic in `apps/web/tests/unit/oracle-store.test.ts`
- [x] T018 [US3] Update `BroadcastChannel` message listener to compare `lastUpdated` timestamps in `apps/web/src/lib/stores/oracle.svelte.ts`

---

## Phase 6: User Story 4 - Accessible and Maintainable UI (Priority: P2)

**Goal**: Fix technical debt and accessibility issues.

**Independent Test**: Run `npm run lint` and verify zero a11y warnings.

### Implementation for User Story 4

- [x] T019 [P] [US4] Remove `display: block !important;` in `apps/web/src/lib/components/GraphView.svelte`
- [x] T020 [P] [US4] Add keyboard event handlers to the Minimap container in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T021 [P] [US4] Replace inline style strings with Svelte `style:--var` in `GraphView.svelte` and `Minimap.svelte`
- [x] T022 [P] [US4] Centralize hardcoded hex colors into `app.css` and update components (Minimap, LegalDocument, etc.)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation.

- [x] T023 Run full performance profiling per `quickstart.md` to confirm SC-001 and SC-002
- [x] T024 Code cleanup and removal of any lingering debug logs
- [x] T025 [P] Update `README.md` if performance characteristics have significantly changed
- [x] T026 **Offline Functionality Verification** (Verify Service Worker caching after performance optimizations)
