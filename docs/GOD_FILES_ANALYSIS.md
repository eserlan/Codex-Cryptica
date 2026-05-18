# God File Analysis Report: Codex-Cryptica

_(Last updated: May 18, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

The major refactor of the **Map session store** (Spec 099) reduced `map-session.svelte.ts` from 896 lines to 47 lines by extracting snapshot translation, lifecycle orchestration, manager composition, and compatibility delegation. This follows the **P2P host service** refactor (Spec 098), which reduced `host-service.svelte.ts` from 917 lines to 263 lines, and the earlier **Oracle Executor monolith** win (Spec 097), where command executors reduced the executor from over 1,100 lines to 153 lines.

The largest remaining pressure points are now the **broad global Oracle/UI stores**, the map route coordinator, and the guest-side half of **P2P synchronization**. The host path is now modular, but `guest-service.ts` remains a large coordinator and should be the next P2P-specific refactor target.

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                 | Line Count | Type                | Status           |
| :--- | :-------------------------------------------------------- | :--------- | :------------------ | :--------------- |
| 1    | `apps/web/src/lib/stores/oracle.svelte.ts`                | 887        | Store (State/Logic) | 🔴 REGRESSION    |
| 2    | `apps/web/src/lib/stores/ui.svelte.ts`                    | 872        | Store (State)       | 🔴 CRITICAL      |
| 3    | `apps/web/src/routes/(app)/map/+page.svelte`              | 735        | UI Layout           | 🟡 NEEDS SPLIT   |
| 4    | `apps/web/src/lib/components/GraphView.svelte`            | 699        | UI Component        | 🟡 REGRESSION    |
| 5    | `packages/map-engine/src/renderer.ts`                     | 672        | Engine Core         | 🟡 WATCH         |
| 6    | `apps/web/src/lib/components/graph/ContextMenu.svelte`    | 658        | UI Component        | 🟡 NEEDS SPLIT   |
| 7    | `apps/web/src/lib/components/oracle/ChatMessage.svelte`   | 654        | UI Component        | 🟡 NEW           |
| 8    | `packages/graph-engine/src/LayoutManager.ts`              | 637        | Engine Core         | 🟡 WATCH         |
| 9    | `apps/web/src/lib/cloud-bridge/p2p/guest-service.ts`      | 617        | Service (P2P)       | 🟡 HOST RESOLVED |
| 10   | `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts` | 605        | Store Manager       | 🟡 WATCH         |

---

## Evaluation & Refactoring Strategies

### 1. Map Route Coordinator (`(app)/map/+page.svelte`)

**Analysis:** `map-session.svelte.ts` is resolved after Spec 099, but `(app)/map/+page.svelte` (735 lines) still acts as a heavy route coordinator.
**Recommended Split:**

- Move route-specific setup out of `(app)/map/+page.svelte` into controller modules.

### 2. Application Stores (`oracle.svelte.ts`, `ui.svelte.ts`)

**Analysis:** `oracle.svelte.ts` (887 lines) has regressed, accumulating chat, undo, and reconciliation state. `ui.svelte.ts` (872 lines) remains a dumping ground for global UI state.
**Recommended Split:**

- REVIEW `oracle.svelte.ts`: Extract sub-stores for distinct features (e.g., `chat-history-ui.ts` vs `recon-manager.ts`).
- Decompose `ui.svelte.ts` into feature-specific stores (Toast, Modal, Layout).

### 3. P2P Guest Bridge (`guest-service.ts`)

**Analysis:** `host-service.svelte.ts` is no longer a god file after Spec 098, but `guest-service.ts` is now the largest remaining P2P file at 617 lines. It still combines connection lifecycle, inbound protocol handling, file requests, graph/map sync, and guest presence updates.
**Recommended Split:**

- Mirror the host-side architecture with guest transport, dispatcher, and focused handlers.
- Move file reassembly/request tracking and map sync handling into dedicated modules.
- Keep the guest service as a small lifecycle facade over reactive state and dependency injection.

### 4. Graph Component Regressions (`GraphView.svelte`, `ContextMenu.svelte`)

**Analysis:** `GraphView.svelte` has crept back up to ~700 lines. `ContextMenu.svelte` (644 lines) handles too many action logic branches directly.
**Recommended Split:**

- Extract menu item logic from `ContextMenu.svelte` into a strategy pattern.
- Push complex graph features from `GraphView.svelte` down into child components.

---

## Next Recommended Refactor Order

1. **`ui.svelte.ts`**: Global UI state should be decomposed to improve testability.
2. **`oracle.svelte.ts`**: Clean up regressed UI state and logic.
3. **`(app)/map/+page.svelte`**: Move route orchestration into smaller controller modules.
4. **`guest-service.ts`**: Apply the successful host-side P2P pattern to the guest-side bridge.

---

## Historical Successes (Previously Fixed & Maintained)

- **`oracle-executor.ts`**: **RESOLVED**. Reduced from 1,135 to 153 lines by extracting logic into 9 specialized command executors (Spec 097).
- **`host-service.svelte.ts`**: **RESOLVED**. Reduced from 917 to 263 lines by extracting P2P transport, dispatcher, and specialized handlers (Spec 098).
- **`map-session.svelte.ts`**: **RESOLVED**. Reduced from 896 to 47 lines by extracting snapshot, lifecycle, composition, and compatibility facade modules (Spec 099).
- **`MapView.svelte`**: **RESOLVED**. Reduced from 1,536 to ~330 lines by decomposing into focused modules.
- **`vault.svelte.ts`**: Holding steady at ~500 lines (down from 1,381).
- **`CanvasWorkspace.svelte`**: Staying modular at ~326 lines (down from 835).
- **`entity-store.svelte.ts`**: Maintaining boundaries at ~450 lines (down from 920).
- **`ai.ts`**: Effectively eliminated as a god file.
