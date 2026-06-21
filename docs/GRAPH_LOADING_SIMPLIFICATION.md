# Graph Loading — Deep Analysis & Simplification Plan

_Status: analysis / proposal. No behavior changes implied by this document — it is a map of the current pipeline and a phased plan to simplify it._

## 1. Scope & method

This traces what happens between "user opens a vault" and "the graph is laid out and visible," across:

| Layer                       | File                                                                            |
| --------------------------- | ------------------------------------------------------------------------------- |
| Reactive data source        | `apps/web/src/lib/stores/graph.svelte.ts` (`elements` derived)                  |
| Entity → cytoscape elements | `packages/graph-engine/src/transformer.ts`                                      |
| Svelte component / effects  | `apps/web/src/lib/components/GraphView.svelte` (601 LOC, **14 `$effect`s**)     |
| Imperative owner            | `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts` (540 LOC)   |
| Element diff/sync           | `packages/graph-engine/src/sync/useGraphSync.ts` (`syncGraphElements`, 317 LOC) |
| Layout solving              | `packages/graph-engine/src/LayoutManager.ts` (664 LOC)                          |
| Vault load lifecycle        | `apps/web/src/lib/stores/vault/lifecycle.ts`, `vault.svelte.ts`                 |

~2,800 LOC across the hot path.

---

## 2. The pipeline today

### 2.1 Sequence (cold load / refresh)

```
onMount (GraphView)
 ├─ graph.init()                      load persisted prefs (labels, stableLayout…)
 └─ controller.init(container)        async: dynamic-import cytoscape+fcose, create cy
                                      → graphVisible = true (#1)

vault loads (lifecycle)              status: loading → idle; allEntities populated
        │
        ▼ (reactive)
graph.elements ($derived)            entities → elements via GraphTransformer
                                      unplaced nodes get phyllotaxis spiral seed
                                      + isPendingLayout (opacity:0)
        │
        ▼ (effect: Element Sync)
controller.syncElements → syncGraphElements(cy, …)
   ├─ add/remove/patch cy elements, apply filters, recompute weights
   ├─ if FIRST elements:  onFirstElements() → initialLoaded=true, graphVisible=true (#2,#3)
   │                      + cy.viewport(zoom 0.15, pan w/2,h/2)   ← throwaway framing
   └─ else if !loading:   onLayoutUpdate(false,…, "Elements Update")

        ▼ (effect: Load Finalization)
controller.handleVaultLoadFinalization()
   when status===idle && initialLoaded && !didFinalizeLoad:
     didFinalizeLoad = true
     await waitForStableContainer()   ← (recent fix #1458) gate on stable dims
     applyCurrentLayout(isInitial=true, isForced=true, "Load Finalized")
        │
        ▼
LayoutManager.apply(options, isInitial, isForced, caller, randomizeForced, hasNewNodes)
   → guest? cy.fit            (demo is NOT guest — see §2.3)
   → timeline? orbit? force?
   → force: fit-only OR worker-solve → animateFitAndStop
   → onLayoutStop → graphVisible=true (#4), _layoutReady=true
```

### 2.2 The load "state machine" is implicit

Three booleans on the controller encode load progress, written from five places:

- `initialLoaded` — set in `onFirstElements` (sync), reset in `handleVaultLoading`.
- `didFinalizeLoad` — set in `handleVaultLoadFinalization`, reset in `handleVaultLoading`.
- `_layoutReady` — set in `onLayoutStop` (initial only), read to gate position persistence.

They are never defined together; the legal transitions live in the reader's head. `GraphView.svelte:221-227` re-runs finalization by `void`-touching all three plus `vault.status` and `controller.cy`.

`graphVisible` (the container opacity gate) is written **4 times** (`controller:195, 335, 404, 425`) from unrelated code paths — init, layout-stop, search-focus effect, and the sync tail — all meaning "we have something to show."

### 2.3 The layout decision tree

`LayoutManager.apply()` takes **6 positional args** (`options, isInitial, isForced, caller, randomizeForced, hasNewNodes`); `options` itself has ~12 fields. `applyCurrentLayout` adds `hasRemovedNodes`. Behavior is then re-derived inside `applyForceLayout` from a **stringly-typed `caller`**:

```
caller ∈ { "Load Finalized", "Elements Update", "Window Resize",
           "Mode Change Effect", "Timeline Toggle", "UI Redraw Button",
           "Keyboard Shortcut (T)", "unknown" }
```

Inside `applyForceLayout` (`LayoutManager.ts:423-648`) these strings drive logic:

- `isExitingTimeline = caller === "Timeline Toggle" && !timelineMode`
- `isExitingMode = caller === "Mode Change Effect" && …`
- `isManualRedraw = caller === "UI Redraw Button" && isForced`
- `manualRedrawRandomize = caller === "UI Redraw Button" && isForced && randomizeForced`

…plus **two independent "nodes aren't really placed" checks**:

- `nodesAtOrigin === count` (all at 0,0)
- `pendingCount === count` (all `.pending-layout`, added in the #1458 demo fix)

`resolveViewportPolicy` (`controller.ts:283-295`) separately re-derives `"preserve" | "fit"` from `(isInitial, caller, randomizeForced, hasNewNodes, hasRemovedNodes)` — partially duplicating the same intent the caller string already encodes.

---

## 3. Essential vs accidental complexity

**Essential (keep):**

- Reactive transform of vault entities → elements.
- **Incremental** diff into cy (don't rebuild) to preserve positions & perf.
- Async **worker** force-solve for unplaced nodes; preserve coords for placed nodes (`stableLayout`).
- Camera policy: fit on structural change, preserve on safe churn.
- Modes: timeline, orbit.
- Position persistence back to the vault.

**Accidental (targets):**

| #   | Smell                                                                                              | Evidence                                                  |
| --- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| A   | Load progress = 3 scattered booleans + a 4th implicit `isFirstElements`                            | `controller` 56-58, 403, 511-527; `useGraphSync` 288      |
| B   | Behavior driven by stringly-typed `caller` + 5 boolean flags re-parsed downstream                  | `LayoutManager.apply` 298-305; `applyForceLayout` 433-452 |
| C   | Two separate "unplaced" predicates                                                                 | `LayoutManager.ts` 441-455                                |
| D   | `graphVisible` written from 4 unrelated sites                                                      | `controller` 195, 335, 404, 425                           |
| E   | Throwaway `zoom 0.15` viewport always overwritten by finalize                                      | `useGraphSync` 295-297                                    |
| F   | `applyForceLayout` mixes fit-only + solve in one ~220-line method; position-persistence duplicated | `LayoutManager` 454-524 vs 632-647                        |
| G   | `syncGraphElements` is one 230-line function (diff + patch + filter + weights + layout trigger)    | `useGraphSync` 75-317                                     |
| H   | 14 thin `$effect`s in the component wire reactivity the controller could own                       | `GraphView.svelte`                                        |

---

## 4. Simplification proposals (ordered by leverage ÷ risk)

### P1 — One explicit load state machine _(high leverage, low risk)_

Replace `initialLoaded` / `didFinalizeLoad` / `_layoutReady` / `isFirstElements` with a single owned enum on the controller:

```ts
type LoadPhase =
  | "idle" // no cy / no data
  | "awaitingFirst" // cy ready, waiting for first elements
  | "awaitingFinal" // first elements in, waiting for vault idle + stable container
  | "ready"; // initial layout done; normal incremental updates
```

- Transitions live in **one** `reconcile()` method driven by `(cy?, vault.status, hasElements, containerStable)`.
- `graphVisible` and the position-persistence gate become `$derived` from `phase` (kills smell D and the `_layoutReady` read).
- `handleVaultLoading` / `handleVaultLoadFinalization` / the `onFirstElements` callback collapse into phase transitions.

**Risk:** low — pure refactor of existing flags. **Tests:** the controller already has finalization tests; extend with explicit phase assertions.

### P2 — Replace `caller` string + boolean soup with a typed `LayoutRequest` _(high leverage, medium risk)_

Compute intent **at the call site** instead of re-deriving from a string downstream:

```ts
interface LayoutRequest {
  reason: "initial" | "elementsChanged" | "resize" | "modeChange" | "redraw";
  reseed: boolean; // was: randomize / randomizeForced / clump magic
  viewport: "fit" | "preserve"; // was: resolveViewportPolicy()
  // structural hints kept only if a downstream decision truly needs them
}
```

`apply(request, options)` becomes a 2-arg method. `applyForceLayout`'s `isExiting*`, `isManualRedraw`, `manualRedrawRandomize` branches disappear — the caller already said `reseed: true`. `resolveViewportPolicy` moves to the ~5 call sites that know their own intent (mostly 1-liners) or a small pure helper.

**Risk:** medium — touches every layout call site (controller, sync, toolbar, keyboard). Mechanical but broad. Do **after** P1. **Tests:** `LayoutManager.test.ts` already asserts on `capturedPostMessage.options.randomize` and viewport policy — adapt those to the new request shape; they pin the behavior.

### P3 — Collapse the two "unplaced" checks into one signal _(medium leverage, low risk)_

The transformer already knows which nodes are unplaced — it sets `isPendingLayout`. Make that the single source of truth:

```ts
const needsSolve =
  isInitial &&
  cyNodes.length > 1 &&
  cy.nodes(".pending-layout").length === cyNodes.length;
```

Drop the `nodesAtOrigin === count` scan (origin is just one way to be unplaced; spiral-seeded nodes proved it incomplete — the #1458 demo bug). Keep a cheap origin guard only if a non-pending all-at-origin path still exists (verify; likely vestigial).

**Risk:** low. **Tests:** the two LayoutManager tests added in #1458 already cover "all unplaced → solve" and "placed → fit-only."

### P4 — Split `applyForceLayout`; dedupe persistence _(medium leverage, low risk)_

Two private methods — `fitOnly(options)` and `solveAndFit(request, options)` — and one `persistPositions(nodes)` helper used by both (currently duplicated at 498-513 and 632-647). Halves the method length and makes the fit-only vs solve fork obvious.

**Risk:** low — internal extraction. **Tests:** existing LayoutManager suite (30 tests) covers both paths.

### P5 — Remove the throwaway `0.15` viewport _(low leverage, low risk)_

With the #1458 stable-container gate, the initial fit is correct and prompt; the placeholder framing at `useGraphSync.ts:295-297` mostly flashes a wrong zoom on placed-coordinate loads. Either delete it, or replace with a one-line "fit current nodes, no animation" so the first paint is already correct. **Verify** nothing else depends on that early viewport.

### P6 — Decompose `syncGraphElements` _(medium leverage, medium risk)_

Extract at minimum the **layout-trigger decision** (the `isFirstElements / hasNewNodes / hasDeletions` block, 288-313) into a pure function returning a `LayoutRequest | null`. Optionally split add/remove, data-patch, and filter passes. This is the function most likely to hide future bugs because it does five things in one `try`.

**Risk:** medium — it's on every data change; the diff logic is subtle (temporal equality, pending-layout preservation). Has a test (`useGraphSync.ts.test.ts`) but that file has pre-existing type looseness. Tighten tests first, then split.

### P7 — Move load orchestration out of the component _(high leverage, higher risk)_

After P1, several of GraphView's 14 effects (mode change, vault loading, finalization, element sync) are thin forwarders. Collapse them into a single `controller.reconcile({ status, elementsVersion, cy, containerStable })` the component calls from **one** effect. The component shrinks toward "render + forward inputs"; the controller owns the state machine end-to-end. Leave the genuinely view-specific effects (search focus, find-node centering, fit request, style sync) as-is.

**Risk:** higher — effect consolidation can change reactive timing. Do last, with the e2e graph suite (the `✅ Fix graph *` specs) as the safety net.

---

## 5. Recommended phasing

| Phase | Proposals   | Outcome                                                                           | Net risk |
| ----- | ----------- | --------------------------------------------------------------------------------- | -------- |
| 1     | **P1 + P3** | Single load phase enum; one "unplaced" signal; `graphVisible`/persistence derived | Low      |
| 2     | **P4 + P5** | `applyForceLayout` split, persistence deduped, throwaway viewport gone            | Low      |
| 3     | **P2**      | `LayoutRequest` replaces `caller` strings & boolean args everywhere               | Medium   |
| 4     | **P6 + P7** | `syncGraphElements` decomposed; component reduced to forwarding                   | Medium   |

Each phase is independently shippable and test-backed. Stop after Phase 2 and you've already removed most of the cognitive load with near-zero behavioral risk; Phases 3–4 are the structural wins.

**Estimated reduction:** the hot path (`controller` + `LayoutManager` + `useGraphSync`) should drop ~25–35% LOC, and — more importantly — the number of independent state variables governing "is the graph loaded yet" goes from **4 + a string enum of 8** to **1 enum of 4 + 1 typed request**.

---

## 6. Do NOT touch

- The **worker-solve** mechanism and its timeout/cancellation (`runInWorker`, `LayoutManager.ts:203-269`) — it's load-bearing for big graphs and already careful.
- The **incremental diff** semantics in `syncGraphElements` (temporal equality, `isPendingLayout` preservation, `resolvedImage` retention) — subtle, correctness-critical; refactor its _structure_ (P6) but not its _rules_.
- `removeOverlaps` spatial-grid algorithm — isolated and correct.
- The phyllotaxis seeding in the transformer — it's the right default for unplaced nodes.

---

## 7. Open questions — RESOLVED (T0 spike)

1. **Is `nodesAtOrigin === count` reachable for any non-pending path?** → **YES.** A node with saved coords of exactly `{x:0, y:0}` takes the `hasValidCoords` path (`transformer.ts:194-199`) → positioned at origin, **not** `.pending-layout`. So a legacy/degenerate vault saved entirely at `(0,0)` is caught only by the origin scan. **Consequence:** T5 must **unify**, not delete — the origin case is distinct from the pending case.
2. **Does anything read the early `0.15` viewport before finalize?** → **NO hard dependency.** Only the Minimap reflects it reactively (`Minimap.svelte:146-150`) and re-renders when finalize re-fits; no export/screenshot/image path captures the viewport (`GraphImageManager.sync` applies node images, not viewport). **Consequence:** T8 is safe — remove or replace with a no-anim fit.
3. **Are any `caller` strings consumed for telemetry/debug?** → **YES.** `controller.ts:328-331` logs `debugStore.log("Layout: …", { nodes, caller })`. **Consequence:** T12 must keep a stable `reason` label feeding that log.

---

## 8. Task backlog (ordered)

Each task is small, independently shippable, and test-backed. Order respects dependencies (`deps`). `∥` marks tasks that can run in parallel with their siblings. Verify the §7 open questions first (T0) — they gate T5, T8, T12.

### T0 — Verification spike _(gate)_

Answer the three §7 open questions before refactoring.

- Is `nodesAtOrigin === count` reachable for any **non-pending** path? → gates **T5**.
- Does anything read the early `0.15` viewport before finalize? → gates **T8**.
- Which `caller` strings feed debug telemetry? → gates **T12**.
- **Deps:** none · **Files:** read-only · **Done when:** each question has a written yes/no + the affected task is unblocked or adjusted.

### Phase 1 — Explicit load state machine (P1 + P3)

| ID       | Task                                                                                                                                 | Deps | Files                                             | Done when                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **T1**   | Add `LoadPhase` type + `phase` state; implement `reconcile(inputs)` **alongside** existing flags (no behavior change, shadow mode)   | T0   | `graph-view-controller.svelte.ts`                 | `reconcile` computes the same transitions the booleans do; asserted equal in a unit test |
| **T2**   | Route finalization / first-elements / vault-loading transitions through `phase`; delete `initialLoaded` & `didFinalizeLoad` reads    | T1   | controller, `useGraphSync.ts` (`onFirstElements`) | finalization tests pass against `phase`; old booleans gone                               |
| **T3** ∥ | Derive `graphVisible` from `phase`; remove the 4 scattered writes (195/335/404/425)                                                  | T2   | controller, `GraphView.svelte`                    | single source for visibility; fade-in unchanged in e2e                                   |
| **T4** ∥ | Remove `_layoutReady`; gate position persistence on `phase === "ready"`                                                              | T2   | controller                                        | persistence still skipped during load; covered by test                                   |
| **T5** ∥ | Collapse the two "unplaced" checks into the single `.pending-layout` predicate; delete `nodesAtOrigin` scan (if T0 says unreachable) | T0   | `LayoutManager.ts`                                | the two #1458 LayoutManager tests still pass                                             |

### Phase 2 — LayoutManager internals (P4 + P5) — _natural stopping point_

| ID       | Task                                                                                           | Deps | Files              | Done when                                             |
| -------- | ---------------------------------------------------------------------------------------------- | ---- | ------------------ | ----------------------------------------------------- |
| **T6**   | Extract `persistPositions(nodes)` helper; dedupe the two persistence blocks (498-513, 632-647) | —    | `LayoutManager.ts` | both paths call one helper; suite green               |
| **T7**   | Split `applyForceLayout` → `fitOnly(options)` + `solveAndFit(request, options)`                | T6   | `LayoutManager.ts` | method ≤ ~half length; 30-test suite green            |
| **T8** ∥ | Remove/replace the throwaway `0.15` viewport with a no-anim fit (if T0 clears it)              | T0   | `useGraphSync.ts`  | first paint correct; no regression in initial framing |

### Phase 3 — Typed `LayoutRequest` (P2)

| ID      | Task                                                                                                                      | Deps    | Files                                                                     | Done when                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| **T9**  | Define `LayoutRequest { reason, reseed, viewport }`; add adapter so `apply` accepts it while old shape still works        | T7      | `LayoutManager.ts`                                                        | both call shapes compile; tests dual-run             |
| **T10** | Move `resolveViewportPolicy` → pure helper producing `viewport`                                                           | T9      | controller                                                                | helper unit-tested; identical outputs to old fn      |
| **T11** | Convert all call sites (controller, sync, toolbar, keyboard) to build `LayoutRequest`                                     | T9, T10 | controller, `useGraphSync.ts`, `GraphToolbar.svelte`, `graph-keyboard.ts` | no caller passes positional booleans                 |
| **T12** | Delete `caller`-string parsing + boolean args from `apply`/`applyForceLayout`; keep a stable `reason` label for telemetry | T11, T0 | `LayoutManager.ts`                                                        | no string-compare branches remain; debug logs intact |

### Phase 4 — Sync decomposition & component reduction (P6 + P7)

| ID        | Task                                                                                   | Deps     | Files                          | Done when                                       |
| --------- | -------------------------------------------------------------------------------------- | -------- | ------------------------------ | ----------------------------------------------- |
| **T13**   | Tighten `useGraphSync` tests (fix type looseness) as a safety net                      | —        | `useGraphSync.ts.test.ts`      | types clean; coverage of diff rules raised      |
| **T14**   | Extract the layout-trigger decision (288-313) into a pure fn → `LayoutRequest \| null` | T11, T13 | `useGraphSync.ts`              | decision unit-tested in isolation               |
| **T15** ∥ | (Optional) Split add/remove, data-patch, filter passes into named helpers              | T13      | `useGraphSync.ts`              | `syncGraphElements` reads as orchestration only |
| **T16**   | Collapse GraphView's load-related effects into one `controller.reconcile({...})` call  | T2, T14  | `GraphView.svelte`, controller | load effects: 4 → 1; e2e graph suite green      |

### Linear execution order

```
T0
└ Phase 1:  T1 → T2 → (T3 ∥ T4 ∥ T5)
  Phase 2:  T6 → T7 ; (T8 ∥)              ← ship here for 80% of the win, ~0 behavioral risk
  Phase 3:  T9 → (T10) → T11 → T12
  Phase 4:  T13 → T14 → T16 ; (T15 ∥)
```

**Per-task discipline:** one task = one PR = green `lint:types` + unit suite + (for T3/T8/T16) the `✅ graph *` e2e specs. Never bundle a behavioral change with a structural one in the same task.
