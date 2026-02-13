# Tasks: Web Worker Architecture

**Input**: `specs/043-web-worker-architecture/spec.md`

## Phase 1: Search Modernization

- [ ] T001 Install `comlink` in `apps/web`
- [ ] T002 Refactor `search.worker.ts` to use `Comlink.expose`
- [ ] T003 Update `SearchService` to use `Comlink.wrap`
- [ ] T004 Verify search functionality with existing tests

## Phase 2: Background Graph Layouts

- [ ] T005 Create `layout.worker.ts`
- [ ] T006 Implement `fcose` layout logic in worker
- [ ] T007 Modify `GraphView.svelte` to use the background layout worker
- [ ] T008 Add `timeline` layout support to worker
- [ ] T009 Verify smooth graph animations and responsiveness during layout

## Phase 3: Svelte 5 Performance Tuning

- [ ] T010 Refactor `SearchStore` to use `$state.raw` for massive result sets
- [ ] T011 Implement `parser.worker.ts` for background Markdown parsing
- [ ] T012 Add stress test E2E scenario for large vaults (5,000+ nodes)

## Phase 4: Polish

- [ ] T013 Add "Worker Status" debug indicator (optional)
- [ ] T014 Ensure proper worker termination on vault switch
