# God File Analysis Report: Codex-Cryptica

_(Last updated: May 20, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

The **UI store decoupling** refactor (Spec 101) deleted `ui.svelte.ts` after splitting its 872-line grab-bag into focused `stores/ui/*` modules, each under 200 lines. This follows the **P2P guest service** refactor (Spec 100), **Map session store** refactor (Spec 099), **P2P host service** refactor (Spec 098), and the **Oracle Executor monolith** win (Spec 097, 1,100+ → 153 lines).

With both sides of P2P and the global UI store now modular, and with the **map route coordinator** decomposed in Spec 103, the largest remaining pressure points are the **regressed graph components**, the **map/graph engine cores**, and several still-broad UI/store modules (`ChatMessage.svelte`, `vtt-token-manager.svelte.ts`, `map.svelte.ts`).

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                    | Line Count | Type                | Status        |
| :--- | :----------------------------------------------------------- | :--------- | :------------------ | :------------ |
| 1    | `apps/web/src/lib/components/GraphView.svelte`               | 705        | UI Component        | 🔴 REGRESSION |
| 2    | `apps/web/src/lib/components/graph/ContextMenu.svelte`       | 679        | UI Component        | 🔴 REGRESSION |
| 3    | `packages/map-engine/src/renderer.ts`                        | 672        | Engine Core         | 🟡 WATCH      |
| 4    | `apps/web/src/lib/components/oracle/ChatMessage.svelte`      | 659        | UI Component        | 🟡 WATCH      |
| 5    | `packages/graph-engine/src/LayoutManager.ts`                 | 637        | Engine Core         | 🟡 WATCH      |
| 6    | `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts`    | 605        | Store Manager       | 🟡 WATCH      |
| 7    | `apps/web/src/lib/stores/map.svelte.ts`                      | 595        | Store (State)       | 🟡 WATCH      |
| 8    | `apps/web/src/lib/components/timeline/TemporalPicker.svelte` | 594        | UI Component        | 🟡 WATCH      |
| 9    | `apps/web/src/lib/stores/oracle.svelte.ts`                   | 509        | Store (State/Logic) | 🟢 IMPROVED   |
| 10   | `apps/web/src/lib/components/explorer/EntityList.svelte`     | 500        | UI Component        | 🟡 WATCH      |

---

## Evaluation & Refactoring Strategies

### 1. Map Route Coordinator (`(app)/map/+page.svelte`)

**Analysis:** Resolved in Spec 103. The route is now 148 lines and acts as a thin composer over `MapPageController`, `MapHUD`, `MapUploadOverlay`, `MapVTTControlsHUD`, and `MapVTTSidebar`.
**Result:**

- Keep the route off the active god-file list unless it regresses again.
- Watch `map-page-controller.svelte.ts` (267 lines) and `MapVTTSidebar.svelte` (210 lines) for future creep, but neither is an immediate hotspot.

### 2. Application Store (`oracle.svelte.ts`)

**Analysis:** This is no longer the top repository hotspot. `oracle.svelte.ts` is currently 509 lines, down materially from the prior 896-line regression noted in the May 2026 reassessment.
**Recommended Split:**

- Keep watching `oracle.svelte.ts`, but deprioritize it behind `GraphView.svelte` and `ContextMenu.svelte`.
- If it starts creeping up again, continue extracting state/logic into focused manager modules.

### 3. Graph Component Regressions (`GraphView.svelte`, `ContextMenu.svelte`)

**Analysis:** `GraphView.svelte` (705 lines) and `ContextMenu.svelte` (679 lines) are now the clearest UI god files in the app. They have overtaken the map route and the Oracle store as the main frontend maintenance risk.
**Recommended Split:**

- Extract menu item logic from `ContextMenu.svelte` into a strategy pattern.
- Push complex graph features from `GraphView.svelte` down into child components.

### 4. Engine and Manager Watch List (`renderer.ts`, `LayoutManager.ts`, `vtt-token-manager.svelte.ts`, `map.svelte.ts`)

**Analysis:** The next cluster is not route-level UI but large engine/store files that may deserve focused seams before they turn into full regressions:

- `packages/map-engine/src/renderer.ts` (672)
- `packages/graph-engine/src/LayoutManager.ts` (637)
- `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts` (605)
- `apps/web/src/lib/stores/map.svelte.ts` (595)

**Recommended Split:**

- Prefer extracting algorithmic helpers and persistence helpers from the engine/store cores before changing public APIs.
- For `map.svelte.ts`, keep route orchestration in `MapPageController` and continue shrinking global map-store responsibilities rather than re-inflating the route.

---

## Next Recommended Refactor Order

1. **`GraphView.svelte`**: Break out dense graph interaction and rendering coordination.
2. **`ContextMenu.svelte`**: Extract action branching and menu behavior out of the component.
3. **`packages/map-engine/src/renderer.ts` / `packages/graph-engine/src/LayoutManager.ts`**: Reduce engine-core breadth before more UI layers depend on them.
4. **`vtt-token-manager.svelte.ts` / `map.svelte.ts`**: Prevent the next store regressions.

---

## Historical Successes (Previously Fixed & Maintained)

- **`oracle-executor.ts`**: **RESOLVED**. Reduced from 1,135 to 153 lines by extracting logic into 9 specialized command executors (Spec 097).
- **`host-service.svelte.ts`**: **RESOLVED**. Reduced from 917 to 263 lines by extracting P2P transport, dispatcher, and specialized handlers (Spec 098).
- **`map-session.svelte.ts`**: **RESOLVED**. Reduced from 896 to 47 lines by extracting snapshot, lifecycle, composition, and compatibility facade modules (Spec 099).
- **`guest-service.ts`**: **RESOLVED**. Reduced from 657 to 197 lines by mirroring the host-side architecture &mdash; sibling `P2PClientTransport`, generalized dispatcher, six focused guest handlers, dedicated `GuestFileClient`, `MapAssetUrlCache`, and `TokenMoveCoalescer` (Spec 100).
- **`ui.svelte.ts`**: **RESOLVED**. Reduced from 872 lines to a deleted facade by extracting notification, onboarding, session mode, modal, discovery policy, connection mode, explorer, layout, and navigation state into focused `stores/ui/*` modules (Spec 101).
- **`(app)/map/+page.svelte`**: **RESOLVED**. Reduced from 738 to 148 lines by moving route orchestration into `MapPageController` and extracting `MapHUD`, `MapUploadOverlay`, `MapVTTControlsHUD`, and `MapVTTSidebar` (Spec 103).
- **`MapView.svelte`**: **RESOLVED**. Reduced from 1,536 to ~330 lines by decomposing into focused modules.
- **`vault.svelte.ts`**: Holding steady at ~500 lines (down from 1,381).
- **`CanvasWorkspace.svelte`**: Staying modular at ~326 lines (down from 835).
- **`entity-store.svelte.ts`**: Maintaining boundaries at ~450 lines (down from 920).
- **`ai.ts`**: Effectively eliminated as a god file.
