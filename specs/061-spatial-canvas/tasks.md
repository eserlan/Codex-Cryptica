# Tasks: Interactive Spatial Canvas

## Phase 1: Setup

- [x] T001 Initialize `packages/canvas-engine` structure with `package.json` and `tsconfig.json`
- [x] T002 [P] Install dependencies: `@xyflow/svelte`, `zod`, `vitest` in `packages/canvas-engine`
- [x] T003 Configure `packages/canvas-engine` in root `package.json` workspaces and `turbo.json`

## Phase 2: Foundational Engine

- [x] T004 Define Zod schemas for `.canvas` format in `packages/canvas-engine/src/types.ts`
- [x] T005 Implement `CanvasStore` using Svelte 5 Runes in `packages/canvas-engine/src/store.ts`
- [x] T006 Implement JSON serialization/deserialization logic in `packages/canvas-engine/src/index.ts`
- [x] T007 Create unit tests for store operations and serialization in `packages/canvas-engine/tests/engine.spec.ts`

## Phase 3: [US1] Intentional Conspiracy Board (MVP)

**Goal**: Manually place entities and draw visual links on a persistent board.
**Independent Test**: Drag two entities onto the canvas, draw a link, and verify coordinates/links persist after refresh.

- [x] T008 [P] [US1] Scaffold `apps/web/src/routes/canvas` with basic `@xyflow/svelte` integration
- [x] T009 [US1] Create `EntityNode` custom component in `apps/web/src/lib/components/canvas/EntityNode.svelte`
- [x] T010 [US1] Create `EntityPalette` sidebar component with filter logic in `apps/web/src/lib/components/canvas/EntityPalette.svelte`
- [x] T011 [US1] Implement drag-and-drop from the palette into the canvas in `apps/web/src/routes/canvas/+page.svelte`
- [x] T012 [US1] Implement node placement logic using `@xyflow/svelte` handlers in `apps/web/src/routes/canvas/+page.svelte`
- [x] T013 [US1] Implement visual edge drawing between nodes in `apps/web/src/routes/canvas/+page.svelte`
- [x] T014 [US1] Integrate `canvas-engine` store with `vault` storage for single-canvas persistence in `apps/web/src/routes/canvas/+page.svelte`

## Phase 4: [US3] Search-to-Canvas Quick Spawn

**Goal**: Quickly drop entities onto the board from global search results.
**Independent Test**: Use search to find an entity and click "Add to Canvas" to see it appear at current viewport center.

- [x] T015 [P] [US3] Update Search UI to include "Add to Canvas" action in `apps/web/src/lib/components/search/SearchModal.svelte`
- [x] T016 [US3] Implement search result drop handler in `apps/web/src/routes/canvas/+page.svelte`

## Phase 5: [US2] Multiple Specialized Dashboards

**Goal**: Manage multiple independent canvases per vault.
**Independent Test**: Create two canvases, switch between them, and verify content is distinct and preserved.

- [x] T017 [US2] Implement Canvas Registry in IndexedDB via `idb` in `apps/web/src/lib/stores/canvas-registry.ts`
- [x] T018 [US2] Create Canvas Sidebar for managing/switching canvases in `apps/web/src/lib/components/canvas/CanvasSidebar.svelte`
- [x] T019 [US2] Implement filter/search logic for the Canvas Registry in `apps/web/src/lib/components/canvas/CanvasSidebar.svelte`
- [x] T020 [US2] Update `apps/web/src/routes/canvas` to handle dynamic canvas ID routing

## Phase 6: Polish & Cross-Cutting

- [x] T021 Implement auto-expanding card logic based on content height in `apps/web/src/lib/components/canvas/EntityNode.svelte`
- [x] T022 Integrate "Zen Mode" trigger on node double-click in `apps/web/src/lib/components/canvas/EntityNode.svelte`
- [x] T023 [P] Add user documentation guide in `apps/web/src/lib/config/help-content.ts`
- [x] T024 [P] Create FeatureHint for new Canvas mode in `apps/web/src/lib/components/hints/CanvasHint.svelte`
- [x] T025 Final E2E verification with Playwright in `apps/web/tests/canvas.spec.ts`

## Dependencies

- Phase 1 & 2 must be completed before any User Story implementation.
- [US1] is the prerequisite for [US2] and [US3].
- [US3] can be implemented in parallel with [US2] once [US1] base is ready.

## Parallel Execution Examples

- **Core/UI Parallel**: T004-T007 (Engine) can run while T008 (Scaffold) is being prepared.
- **Story Parallel**: T013 (Search UI) can be worked on while T015 (Registry) is being implemented.
- **Polish Parallel**: T020 (Docs) and T021 (Hints) can be done simultaneously after implementation is stable.

## Implementation Strategy

We follow an **MVP-first** approach:

1.  Establish the standalone `canvas-engine` package first (**Library-First** principle).
2.  Build the primary [US1] journey (The "Living Desk") as the core value proposition.
3.  Expand to multi-canvas organization [US2] and quick interactions [US3].
4.  Finalize with UX polish and documentation.
