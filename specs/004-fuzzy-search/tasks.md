# Tasks: Fuzzy Search

**Feature**: Fuzzy Search (`004-fuzzy-search`)
**Status**: Planned

## Dependencies

- **Phase 1 (Setup)**: Blocks all.
- **Phase 2 (Foundational)**: Blocks Phase 3, 4, 5.
- **Phase 3 (US1)**: Blocks Phase 4, 5.
- **Phase 4 (US2)**: Dependent on Phase 3.
- **Phase 5 (US3)**: Dependent on Phase 3.

## Phase 1: Setup
**Goal**: Initialize project with necessary dependencies and structure.

- [x] T001 Install `flexsearch` dependency in `apps/web/package.json`
- [x] T002 Create directory `apps/web/src/lib/workers` if not exists
- [x] T003 Create directory `apps/web/src/lib/services` if not exists
- [x] T004 Create directory `apps/web/src/lib/components/search` if not exists

## Phase 2: Foundational (Core Engine)
**Goal**: Establish the search worker and service bridge.
**Independent Test**: Unit test `SearchService` can send/receive messages from worker.

- [x] T005 [P] Create `apps/web/src/lib/workers/search.worker.ts` with basic message handling
- [x] T006 [P] Implement `FlexSearch` initialization (with phonetic encoder if feasible) and indexing logic in `apps/web/src/lib/workers/search.worker.ts`
- [x] T007 Define `SearchEntry` and `SearchResult` interfaces in `packages/schema/src/search.ts` (or local types if package not ready)
- [x] T008 Implement `SearchService` class in `apps/web/src/lib/services/search.ts` to bridge main thread and worker
- [x] T009 Create `apps/web/src/tests/search.test.ts` to verify worker communication (mocked)

## Phase 3: Global Note Navigation (User Story 1 - P1)
**Goal**: Users can find and open notes by title.
**Independent Test**: Open modal, type title, see result.

- [x] T010 [US1] Create `SearchStore` in `apps/web/src/lib/stores/search.ts` to hold query and results
- [x] T011 [US1] Create `SearchModal.svelte` component in `apps/web/src/lib/components/search/SearchModal.svelte`
- [x] T012 [US1] Implement global keyboard shortcut listener (Cmd/Ctrl+K) in `apps/web/src/routes/+layout.svelte`
- [x] T013 [US1] Integrate `SearchService.index()` into `apps/web/src/lib/stores/vault.svelte.ts` (or equivalent) to index notes on load/change
- [x] T014 [US1] Connect `SearchModal` input to `SearchStore` and trigger `SearchService.search()` on input
- [x] T015 [US1] Render search results (titles only) in `SearchModal.svelte`

## Phase 4: Search Within Content (User Story 2 - P2)
**Goal**: Users can find notes by content.
**Independent Test**: Search for unique string in body, see result.

- [x] T016 [US2] Update `apps/web/src/lib/workers/search.worker.ts` to configure `FlexSearch` for multi-field (title, content)
- [x] T017 [US2] Update `apps/web/src/lib/services/search.ts` to pass content data during indexing
- [x] T018 [US2] Update `apps/web/src/lib/components/search/SearchModal.svelte` to display content excerpts/snippets
- [x] T019 [US2] Implement ranking logic in worker (Title > Content) if not handled by FlexSearch configuration

## Phase 5: Keyboard Navigation (User Story 3 - P2)
**Goal**: Full keyboard control of search results.
**Independent Test**: Navigate results with arrows, select with Enter.

- [x] T020 [US3] Add `selectedIndex` state to `SearchModal.svelte`
- [x] T021 [US3] Implement `keydown` handler for ArrowUp/ArrowDown to update `selectedIndex`
- [x] T022 [US3] Implement `Enter` key handler to dispatch 'select' event or open note
- [x] T023 [US3] Implement auto-scroll to keep selected item in view
- [x] T024 [US3] Implement "Recent Notes" display in `SearchModal.svelte` when query is empty

## Final Phase: Polish & Quality
**Goal**: Production-ready experience.

- [x] T025 [P] Implement highlighting of matched terms in `SearchModal.svelte`
- [x] T026 [P] Add debounce to search input to prevent worker overload
- [x] T027 Add `e2e` test in `apps/web/tests/search.spec.ts` covering full flow (Open -> Search -> Navigate -> Select) and Offline Verification
- [x] T028 Verify mobile responsiveness of `SearchModal`
- [x] T029 Implement persistent search bar in the application header (`apps/web/src/routes/+layout.svelte`)

## Implementation Strategy
1. **MVP (Phase 1-3)**: purely title search.
2. **Enhanced (Phase 4)**: add content search.
3. **UX (Phase 5+)**: add keyboard nav and polish.
