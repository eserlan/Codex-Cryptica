# God File Analysis Report: Codex-Cryptica

_(Last updated: May 17, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

The major refactor of the **Oracle Executor monolith** (Spec 097) has eliminated the project's #1 hotspot, reducing it from over 1,100 lines to 153 lines. This demonstrates the effectiveness of the **Command + Event + DI** pattern for modularizing engine logic.

However, growth in the **Oracle Store** (+12% since May 13) and the continued high complexity of **P2P Hosting** and **UI State** stores indicate that the focus must now shift to the application layer. The largest remaining pressure points are now **P2P synchronization**, **Map session state**, and the **broad global UI/Oracle stores**.

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                    | Line Count | Type                | Status            |
| :--- | :----------------------------------------------------------- | :--------- | :------------------ | :---------------- |
| 1    | `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts`   | 917        | Service (P2P)       | 🔴 NEW (CRITICAL) |
| 2    | `apps/web/src/lib/stores/map-session.svelte.ts`              | 896        | Store (State/Logic) | 🔴 NEW            |
| 3    | `apps/web/src/lib/stores/oracle.svelte.ts`                   | 887        | Store (State/Logic) | 🔴 REGRESSION     |
| 4    | `apps/web/src/lib/stores/ui.svelte.ts`                       | 872        | Store (State)       | 🔴 NEW            |
| 5    | `apps/web/src/routes/(app)/map/+page.svelte`                 | 735        | UI Layout           | 🟡 NEW            |
| 6    | `apps/web/src/lib/components/GraphView.svelte`               | 699        | UI Component        | 🟡 REGRESSION     |
| 7    | `packages/map-engine/src/renderer.ts`                        | 672        | Engine Core         | 🟡 NEW            |
| 8    | `apps/web/src/lib/components/graph/ContextMenu.svelte`       | 644        | UI Component        | 🟡 NEW            |
| 9    | `apps/web/src/lib/components/map/map-interactions.svelte.ts` | 532        | State Class         | 🟢 NEW (MODULAR)  |
| 10   | `apps/web/src/lib/stores/vault.svelte.ts`                    | 505        | Store (State)       | 🟢 MAINTAINED     |

---

## Evaluation & Refactoring Strategies

### 1. P2P Cloud Bridge (`host-service.svelte.ts`)

**Analysis:** At 917 lines, the host service handles WebRTC signaling, connection management, delta synchronization, and host authority rules simultaneously. It is now the largest single logic block in the app.
**Recommended Split:**

- Extract the low-level WebRTC/connection management into a transport layer.
- Keep the Svelte store focused purely on reactive connection state and top-level session authority.

### 2. Map Session & Page Monoliths (`map-session.svelte.ts`, `(app)/map/+page.svelte`)

**Analysis:** `map-session.svelte.ts` remains significant at 896 lines, and `(app)/map/+page.svelte` (735 lines) acts as a heavy route coordinator.
**Recommended Split:**

- Trim `map-session.svelte.ts` by keeping it as a session facade over focused sub-managers (Sync, Selection, Tools).
- Move route-specific setup out of `(app)/map/+page.svelte` into controller modules.

### 3. Application Stores (`oracle.svelte.ts`, `ui.svelte.ts`)

**Analysis:** `oracle.svelte.ts` (887 lines) has regressed, accumulating chat, undo, and reconciliation state. `ui.svelte.ts` (872 lines) remains a dumping ground for global UI state.
**Recommended Split:**

- REVIEW `oracle.svelte.ts`: Extract sub-stores for distinct features (e.g., `chat-history-ui.ts` vs `recon-manager.ts`).
- Decompose `ui.svelte.ts` into feature-specific stores (Toast, Modal, Layout).

### 4. Graph Component Regressions (`GraphView.svelte`, `ContextMenu.svelte`)

**Analysis:** `GraphView.svelte` has crept back up to ~700 lines. `ContextMenu.svelte` (644 lines) handles too many action logic branches directly.
**Recommended Split:**

- Extract menu item logic from `ContextMenu.svelte` into a strategy pattern.
- Push complex graph features from `GraphView.svelte` down into child components.

---

## Next Recommended Refactor Order

1. **`host-service.svelte.ts`**: High multiplayer risk; should be modularized to support guest-mode scaling.
2. **`ui.svelte.ts`**: Global UI state should be decomposed to improve testability.
3. **`oracle.svelte.ts`**: Clean up regressed UI state and logic.
4. **`map-session.svelte.ts`**: Hardening session management.

---

## Historical Successes (Previously Fixed & Maintained)

- **`oracle-executor.ts`**: **RESOLVED**. Reduced from 1,135 to 153 lines by extracting logic into 9 specialized command executors (Spec 097).
- **`MapView.svelte`**: **RESOLVED**. Reduced from 1,536 to ~330 lines by decomposing into focused modules.
- **`vault.svelte.ts`**: Holding steady at ~500 lines (down from 1,381).
- **`CanvasWorkspace.svelte`**: Staying modular at ~326 lines (down from 835).
- **`entity-store.svelte.ts`**: Maintaining boundaries at ~450 lines (down from 920).
- **`ai.ts`**: Effectively eliminated as a god file.
