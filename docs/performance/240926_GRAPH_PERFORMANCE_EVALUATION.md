# Graph Rendering Performance & CPU Load Evaluation

- **Initial investigation date:** 2026-09-24
- **Status:** Revised after code review. The cause of the reported idle CPU use is unconfirmed; profile before changing graph behavior.
- **Target repository:** Codex Cryptica (`packages/graph-engine`, `apps/web`)

## Executive summary

The original version attributed high CPU while the graph appeared idle to bezier edges, edge labels, mouse hit-testing, and FCOSE layout work. It had no performance trace to support that diagnosis. Those operations can be expensive while rendering, interacting, or laying out, but do not by themselves explain sustained CPU with no redraws, pointer movement, animation, or background work. Cytoscape does not continuously repaint an unchanged canvas merely because it is open.

Treat the original root-cause claims and action blueprint as withdrawn. Do not apply the proposed threshold, edge-event, focus-count, or FCOSE changes to address idle CPU without measurements. Several proposed changes are already shipped or would break existing behavior.

## Corrections to the original diagnosis

### The 500-node threshold is not enough to infer the active rendering mode

[`isLargeGraphSize`](../../packages/graph-engine/src/index.ts) enables large-graph behavior when **either** the node count is greater than 700 **or** the edge count is greater than 1,800. A view with 500 nodes can therefore already be in performance mode if it is dense. The [August investigation](./090826_LARGE_VAULT_PERFORMANCE_INVESTIGATION.md) recorded 2,005 edges in a 500-node view, above the edge threshold. The current focus-view cap is 2,000 edges ([`FOCUS_EDGE_CAP`](../../apps/web/src/lib/stores/graph.svelte.ts)), so use live counts and the actual mode flag to resolve any difference between that earlier measurement and a fresh run. For the recorded count, performance styling was probably already active; `500 < 700` alone does not establish a dead zone.

For a new profile, record the actual rendered node and edge counts and whether [`isLargeGraphSize`](../../packages/graph-engine/src/index.ts) / [`perfStylingActive`](../../apps/web/src/lib/stores/graph.svelte.ts) is true. Do not infer the mode from node count alone.

### Selection and focus-root decoupling has shipped

The earlier recommendation to separate selecting a node from changing the focus root was implemented in commit `3bc829008`. It is no longer an outstanding action item. The August investigation documents the original 5.7-second main-thread task and the change that addressed it: [`090826_LARGE_VAULT_PERFORMANCE_INVESTIGATION.md`](./090826_LARGE_VAULT_PERFORMANCE_INVESTIGATION.md).

### Several proposed changes are already implemented or unsafe

- **Do not disable edge events with `events: "no"`.** Edge tap and context-menu / long-press actions rely on those events in [`useGraphEvents.ts`](../../packages/graph-engine/src/events/useGraphEvents.ts). Disabling them would remove connection-editing features.
- **Do not repeat existing rendering mitigations as new work.** Device pixel ratio is capped, textures and labels are hidden during viewport movement, edge labels are zoom-gated, and the minimap limits redraws and pauses while hidden. Confirm current behavior in code before proposing changes.
- **Do not assume LOD checks or minimap redraws are hot loops.** The zoom detail-level handler changes classes only when crossing a zoom tier. The minimap already limits redraw frequency.
- **Do not reduce FCOSE iterations to address idle CPU.** FCOSE runs once per layout in a Web Worker; the 1,200-iteration tuning was chosen for layout quality and is documented in [`230426_GRAPH_LAYOUT_TUNING.md`](./230426_GRAPH_LAYOUT_TUNING.md). Layout work can affect CPU while it is running, but does not explain CPU that remains high after layout settles.
- **Do not lower `FOCUS_BASE_COUNT` from 500 to 150–200 on this evidence.** The mobile investigation deliberately raised the count from 150 to 500 for desktop vault use and suggested adapting by device instead: [`030726_GRAPH_MOBILE_PERF_INVESTIGATION.md`](./030726_GRAPH_MOBILE_PERF_INVESTIGATION.md).
- **Discard unsupported estimates.** The previous “5–10× faster” straight-line claim and “tens of millions of forces” estimate had no measurement or source and should not guide decisions.

## Idle-CPU hypotheses to test

These are candidates, not confirmed causes:

- **Persistent graph animations or compositing.** The selected-node “ARCHIVE DETAIL MODE” badge pulses in [`GraphHUD.svelte`](../../apps/web/src/lib/components/graph/GraphHUD.svelte); other graph icons may pulse or spin. Graph panels also use backdrop blur. A looping animation could keep rendering or compositing active, but the presence of an animation or blur alone does not prove it is responsible.
- **App-shell status animation.** Check the status indicators in [`DriveStatus.svelte`](../../apps/web/src/lib/components/layout/DriveStatus.svelte) and [`P2PStatus.svelte`](../../apps/web/src/lib/components/layout/P2PStatus.svelte), and whether a “syncing” state in [`VaultControls.svelte`](../../apps/web/src/lib/components/VaultControls.svelte) can remain active if loading never settles.
- **Background work.** Inspect recurring timers, P2P heartbeats, and deferred search indexing. Determine whether they run continuously and correlate with the observed CPU use.

## Measure before changing code

1. **Capture an idle trace.** Record a 10–20 second Chrome Performance trace with the vault open and the pointer stationary. Use paint flashing and frame-rendering statistics. Identify whether the main thread, animation frames, paints, compositing, timers, or workers are active.
2. **Record the graph state.** Log the rendered node and edge counts and the actual large-graph/performance-styling flags for the profiled vault. This distinguishes an assumed threshold state from the state the renderer used.
3. **Run a quick animation isolation test.** Compare CPU with the selected node deselected, then with animations disabled temporarily in DevTools (for example, `* { animation: none !important }`). Change one condition at a time and repeat the trace. This is diagnostic only, not a proposed production fix.
4. **Check the app shell and background tasks.** Confirm that loading and syncing settle; inspect recurring callbacks and P2P/search work in the trace. Attribute a fix only to activity that correlates with the measurement.
5. **Fix only the measured cause.** If a looping animation is responsible, stop or scope it appropriately and respect reduced-motion preferences. Preserve the interactions that depend on graph events and status feedback.

## Regression-test direction

Consider adding a five-second, pointer-stationary idle check to [`large-graph.spec.ts`](../../apps/web/tests/performance/large-graph.spec.ts). It could assert that there are no unexpected Cytoscape redraws or browser Long Tasks API entries during that interval. First establish what the harness can reliably observe and compare repeated baseline runs; treat the check as a regression signal, not proof of the cause or an unsupported CPU-percentage target.

## Related performance documents

| Document                                                                                               | Latest change | Scope                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------ |
| [`230426_GRAPH_LAYOUT_TUNING.md`](./230426_GRAPH_LAYOUT_TUNING.md)                                     | 23 Apr 2026   | FCOSE tuning and layout quality.                             |
| [`060426_GRAPH_PERFORMANCE_ASSESSMENT.md`](./060426_GRAPH_PERFORMANCE_ASSESSMENT.md)                   | 06 Apr 2026   | Earlier graph-engine assessment.                             |
| [`280526_PERFORMANCE_OPTIMIZATION_REPORT.md`](./280526_PERFORMANCE_OPTIMIZATION_REPORT.md)             | 28 May 2026   | Broad application performance audit.                         |
| [`030726_GRAPH_MOBILE_PERF_INVESTIGATION.md`](./030726_GRAPH_MOBILE_PERF_INVESTIGATION.md)             | 03 Jul 2026   | Mobile investigation and focus-count decision.               |
| [`090826_LARGE_VAULT_PERFORMANCE_INVESTIGATION.md`](./090826_LARGE_VAULT_PERFORMANCE_INVESTIGATION.md) | 09 Aug 2026   | Measured large-vault interactions and shipped selection fix. |
| [`100826_LARGE_VAULT_BUDGETS.md`](./100826_LARGE_VAULT_BUDGETS.md)                                     | 10 Aug 2026   | Large-vault benchmark budgets.                               |
| [`110826_GRAPH_LARGE_VAULT_PERF.md`](./110826_GRAPH_LARGE_VAULT_PERF.md)                               | 11 Aug 2026   | Large-vault graph work and performance-mode behavior.        |
| [`110826_LARGE_VAULT_TIMELINE.md`](./110826_LARGE_VAULT_TIMELINE.md)                                   | 11 Aug 2026   | Date-heavy Timeline fixture and benchmark.                   |

The filenames use the date of each document's latest substantive content change before this archive move, in `ddmmyy` format. The assessment also retains its original investigation date in its own text where available.
