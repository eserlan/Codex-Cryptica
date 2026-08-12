# Feature Specification: Suspend Graph Rendering While Fully Covered

**Feature Branch**: `2146-graph-visibility-suspension`
**Created**: 2026-08-11
**Status**: Draft
**Input**: GitHub issue #2146

## Problem

Cytoscape and the minimap can remain mounted when the graph is covered by the
Explorer workspace or another full surface. Hidden rendering, observers,
layouts, and animations compete with the foreground UI and retain memory.

## Goals

- Stop avoidable graph work while the graph is fully covered or the document is
  hidden.
- Resume quickly and correctly when the graph becomes visible again.
- Preserve graph membership, selection, camera, and pending user intent.
- Prevent vault changes and asynchronous callbacks from replaying stale work
  after a hidden period.
- Measure the chosen policy's memory/work reduction and resume cost.

## Non-goals

- Replacing Cytoscape or changing graph layout algorithms.
- Suspending the graph merely because a sidebar is open or the graph is only
  partially visible.
- Destroying and recreating the Cytoscape instance in the first implementation.

## User Stories & Acceptance Criteria

### US1 — Fully covered graph pauses work

When the Explorer workspace or another recognized full-surface overlay fully
covers the graph, minimap redraws, layout work, avoidable viewport observers,
and graph animations stop or are deferred.

**Acceptance criteria**:

1. The graph enters a deterministic `suspended` lifecycle state when fully
   covered.
2. A partially visible graph or sidebar does not enter `suspended`.
3. Pending timers, animation frames, and layout callbacks cannot mutate graph
   state while suspended.

### US2 — Document visibility pauses work

When the browser document becomes hidden, the same suspension policy applies.
When it becomes visible, the graph resumes without duplicating listeners or
starting stale work.

**Acceptance criteria**:

1. `document.hidden` transitions suspend and resume the graph.
2. A visibility transition during layout or animation leaves no orphaned work.
3. Existing graph input and accessibility behavior remain unchanged when
   visible.

### US3 — Resume preserves state

Returning from a covered/hidden state preserves graph membership, selection,
camera, and pending search/user intent, while reconciling any vault changes
that happened during suspension.

**Acceptance criteria**:

1. Camera and selection survive cover/resume.
2. Vault changes while suspended appear after resume without replaying stale
   layout or focus work.
3. Resume performs at most one necessary reconciliation/layout pass.

### US4 — Evidence-backed lifecycle policy

The implementation documents why preserve-in-place is preferred over
destroy/recreate for this slice and records performance evidence for the
decision.

**Acceptance criteria**:

1. Instrumentation captures suspended work avoided and resume latency.
2. A repeatable large-vault scenario compares visible versus covered behavior.
3. The implementation includes a fallback path if the preserved Cytoscape
   instance is invalid or destroyed unexpectedly.

## Test Requirements

- Cover/resume success path.
- Document visibility path.
- Vault switch while hidden.
- Destroy/recreate or invalid-instance fallback path.
- Partial-visibility guard.
- Timer, animation-frame, and layout callback cancellation/invalidation.

## Constraints

- Browser-local/client-side behavior; no server or persistence changes.
- Svelte 5 Runes and constructor-based DI for new lifecycle coordination.
- Keep the existing `GraphViewController` and `LayoutManager` boundaries unless
  research demonstrates a reusable package-level abstraction is required.
- Preserve current graph UX and accessibility behavior while visible.

## Dependencies

- `apps/web/src/lib/components/GraphView.svelte`
- `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts`
- `apps/web/src/lib/components/graph/Minimap.svelte`
- `apps/web/src/routes/(app)/+layout.svelte`
- `apps/web/src/lib/stores/ui/layout-ui.svelte.ts`
- `packages/graph-engine/src/LayoutManager.ts`
- Existing browser performance capture utilities
