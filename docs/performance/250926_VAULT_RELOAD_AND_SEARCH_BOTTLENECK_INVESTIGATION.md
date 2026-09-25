# Vault Reload & Search Persistence Bottleneck Investigation

- **Investigation Date:** 2026-09-25
- **Branch:** `perf/graph-bottlenecks`
- **Target Repository:** Codex Cryptica (`packages/search-orchestrator`, `packages/search-engine`, `apps/web`)
- **Profiled Vault:** Real-world user campaign (`big-brin-zieb`, 1,625 entities, 500 nodes and 1,158 edges in graph view)

---

## 1. Executive Summary

Following graph rendering optimizations (PR #3392: edge endpoint validation sets, linear weight cache, stable layout fast-path), we profiled a cold/warm reload and full initial load of a 1,625-entity vault under Chrome DevTools.

While initial page load and graph rendering are fast (DOMContentLoaded: 201ms, cache preload: 309.6ms, graph mount: ~350ms with 0 long tasks during idle), the profile revealed a severe background CPU saturation issue in the search subsystem:

**40 consecutive full-vault index exports (`exportIndexCompressed`) were queued in the search web worker during background file reconciliation, saturating the worker for over 100 seconds (2+ minutes).**

---

## 2. Profiling Measurements & Timeline

| Phase / Metric                       | Measurement            | Assessment  | Notes                                            |
| :----------------------------------- | :--------------------- | :---------- | :----------------------------------------------- |
| **DOMContentLoaded**                 | 201 ms                 | ⚡ Fast     | Bundle loading & initial hydration               |
| **Window Load Event**                | 244 ms                 | ⚡ Fast     | Core stylesheets & layout render                 |
| **IndexedDB Cache Preload**          | 309.6 ms               | ⚡ Fast     | 1,625 entities restored to RAM by `CacheService` |
| **Graph View Elements Mounted**      | ~350 ms                | ⚡ Fast     | 500 nodes + 1,158 edges rendered                 |
| **Stationary Graph Long Tasks**      | 0 ms                   | ⚡ Fast     | No continuous repaints or animation freezes      |
| **External Image Visual Resolution** | 11,827 ms              | 🟡 Slow     | 198 external CORS-blocked image fetches          |
| **Search Index Persistence Churn**   | **40 exports (~110s)** | 🔴 Critical | Redundant sequential worker exports              |

---

## 3. Detailed Findings

### Finding 1: Search Index Persistence Storm (Priority 1)

#### Root Cause

1. During background vault reconciliation (`loadFiles(false)`), files are processed in chunks of 40 (`CHUNK_SIZE = 40` in `packages/vault-engine/src/repository.svelte.ts`).
2. For 1,625 entities, 40 `SYNC_CHUNK_READY` events are emitted to `vaultEventBus`.
3. `SearchIndexLifecycle` receives each chunk and calls `pipeline.indexBatch(entities)`.
4. In `SearchEngine` (worker), `addBatchProgressive` invokes `notifyChange()` after indexing each chunk.
5. In `search.svelte.ts`, the change callback marks `coordinator.isDirty = true` and calls `scheduleAutoSave()`.
6. When `saveIndex(vaultId)` executes:
   - In `packages/search-orchestrator/src/search-index-persistence.ts`, `saveIndex()` registers a `requestIdleCallback(run)`.
   - As soon as `run()` begins, it immediately removes its idle callback handle: `this.idleCallbacks.delete(vaultId)`.
   - `persistIndex(vaultId, generation)` is invoked asynchronously, calling `api.exportIndexCompressed()`.
   - Because `exportIndexCompressed()` takes **2.7s to 4.8s** to serialize and compress all 6 FlexSearch segments (1,625 docs), subsequent calls to `saveIndex()` find `previousIdle === undefined`.
   - Without an in-flight lock, each subsequent save schedules another idle callback, which starts another `persistIndex()`.
   - All 40 requests queue up in the worker's sequential `taskQueue`.
7. Even though `persistIndex()` checks `if (this.saveGenerations.get(vaultId) !== generation)` before saving to IndexedDB, it checks **after** `await compressedApi.exportIndexCompressed()` has already finished its expensive work!
8. Consequently, the worker completed 40 full compression passes of identical index data, blocking any real-time user searches during the entire 2-minute post-load window.

#### Remediation Plan

1. **In-Flight Coalescing Mutex**: When `persistIndex()` is actively running for a vault:
   - Any incoming `saveIndex()` calls must not start a concurrent export or schedule redundant worker tasks.
   - Instead, record `hasPendingTrailingSave = true` (or track the pending generation).
2. **Trailing Execution**: When the active export completes:
   - If a trailing save was requested during execution, run exactly **one** trailing export to capture the latest state.
   - If no new changes occurred, mark clean and settle.
3. **Chunk Batch Awareness**: Ensure background sync batches don't prematurely trigger persistence while indexing is actively progressing.

---

### Finding 2: External Image CORS Network Delays (Priority 2)

#### Root Cause

- The user's vault contains 198 entity avatar/card URLs pointing to external hosts (Discord attachments, Scabard, Google UserContent, etc.) that do not emit `Access-Control-Allow-Origin` headers.
- `GraphImageManager` attempts to fetch each image, incurring network round-trips and CORS rejection errors before falling back to SVG vector silhouettes.
- Total resolution time was **11,827 ms** on the 500-node graph.

#### Remediation Plan

- Add domain-level CORS pre-filtering or fast-failure caching:
  - If a domain is known to reject CORS (or has failed CORS previously in the session), avoid making repeated network requests and immediately fall back to vector silhouettes.
  - Implement a bounded timeout on image resolution fetches so individual stalls cannot prolong graph visual readiness.

---

### Finding 3: Double Cache Preload Sequence (Priority 3)

#### Root Cause

- On initial reload, `CacheService.preloadVault()` was logged twice:
  1. Instant warm paint: 309.60ms (1,625 entities).
  2. Second run during sync reconciliation: 1,281.30ms.
- While this does not freeze the UI (the second pass happens in the background), deduping in-flight preload promises will save unnecessary IndexedDB reads.

---

### Finding 4: Graph Reload Layout Bypass & Invisible Nodes Hairball (Priority 1.5 - Visual Critical)

#### Root Cause

1. **Selector Mismatch (`isPendingLayout` vs `.pending-layout`):**
   - In `transformer.ts`, nodes without saved coordinates received temporary golden-angle spiral seed positions and `(nodeData as any).isPendingLayout = true`. They did NOT receive the class `classes: "pending-layout"`.
   - In the stylesheet (`transformer.ts`), both `node[isPendingLayout]` and `.pending-layout` were styled with `{ opacity: 0; events: "no" }`.
   - In `LayoutManager.ts`, lines querying pending nodes used `this.cy.nodes(".pending-layout")`. Because the class was missing, `pendingCount` returned `0` and `pendingNodes` collection was empty.
2. **Initial Solve Bypass Condition:**
   - In `LayoutManager.ts`, the check `const needsInitialSolve = isInitial && cyNodes.length > 1 && (pendingCount === cyNodes.length || nodesAtOrigin === cyNodes.length);` required _all_ nodes to be pending or at origin.
   - In the user's real vault (`big-brin-zieb`), 498 nodes lacked coordinates and 2 nodes had coordinates. Because 498 !== 500 (and `pendingCount` returned 0 due to the selector mismatch), `needsInitialSolve` evaluated to `false`.
   - With `options.stableLayout = true` on initial load, layout computation was bypassed completely and directed to `fitOnly`.
   - In `fitOnly`, `pendingNodes` was empty, so `isPendingLayout` was never removed. All 498 unplaced nodes remained at `opacity: 0` in their raw spiral seed positions, while all 1,158 edges were rendered between them, producing a spherical "spiderweb hairball" of criss-crossing lines with only the 2 placed nodes visible.

#### Remediation Plan

1. **Unified Pending Selector (`PENDING_LAYOUT_SELECTOR`):**
   - Export and use `PENDING_LAYOUT_SELECTOR = "node[isPendingLayout], .pending-layout"` in `LayoutManager.ts`.
   - Tag newly generated pending elements with both `isPendingLayout: true` and `classes: "pending-layout"` in `transformer.ts` (entities and quicknotes) and `useGraphSync.ts`.
2. **Majority-Unplaced Layout Detection:**
   - Update `needsInitialSolve` in `LayoutManager.ts` to trigger a full initial force layout when:
     - `pendingCount === cyNodes.length` or `nodesAtOrigin === cyNodes.length`, OR
     - `pendingCount >= cyNodes.length * 0.5`, OR
     - `nodesAtOrigin >= cyNodes.length * 0.5`, OR
     - `unplacedCount >= cyNodes.length * 0.5`.
   - When a vault has mostly unplaced nodes (e.g. 498 / 500), it automatically triggers the worker force layout, calculates positions, clears `isPendingLayout`, fits the viewport, and persists coordinates to entity metadata.
3. **Defensive Worker Error Recovery:**
   - In `solveAndFit`, if the layout worker errors or times out, safely clear `isPendingLayout` and `pending-layout` so nodes are never left permanently invisible.

---

## 4. Implementation Log & Fix Tracking

| Priority | Item                                          | Component                            | Status          | Verification                                                                                                                 |
| :------- | :-------------------------------------------- | :----------------------------------- | :-------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **P1**   | Search Index Persistence Coalescing           | `search-index-persistence.ts`        | ✅ **Resolved** | 14/14 unit tests pass; verified in dev server: 40 redundant exports -> 0 on reload, exactly 1 on manual/subsequent save.     |
| **P1.5** | Graph Reload Layout Bypass & Pending Selector | `LayoutManager.ts`, `transformer.ts` | ✅ **Resolved** | 49/49 graph-engine tests pass; live DevTools validation on 500-node graph confirms all nodes visible and beautifully placed. |
| **P2**   | Image CORS Fast-Fail / Fallback Cache         | `ImageManager` / `GraphImageManager` | ⏳ Pending      | Network latency benchmark                                                                                                    |
| **P3**   | Cache Preload Deduping                        | `CacheService`                       | ⏳ Pending      | Trace confirmation                                                                                                           |
