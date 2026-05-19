# God File Analysis Report: Codex-Cryptica

_(Last updated: May 19, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

The **P2P guest service** refactor (Spec 100) reduced `guest-service.ts` from 657 lines to 197 lines by extracting a `P2PClientTransport`, generalizing the existing `P2PDispatcher`, partitioning inbound handling across six focused handlers, and isolating chunked file transfer and token-move coalescing into dedicated modules. This mirrors the **P2P host service** refactor (Spec 098) and follows the **Map session store** refactor (Spec 099, `map-session.svelte.ts` 896 → 47 lines) and the **Oracle Executor monolith** win (Spec 097, 1,100+ → 153 lines).

With both sides of P2P now modular, the largest remaining pressure points are the **broad global Oracle/UI stores**, the **map route coordinator**, and **regressed graph components** (`GraphView.svelte`, `ContextMenu.svelte`).

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                 | Line Count | Type                | Status         |
| :--- | :-------------------------------------------------------- | :--------- | :------------------ | :------------- |
| 1    | `apps/web/src/lib/stores/oracle.svelte.ts`                | 888        | Store (State/Logic) | 🔴 REGRESSION  |
| 2    | `apps/web/src/lib/stores/ui.svelte.ts`                    | 872        | Store (State)       | 🔴 CRITICAL    |
| 3    | `apps/web/src/routes/(app)/map/+page.svelte`              | 735        | UI Layout           | 🟡 NEEDS SPLIT |
| 4    | `apps/web/src/lib/components/GraphView.svelte`            | 700        | UI Component        | 🟡 REGRESSION  |
| 5    | `packages/map-engine/src/renderer.ts`                     | 672        | Engine Core         | 🟡 WATCH       |
| 6    | `apps/web/src/lib/components/oracle/ChatMessage.svelte`   | 659        | UI Component        | 🟡 NEW         |
| 7    | `apps/web/src/lib/components/graph/ContextMenu.svelte`    | 658        | UI Component        | 🟡 NEEDS SPLIT |
| 8    | `packages/graph-engine/src/LayoutManager.ts`              | 637        | Engine Core         | 🟡 WATCH       |
| 9    | `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts` | 605        | Store Manager       | 🟡 WATCH       |
| 10   | `apps/web/src/lib/stores/map.svelte.ts`                   | 595        | Store (State)       | 🟡 NEW         |

---

## Evaluation & Refactoring Strategies

### 1. Map Route Coordinator (`(app)/map/+page.svelte`)

**Analysis:** `map-session.svelte.ts` is resolved after Spec 099, but `(app)/map/+page.svelte` (735 lines) still acts as a heavy route coordinator.
**Recommended Split:**

- Move route-specific setup out of `(app)/map/+page.svelte` into controller modules.

### 2. Application Stores (`oracle.svelte.ts`, `ui.svelte.ts`)

**Analysis:** `oracle.svelte.ts` (888 lines) has regressed, accumulating chat, undo, and reconciliation state. `ui.svelte.ts` (872 lines) remains a dumping ground for global UI state.
**Recommended Split:**

- REVIEW `oracle.svelte.ts`: Extract sub-stores for distinct features (e.g., `chat-history-ui.ts` vs `recon-manager.ts`).
- Decompose `ui.svelte.ts` into feature-specific stores (Toast, Modal, Layout).

### 3. Graph Component Regressions (`GraphView.svelte`, `ContextMenu.svelte`)

**Analysis:** `GraphView.svelte` has crept back up to 700 lines. `ContextMenu.svelte` (658 lines) handles too many action logic branches directly.
**Recommended Split:**

- Extract menu item logic from `ContextMenu.svelte` into a strategy pattern.
- Push complex graph features from `GraphView.svelte` down into child components.

---

## Next Recommended Refactor Order

1. **`ui.svelte.ts`**: Global UI state should be decomposed to improve testability.
2. **`oracle.svelte.ts`**: Clean up regressed UI state and logic.
3. **`(app)/map/+page.svelte`**: Move route orchestration into smaller controller modules.
4. **`GraphView.svelte` / `ContextMenu.svelte`**: Push complex menu/action logic out of the components.

---

## Historical Successes (Previously Fixed & Maintained)

- **`oracle-executor.ts`**: **RESOLVED**. Reduced from 1,135 to 153 lines by extracting logic into 9 specialized command executors (Spec 097).
- **`host-service.svelte.ts`**: **RESOLVED**. Reduced from 917 to 263 lines by extracting P2P transport, dispatcher, and specialized handlers (Spec 098).
- **`map-session.svelte.ts`**: **RESOLVED**. Reduced from 896 to 47 lines by extracting snapshot, lifecycle, composition, and compatibility facade modules (Spec 099).
- **`guest-service.ts`**: **RESOLVED**. Reduced from 657 to 197 lines by mirroring the host-side architecture &mdash; sibling `P2PClientTransport`, generalized dispatcher, six focused guest handlers, dedicated `GuestFileClient`, `MapAssetUrlCache`, and `TokenMoveCoalescer` (Spec 100).
- **`MapView.svelte`**: **RESOLVED**. Reduced from 1,536 to ~330 lines by decomposing into focused modules.
- **`vault.svelte.ts`**: Holding steady at ~500 lines (down from 1,381).
- **`CanvasWorkspace.svelte`**: Staying modular at ~326 lines (down from 835).
- **`entity-store.svelte.ts`**: Maintaining boundaries at ~450 lines (down from 920).
- **`ai.ts`**: Effectively eliminated as a god file.
