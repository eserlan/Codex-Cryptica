# God File Analysis Report: Codex-Cryptica

_(Last updated: May 20, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

The **Graph Surface Decomposition** refactor has successfully eliminated `GraphView.svelte` and `ContextMenu.svelte` as the top frontend monoliths, dropping them from ~700 lines down to ~300 by extracting orchestration into `GraphViewController` and `GraphContextMenuController`.

With the UI store, P2P services, Map route, and Graph surface now modular, the largest remaining pressure points are concentrated in the **engine cores** (`renderer.ts`, `LayoutManager.ts`) and specific **store managers** (`vtt-token-manager.svelte.ts`, `map.svelte.ts`, `oracle.svelte.ts`).

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                                   | Line Count | Type                | Status      |
| :--- | :-------------------------------------------------------------------------- | :--------- | :------------------ | :---------- |
| 1    | `packages/map-engine/src/renderer.ts`                                       | 672        | Engine Core         | 🟡 WATCH    |
| 2    | `apps/web/src/lib/components/oracle/ChatMessage.svelte`                     | 659        | UI Component        | 🟡 WATCH    |
| 3    | `packages/graph-engine/src/LayoutManager.ts`                                | 637        | Engine Core         | 🟡 WATCH    |
| 4    | `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts`                   | 605        | Store Manager       | 🟡 WATCH    |
| 5    | `apps/web/src/lib/stores/map.svelte.ts`                                     | 595        | Store (State)       | 🟡 WATCH    |
| 6    | `apps/web/src/lib/components/timeline/TemporalPicker.svelte`                | 594        | UI Component        | 🟡 WATCH    |
| 7    | `apps/web/src/lib/components/explorer/EntityList.svelte`                    | 510        | UI Component        | 🟡 WATCH    |
| 8    | `apps/web/src/lib/stores/oracle.svelte.ts`                                  | 509        | Store (State/Logic) | 🟢 IMPROVED |
| 9    | `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts`         | 483        | Controller          | 🟢 NEW      |
| 10   | `apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts` | 441        | Controller          | 🟢 NEW      |

---

## Evaluation & Refactoring Strategies

### 1. Engine and Manager Cores (`renderer.ts`, `LayoutManager.ts`, `vtt-token-manager.svelte.ts`)

**Analysis:** With the UI layers significantly thinned out, the core engines and store managers now dominate the top of the list. These files are inherently complex, but their size poses a long-term maintenance risk.
**Recommended Split:**

- Prefer extracting algorithmic helpers and persistence logic from the engine/store cores before changing public APIs.
- Look for natural seams, such as separating WebGL setup from render loops in `renderer.ts`, or isolating collision detection in `vtt-token-manager`.

### 2. Broad UI Components (`ChatMessage.svelte`, `TemporalPicker.svelte`)

**Analysis:** Some UI components remain large due to complex internal state and dense templates.
**Recommended Split:**

- For `ChatMessage.svelte`, consider extracting rendering logic for different message types (system, AI, user, image) into sub-components.
- For `TemporalPicker.svelte`, break out date parsing/formatting logic or specific picker views (year, month, day).

### 3. Application Stores (`map.svelte.ts`, `oracle.svelte.ts`)

**Analysis:** These stores have been improved or held steady but still sit around 500-600 lines.
**Recommended Split:**

- Continue shrinking global store responsibilities. For `map.svelte.ts`, keep route orchestration in `MapPageController`.
- For `oracle.svelte.ts`, continue extracting state/logic into focused manager modules if size creeps up.

---

## Next Recommended Refactor Order

1. **`packages/map-engine/src/renderer.ts` / `packages/graph-engine/src/LayoutManager.ts`**: Reduce engine-core breadth before more UI layers depend on them.
2. **`apps/web/src/lib/components/oracle/ChatMessage.svelte`**: Break down complex message rendering into specialized sub-components.
3. **`apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts` / `apps/web/src/lib/stores/map.svelte.ts`**: Prevent the next store regressions by extracting logic helpers.

---

## Historical Successes (Previously Fixed & Maintained)

- **`GraphView.svelte` & `ContextMenu.svelte`**: **RESOLVED**. Reduced from ~700 lines each to ~340 and ~290 lines respectively by extracting orchestration and action logic into `GraphViewController` and `GraphContextMenuController` (Spec 825/826).
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
