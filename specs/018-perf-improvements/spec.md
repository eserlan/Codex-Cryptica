# Performance Improvements

## Background

A critical code review identified several performance bottlenecks in the Codex Cryptica web application, primarily affecting large vaults and battery-powered devices. These improvements target rendering efficiency, store reactivity, and resource management.

## Objectives

1.  **Reduce Event Queue Flooding**: Batch async operations to prevent micro-task pile-up.
2.  **Optimize Incremental Updates**: Avoid full recalculations when only a single data point changes.
3.  **Minimize Idle CPU Usage**: Switch from polling-based loops to event-driven patterns.
4.  **Reduce JSON Serialization**: Replace deep comparisons with cheaper alternatives.

---

## Implementation Plan

### 1. GraphView: Batched Image Resolution

**File**: `apps/web/src/lib/components/GraphView.svelte`

**Problem**: The `$effect` block that resolves node images iterates with `for-await`, starting many parallel file operations.

**Solution**:
-   Collect all image paths and resolve them with `Promise.all()` (or in chunks if more than ~20).
-   Add a ~100ms debounce to the `$effect` so it doesn't re-fire on every minor graph update.

**Affected Lines**: ~209-228

---

### 2. VaultStore: Incremental Adjacency Map

**File**: `apps/web/src/lib/stores/vault.svelte.ts`

**Problem**: `updateInboundConnections()` rebuilds the entire map (O(N*M)) on every connection change.

**Solution**:
-   Introduce helper methods `addInboundConnection(sourceId, targetId)` and `removeInboundConnection(sourceId, targetId)`.
-   Call these directly from `addConnection` and `removeConnection` instead of invoking `updateInboundConnections()`.

**Affected Lines**: ~25-33, ~596-625, ~651-662

---

### 3. Minimap: Event-Driven Redraws

**File**: `apps/web/src/lib/components/graph/Minimap.svelte`

**Problem**: A perpetual `requestAnimationFrame` loop (30fps) polls Cytoscape state even when idle.

**Solution**:
-   Remove the continuous loop.
-   Attach listeners to `cy.on('pan zoom resize add remove position')` and call `draw()` on demand.
-   Use a RAF-throttled redraw (max 30fps) when events fire in quick succession.

**Affected Lines**: ~116-176, ~262-287

---

### 4. OracleStore: Cheap Sync Check

**File**: `apps/web/src/lib/stores/oracle.svelte.ts`

**Problem**: `JSON.stringify(this.messages) !== JSON.stringify(data.messages)` runs on every `BroadcastChannel` message.

**Solution**:
-   Add a `lastUpdated: number` timestamp to the synced state.
-   First, compare the timestamps. Only if they differ, proceed with a deeper check (or trust the incoming data).

**Affected Lines**: ~32

---

### 5. VaultStore: Canvas Pooling for Thumbnails

**File**: `apps/web/src/lib/stores/vault.svelte.ts`

**Problem**: `generateThumbnail()` creates a new `Image`, `canvas`, and `2D context` on every call, causing minor GC pressure.

**Solution**:
-   Create a module-level reusable canvas and context (or use `OffscreenCanvas` where supported).
-   Reuse these objects across thumbnail generation calls.

**Affected Lines**: ~413-469

---

## Verification Plan

### Automated Tests
-   Existing E2E tests should still pass after these changes (no functional regressions).
-   No new unit tests required unless specific edge cases emerge.

### Manual Verification
-   **Large Vault Test**: Open a vault with 100+ entities. Confirm graph renders smoothly without UI jank.
-   **Minimap Idle Test**: Open devtools Performance tab. Confirm CPU usage drops to near-zero when the graph is not being interacted with.
-   **Oracle Sync Test**: Open the app in two tabs. Send messages. Confirm sync works and no console errors appear.

## User Impact

-   **Faster Load Times**: Vaults load more smoothly with less main-thread blocking.
-   **Better Battery Life**: The minimap no longer spins idle, saving CPU cycles.
-   **Smoother Chat Experience**: Oracle sync is more efficient in long sessions.
