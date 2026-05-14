# God File Analysis Report: Codex-Cryptica

_(Last updated: May 13, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

A fresh reassessment on current `staging` shows that the VTT refactor has reduced the worst store-level hotspot: `map-session.svelte.ts` dropped from roughly 1,788 lines to 896 lines. That is meaningful progress, but the overall god-file risk has not disappeared. The largest remaining pressure points are now **Map UI composition**, **Oracle command execution**, **P2P hosting**, and broad global stores such as `ui.svelte.ts` and `oracle.svelte.ts`.

The historical wins are still real (`vault.svelte.ts`, `CanvasWorkspace.svelte`, and the entity store remain contained), but the project has a new top tier of files above ~900 lines that deserve deliberate extraction work before adding more feature logic.

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                    | Line Count | Type                | Status            |
| :--- | :----------------------------------------------------------- | :--------- | :------------------ | :---------------- |
| 1    | `packages/oracle-engine/src/oracle-executor.ts`              | 1,072      | Engine Core         | 🔴 NEW (CRITICAL) |
| 2    | `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts`   | 917        | Service (P2P)       | 🔴 NEW            |
| 3    | `apps/web/src/lib/stores/map-session.svelte.ts`              | 896        | Store (State/Logic) | 🟡 IMPROVED       |
| 4    | `apps/web/src/lib/stores/ui.svelte.ts`                       | 872        | Store (State)       | 🔴 NEW            |
| 5    | `apps/web/src/lib/stores/oracle.svelte.ts`                   | 790        | Store (State/Logic) | 🔴 REGRESSION     |
| 6    | `apps/web/src/routes/(app)/map/+page.svelte`                 | 735        | UI Layout           | 🔴 NEW            |
| 7    | `apps/web/src/lib/components/GraphView.svelte`               | 699        | UI Component        | 🟡 REGRESSION     |
| 8    | `packages/map-engine/src/renderer.ts`                        | 672        | Engine Core         | 🔴 NEW            |
| 9    | `apps/web/src/lib/components/graph/ContextMenu.svelte`       | 644        | UI Component        | 🔴 NEW            |
| 10   | `apps/web/src/lib/components/map/map-interactions.svelte.ts` | 532        | State Class         | 🟢 NEW (MODULAR)  |

---

## Evaluation & Refactoring Strategies

### 1. The VTT / Map Monoliths (`map-session.svelte.ts`, `(app)/map/+page.svelte`)

**Analysis:** The `MapView.svelte` refactor successfully reduced the UI component from 1,536 lines to ~330 lines by extracting logic into `MapCanvas`, `MapContextMenu`, and `MapInteractionManager`. However, `(app)/map/+page.svelte` remains a large route coordinator, and `map-session.svelte.ts` is still significant at 896 lines.
**Recommended Split:**

- Continue trimming `map-session.svelte.ts` by keeping it as a session facade over focused managers.
- Move route-specific setup and teardown out of `(app)/map/+page.svelte` into hooks or controller modules so the route file becomes layout glue.

### 2. The Oracle Monoliths (`oracle-executor.ts`, `oracle.svelte.ts`)

**Analysis:** `oracle-executor.ts` (1,072 lines) handles command routing, execution policy, and effectful integrations behind a single entrypoint. Additionally, `oracle.svelte.ts` (790 lines) has regressed from its previously refactored state of ~300 lines, accumulating new state and logic.
**Recommended Split:**

- Isolate command routing, specific tool executors, and effectful integrations in `oracle-executor.ts` into a plugin-like architecture so the executor becomes a thin dispatcher.
- Review `oracle.svelte.ts` to push business logic back down into the `oracle-engine` or extract sub-stores for distinct Oracle features (e.g., Chat History vs. Generation State).

### 3. P2P Cloud Bridge (`host-service.svelte.ts`)

**Analysis:** At 917 lines, the host service likely handles WebRTC signaling, connection management, delta synchronization, and host authority rules simultaneously.
**Recommended Split:**

- Extract the low-level WebRTC/connection management into a transport layer.
- Keep the Svelte store focused purely on reactive connection state and top-level session authority.

### 4. UI State (`ui.svelte.ts`)

**Analysis:** A generic `ui.svelte.ts` store at 872 lines indicates it has become a dumping ground for global UI state (modals, toasts, theme, layout toggles, sidebars).
**Recommended Split:**

- Decompose into feature-specific UI stores (e.g., `toast-store.svelte.ts`, `modal-store.svelte.ts`, `layout-store.svelte.ts`).

### 5. Graph Component Regressions (`GraphView.svelte`, `ContextMenu.svelte`)

**Analysis:** `GraphView.svelte` has crept back up to ~700 lines, and `ContextMenu.svelte` at 644 lines indicates an overly complex context menu logic (likely handling every possible graph node action).
**Recommended Split:**

- Extract action dispatchers and menu item configuration from `ContextMenu.svelte` into a configuration/strategy pattern.
- Re-audit `GraphView.svelte` to push newly added graph features into `packages/graph-engine/` or child components.

---

## Next Recommended Refactor Order

1. **`oracle-executor.ts`**: Critical engine hotspot where command handlers should become isolated executors.
2. **`host-service.svelte.ts` / `guest-service.ts`**: P2P service split should reduce future multiplayer risk.
3. **`ui.svelte.ts`**: Global UI state should be decomposed before it grows further.
4. **`oracle.svelte.ts`**: Push chat, generation, and reconciliation state into smaller stores/services.
5. **`(app)/map/+page.svelte`**: Reduce route coordination complexity.

---

## Historical Successes (Previously Fixed & Maintained)

- **`MapView.svelte`**: **RESOLVED**. Reduced from 1,536 to ~330 lines by decomposing into focused modules.
- **`vault.svelte.ts`**: Holding steady at ~500 lines (down from 1,381).
- **`CanvasWorkspace.svelte`**: Staying modular at ~326 lines (down from 835).
- **`entity-store.svelte.ts`**: Maintaining boundaries at ~450 lines (down from 920).
- **`ai.ts`**: Effectively eliminated as a god file.
