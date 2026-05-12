# God File Analysis Report: Codex-Cryptica

_(Last updated: May 11, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

A recent reassessment has revealed a significant shift in the codebase's technical debt. While many of the historical "God Files" (like `vault.svelte.ts` and `CanvasWorkspace.svelte`) have stayed modular, a massive influx of new code—primarily around the **VTT / Map Engine**, **P2P Cloud Bridge**, and **Oracle enhancements**—has created a new generation of monolithic files. Furthermore, some previously refactored files (such as `MapView.svelte` and `oracle.svelte.ts`) have suffered severe regressions.

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                  | Line Count | Type                | Status            |
| :--- | :--------------------------------------------------------- | :--------- | :------------------ | :---------------- |
| 1    | `apps/web/src/lib/stores/map-session.svelte.ts`            | 1,788      | Store (State/Logic) | 🔴 NEW (CRITICAL) |
| 2    | `apps/web/src/lib/components/map/MapView.svelte`           | 1,536      | UI Component        | 🔴 REGRESSION     |
| 3    | `packages/oracle-engine/src/oracle-executor.ts`            | 1,072      | Engine Core         | 🔴 NEW (CRITICAL) |
| 4    | `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts` | 917        | Service (P2P)       | 🔴 NEW            |
| 5    | `apps/web/src/lib/stores/ui.svelte.ts`                     | 872        | Store (State)       | 🔴 NEW            |
| 6    | `apps/web/src/lib/stores/oracle.svelte.ts`                 | 790        | Store (State/Logic) | 🔴 REGRESSION     |
| 7    | `apps/web/src/routes/(app)/map/+page.svelte`               | 735        | UI Layout           | 🔴 NEW            |
| 8    | `apps/web/src/lib/components/GraphView.svelte`             | 699        | UI Component        | 🟡 REGRESSION     |
| 9    | `packages/map-engine/src/renderer.ts`                      | 672        | Engine Core         | 🔴 NEW            |
| 10   | `apps/web/src/lib/components/graph/ContextMenu.svelte`     | 644        | UI Component        | 🔴 NEW            |

---

## Evaluation & Refactoring Strategies

### 1. The VTT / Map Monoliths (`map-session.svelte.ts`, `MapView.svelte`, `(app)/map/+page.svelte`)

**Analysis:** The introduction of the VTT and Map features has severely overloaded these files. `map-session.svelte.ts` at 1,788 lines is the largest file in the project, likely orchestrating state, rendering loops, multiplayer sync, and fog of war all in one place. `MapView.svelte` (1,536 lines) was previously refactored but has completely ballooned with VTT features.
**Recommended Split:**

- Decouple pure rendering state from multiplayer session state.
- Extract P2P sync handlers out of the map session store into dedicated sync coordinators.
- Split `MapView.svelte` into smaller composite components (e.g., `MapCanvas`, `TokenLayer`, `FogLayer`, `VTTControls`).

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

## Historical Successes (Previously Fixed & Maintained)

- **`vault.svelte.ts`**: Holding steady at ~500 lines (down from 1,381).
- **`CanvasWorkspace.svelte`**: Staying modular at ~326 lines (down from 835).
- **`entity-store.svelte.ts`**: Maintaining boundaries at ~450 lines (down from 920).
- **`ai.ts`**: Effectively eliminated as a god file.
