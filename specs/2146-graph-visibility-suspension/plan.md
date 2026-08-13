# Implementation Plan: Graph Visibility Suspension

**Branch**: `2146-graph-visibility-suspension` | **Date**: 2026-08-11  
**Spec**: `specs/2146-graph-visibility-suspension/spec.md`

## Summary

Add a preserve-in-place visibility lifecycle to the graph view. `GraphView`
will combine document visibility, explicit app-owned full-surface overlay state,
and a zero-intersection safety guard. `GraphViewController` will suspend
layout, worker, animation, timer, and render-ready work using its existing
cancellation/generation mechanisms, while `Minimap` will stop its RAF and
Cytoscape listeners. Resume will reconcile only the latest vault/graph state,
preserve camera and selection, and emit local-only performance measurements.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: Cytoscape, `graph-engine` `LayoutManager`, existing Svelte stores, `ResizeObserver`/`IntersectionObserver`, local performance capture  
**Storage**: N/A; runtime-only browser state, no vault persistence changes  
**Testing**: Vitest via `bun run test:unit`, `svelte-check`, ESLint  
**Target Platform**: Browser client, including document visibility changes and desktop Explorer overlay  
**Project Type**: SvelteKit web application with browser-local graph rendering  
**Performance Goals**: Zero avoidable minimap RAFs and no new layout/worker jobs while suspended; one guarded reconciliation on resume; preserve visible-graph interaction behavior  
**Constraints**: Privacy-safe local measurements only; no stale callbacks after vault switch; ordinary sidebars and partial visibility must not suspend; no unnecessary Cytoscape destruction  
**Scale/Scope**: Existing graph view and minimap, with large-vault behavior as the primary measurement scenario; no new package unless reuse proves impossible

## Constitution Check

- **Library-first**: Pass. This is app-specific lifecycle coordination around the
  existing `graph-engine`; no reusable graph algorithm is being added.
- **TDD**: Pass. Add controller/lifecycle, Minimap, GraphView/layout integration,
  and failure-path tests before implementation is considered complete.
- **Simplicity/YAGNI**: Pass. Preserve the existing instance and reuse
  `LayoutManager.stop()`, `cy.stop()`, current generation guards, and existing
  performance capture rather than introducing a new rendering subsystem.
- **Privacy/client-side**: Pass. All state and measurements remain in-browser;
  no vault content is collected or persisted.
- **Clean implementation**: Pass subject to `bun run lint`, `bun run check`,
  and unit tests before handoff.
- **DI**: Pass. New lifecycle logic will be constructor/argument injectable in
  the controller and pure resolver tests will avoid global browser state.
- **Documentation**: Pass. The feature plan and quickstart document the
  behavior; no new user-facing feature is exposed, so no help article is needed.

## Project Structure

```text
apps/web/src/lib/components/GraphView.svelte
apps/web/src/lib/components/GraphView.test.ts              # existing or new
apps/web/src/lib/components/graph/graph-view-controller.svelte.ts
apps/web/src/lib/components/graph/graph-view-controller.test.ts
apps/web/src/lib/components/graph/Minimap.svelte
apps/web/src/lib/components/graph/Minimap.test.ts           # add if absent
apps/web/src/routes/(app)/+layout.svelte                    # existing signal source
apps/web/src/routes/(app)/+layout.route.test.ts             # overlay regression coverage
apps/web/src/lib/stores/ui/layout-ui.svelte.ts
packages/graph-engine/src/LayoutManager.ts                  # reuse existing stop API
apps/web/src/lib/services/performance/browser-performance-capture.ts
```

Potential new app-local pure helper:

```text
apps/web/src/lib/components/graph/graph-visibility.ts
apps/web/src/lib/components/graph/graph-visibility.test.ts
```

This helper is preferred only if it keeps the controller and Svelte component
from duplicating the transition/precedence rules.

## Implementation Phases

### Phase 0 — Lifecycle contract and measurements

1. Add the pure visibility input/snapshot resolver and transition tests.
2. Define the precedence for simultaneous reasons: document-hidden first,
   explicit surface-covered second, offscreen safety guard third.
3. Add local-only counters/spans for suspension, deferred updates, and resume
   to the existing performance capture path.

### Phase 1 — Controller suspension

1. Add `isSuspended`, generation, and deferred-reconciliation state to
   `GraphViewController`.
2. Add an idempotent `setVisibilityInputs`/lifecycle method that stops
   `LayoutManager`, Cytoscape animations, focus/resize/slash timers, and pending
   render-ready RAFs on entry.
3. Gate `applyCurrentLayout`, resize handling, focus-zoom settling, search
   focus, slash recovery, image/render synchronization, and async callbacks on
   the current lifecycle generation.
4. On resume, validate `cy` and the active vault, then reconcile current
   elements/images/hints once and preserve the existing camera/selection unless
   the normal structural update requires a fit.
5. Keep the existing `destroy()` path authoritative and add invalid-instance
   fallback behavior for resume.

### Phase 2 — GraphView and Minimap integration

1. In `GraphView.svelte`, derive explicit full-surface coverage from the
   existing Explorer/front-page/landing state and document visibility.
2. Add a container visibility observer as a zero-intersection safety guard;
   ensure sidebars and partial intersections do not trigger suspension.
3. Pass suspension state to Minimap. Cancel its pending RAF and detach its
   Cytoscape listeners while suspended; reattach and redraw once on resume.
4. Ensure the existing GraphView effects defer expensive work while suspended
   rather than repeatedly starting it.

### Phase 3 — Regression and performance evidence

1. Add cover/resume, document visibility, vault switch, invalid/destroyed
   Cytoscape, partial visibility, and duplicate-listener tests.
2. Add layout-worker/timer/RAF cancellation assertions.
3. Run the large-vault performance scenario and record before/after aggregate
   evidence in the PR description or issue comment.
4. Run targeted tests, full unit tests, type-check, lint, and diff hygiene.

## Risks and Mitigations

| Risk                                               | Mitigation                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A hidden callback mutates a switched vault's graph | Increment generation on suspend and verify active vault/Cytoscape identity before applying callbacks.                    |
| Resume causes a visible camera jump                | Preserve camera by default; only use existing structural-fit policy when required. Test camera and selection explicitly. |
| Minimap resumes with duplicate listeners/frames    | Centralize attach/detach in one effect and assert listener counts/RAF cancellation.                                      |
| Overlay signal misses a full surface               | Start with all existing app-owned full surfaces that can leave GraphView mounted; add integration tests for each.        |
| Over-suspension harms partially visible layouts    | Keep sidebar state separate from `surfaceCovered`; test partial intersection and ordinary sidebar paths.                 |
| Destroy/recreate fallback loses state              | Capture camera/selection before fallback and restore after reinit; keep fallback exceptional and instrumented.           |

## Success Criteria

- No avoidable minimap animation frames or layout worker jobs while fully
  covered/document-hidden.
- Cover/resume and document visibility tests pass, including vault-switch and
  invalid-instance failure paths.
- Camera, selection, graph membership, and pending intent remain correct.
- Ordinary sidebars/partial visibility remain active.
- `bun run check`, `bun run lint`, and full `bun run test:unit` pass.

## Complexity Tracking

No constitution violations or new architectural layer are planned. A pure
helper is optional and should be added only to prevent duplicated transition
logic.
