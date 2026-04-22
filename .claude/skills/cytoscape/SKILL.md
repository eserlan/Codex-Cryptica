---
name: cytoscape
description: Master reference for Cytoscape.js + cytoscape-fcose used in Codex Arcana. Use when tuning layout physics, writing style rules, querying the graph, optimizing performance, or debugging rendering.
---

# Cytoscape + fcose — Master Reference

## Project file map

| File                                         | Purpose                                                  |
| -------------------------------------------- | -------------------------------------------------------- |
| `packages/graph-engine/src/defaults.ts`      | `getDynamicLayoutOptions(nodeCount)` — all fcose physics |
| `packages/graph-engine/src/LayoutManager.ts` | Runs layouts, handles `layoutstop`, persists positions   |
| `packages/graph-engine/src/transformer.ts`   | Builds the Cytoscape style array from theme + categories |
| `packages/schema/src/theme.ts`               | `THEMES` constant — source of truth for all theme values |
| `packages/graph-engine/src/index.ts`         | Public exports from graph-engine package                 |

---

## Selector syntax

Used in style rules (`cy.style()`), queries (`cy.$()`), and event listeners.

### Element type

```
node          all nodes
edge          all edges
*             everything
```

### Data attributes

```
node[type]                    has the attribute
node[!type]                   attribute is falsy/missing
node[type = "npc"]            exact match
node[type != "npc"]           not equal
node[weight > 5]              numeric comparison (>, <, >=, <=)
node[label *= "dragon"]       contains substring
node[label ^= "Sir"]          starts with
node[label $= "the"]          ends with
node[[degree > 3]]            computed property (double brackets)
```

### State

```
node:selected
node:unselected
node:visible
node:hidden
node:grabbed
node:free                     not grabbed
node:locked
node:child                    inside a compound node
node:parent                   has children
node:orphan                   no parent
node:nonorphan
edge:loop                     self-loop
```

### Combinators

```
node edge                     edge connected to node (descendant)
node > edge                   direct child
node + node                   immediately following sibling
node ~ node                   any following sibling
#id                           specific element by ID
.className                    has CSS class
```

### Compound (comma = OR)

```
node[type="npc"], node[type="location"]
```

---

## Style properties reference

### Node geometry

```js
"shape":                  "ellipse" | "rectangle" | "round-rectangle" | "diamond"
                          | "hexagon" | "octagon" | "star" | "triangle" | "vee"
                          | "rhomboid" | "cut-rectangle" | "barrel" | "bottom-round-rectangle"
"width":                  px | "label" (fit to label)
"height":                 px | "label"
"padding":                px  // extra space around content
```

### Node background

```js
"background-color":       color
"background-opacity":     0–1
"background-image":       url | "none"
"background-fit":         "cover" | "contain" | "none"
"background-clip":        "node" | "none"
"background-position-x":  px | %
"background-position-y":  px | %
"background-width":       px | % | "auto"
"background-height":      px | % | "auto"
// Gradient (two-stop)
"background-gradient-stop-colors": "red blue"
"background-gradient-stop-positions": "0% 100%"
"background-gradient-direction": "to-bottom" | "to-right" | etc.
```

### Node border

```js
"border-width":           px
"border-color":           color
"border-style":           "solid" | "dashed" | "dotted" | "double" | "none"
"border-opacity":         0–1
```

### Node overlay / underlay (highlight rings)

```js
"overlay-color":          color
"overlay-padding":        px
"overlay-opacity":        0–1   // set > 0 to show
"underlay-color":         color
"underlay-padding":       px
"underlay-opacity":       0–1
"underlay-shape":         "ellipse" | "rectangle"
```

### Node ghost (drop shadow effect)

```js
"ghost":                  "yes" | "no"
"ghost-offset-x":         px
"ghost-offset-y":         px
"ghost-opacity":          0–1
```

### Labels

```js
"label":                  "data(label)" | static string | ""
"font-family":            CSS font stack
"font-size":              px
"font-weight":            "normal" | "bold"
"font-style":             "normal" | "italic"
"color":                  color
"text-opacity":           0–1
"text-valign":            "top" | "center" | "bottom"
"text-halign":            "left" | "center" | "right"
"text-wrap":              "none" | "wrap" | "ellipsis"
"text-max-width":         px
"text-background-color":  color
"text-background-opacity": 0–1
"text-background-padding": px
"text-background-shape":  "rectangle" | "roundrectangle"
"text-border-width":      px
"text-border-color":      color
"text-border-style":      "solid" | "dashed" | "dotted"
"text-margin-x":          px  // nudge label
"text-margin-y":          px
"text-rotation":          rad | "autorotate"  // autorotate for edge labels
"min-zoomed-font-size":   px  // hide label when zoomed out past this
```

### Edges

```js
"line-color":             color
"line-style":             "solid" | "dashed" | "dotted"
"line-dash-pattern":      [dash, gap, ...]  // e.g. [6, 3]
"line-dash-offset":       px
"width":                  px
"opacity":                0–1
"curve-style":            "bezier" | "unbundled-bezier" | "haystack"
                          | "segments" | "straight" | "straight-triangle"
                          | "taxi"
"control-point-step-size": px  // bezier curve bulge
"control-point-distance": px   // for unbundled-bezier
"control-point-weight":   0–1
"segment-distances":      "20 -20"  // for segments curve
"segment-weights":        "0.25 0.75"
"taxi-direction":         "auto" | "horizontal" | "vertical" | "upward" | "downward" | "leftward" | "rightward"
"taxi-turn":              px | %
"edge-distances":         "intersection" | "node-position"
"loop-direction":         deg  // self-loop direction
"loop-sweep":             deg  // self-loop arc size
```

### Arrows

```js
"target-arrow-shape":     "triangle" | "triangle-tee" | "circle-triangle"
                          | "triangle-cross" | "triangle-backcurve"
                          | "vee" | "tee" | "square" | "circle"
                          | "diamond" | "chevron" | "none"
"source-arrow-shape":     (same options)
"mid-target-arrow-shape": (same options)  // arrow at midpoint
"mid-source-arrow-shape": (same options)
"target-arrow-color":     color
"source-arrow-color":     color
"arrow-scale":            multiplier
```

### Visibility

```js
"display":                "element" | "none"  // none removes from layout
"visibility":             "visible" | "hidden"  // hidden but still in layout
"opacity":                0–1   // affects element + descendants
"z-index":                int
"z-compound-depth":       "auto" | "bottom" | "orphan" | "top"
```

---

## Viewport API

```js
cy.fit(eles?, padding?)       // zoom + pan to fit elements (default: all)
cy.zoom(level?)               // get or set zoom level
cy.pan(pos?)                  // get or set pan {x, y}
cy.center(eles?)              // pan to center on elements
cy.reset()                    // zoom=1, pan=0
cy.extent()                   // returns bounding box of viewport {x1, y1, x2, y2, w, h}
cy.width()                    // container width in px
cy.height()                   // container height in px

// Animate viewport
cy.animate({
  fit: { eles: cy.nodes(), padding: 20 },
  zoom: 1.5,
  pan: { x: 0, y: 0 },
  duration: 800,
  easing: "ease-out-cubic",
  complete: () => {},
})

// Zoom constraints
cy.minZoom(0.1)
cy.maxZoom(5)
cy.userZoomingEnabled(bool)
cy.userPanningEnabled(bool)
cy.boxSelectionEnabled(bool)
cy.autoungrabifyNodes(bool)
```

---

## Collection API

```js
// Selection
cy.nodes(); // all nodes (NodeCollection)
cy.edges(); // all edges
cy.elements(); // all elements
cy.$("node[type='npc']"); // query selector
cy.getElementById("id"); // single element by id

// Filtering
col.filter(selector);
col.filter(fn); // fn(ele) => bool
col.not(selector);
col.has(ele);
col.is(selector); // true if any match

// Traversal
node.connectedEdges();
node.neighborhood(); // connected nodes + edges
node.predecessors(); // all nodes upstream (follows edges in)
node.successors(); // all nodes downstream
node.ancestors(); // compound parents chain
node.descendants(); // compound children, all levels
edge.source();
edge.target();
edge.connectedNodes();

// Metrics
node.degree(); // total edge count
node.indegree();
node.outdegree();
col.length;
col.size();

// Mutation
col.addClass("highlight");
col.removeClass("highlight");
col.toggleClass("highlight");
col.hasClass("highlight");
col.select();
col.unselect();
col.lock(); // freeze position
col.unlock();
col.show();
col.hide();
col.remove();
col.restore();

// Data
ele.data("key"); // get
ele.data("key", value); // set
ele.data({ key: value }); // set multiple
ele.removeData("key");
ele.id();
ele.position(); // { x, y }
ele.position({ x, y }); // set
ele.renderedPosition(); // position in screen px

// Iteration
col.forEach((ele, i) => {});
col.map(fn);
col.reduce(fn, init);
col.some(fn);
col.every(fn);
col.sort(fn);
col.toArray();
```

---

## Event system

```js
// Binding
cy.on("tap", "node", (evt) => {
  const node = evt.target;
  const pos = evt.position;        // graph coordinates
  const renderedPos = evt.renderedPosition;
})

cy.one("layoutstop", cb)           // fires once then removes itself
cy.off("tap", "node", cb)
ele.on("tap", cb)

// Common events
"tap"           click or touch tap
"tapstart"      mousedown / touchstart
"tapend"        mouseup / touchend
"tapdrag"       dragging
"tapdragover"   dragging over an element
"mouseover"     hover enter
"mouseout"      hover exit
"grab"          node grabbed (drag start)
"free"          node released
"drag"          node being dragged
"select"        element selected
"unselect"      element deselected
"add"           element added to graph
"remove"        element removed
"data"          element data changed
"position"      node position changed
"zoom"          viewport zoom changed
"pan"           viewport pan changed
"resize"        container resized
"layoutstart"   layout begins
"layoutstop"    layout finished
"layoutready"   layout computed first positions
"style"         style applied
"ready"         cy fully initialised
"destroy"       cy destroyed

// Trigger manually
cy.trigger("resize")
ele.trigger("tap")
```

---

## fcose full parameter reference

All values come from `getDynamicLayoutOptions(nodeCount)` in `defaults.ts`.

### Core physics (dynamically computed)

| Parameter         | Formula                      | ~231 nodes | Effect                                                                                                        |
| ----------------- | ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `idealEdgeLength` | `min(70, 15 + √n×1.5)`       | **38px**   | **Primary clustering dial.** Short edges pull connected nodes into tight dandelion clusters around their hub. |
| `nodeRepulsion`   | `min(200000, 30000 + n×500)` | 145500     | Pushes all nodes apart. High value creates breathing room between clusters.                                   |
| `nodeSeparation`  | `min(100, 20 + √n×2.5)`      | 58         | Min gap between bounding boxes. **Soft target.**                                                              |
| `gravity`         | `max(0.08, 0.25 - n×0.0005)` | 0.134      | Pull toward center. Low value lets clusters drift into their own regions.                                     |
| `gravityRange`    | `5.5` (fixed)                | —          | Gravity effective radius multiplier. 5.5 ensures isolated nodes are still pulled toward the main body.        |

Gravity is additionally capped in `LayoutManager.ts`: landscape ≤ 0.25, portrait ≤ 0.35.

**The key insight:** `idealEdgeLength` and `nodeRepulsion` work as a pair. Short edges keep _connected_ nodes huddled together (edge spring wins). High repulsion pushes _unconnected_ nodes apart (repulsion wins). The result: tight per-hub clusters with visible gaps between them.

### Fixed options (in `DEFAULT_LAYOUT_OPTIONS`)

| Parameter                     | Value                   | Notes                                                                                                           |
| ----------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `quality`                     | `"default"` / `"draft"` | Draft if n>500. Default runs more refinement passes.                                                            |
| `numIter`                     | `5000`                  | Solver iterations. More → better convergence, slower.                                                           |
| `randomize`                   | `true`                  | Scramble positions before solving. Controlled by `shouldRandomize`.                                             |
| `animate`                     | `false`                 | Skip animation during solve (positions snap then viewport animates).                                            |
| `packComponents`              | `true`                  | Pack disconnected subgraphs into viewport.                                                                      |
| `tile`                        | `true`                  | Tile isolated (zero-edge) nodes in a grid.                                                                      |
| `tilingPaddingVertical`       | `60`                    | Padding around tiled isolated node grid.                                                                        |
| `tilingPaddingHorizontal`     | `60`                    |                                                                                                                 |
| `nodeDimensionsIncludeLabels` | `true`                  | fcose collision detection uses label bounding box. Important — without this labels overlap even if nodes don't. |
| `nestingReprGrpFactor`        | `1.2`                   | Extra space for compound node children.                                                                         |
| `initialEnergyOnIncremental`  | `0.3`                   | Energy level when re-running layout on existing positions (not randomized). Lower = less disruption.            |

### Rarely tuned but available

| Parameter              | Default             | Notes                                                                                                      |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `piTol`                | `0.0000001`         | Convergence tolerance. Smaller = more precise but slower.                                                  |
| `samplingType`         | `true`              | Use Barnes-Hut approximation for large graphs.                                                             |
| `sampleSize`           | `25`                | Sample size for Barnes-Hut.                                                                                |
| `nestingFactor`        | `0.1`               | Weight of compound nesting in force calculation.                                                           |
| `gravityRangeCompound` | `1.5`               | Gravity range multiplier inside compound nodes.                                                            |
| `gravityCompound`      | `1.0`               | Gravity inside compound nodes.                                                                             |
| `gravityRange`         | `5.5` (we set this) | Multiplier on gravity effective radius. Default 3.8 didn't reach isolated nodes; 5.5 reels strays back in. |
| `boundingBox`          | `{x1,y1,x2,y2}`     | Initial scatter region. We use `{x1:-1200,y1:-1200,x2:1200,y2:1200}`.                                      |

### Tuning philosophy

The clustering aesthetic is driven by **short `idealEdgeLength`** (not gravity). Low gravity lets clusters drift apart into distinct regions — the "ball" shape is a side effect of high gravity and is not the goal here. When clusters are too mixed: shorten `idealEdgeLength`. When clusters are too close together: raise `nodeRepulsion`. When graph is too spread out: raise `gravity` or `gravityRange`.

---

## Style cascade (transformer.ts)

Array order determines specificity — later entries win on equal-specificity selectors:

```
baseStyle          node shape, size, label defaults, edge defaults
  ↓
categoryStyles     border-color, background-color @ 0.55 opacity — one rule per category
  ↓
revealedStyles     background-opacity: 1 for image nodes (MUST be after categoryStyles)
                   isRevealed state styles
  ↓
selectionStyles    selected node highlight (background-opacity: 1)
```

**Rule:** anything that needs to override a category rule goes in `revealedStyles` or later. Putting it in `baseStyle` won't work because `categoryStyles` comes after.

---

## Layout comparison

| Layout         | Package           | Overlap guarantee          | Best for                                                            |
| -------------- | ----------------- | -------------------------- | ------------------------------------------------------------------- |
| `fcose`        | `cytoscape-fcose` | No (soft forces)           | Organic clustering, Obsidian-style graphs                           |
| `cola`         | `cytoscape-cola`  | Yes (`avoidOverlap: true`) | When no-overlap is hard requirement; produces more grid-like result |
| `dagre`        | `cytoscape-dagre` | Yes                        | DAGs, trees, hierarchy views                                        |
| `elk`          | `cytoscape-elk`   | Yes                        | Complex hierarchies, layered diagrams                               |
| `preset`       | built-in          | N/A                        | Restoring saved positions                                           |
| `grid`         | built-in          | Yes                        | Simple grid, debugging                                              |
| `circle`       | built-in          | Yes                        | Small graphs, explicit circular layout                              |
| `breadthfirst` | built-in          | Yes                        | Trees                                                               |
| `random`       | built-in          | No                         | Debugging                                                           |
| `cose`         | built-in          | No                         | Older force-directed, slower than fcose                             |

For this project: `fcose` for force layout, `preset` for restoring saved coordinates, timeline mode uses a custom `preset`-based approach.

---

## Performance

### cy.batch()

Wraps multiple mutations in a single style recalculation + redraw. **Always use for bulk updates.**

```js
cy.batch(() => {
  cy.nodes().forEach((node) => {
    node.data("score", compute(node));
    node.addClass("updated");
  });
});
// Single redraw fires here
```

Without `cy.batch()`, each `data()` or `addClass()` call triggers a separate style recalculation.

### animate: false during layout

fcose with `animate: false` runs the full solve synchronously then snaps positions. The viewport animation (`cy.animate({ fit: ... })`) is separate and cheap. Always use `animate: false` in fcose options; animate the viewport after `layoutstop` instead.

### Avoid repeated selector queries

```js
// Bad — re-queries on every iteration
cy.nodes().forEach((n) => cy.$(`#${n.id()}`).data("x", 1));

// Good — cache the collection
const nodes = cy.nodes();
nodes.forEach((n) => n.data("x", 1));
```

### Use element IDs for direct lookup

```js
cy.getElementById("npc-001"); // O(1) hash lookup
cy.$("[id='npc-001']"); // O(n) selector scan
```

### Hide off-screen or irrelevant nodes

`display: none` removes from layout calculation entirely — reduces fcose n for better performance.
`visibility: hidden` keeps in layout but skips render. Use for fading without affecting physics.

### Defer style updates until layout is done

Style changes during a running layout are wasted work. Hook into `layoutstop`:

```js
layout.one("layoutstop", () => {
  cy.batch(() => {
    /* style updates */
  });
});
```

### numIter and quality trade-off

- `quality: "draft"` skips refinement → 30–50% faster, slightly worse overlap handling
- `numIter: 2500` vs `5000` → halves solve time; noticeable quality drop on dense graphs
- Auto-switch to draft above 500 nodes is already in `getDynamicLayoutOptions`

### Large graph tips (>500 nodes)

- Enable `samplingType: true` (default) — Barnes-Hut approximation drops O(n²) forces to O(n log n)
- Lower `numIter` to 2000
- Use `quality: "draft"`
- Consider hiding low-degree nodes by default
- `nodeDimensionsIncludeLabels: false` skips label geometry from collision — speeds up significantly but labels may overlap

### Viewport resize

Always call `cy.resize()` after container size changes before running a layout or fitting. Already done in `LayoutManager.apply()`.

---

## Overlap removal (post-layout pass)

`nodeSeparation` is a soft force — loses to high repulsion + short edges at hub nodes. `removeOverlaps` runs automatically after every fcose `layoutstop` in `LayoutManager.ts`:

```typescript
layout.one("layoutstop", () => {
  removeOverlaps(this.cy);  // 10px padding, 50 max iterations
  this.cy.animate({ fit: ... });
});
```

Algorithm: O(n²) per iteration. For each overlapping pair, push apart by exactly the gap needed. Repeats until stable or max iterations. Handles zero-distance nodes (same position) with a deterministic horizontal push. Runs in <10ms for ≤300 nodes.

To disable: remove the `removeOverlaps(this.cy)` call. To adjust padding: `removeOverlaps(this.cy, 16)` (default 10).

---

## Randomize / stable layout

- `stableLayout` — user toggle. When on, `LayoutManager` skips the fcose run entirely and just fits the viewport. Positions are preserved from last layout.
- `randomizeForced` — passed from the Redraw button. Sets fcose `randomize: true` so positions are scrambled before solving, producing a fresh layout.
- `shouldRandomize` in `LayoutManager.ts` gates this: `randomize || (isForced && randomizeForced && !stableLayout)`. StableLayout always wins.
- Saved positions are coordinates stored in entity metadata (`metadata.coordinates.x/y`). On load, nodes are placed at these positions; fcose runs with `randomize: false` so it refines from there.

---

## Debugging tips

### Inspect computed style

```js
ele.style("background-color"); // computed value for one property
ele.style(); // all computed styles (object)
ele.renderedStyle("font-size"); // style at current zoom level
```

### Check node bounding box

```js
node.boundingBox(); // { x1, y1, x2, y2, w, h } in graph coords
node.renderedBoundingBox(); // same in screen px
```

### Check positions

```js
cy.nodes().forEach((n) => console.log(n.id(), n.position()));
```

### Find overlapping nodes (manual check)

```js
const nodes = cy.nodes().toArray();
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const p1 = nodes[i].position(),
      p2 = nodes[j].position();
    const r1 = nodes[i].width() / 2,
      r2 = nodes[j].width() / 2;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (dist < r1 + r2)
      console.log("OVERLAP", nodes[i].id(), nodes[j].id(), dist, r1 + r2);
  }
}
```

### Style not applying?

1. Check cascade order — `baseStyle` < `categoryStyles` < `revealedStyles` < `selectionStyles`
2. Check selector specificity — data selectors `[attr]` beat type selectors, but order in the array wins ties
3. Check `cy.style()` is being re-applied after changes — call `cy.style(newStyleArray)` explicitly or use `ele.style(prop, val)` for targeted updates
4. Check visibility — `display: none` overrides everything

### Layout not running?

- `cy.destroyed()` returns true → container unmounted
- Check `stableLayout` flag — may be skipping the run
- Check `hasNewNodes` — only triggers re-layout if positions are at (0,0)
- `this.currentLayout.stop()` may have been called before `layoutstop` fired

---

## Common tasks

**Tune graph tighter/looser:** Edit `getDynamicLayoutOptions` in `defaults.ts`. Raise `gravity` for tighter circular pull; raise `nodeRepulsion`/`nodeSeparation` to push nodes apart.

**Change node shape for a theme:** Edit `THEMES` in `packages/schema/src/theme.ts`. `nodeShape` maps directly to Cytoscape `shape`.

**Add per-category style override:** Add to `categoryStyles` in `transformer.ts`. To override it for a specific state, add a counter-rule in `revealedStyles`.

**Add a class-based highlight:** `node.addClass("pulsing")` + a `node.pulsing` selector in the style array. Put it in `revealedStyles` or `selectionStyles` so it wins over category color.

**Make edges directional:** Add `"target-arrow-shape": "triangle"` and `"target-arrow-color"` to the edge style rule.

**Show edge labels:** Add `"label": "data(label)"` to the edge style. Use `"text-rotation": "autorotate"` to follow the edge angle.

**Freeze a node in place:** `node.lock()` / `node.unlock()`. Locked nodes are skipped by fcose positioning. (Per-node pinning is not yet in the schema — only global `stableLayout` exists.)
