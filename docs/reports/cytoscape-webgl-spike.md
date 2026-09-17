# Spike: Cytoscape WebGL renderer prototype (#3168)

**Recommendation: REJECT — keep Canvas 2D, continue #3160. No follow-up implementation issue.**

## Method

- Branch `3168-cytoscape-webgl-spike`, Cytoscape 3.33.4 (bundled; its canvas
  renderer already contains the experimental WebGL node/edge layer, enabled via
  the construction-time `webgl: true` option — no new dependency).
- Prototype: `GraphOptions.webgl` pass-through in `packages/graph-engine`,
  `?webgl=1` opt-in (sticky in localStorage) in the main graph controller,
  WebGL2 capability probe + try/catch fallback to Canvas so production can
  never be left without a graph. `DetailConnectionsTab` untouched (Canvas).
- Harness: `apps/web/tests/performance/webgl-spike.spec.ts` (smoke, real-input
  interaction parity, mobile viewport, multi-scale benchmarks), same seeded
  vault fixture shape as `large-graph.spec.ts`, serial workers.
- Environment caveat (read first): dev server + headless Chromium with
  **SwiftShader software GL — no hardware GPU**. Canvas 2D in the same
  environment is comparatively well-optimized, so these numbers measure
  _software-GL WebGL_, not hardware-GL WebGL. The direction and magnitude
  below are still fatal for adoption (see interpretation), but a hardware-GPU
  retest would be required before any revisit.

## Benchmarks: Canvas vs WebGL, full CC visuals (dev build, SwiftShader)

Steady-state pan/zoom frames (30 measured after LOD warm-up), enter→usable
(seed → full cy counts + layout settle), programmatic select latency:

| Scale                         | Canvas avg / p90 frame | WebGL avg / p90 frame                    | Canvas enter | WebGL enter |
| ----------------------------- | ---------------------- | ---------------------------------------- | ------------ | ----------- |
| 250n / 1400e                  | 23 / 44 ms             | 256 / 290 ms (~11×)                      | 9.5 s        | 11.4 s      |
| 500n / 2800e                  | 31 / 63 ms             | 656 / 736 ms (~21×)                      | 6.6 s        | 8.9 s       |
| 1000n / 5600e                 | 78 / 195 ms            | 1349 / 1506 ms (~17×)                    | 23.4 s       | 29.6 s      |
| 1600n / 9000e full            | 125 / 223 ms           | **never ready (90 s timeout, 2/2 runs)** | 84.8 s       | —           |
| 1600n simplified (labels off) | 46 / 35 ms             | 3159 / 4566 ms (~69×)                    | 75.0 s       | 85.4 s      |

Select latency follows the same ratio (e.g. stress simplified: 299 ms
Canvas vs 6311 ms WebGL). Seed (data prep) is identical, as expected —
WebGL changes nothing before construction.

### Interpretation (per the issue's phase rule)

- **Rendering throughput is worse, not better**: frames are 11–69× slower,
  and the gap _widens_ with scale and _widens further_ with labels off,
  i.e. the WebGL body/edge path itself is the bottleneck here, not text.
- **It also poisons the other phases**: enter→usable is slower at every
  scale and the stress graph never converges under WebGL — each layout tick
  pays the atlas cost, so layout/reconciliation inherit the penalty.
- Plausible mechanism (source-read, not profiled): CC's styles push almost
  every node off the "simple shape" fast path (entity thumbnails via
  `background-image`, dotted quicknote borders, polygon shield shapes,
  underlays) into per-element texture-atlas raster + upload, rebuilt every
  frame during interaction; on software GL that upload dominates.
- JS-heap comparison inconclusive (`performance.memory` flat at ~9–10 MB in
  this context); GPU/texture memory unmeasured.

## Compatibility matrix

| Feature                               | Verdict                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme/category colours                | ✅ identical screenshots                                                                                                                                |
| Node shapes, dynamic sizing           | ✅ identical (ellipse fast path; polygon via texture path)                                                                                              |
| Entity thumbnails / background images | ✅ silhouette renders under WebGL                                                                                                                       |
| Labels, custom fonts                  | ✅ identical (label atlas layer)                                                                                                                        |
| Borders, selected/focused states      | ✅ selection card + panel verified                                                                                                                      |
| Opacity / dimming                     | ⚠️ same style pipeline, not visually stressed at scale                                                                                                  |
| Straight / curved edges               | ✅ bezier per source + screenshots                                                                                                                      |
| Directed-edge arrows                  | ✅ triangle per source + screenshots                                                                                                                    |
| Timeline mode                         | ⚠️ same class/layout pipeline, not runtime-toggled in spike                                                                                             |
| Focus / neighbourhood highlighting    | ⚠️ selection verified; focus-expansion latency unmeasured (harness gap)                                                                                 |
| Hover, tooltip                        | ✅ events fire; tooltip is DOM, renderer-agnostic                                                                                                       |
| Selection                             | ✅ real-click select both modes                                                                                                                         |
| Context menu positioning              | ✅ `cxttap` fires; menu is DOM (right-click opened panel in run)                                                                                        |
| Dragging                              | ✅ real-mouse drag moves nodes both modes                                                                                                               |
| Zoom / pan                            | ✅ both modes                                                                                                                                           |
| Mobile / touch                        | ⚠️ mounts in 390px viewport both modes; tap-select blocked by app modal backdrop (`z-[85]`) in **both** modes — harness/layout issue, no renderer delta |
| Minimap                               | ✅ model-driven SVG overlay, renderer-agnostic (static)                                                                                                 |
| PNG / export                          | N/A — app never calls `cy.png()`                                                                                                                        |
| Accessibility                         | ✅ `graph-a11y-summary` present both modes                                                                                                              |

Incidental findings (prototype rough edges, not adoption blockers alone):

- Cytoscape logs `webgl rendering enabled` to the console unconditionally.
- `CRp.CANVAS_LAYERS` is mutated on the shared renderer prototype when any
  instance enables WebGL — a second Canvas instance afterwards still works
  (extra layer allocated) but this is upstream sloppiness worth knowing.
- No `getContext('webgl2')` failure fallback upstream (it `util.error`s);
  our pre-probe + try/catch covers it.

## Adoption check (from #3168)

- User-visible improvement: **no — 11–69× regression**, stress unusable.
- Interaction regressions: none found at small scale, but irrelevant given perf.
- Mobile/browser, a11y: no delta either way.
- Maintenance risk: experimental upstream path confirmed rough (console noise,
  prototype-global mutation) — moot given perf.
- Canvas fallback: implemented and tested (probe + catch paths).

## Conclusion

Do not adopt. Keep Canvas 2D and continue the broader alternatives spike in
#3160. Revisit only with hardware-GPU measurements showing a reversal at
CC-relevant scales _and_ an upstream stabilization of the experimental
renderer. No follow-up implementation issue filed.
