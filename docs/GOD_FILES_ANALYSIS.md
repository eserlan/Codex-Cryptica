# God File Analysis Report: Codex-Cryptica

_(Last updated: May 19, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

The **UI store decoupling** refactor (Spec 101) deleted `ui.svelte.ts` after splitting its 872-line grab-bag into focused `stores/ui/*` modules, each under 200 lines. This follows the **P2P guest service** refactor (Spec 100), **Map session store** refactor (Spec 099), **P2P host service** refactor (Spec 098), and the **Oracle Executor monolith** win (Spec 097, 1,100+ → 153 lines).

With both sides of P2P and the global UI store now modular, the largest remaining pressure points are the **broad global Oracle store**, the **map route coordinator**, and **regressed graph components** (`GraphView.svelte`, `ContextMenu.svelte`).

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                    | Line Count | Type                | Status         |
| :--- | :----------------------------------------------------------- | :--------- | :------------------ | :------------- |
| 1    | `apps/web/src/lib/stores/oracle.svelte.ts`                   | 896        | Store (State/Logic) | 🔴 REGRESSION  |
| 2    | `apps/web/src/routes/(app)/map/+page.svelte`                 | 738        | UI Layout           | 🟡 NEEDS SPLIT |
| 3    | `apps/web/src/lib/components/GraphView.svelte`               | 703        | UI Component        | 🟡 REGRESSION  |
| 4    | `packages/map-engine/src/renderer.ts`                        | 672        | Engine Core         | 🟡 WATCH       |
| 5    | `apps/web/src/lib/components/graph/ContextMenu.svelte`       | 661        | UI Component        | 🟡 NEEDS SPLIT |
| 6    | `apps/web/src/lib/components/oracle/ChatMessage.svelte`      | 659        | UI Component        | 🟡 NEW         |
| 7    | `packages/graph-engine/src/LayoutManager.ts`                 | 637        | Engine Core         | 🟡 WATCH       |
| 8    | `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts`    | 605        | Store Manager       | 🟡 WATCH       |
| 9    | `apps/web/src/lib/stores/map.svelte.ts`                      | 595        | Store (State)       | 🟡 NEW         |
| 10   | `apps/web/src/lib/components/timeline/TemporalPicker.svelte` | 594        | UI Component        | 🟡 WATCH       |

---

## Evaluation & Refactoring Strategies

### 1. Map Route Coordinator (`(app)/map/+page.svelte`)

**Analysis:** `map-session.svelte.ts` is resolved after Spec 099, but `(app)/map/+page.svelte` (735 lines) still acts as a heavy route coordinator.
**Recommended Split:**

- Move route-specific setup out of `(app)/map/+page.svelte` into controller modules.

### 2. Application Store (`oracle.svelte.ts`)

**Analysis:** `oracle.svelte.ts` (896 lines) has regressed, accumulating chat, undo, and reconciliation state. `ui.svelte.ts` is resolved by Spec 101.
**Recommended Split:**

- REVIEW `oracle.svelte.ts`: Extract sub-stores for distinct features (e.g., `chat-history-ui.ts` vs `recon-manager.ts`).

### 3. Graph Component Regressions (`GraphView.svelte`, `ContextMenu.svelte`)

**Analysis:** `GraphView.svelte` has crept back up to 700 lines. `ContextMenu.svelte` (658 lines) handles too many action logic branches directly.
**Recommended Split:**

- Extract menu item logic from `ContextMenu.svelte` into a strategy pattern.
- Push complex graph features from `GraphView.svelte` down into child components.

---

## Next Recommended Refactor Order

1. **`oracle.svelte.ts`**: Clean up regressed UI state and logic.
2. **`(app)/map/+page.svelte`**: Move route orchestration into smaller controller modules.
3. **`GraphView.svelte` / `ContextMenu.svelte`**: Push complex menu/action logic out of the components.

---

## Historical Successes (Previously Fixed & Maintained)

- **`oracle-executor.ts`**: **RESOLVED**. Reduced from 1,135 to 153 lines by extracting logic into 9 specialized command executors (Spec 097).
- **`host-service.svelte.ts`**: **RESOLVED**. Reduced from 917 to 263 lines by extracting P2P transport, dispatcher, and specialized handlers (Spec 098).
- **`map-session.svelte.ts`**: **RESOLVED**. Reduced from 896 to 47 lines by extracting snapshot, lifecycle, composition, and compatibility facade modules (Spec 099).
- **`guest-service.ts`**: **RESOLVED**. Reduced from 657 to 197 lines by mirroring the host-side architecture &mdash; sibling `P2PClientTransport`, generalized dispatcher, six focused guest handlers, dedicated `GuestFileClient`, `MapAssetUrlCache`, and `TokenMoveCoalescer` (Spec 100).
- **`ui.svelte.ts`**: **RESOLVED**. Reduced from 872 lines to a deleted facade by extracting notification, onboarding, session mode, modal, discovery policy, connection mode, explorer, layout, and navigation state into focused `stores/ui/*` modules (Spec 101).
- **`MapView.svelte`**: **RESOLVED**. Reduced from 1,536 to ~330 lines by decomposing into focused modules.
- **`vault.svelte.ts`**: Holding steady at ~500 lines (down from 1,381).
- **`CanvasWorkspace.svelte`**: Staying modular at ~326 lines (down from 835).
- **`entity-store.svelte.ts`**: Maintaining boundaries at ~450 lines (down from 920).
- **`ai.ts`**: Effectively eliminated as a god file.
