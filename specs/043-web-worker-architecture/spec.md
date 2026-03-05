# Feature Specification: Web Worker Architecture (The Background Brain)

**Feature Branch**: `043-web-worker-architecture`
**Created**: 2026-02-13
**Status**: Draft
**Objective**: Ensure a buttery smooth 60fps UI by offloading all non-UI blocking, heavy computations to background Web Workers.

## Problem Statement

As campaign vaults grow in size (thousands of entities), heavy tasks like full-text indexing, complex graph layouts, and markdown parsing cause "jank" (stuttering) on the main thread. This degrades the user experience and makes the application feel less responsive.

## Proposed Solution

Implement a robust Web Worker architecture using **Comlink** for seamless communication. Offload core computational tasks to dedicated background workers.

## User Scenarios & Testing

### User Story 1 - Smooth Search (Priority: P1)

As a user with a large vault, I want to search for lore without the UI freezing while the index is being updated or queried.

- **Success Criteria**: Search typing remains responsive (no dropped frames) even during a 100+ file import.

### User Story 2 - Fluid Graph Layout (SUPERSEDED)

> **Note**: This user story is now handled via main-thread execution with professional pipeline optimizations. See [ADR 004](../../docs/adr/004-direct-cytoscape-layout.md).

- **Success Criteria**: Force-directed layouts (fcose) execute with smooth animations, and the UI remains interactive via optimized stabilization windows.

---

## Technical Requirements

### FR-001: Modernized Search Worker

- Refactor `search.worker.ts` to use `Comlink`.
- Implement `SearchService` as a wrapper around the Comlink worker.
- System MUST use **Transferables** (ArrayBuffers) for search result sets exceeding 100 items to minimize serialization overhead.

### FR-002: Background Graph Layout (SUPERSEDED)

> **Note**: This requirement was abandoned in favor of direct main-thread execution. See [ADR 004](../../docs/adr/004-direct-cytoscape-layout.md) for rationale.

- ~~Implement `layout.worker.ts` for Cytoscape.js calculations.~~
- ~~Support `fcose` and custom `timeline` layouts in the worker.~~
- ~~The worker should receive node/edge data and return a map of `id -> {x, y}` positions.~~

### FR-003: Background Markdown Parsing

- Offload `marked` parsing to a worker for very large chronicles (>50kb).
- Prevent UI blocking when switching between complex lore entries.

### FR-004: User Documentation

- System MUST include a new help article in `help-content.ts` titled "Performance Optimization".
- The article MUST explain the "Background Brain" (Web Workers) and how it handles scaling for large vaults.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Main thread blocking tasks > 16ms during search/layout reduced by 90%.
  - _Verification_: Measured via Chrome DevTools "Performance" profile trace comparing a "Main Thread" layout vs "Worker Thread" layout on a 5,000 node dataset.
- **SC-002**: "Layout" operations no longer freeze graph interactions (zoom/pan).
- **SC-003**: Lighthouse Performance score remains high (>90) even with stress-test datasets.

## Implementation Guardrails

- **No Shared State**: Ensure all data passed to workers is cloned or transferred.
- **Worker Management**: Properly terminate workers when switching vaults or clearing campaign state.
- **Error Handling**: Implement robust error boundaries for worker crashes.
