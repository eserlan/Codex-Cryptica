# Large Vault Performance Investigation

**Date:** 2026-08-09  
**Status:** Investigation complete; no application changes implemented  
**Test scale:** 1,600 entities and 9,000 directed connections

## Executive Summary

The application can handle 1,600 entities, but several normal interactions
become whole-subgraph, whole-list, or repeated whole-vault operations at that
scale. The entity count is therefore an amplifier rather than the root cause.

The strongest confirmed bottleneck is graph focus behavior. Selecting a node
changes the focus root, recomputes a 500-entity neighborhood, and reconciles a
large new Cytoscape element set. In one measured selection, 365 of 500 nodes
and 1,726 edges were replaced. The interaction took 6.1 seconds, including a
5.7-second main-thread task.

The next largest confirmed costs are unbounded DOM rendering in Entity
Explorer and Entity Table, followed by cold-load amplification where every
sync chunk sends the entire accumulated vault to search and secondary-index
rebuilds.

The recommended first changes are:

1. Decouple graph selection from the focus root.
2. Make focus expansion explicit, adaptive, or progressive.
3. Virtualize or paginate Explorer and Table.
4. Send only changed entities through cold-sync chunk events.
5. Make warm startup genuinely metadata-first.

## Scope and Method

This investigation combined:

- Static analysis of graph, vault, cache, search, Explorer, Table, Timeline,
  and persistence paths.
- Existing large-vault documentation and performance tests.
- Playwright-driven runtime measurements in Chromium.
- Long Animation Frame and Long Task observation.
- A representative synthetic vault with 1,600 entities, 9,000 connections,
  short content fields, and the same scale used by the existing graph
  performance fixture.
- Svelte 5 component analysis for the primary rendering surfaces.

The measurements were taken in a local development build on one desktop
machine. Absolute timings are not release-build service-level objectives.
They are directional evidence used to distinguish dominant costs from minor
ones. A trace from a private copy of the real vault is still needed to measure
the effects of its content size, images, hierarchy, dated entities, and graph
topology.

## Runtime Measurements

| Scenario                                                |                     Observed result |
| ------------------------------------------------------- | ----------------------------------: |
| Steady interaction in the default 500-node focus view   |  22.9 ms average frame, 38.5 ms p90 |
| Steady interaction with all 1,600 nodes and 9,000 edges | 67.5 ms average frame, 203.4 ms p90 |
| Select another node already visible in focus view       |              6.1 seconds end-to-end |
| Longest task during that selection                      |                         5.7 seconds |
| Expand focus view from 500 to 1,000 nodes               |                        14.2 seconds |
| Shrink focus view from 1,000 to 500 nodes               |                         5.7 seconds |
| Cross a graph visual-detail zoom threshold              |                      80–90 ms frame |
| Open Entity Explorer                                    |                              433 ms |
| Entity Explorer DOM size                                |          Approximately 21,100 nodes |
| Clear an Entity Explorer search                         |                              584 ms |
| Render or restore the full Entity Table                 |           Approximately 1.4 seconds |
| Entity Table DOM size                                   |          Approximately 27,600 nodes |
| Clear an Entity Table search                            |                        1.43 seconds |

The existing full-graph performance test still passes these measured graph
results because its limits are intentionally broad: 200 ms average, 350 ms
p90, and 1,500 ms maximum. It also warms every visual-detail tier before
measurement, excluding a real first-crossing interaction cost.

## Confirmed Findings

### 1. Selection Rebuilds the Focus Neighborhood

Large graphs default to a focus view. The focus target starts at 500 entities
and doubles at each detail level:

```text
Level 1: 500
Level 2: 1,000
Level 3: 1,600 (the full test vault)
```

The selected entity is also the focus root. A click therefore does more than
highlight a node and open its details:

1. The selected entity changes.
2. The graph derives a new breadth-first neighborhood around it.
3. The transformed graph element array changes.
4. Cytoscape reconciles removed, retained, and added elements.
5. Layout, filtering, styling, neighborhood dimming, and rendering follow.

In the measured selection:

| Element type | Before | Retained | Replaced |
| ------------ | -----: | -------: | -------: |
| Nodes        |    500 |      135 |      365 |
| Edges        |  2,005 |      279 |    1,726 |

The current code also adds costs around this operation:

- A deliberate 300 ms single-click delay to distinguish double-clicks.
- Neighborhood classes applied across all rendered elements.
- Animation and style overrides cleared across all rendered nodes.
- An 800 ms centering animation.

Applying the neighborhood classes alone measured approximately 220 ms, but
the multi-second stall is dominated by focus-set replacement and Cytoscape
reconciliation.

Relevant code:

- [`apps/web/src/lib/stores/graph.svelte.ts`](../../apps/web/src/lib/stores/graph.svelte.ts)
- [`apps/web/src/lib/components/graph/graph-view-controller.svelte.ts`](../../apps/web/src/lib/components/graph/graph-view-controller.svelte.ts)
- [`packages/graph-engine/src/sync/useGraphSync.ts`](../../packages/graph-engine/src/sync/useGraphSync.ts)

### 2. Automatic Focus Expansion Is Too Coarse

The zoom ratchet changes detail after a 1.8x zoom difference. At the tested
scale, one step adds 500 nodes and thousands of edges. Graph derivation reached
the 1,000-node target in roughly 200 ms, while the Cytoscape element set did
not finish reconciling until roughly 14.2 seconds. The dominant cost is thus
renderer synchronization, not choosing the neighborhood.

The reconciliation implementation has separate remove, add-node, add-edge,
and data/filter passes. Only the final data/filter pass is inside a Cytoscape
batch. A focus-only membership change also rechecks retained element data and
filters.

### 3. Full-Graph Steady-State Interaction Is Not Smooth

The default focus view is materially better than the full graph, confirming
that culling is useful. The full graph measured approximately 15 frames per
second on average, with the slowest ten percent of frames near five frames per
second.

Visual performance styling, hidden edges during viewport movement, worker
layout, and focus culling have prevented catastrophic failure. They do not make
the full graph a consistently smooth interaction surface at this density.

### 4. Explorer Instantiates Every Entity

Entity Explorer performs scale-sensitive filtering, sorting, grouping, and
tree construction, then instantiates every matching `EntityListItem`.

Each list item uses `content-visibility: auto`. This skips some offscreen
layout and paint, but it does not prevent Svelte component creation or DOM
instantiation. Opening Explorer produced approximately 21,100 DOM nodes.

Opening, closing, and reopening the sidebar destroys and recreates those
components. The reopen measurement was approximately 396 ms, so preloading the
component module does not solve the rendering cost.

Filtering, counting, and sorting 1,600 synthetic records averaged roughly 15
ms in isolation. The several-hundred-millisecond interaction is therefore
primarily DOM/component work rather than the sort implementation.

Explorer text search also lowercases and scans entity content on the main
thread for each query update instead of delegating to the existing search
worker.

Relevant code:

- [`apps/web/src/lib/components/explorer/EntityList.svelte`](../../apps/web/src/lib/components/explorer/EntityList.svelte)
- [`apps/web/src/lib/components/explorer/EntityListItem.svelte`](../../apps/web/src/lib/components/explorer/EntityListItem.svelte)
- [`apps/web/src/lib/components/layout/SidebarPanelHost.svelte`](../../apps/web/src/lib/components/layout/SidebarPanelHost.svelte)

### 5. Entity Table Instantiates Every Row and Cell

Entity Table renders all 1,600 rows, with selection controls, links, type
buttons, connection counts, summaries, labels, and dates. It has neither
virtualization nor pagination and produced approximately 27,600 DOM nodes.

Restoring all rows after clearing a narrow search took roughly 1.43 seconds.
The Table is therefore likely to feel slow when opening, clearing filters,
changing sort order, or applying updates that invalidate row props.

Relevant code:

- [`apps/web/src/routes/(app)/table/+page.svelte`](<../../apps/web/src/routes/(app)/table/+page.svelte>)
- [`apps/web/src/lib/components/table/EntityTable.svelte`](../../apps/web/src/lib/components/table/EntityTable.svelte)
- [`apps/web/src/lib/components/table/EntityTableRow.svelte`](../../apps/web/src/lib/components/table/EntityTableRow.svelte)

### 6. Cold Sync Reprocesses the Accumulated Vault

Vault files are loaded in chunks of 40. After every chunk, the sync event
contains the entire accumulated repository map when the chunk contains a
change. Search normalizes and indexes the supplied entities, while EntityStore
rebuilds inbound connections and secondary indexes.

For a fully cold 1,600-entity vault, the search payload grows like this:

```text
40 + 80 + 120 + ... + 1,600 = 32,800 entity records
```

That is 20.5 times the necessary 1,600 records. Secondary indexes and inbound
connections are also rebuilt 40 times over an increasingly large vault.

There is additionally a fixed 50 ms yield after each chunk. Forty chunks impose
approximately two seconds of waiting before file and cache work is considered.

This path explains intermittent behavior: a warm cache skips most OPFS parsing,
while cold loads, imports, cache invalidation, or external changes trigger the
amplified path.

Relevant code:

- [`packages/vault-engine/src/repository.svelte.ts`](../../packages/vault-engine/src/repository.svelte.ts)
- [`apps/web/src/lib/stores/vault/sync-store.svelte.ts`](../../apps/web/src/lib/stores/vault/sync-store.svelte.ts)
- [`apps/web/src/lib/stores/vault/entity-store.svelte.ts`](../../apps/web/src/lib/stores/vault/entity-store.svelte.ts)
- [`packages/search-orchestrator/src/search-index-lifecycle.ts`](../../packages/search-orchestrator/src/search-index-lifecycle.ts)

### 7. Warm Cache Preload Reads All Lore

`CacheService.preloadVault()` retrieves every matching `entityContent` record
with `toArray()`. Those records contain both `content` and `lore`. The method
discards lore while building the in-memory entity map, but IndexedDB has already
read and deserialized it.

Consequences for a text-heavy vault include:

- Startup cost proportional to total content and lore size, not just entity
  count.
- A higher temporary memory peak.
- Potential garbage-collection pauses after lore strings are discarded.
- Retention of all content in the preload map even when most entities are not
  open or visible.

Relevant code:

- [`apps/web/src/lib/services/cache.svelte.ts`](../../apps/web/src/lib/services/cache.svelte.ts)
- [`apps/web/src/lib/utils/entity-db.ts`](../../apps/web/src/lib/utils/entity-db.ts)

## Secondary and Conditional Contributors

### Search Persistence

Routine global search is largely worker-based, but index export crosses back to
the main thread. Persisting the index performs data decoding, `JSON.stringify`,
compression stream setup, and IndexedDB storage. A large content index can
therefore create intermittent background tasks.

The background content sweep also loads all graph metadata and starts its first
batch before the idle-yield path used by later batches.

### Per-Entity Mutation Cost

An entity update copies the entity record, then index maintenance scans keys in
the old and new maps to identify the changed record. It also finds and copies
derived arrays. O(N) work at 1,600 records is not the largest measured cost, but
it compounds with large mounted DOM surfaces and rapid editing.

### Save Latency and Bulk Actions

Entity persistence has a 400 ms per-entity debounce. UI flows that await a save
will display at least that delay even when storage is fast. Table bulk type
changes await `updateEntity` serially, so 100 selected entities have a
theoretical 40-second debounce floor before storage overhead. Bulk deletion is
also serial.

### Conflict Scanning

`checkForConflicts()` recursively walks the active OPFS directory in the
`finally` block of vault loading, including after a warm-cache early return.
The work is asynchronous but still scales with vault file count and delays the
completion of the load operation.

### Timeline and Agenda

Timeline, agenda, and horizontal timeline views render every matching dated
entity without virtualization. This is conditional on how many of the 1,600
entities contain dates.

### Covered Graph Work

The graph can remain mounted when Entity Explorer or an entity workspace covers
it. Maintaining Cytoscape rendering, observers, animations, or background work
under another full interface adds contention and memory pressure.

## Recommended Solution Order

### Priority 0: Decouple Selection from Graph Focus

Introduce a separate `focusRootId` or equivalent stable focus state.

```text
selectedEntityId != focusRootId
```

Selecting a node that is already rendered should only:

- Update selection state.
- Apply the necessary highlight delta.
- Open entity details.
- Center the camera if desired.

The focus root should change only when:

- The user explicitly chooses a Focus Neighborhood action.
- Search navigates to an entity outside the current rendered set.
- The user intentionally navigates to another graph region.

This preserves the current overview while removing the largest measured click
stall.

Required regression tests should verify that:

- Selecting a rendered node does not change the Cytoscape node or edge set.
- Selecting an entity outside the rendered set follows the chosen explicit
  navigation policy.
- Clearing selection does not rebuild the focus set.

### Priority 0: Make Focus Expansion Bounded

Potential approaches can be combined:

| Option                                          | Benefit                                   | Trade-off                                           |
| ----------------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Lower the base from 500 to 150–250              | Small, low-risk reduction in default work | Less complete initial overview                      |
| Adapt the base to viewport/device               | Better experience on slower hardware      | More behavior variants to test                      |
| Replace automatic zoom expansion with Show More | Fully predictable cost                    | Extra explicit user action                          |
| Progressively add elements across frames        | Maintains input responsiveness            | Longer total transition and temporary partial graph |
| Cap rendered edges per node                     | Large renderer reduction in dense graphs  | Must communicate omitted connections                |
| Cluster or aggregate nodes                      | Best long-term scaling                    | Significant product and interaction design work     |

The preferred initial approach is stable selection plus explicit or progressive
expansion.

### Priority 0: Optimize Cytoscape Membership Sync

Investigate and benchmark:

- One outer Cytoscape batch covering removal, node addition, edge addition,
  data patching, and filtering.
- A focus-membership-only path that does not repatch unchanged retained data.
- Precomputed element lookup maps and direct membership deltas.
- Stopping or suppressing renderer/layout work until a membership batch ends.
- Tracking the previously focused collection so highlight cleanup touches only
  affected elements.

Each phase should receive a performance mark so improvements can be attributed
to reconciliation, data patching, layout, or rendering rather than a single
aggregate Svelte effect.

### Priority 0: Bound Explorer and Table Rendering

#### Virtualization

Render only visible rows plus overscan. This gives the best continuous-scroll
experience and keeps DOM size approximately constant.

- Table is a good fixed-height virtualization candidate.
- Explorer requires a flattened hierarchy and measured or estimated row
  heights because rows can wrap and include group headers.
- Accessibility semantics, focus retention, keyboard navigation, and scroll-to-
  entity behavior need dedicated tests.

#### Pagination

Render 100–200 records per page with explicit navigation and totals.

- Simpler implementation and predictable accessibility.
- Particularly suitable for the semantic Entity Table.
- Less fluid for browsing a long continuous Explorer tree.

#### Progressive Mounting

Render the first group of records immediately and append additional groups
between frames.

- Lower implementation cost than full virtualization.
- Does not solve final DOM size or ongoing update cost.

`content-visibility` can remain as a supplementary optimization but is not an
alternative to bounding component and DOM creation.

### Priority 0: Fix Cold-Sync Amplification

- Send only `newOrChanged` entities to search.
- Keep progress metadata separate from entity data.
- Update secondary indexes and inbound connections incrementally, or rebuild
  once on sync completion.
- Replace fixed sleeps with time-budgeted yielding based on elapsed work or
  pending user input.
- Add a cold-load test asserting that 1,600 changed entities result in roughly
  1,600 search-index inputs, not 32,800.

### Priority 1: Make Startup Metadata-First

Options include:

1. Load only graph metadata initially and hydrate content for visible or open
   entities.
2. Split content and lore into separate IndexedDB stores so a content scan
   cannot deserialize lore.
3. Persist a lightweight summary/search-preview field with metadata.
4. Read content in idle-time pages rather than a single full `toArray()`.
5. Release the preload map after it seeds the repository.
6. Delegate Explorer and Table content queries to the existing search worker.

A split content/lore store gives the cleanest data boundary but requires an
IndexedDB migration. Metadata plus preview is a smaller intermediate change.

### Priority 1: Improve Mutation and Bulk APIs

- Pass explicit `{ id, oldEntity, newEntity, patch }` deltas to index
  maintenance instead of diffing two full maps.
- Maintain entity ID-to-position indexes for derived arrays.
- Add batch type-change and batch-delete operations.
- Flush immediately for an explicit Save action, while retaining debounce for
  continuous editing.
- Consider raw immutable state for large snapshots only after direct nested
  mutations are replaced with explicit APIs.

### Priority 1: Move Background Serialization Off the Main Thread

- Serialize and compress the search index in the search worker.
- Return a transferable `ArrayBuffer` rather than a large object graph.
- Schedule persistence only during idle periods and pause it when user input is
  pending.
- Yield before the first content-index batch as well as subsequent batches.

### Priority 1: Pause Covered Rendering

When a workspace or route fully covers the graph:

- Pause animations and viewport observers.
- Suspend minimap redraws.
- Prevent layout work until the graph becomes visible.
- Compare preserving the Cytoscape instance with destroying/recreating it;
  preserving state avoids reload cost, while destruction releases more memory.

## Larger Architectural Alternatives

These should remain available if the prioritized changes do not meet the
performance target.

### Semantic Graph Clustering

Render clusters, categories, locations, or communities as aggregate nodes and
expand them on demand. This keeps the visible graph below a stable element
budget regardless of vault size.

### WebGL Graph Renderer

Evaluate a WebGL-first renderer for high-density graphs. This may improve pan,
zoom, and edge throughput, but requires porting layout integration, themes,
selection, editing, accessibility alternatives, image handling, and test
infrastructure. It should not precede fixing selection-driven element churn.

### Worker-Owned Entity Indexes

Move normalized metadata, adjacency, label counts, and search-ready fields to a
worker-owned index. The UI would subscribe to targeted projections instead of
holding and diffing the whole vault reactively.

### Local Vault Manifest

Maintain a local manifest of paths, timestamps, and checksums to reduce repeated
directory walks and parsing. Periodic reconciliation can preserve Markdown
portability and local-first behavior.

### Optional Remote Services

Remote search or graph processing could reduce local work, but it conflicts
with privacy and offline-first principles unless it is explicit opt-in. The
measured bottlenecks can be addressed locally, so remote processing is not
currently justified.

### WASM Parsing or Layout

WASM may help specialized parsing or algorithms, but current measurements show
DOM creation and Cytoscape reconciliation dominating. It is a low-priority
option until those paths are bounded.

## What Not to Prioritize First

- Replacing Svelte. Runtime attribution to Svelte means application work ran
  inside an effect; it does not show that Svelte itself is the root cause.
- Further micro-optimizing the 15 ms Explorer sort while hundreds of
  milliseconds are spent creating DOM.
- Adding more debounce, which delays feedback rather than removing work.
- Keeping the full Explorer permanently mounted, which trades repeat mount cost
  for persistent 21,000-node DOM and higher update cost.
- Relying on `content-visibility` alone.
- Merely increasing graph thresholds or loosening performance-test limits.

## Instrumentation and Acceptance Plan

Add privacy-safe performance events that contain counts and timings but never
entity titles, content, lore, labels, or file paths.

Suggested operations:

- `vault_open_warm`
- `vault_open_cold`
- `vault_sync_chunk`
- `search_index_batch`
- `search_index_persist`
- `graph_focus_compute`
- `graph_sync_reconcile`
- `graph_sync_add`
- `graph_sync_patch`
- `graph_select`
- `graph_focus_depth_change`
- `explorer_open`
- `explorer_filter`
- `table_open`
- `table_filter`
- `entity_save`

Suggested dimensions:

- Entity count.
- Rendered node and edge count.
- Changed node and edge count.
- Result-row count.
- DOM-node count for development diagnostics.
- Warm/cold cache state.
- Operation duration and longest task.

Recommended scenario tests:

1. Warm vault open.
2. Cold vault open in an isolated browser profile.
3. Ten successive graph node selections.
4. Zoom across every focus and visual-detail threshold without warming them
   away.
5. Open, search, clear, close, and reopen Explorer.
6. Open, sort, search, and clear Table.
7. Edit and explicitly save one entity.
8. Batch-change 100 entities.
9. Open Timeline and Agenda when most entities are dated.

Initial targets should emphasize responsiveness:

- No avoidable main-thread task above 50 ms.
- Visible feedback within 100 ms of input.
- Graph node selection without element-set replacement when the node is already
  rendered.
- Default graph interaction at or above a stable 30 frames per second on the
  project test machine.
- Explorer and Table DOM size bounded independently of total entity count.
- Cold search indexing proportional to changed entity count.

The exact release budgets should be set after measuring a production build on
the target desktop and mobile device classes.

## Proposed Implementation Sequence

1. Add phase-level graph and vault timing instrumentation.
2. Decouple graph selection from the focus root and add regression tests.
3. Add a membership-only batched graph sync path.
4. Make focus expansion explicit or progressive.
5. Fix cumulative cold-sync payloads and repeated index rebuilds.
6. Introduce Table pagination or virtualization.
7. Introduce Explorer virtualization or a progressive flattened tree.
8. Make cache startup metadata-first and separate lore from bulk reads.
9. Move search serialization and compression to the worker.
10. Profile the production build against a private copy of the real vault and
    revise thresholds from field evidence.

## Conclusion

A 1,600-entity vault is a reasonable target for a local-first browser
application. The current performance problem does not require abandoning that
architecture. The largest costs come from unbounded rendering and accidental
large-scale work attached to ordinary interactions.

Decoupling graph selection from focus navigation should remove the most severe
observed stall. Bounding DOM creation, correcting cold-sync payloads, and making
startup metadata-first should then address the remaining broad large-vault
costs. More radical renderer or storage changes should be considered only after
those corrections are measured in a production build.
