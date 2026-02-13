# Implementation Plan: Web Worker Architecture

**Branch**: `043-web-worker-architecture` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)

## Summary

Offload heavy computational logic (FlexSearch indexing, Cytoscape layouts) to Web Workers using Comlink to ensure a responsive 60fps main thread.

## Technical Context

- **Framework**: Svelte 5 (Runes)
- **Library**: [Comlink](https://github.com/GoogleChromeLabs/comlink) for RPC-like worker communication.
- **Tools**: Vite `?worker` imports.

## Phase 1: Infrastructure & Search Engine Package

1.  Install `comlink`.

2.  Create `packages/search-engine` to house the FlexSearch logic and SearchWorker.

3.  Refactor existing search logic from `apps/web` into this package.

4.  Expose the worker interface via `Comlink.expose`.

5.  Update `SearchService` in `apps/web` to consume the package.

## Phase 2: Graph Engine Enhancements

1.  Implement the layout worker math within `packages/graph-engine`.

2.  `apps/web` will consume the worker-offloaded layout via the `graph-engine` interface.

3.  Integrate with `GraphView.svelte` to apply background layout results smoothly.

## Phase 3: Performance Hardening & Virtualization

1.  Implement background parsing for large Markdown files in a `parser.worker.ts`.
2.  Apply `$state.raw` to large search result sets in `search.ts`.
3.  Stress test with 5,000+ entities to verify frame stability.

## Complexity Tracking

- **Risk**: Serialization overhead. Transferring massive JSON objects can sometimes be slower than local execution for small sets.
- **Mitigation**: Use `Transferables` for raw buffers and only offload when dataset size warrants it.
