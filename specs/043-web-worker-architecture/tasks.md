# Tasks: Web Worker Architecture

**Input**: `specs/043-web-worker-architecture/spec.md`

## Phase 1: Search Modernization

- [x] T000 Initialize `packages/search-engine` workspace package
- [x] T001 Install `comlink` in `apps/web`
- [x] T002 Refactor `search.worker.ts` to use `Comlink.expose` and implement Transferable object transfer for result buffers
- [x] T003 Update `SearchService` to use `Comlink.wrap`
- [x] T004 Verify search functionality with existing tests

## Phase 2: Background Graph Layouts

- [x] T005 Create `layout.worker.ts`
- [x] T006 Implement `fcose` layout logic in worker
- [x] T007 Modify `GraphView.svelte` to use the background layout worker
- [x] T008 Add `timeline` layout support to worker
- [x] T009 Verify smooth graph animations and responsiveness during layout

## Phase 3: Svelte 5 Performance Tuning

- [x] T010 Refactor `SearchStore` to use `$state.raw` for massive result sets
- [x] T011 Implement `parser.worker.ts` for background Markdown parsing
- [x] T012 Add stress test E2E scenario for large vaults (5,000+ nodes)
- [x] T012.5 Performance Benchmarking: Capture baseline vs. worker traces to verify SC-001

## Phase 4: Polish

- [x] T013 Add "Worker Status" debug indicator (optional)
- [x] T014 Ensure proper worker termination on vault switch
- [x] T015 Author "Performance Optimization" help article (FR-004)
