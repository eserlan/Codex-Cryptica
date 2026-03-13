---
description: "Task list for GraphView Refactor"
---

# Tasks: GraphView Refactor

**Input**: Design documents from `/specs/318-069-graph-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by logical extraction phase.

## Phase 1: Setup

- [ ] T001 Verify baseline graph functionality in browser
- [ ] T002 Create directories: `apps/web/src/lib/services/graph` and `apps/web/src/lib/components/graph`

## Phase 2: Logic Services Extraction

- [ ] T003 [P] Implement `OracleLayoutManager` in `apps/web/src/lib/services/graph/layout-manager.ts`
- [ ] T004 [P] Implement `useGraphEvents` action in `apps/web/src/lib/components/graph/useGraphEvents.ts`
- [ ] T005 Create unit tests for `OracleLayoutManager`

## Phase 3: UI Componentization

- [ ] T006 [P] Extract `Minimap.svelte` to `apps/web/src/lib/components/graph/Minimap.svelte`
- [ ] T007 [P] Extract `GraphControls.svelte` to `apps/web/src/lib/components/graph/GraphControls.svelte`
- [ ] T008 [P] Extract `GraphTooltip.svelte` to `apps/web/src/lib/components/graph/GraphTooltip.svelte`

## Phase 4: Orchestrator Refactor

- [ ] T009 Integrate `OracleLayoutManager` into `GraphView.svelte`
- [ ] T010 Apply `useGraphEvents` action in `GraphView.svelte`
- [ ] T011 Replace inline UI with new components in `GraphView.svelte`
- [ ] T012 Remove redundant state and effect blocks from `GraphView.svelte`

## Phase 5: Polish

- [ ] T013 Verify `GraphView.svelte` line count is < 400 (SC-001)
- [ ] T014 Final interaction test run (SC-002, SC-003)
