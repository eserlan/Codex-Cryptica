# Scalability Hardening: Incremental Indexing & Worker Layout

## Background

The recent architectural review identified that while `loadFiles` is parallelized, it still parses every Markdown file on startup. For a mature vault (1000+ entities), this is unnecessary overhead. Additionally, the Cytoscape layout runs on the main thread, risking UI freezes during graph updates.

## Objectives

1.  **Incremental Loading**: Implement a "Smart Sync" that only reads/parses files modified since the last run.
2.  **Metadata Cache**: Persist file stats and parsed metadata to `idb` (IndexedDB) to serve as the "Hot Cache".
3.  **Off-Main-Thread Layout**: Move the Cytoscape layout logic to a Web Worker (or leverage `cytoscape-cose-bilkent` in a worker if feasible, otherwise optimize the existing effect to yield). _Note: Cytoscape headless in worker is complex; we will focus on the Caching first as it yields higher ROI._

## Implementation Plan

### 1. Metadata Cache (IDB)

- **Schema**: Create an object store `vault_cache` in `idb`.
  - Key: `filePath`
  - Value: `{ lastModified: number, entity: LocalEntity, connections: Connection[] }`
- **Logic**:
  - In `loadFiles`, first `dirHandle.entries()`.
  - For each file, compare `handle.getFile().lastModified` with `cache.lastModified`.
  - **Hit**: Use cached Entity.
  - **Miss**: `parseMarkdown`, update Cache.

### 2. Graph Performance

- **Optimization**: Ensure the "Parallel Chunk" loading allows the UI to render _intermediate_ results. (Currently `Promise.all` waits for the chunk).
- **Streaming**: Refactor `loadFiles` to be a generator or call `entities.update()` per chunk so the user sees the graph populating in real-time.

## User Impact

- **Startup Time**: Reduced from O(N) parsing to O(N) stat checks (much faster).
- **Responsiveness**: Graph fills in progressively rather than all-at-once after a delay.
