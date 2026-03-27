# Graph Engine Performance Assessment

**Date:** March 25, 2026
**Focus:** Codex Cryptica Graph Loading, Syncing, and Rendering Pipeline

## 1. Executive Summary

The Codex Cryptica graph engine is built on Cytoscape.js and relies heavily on the `fcose` layout algorithm. Handling graphs exceeding 300-500 nodes with complex entity cards (images, large text) natively stresses the browser's main thread.

Recent "Bolt" optimizations have successfully eliminated $O(N^2)$ bottlenecks, tuned the physics engine for speed, and implemented viewport-level rendering shortcuts. The current pipeline is highly optimized for graphs up to ~1,000 nodes, but extreme scaling will eventually require off-main-thread processing.

---

## 2. Phase Analysis & Current Optimizations

### A. Transformation Phase (`packages/graph-engine/src/transformer.ts`)

- **Status: Highly Optimized**
- **Current State:**
  - **Memory Allocation:** Swapped expensive `Array.flatMap()` calls and per-node array creations (`entity.labels || []`) for shared constants (`EMPTY_LABELS`) and imperative `for` loops.
  - **Position Hashing:** Generates initial fallback coordinates using a highly efficient bitwise 32-bit hash function inside a single loop, avoiding array `.split().reduce()` cycles.
  - **Date Formatting:** Uses raw string concatenation instead of template literals or `.padStart()`, which is significantly faster in hot loops.

### B. Sync Phase (`packages/graph-engine/src/sync/useGraphSync.ts`)

- **Status: Highly Optimized**
- **Current State:**
  - **$O(N)$ Lookups:** Eliminated an $O(N^2)$ bottleneck where the sync engine searched arrays to match node IDs. It now builds an `elementMap` in a single pass, making diffs instantaneous.
  - **Granular Patching:** The graph data payload is only updated if a strict value/reference change is detected.
  - **Batching:** All graph structure changes, data updates, and CSS class toggles are wrapped in a single `cy.batch()` call, forcing Cytoscape to pause rendering until all DOM logic is complete.

### C. Layout Phase (`packages/graph-engine/src/defaults.ts` & `LayoutManager.ts`)

- **Status: Balanced for Speed and Quality**
- **Current State:**
  - **Algorithmic Quality:** Disabled the extremely expensive `quality: 'proof'` setting. It now scales from `default` down to `draft` for graphs exceeding 500 nodes.
  - **Initial Randomization:** Forcing `randomize: true` on the initial load stops nodes from spawning in a massive clump at `(0,0)`, which previously choked the physics engine as it calculated massive overlapping repulsion forces.
  - **Tuned Constants:**
    - `numIter` capped at 3500.
    - `idealEdgeLength` and `nodeSeparation` tightened to 80px (with dynamic scaling caps).
    - `boundingBox` increased to `+/- 5000px` to give the engine room to disperse dense clusters instantly without compression penalties.

### D. Rendering & UI Phase (`apps/web/src/lib/components/GraphView.svelte`)

- **Status: Optimized**
- **Current State:**
  - **Viewport Caching:** Enabled `hideLabelsOnViewport: true` and `textureOnViewport: true`. When a user pans or zooms, expensive text rendering is disabled, and the graph is temporarily converted into a flat texture. This is crucial for maintaining 60 FPS during interaction.
  - **Debounced Resizing:** `handleResize` is debounced and heavily guarded. It only triggers a re-layout if the aspect ratio physically changes from `portrait` to `landscape` or vice versa, eliminating layout thrashing during standard window resizing.
  - **Image Management:** Image rendering is handled incrementally via an isolated `ImageManager` class, ensuring that heavy Base64/Blob injections do not block initial node painting.

---

## 3. Proposals for Future Improvements

While the synchronous pipeline is currently operating near peak efficiency for standard browser JavaScript, scaling into the thousands of nodes will require architectural shifts.

### Proposal 1: Web Worker Layout Engine (High Impact, Medium Effort)

The `fcose` layout is physics-based and CPU-intensive. When a graph exceeds 500 nodes, the `.run()` command can lock the main thread for 200-800ms.

- **Implementation:** Cytoscape supports running layouts headlessly. We can offload `fcose` to a dedicated Web Worker (similar to the existing `search.worker.ts`). The worker would take the nodes and edges, run the layout, and post a `Record<NodeId, Position>` dictionary back to the main thread.
- **Benefit:** Zero UI blocking during massive graph layout calculations.

### Proposal 2: Canvas / WebGL Renderer (High Impact, High Effort)

Cytoscape's default renderer uses the Canvas 2D API. While highly optimized, it struggles to paint thousands of complex nodes with labels and images.

- **Implementation:** Evaluate migrating to a WebGL-based renderer (like `cytoscape-webgl` or migrating the engine core to `PixiJS` / `Sigma.js` if necessary).
- **Benefit:** Uses the GPU for rendering, allowing 10k+ nodes to run smoothly at 60fps.

### Proposal 3: LOD (Level of Detail) & Culling (Medium Impact, Low Effort)

Currently, all nodes exist in the graph even when zoomed far out.

- **Implementation:** Implement semantic zooming. When the zoom level drops below `0.3`, transition node backgrounds to solid colors, completely hide images, and drop edge bezier calculations in favor of straight lines.
- **Benefit:** Drastically reduces the number of pixels the GPU/CPU must push during high-level panning.

### Proposal 4: Differential Edge Syncing (Low Impact, Medium Effort)

- **Implementation:** Currently, edge syncing checks if an edge exists. If node attributes change rapidly, Cytoscape sometimes struggles with connected edge redraws. We could pause edge rendering entirely (`cy.edges().style('display', 'none')`) while the layout runs, and restore them post-layout.
- **Benefit:** Saves rendering cycles on line-intersection math during animation frames.
