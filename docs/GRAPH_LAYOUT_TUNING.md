# Graph Layout Tuning

Developer reference for `packages/graph-engine`. Documents what works, what doesn't, and why — based on extensive iteration in April 2026.

## Observed performance

| Graph size | Quality | numIter | Redraw time                                |
| ---------- | ------- | ------- | ------------------------------------------ |
| 240 nodes  | default | 2200    | < 1 second                                 |
| 500 nodes  | default | 2200    | ~2–4s (estimated)                          |
| 500+ nodes | draft   | 1200    | ~3–8s (estimated, depends on edge density) |

The main thread never blocks — fcose runs in a Web Worker. The UI stays fully responsive during layout computation.

## Architecture

Layout runs in a **Web Worker** so the main thread stays unblocked.

```
LayoutManager.ts          →  layout.worker.ts           →  Cytoscape + fcose
  serialise nodes/edges      getDegreeAwareLayoutOptions    removeOverlaps
  pass _degree per node      per-node repulsion fn          spatial grid O(N)
  ±2400 bounding box         per-edge length fn
```

Key files:

| File                   | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `src/LayoutManager.ts` | Serialises graph, manages worker lifecycle, applies positions |
| `src/layout.worker.ts` | Runs fcose in headless Cytoscape, resolves overlaps           |
| `src/defaults.ts`      | `getDynamicLayoutOptions` — base physics scaled by node count |

## Degree-aware forces (the core insight)

fcose accepts **functions** for `nodeRepulsion` and `idealEdgeLength`, not just numbers. This is what makes the layout work well:

```ts
// layout.worker.ts — getDegreeAwareLayoutOptions()
nodeRepulsion: (node) => baseRepulsion * (1 + Math.min(4.0, Math.sqrt(degree) * 0.55)),
//   degree 0  → 1.0× base
//   degree 5  → 2.2× base
//   degree 20 → 3.5× base
//   degree 50 → 4.9× base   (capped at 5×)

idealEdgeLength: (edge) => {
  if (minDegree >= 5) return base * 3.5;  // hub↔hub — pushes communities apart
  if (maxDegree >= 5) return base * 0.8;  // hub↔leaf — keeps leaf near its hub
  return base;                             // leaf↔leaf — default
}
```

**Effect:** Hub nodes carve out space between clusters; leaf nodes stay tightly grouped near their hubs. Communities separate naturally without any fixed constraints.

## Bounding box

Always `{ x1: -2400, y1: -2400, x2: 2400, y2: 2400 }` for non-trivial graphs.

- **Too small (±1200):** nodes crush together with no room to spread — removeOverlaps can't fix it
- **Too large:** makes gravity too weak relative to the space; clusters drift off-screen

## Base physics (defaults.ts)

Scaled by node count via `getDynamicLayoutOptions(nodeCount)`:

```ts
repulsion  = min(200_000, 30_000 + nodeCount × 500)
gravity    = max(0.08, 0.25 − nodeCount × 0.0005)
edgeLength = min(70, 15 + √nodeCount × 1.5)
separation = min(100, 20 + √nodeCount × 2.5)
gravityRange = 5.5
numIter    = 5000
```

The degree-aware functions in the worker multiply on top of these base values.

## Gravity caps (LayoutManager.ts)

After `getDynamicLayoutOptions`, gravity is capped per aspect ratio:

```ts
gravity = isLandscape ? min(base, 0.25) : min(base, 0.35);
```

## removeOverlaps (layout.worker.ts)

Spatial-grid O(N amortised) post-pass after fcose settles:

- `padding = 18` — gap between node edges
- `maxIter = 32` — iterations before giving up
- Uses `actualW/actualH` (real rendered sizes), not fcose layout sizes
- `actualRadii[i] = max(actualW, actualH) / 2` — uses the larger dimension for safety

## What NOT to do

### Fixed node constraints (communityAnchors)

Using `fixedNodeConstraint` to pin hub nodes to a ring creates a **star/spoke pattern**: hubs are locked in place and all their connected nodes radiate outward. Remove these constraints and let the adaptive forces work naturally.

### Uniform repulsion cranked too high

Setting `nodeRepulsion` uniformly to 250k+ (without degree awareness) blasts hub nodes to the canvas edges because their many edge springs can't overcome the repulsion. This causes long crossing edges spanning the whole graph.

### Bounding box ±1200 on large graphs

For 150+ nodes, ±1200 leaves no room. All nodes crush into the center and removeOverlaps cannot resolve them within the space available.

### Gravity floor too low

Setting gravity floor to 0.01–0.02 without a matching `gravityRange` lets the outer nodes escape the canvas entirely. Keep floor ≥ 0.08 unless `gravityRange` is high enough to reach them.

### Draft quality for degree-aware layouts

fcose `quality: "draft"` silently **ignores** function-valued `nodeRepulsion` and `idealEdgeLength`. Switching to draft drops all degree-aware tuning and produces a uniform, badly-overlapped layout. Keep `quality: "default"` for any graph that uses per-node/edge force functions. Only use draft for 500+ nodes where degree-aware functions are not needed.
