# Implementation Plan: Web Worker Architecture

**Branch**: `043-web-worker-architecture` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)

## Summary

Offload heavy computational logic (FlexSearch indexing, Cytoscape layouts) to Web Workers using Comlink to ensure a responsive 60fps main thread.

## Technical Context

- **Framework**: Svelte 5 (Runes)
- **Library**: [Comlink](https://github.com/GoogleChromeLabs/comlink) for RPC-like worker communication.
- **Tools**: Vite `?worker` imports.

## Phase 1: Infrastructure & Search Refactoring

1.  Install `comlink`.
2.  Refactor `search.worker.ts`:
    - Remove `self.onmessage` boiler plate.
    - Expose `SearchWorker` class/object via `Comlink.expose`.
3.  Update `SearchService`:
    - Use `Comlink.wrap` to interface with the worker.
    - Clean up pending request management logic (now handled by Comlink).

## Phase 2: Background Layouts

1.  Create `apps/web/src/lib/workers/layout.worker.ts`.
2.  Implement `fcose` layout logic in the worker.
    - Input: `eles` (nodes/edges data), `options`.
    - Output: Object mapping `id` to `{x, y}`.
3.  Integrate with `GraphView.svelte`:
    - Call worker for layout math.
    - Use `cy.nodes().animate({ position: ... })` to apply results smoothly.

## Phase 3: Performance Hardening & Virtualization

1.  Implement background parsing for large Markdown files in a `parser.worker.ts`.
2.  Apply `$state.raw` to large search result sets in `search.ts`.
3.  Stress test with 5,000+ entities to verify frame stability.

## Complexity Tracking

- **Risk**: Serialization overhead. Transferring massive JSON objects can sometimes be slower than local execution for small sets.
- **Mitigation**: Use `Transferables` for raw buffers and only offload when dataset size warrants it.
