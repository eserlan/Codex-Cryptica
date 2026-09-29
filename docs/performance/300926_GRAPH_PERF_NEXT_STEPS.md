# Graph Performance: Assessment of Recent Work and Next Steps

- **Date:** 2026-09-30
- **Tracking issue:** [#3569](https://github.com/eserlan/Codex-Cryptica/issues/3569)
- **Scope:** `packages/graph-engine`, `packages/vault-engine`, `packages/search-orchestrator`, `apps/web`
- **Method:** code review of the current `staging`, plus the existing measurements in this folder.
- **No fresh measurements.** An attempt to run the large-vault harness (`bun run test:performance`) timed out waiting for its own web server (its `webServer` command rebuilds the app, with a 120 s limit), so every number below is quoted from an earlier document and dated. Step 1 of the plan exists to fix this.

## What the recent work achieved

| Change                              | What it fixed                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #3386 stalls on hover, select, sync | Empty frontmatter no longer counts as a restore, so hover stopped rebuilding the focus graph (~2.5 s). Select no longer clears every node's style bypass or animates ~1,650 elements. Unchanged re-syncs emit no events. |
| #3388 thumbnails                    | The graph paints 200 px thumbnails instead of 1344x896 photos (1 to 3 s per redraw, ~3 s first paint in a 500-node view). Linked external images are copied into the vault.                                              |
| #3392 edges, weights, stable layout | Edge endpoint checks use a set; rendered weights are linear; a fast path skips layout when positions are stable.                                                                                                         |
| Search persistence coalescing       | 40 queued full-index exports (~110 s of worker time) collapse to the latest one. `activeSaves` in `search-index-persistence.ts` now waits for the running export and skips stale generations.                            |

Two documents are out of date and should be edited when the work below lands:

- `250926_VAULT_RELOAD_AND_SEARCH_BOTTLENECK_INVESTIGATION.md` still lists the persistence storm as open. It has shipped.
- `100826_LARGE_VAULT_BUDGETS.md` has ceilings taken before #3386 and #3392.

## What is still expensive

Each item says how it was verified. "Measured" means a figure from an earlier document. "Code review" means the behaviour is visible in the current source but its cost has not been measured.

### 1. Graph images are applied only after the slowest one resolves

**Evidence:** code review of `packages/graph-engine/src/sync/ImageManager.ts`, plus a measurement (11,827 ms for 198 external images, 25 Sep profile).

`sync()` starts every image resolve with one `Promise.all`, with no concurrency limit, and applies results only after all of them settle. A single slow or hanging request delays every node's picture, and hundreds of simultaneous fetches compete with each other.

**Proposal:**

- Resolve through a small pool (for example 6 at a time).
- Order the queue so nodes in the viewport go first.
- Apply each finished chunk as it arrives, inside one `cy.batch`, and call `style().update()` once per chunk.

**Expected effect:** the graph shows pictures progressively instead of after the longest fetch. Total work is unchanged, but the time to first useful paint no longer depends on the slowest host.

### 2. Images that cannot load are retried, twice, with no timeout

**Evidence:** code review of `packages/vault-engine/src/asset-manager.ts`.

For an external image that the host blocks (no CORS headers), `resolveThumbnailUrl` calls `readOrCreateExternalThumbnail`, which calls `readOrFetchExternal`, which fetches and fails. It then falls back to `resolveImageUrl`, which calls `readOrFetchExternal` again and fails again. Nothing remembers the failure, so the next graph mount repeats both attempts. There is no fetch timeout.

**Proposal:**

- Remember failures for the session, per URL, and per origin after a few CORS failures, so later images from that host fail immediately.
- Give the fetch an `AbortSignal.timeout`.
- Skip the fallback fetch when the first attempt already failed the same way.
- Optionally persist a short-lived "failed" marker beside the cached originals, so a reload does not retry either.

**Expected effect:** removes half of the failing requests immediately and most of the rest after the first failure per host. It also bounds the worst case.

### 3. Every sync compares the whole graph

**Evidence:** code review of `packages/graph-engine/src/sync/useGraphSync.ts`. Cost not measured.

`syncGraphElements` builds a set of every target id, walks `cy.elements()` to partition them, then `syncDataAndFilters` patches every element and applies filter classes to every node, and `syncRenderedWeights` runs over all of them. This is O(nodes + edges) for any change, including editing one entity. The unchanged case no longer emits events (#3386), but it still does the comparison.

A cheaper path already exists: `focusMembershipOnly` skips data patching for retained nodes.

**Proposal:** let the store pass a hint about what changed. The entity store already decides whether an edit is graph-relevant (`isGraphRelevantEntityChange`), so it knows which ids changed. Give `SyncOptions` an optional `changedIds` set. When it is present, patch only those elements and their incident edges, and recompute weights only for their endpoints. Fall back to the full path when the hint is absent, for example on first load, filter changes and mode changes.

**Expected effect:** a single-entity edit goes from a whole-graph comparison to a handful of elements. The gain grows with the size of the rendered graph, so it matters most in the full-graph view of a large vault.

### 4. Elements are rebuilt from every entity on every structural change

**Evidence:** code review of `graph.elements` in `apps/web/src/lib/stores/graph.svelte.ts`. Cost not measured; a `graph_focus_compute` span already exists to measure it.

Each recompute loops over all vault entities to build the visible list, id set and lookup map, then regenerates element objects for the rendered set. `fillFocusRenderIds` sorts every candidate by degree whenever the connected neighbourhood is smaller than the target, which is O(n log n) over the vault.

**Proposal, in order of cheapness:**

- Cache each entity's element objects, keyed by the entity object identity and the inputs the transformer reads. Unchanged entities return the same objects.
- Cache the degree table used for filler selection and update it from the same patches that maintain `inboundConnections`.
- Only then consider incremental visibility filtering.

Do this after item 3, and only if the `graph_focus_compute` span shows it matters. The existing `graph_focus_depth_change` figure (1,170 ms median, Aug 2026) was dominated by Cytoscape reconciliation, which items 1 to 3 do not change, so re-measure before investing here.

### 5. Cache preload runs twice

**Evidence:** code review of `apps/web/src/lib/services/cache.svelte.ts`, plus measurement (309.6 ms then 1,281.3 ms, 25 Sep profile).

`preloadVault` has no in-flight tracking. The second call, during background reconciliation, reads all graph records from IndexedDB again. It does not block the UI, but it is wasted work on the critical path of a busy startup.

**Proposal:** keep a per-vault in-flight promise and return it to concurrent callers. Invalidate it on vault switch, as the cache already is.

### 6. Every search index save exports the whole index

**Evidence:** measurement (`exportIndexCompressed` 2.7 to 4.8 s at 1,625 entities; `search_index_batch` 2.8 to 5.0 s, Aug 2026) and code review of `search-index-persistence.ts`.

Coalescing means only the latest export runs, but each one still serialises and compresses all six index segments in the search worker, and blocks searches while it does.

**Proposal:**

- Persist per segment and rewrite only segments that changed.
- Do not start an export while background sync chunks are still streaming in. The 25 Sep doc lists this as "chunk batch awareness"; I did not verify whether it shipped.

This is the largest remaining single cost in the recorded data, but it is off the main thread and affects search latency after load, not graph interaction. Weigh it accordingly.

## What not to do

These were considered and should stay rejected. The reasons are recorded in existing documents.

- **WebGL rendering.** Prototyped in #3168 (branch `3168-cytoscape-webgl-spike`): 11 to 69 times slower frames and a 1,600-node graph that never became ready, on software GL. Revisit only with hardware-GPU numbers and a stabilised upstream renderer. The environment caveat in the report applies.
- **Lowering `FOCUS_BASE_COUNT` to 150 to 200.** Deliberately raised to 500 for desktop; adapt by device instead (`030726_GRAPH_MOBILE_PERF_INVESTIGATION.md`).
- **Disabling edge events (`events: "no"`).** Edge tap and context menu actions depend on them (`240926_GRAPH_PERFORMANCE_EVALUATION.md`).
- **Reducing FCOSE iterations to cut idle CPU.** Layout runs once in a worker and does not explain idle CPU (`240926_GRAPH_PERFORMANCE_EVALUATION.md`).
- **Acting on the idle-CPU report without a trace.** Its cause is still unconfirmed.

## Plan

1. **Re-baseline.** Make the harness runnable without rebuilding: set `PERFORMANCE_EXTERNAL_SERVER` and start `vite preview` separately, or raise the `webServer.timeout`. Record five runs on the current `staging` for the scenarios in `100826_LARGE_VAULT_BUDGETS.md`, and add a stationary five-second idle check to `large-graph.spec.ts`, as `240926` suggested.
2. **Images (items 1 and 2).** Highest value for the least risk; both are local to two files and testable without a browser.
3. **Changed-id sync (item 3).** Re-measure the graph scenarios after step 2 to confirm it is still worth doing.
4. **Preload dedupe (item 5).** Small and independent; can go alongside any step.
5. **Element caching (item 4) and incremental search persistence (item 6).** Only if the fresh baseline shows them.
6. **Update the budget ceilings** to the new numbers, in report-only mode, and correct the two stale documents.

Each step ships as its own PR with a before and after number from the same harness.
