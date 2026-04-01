# God File Analysis Report: Codex-Cryptica

This report identifies the top 10 potential "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                   | Line Count      | Type                | Status   |
| :--- | :---------------------------------------------------------- | :-------------- | :------------------ | :------- |
| 1    | `apps/web/src/lib/stores/oracle.svelte.ts`                  | ~~1,484~~ 303   | Store (State/Logic) | ✅ FIXED |
| 2    | `apps/web/src/lib/stores/vault.svelte.ts`                   | ~~1,381~~ 1,260 | Store (State/Logic) | ✅ FIXED |
| 3    | `apps/web/src/lib/components/GraphView.svelte`              | ~~1,371~~ 560   | UI Component        | ✅ FIXED |
| 4    | `apps/web/src/lib/components/modals/ZenModeModal.svelte`    | ~~1,058~~ 371   | UI Component        | ✅ FIXED |
| 5    | `apps/web/src/lib/services/ai.ts`                           | ~~819~~ 1       | Service (API/Logic) | ✅ FIXED |
| 6    | `apps/web/src/routes/(app)/+layout.svelte`                  | ~~795~~ 221     | UI Layout           | ✅ FIXED |
| 7    | `apps/web/src/lib/components/map/MapView.svelte`            | ~~681~~ 447     | UI Component        | ✅ FIXED |
| 8    | `packages/sync-engine/src/SyncService.ts`                   | 711             | Engine Core         | 🟡 SOON  |
| 9    | `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte` | 835             | UI Component        |          |
| 10   | `apps/web/src/lib/components/oracle/ChatMessage.svelte`     | 629             | UI Component        |          |

---

## Evaluation & Refactoring Strategies

### 1. `oracle.svelte.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-11)**
**Summary:** Refactored into `@codex/oracle-engine`. Logic isolated into `ChatHistoryService`, `OracleSettingsService`, `OracleCommandParser`, `OracleActionExecutor`, `OracleGenerator`, and `UndoRedoService`.
**Outcome:** Reduced from ~1,600 lines to 303 lines. Established Dependency Injection as a core principle.

### 2. `vault.svelte.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-11)**
**Summary:** Refactored into `@codex/vault-engine` and specialized stores. Logic decoupled into `VaultRegistryStore`, `MapRegistryStore`, `CanvasRegistryStore`, and `VaultRepository`.
**Outcome:** Reduced from ~1,400 lines to 1,260 lines. Improved data separation and persistence logic.

### 3. `GraphView.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-12)**
**Summary:** Refactored into modular components and decoupled logic. Extracted `GraphHUD`, `GraphToolbar`, `GraphTooltip`, and `EdgeEditorModal` UI components. Moved layout execution to `LayoutManager`, styling to `GraphStyles`, event handling to `useGraphEvents`, and element synchronization to `useGraphSync`.
**Outcome:** Reduced from 1,371 lines to 560 lines. Improved viewport stability and eliminated image loading jitter. Established a clear separation between the UI layer and the visualization engine.

### 4. `ZenModeModal.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-12)**
**Summary:** Refactored into a modal orchestration shell with extracted editor/view subcomponents and isolated state handling.
**Outcome:** Reduced from 1,058 lines to 371 lines and aligned with the modular component patterns established by GraphView.

### 5. `ai.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-13)**
**Summary:** Decomposed into specialized services under `services/ai/` for orchestration, prompts, generation, and retrieval.
**Outcome:** `ai.ts` now serves as a compatibility/export shim (1 line), dramatically reducing coupling and making AI capabilities independently testable.

### 6. `+layout.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-22)**
**Summary:** Restructured layout architecture using SvelteKit route groups. Created `(app)` route group for workspace routes, moved workspace routes into it, and stripped root layout to minimal shell.
**Outcome:**

- Root `+layout.svelte` reduced from 261 lines to 221 lines
- Marketing pages no longer load workspace JS (stores, bootSystem, modals)
- Clean separation between marketing routes (`(marketing)`) and workspace routes (`(app)`)
- Build passes, all 152 tests pass

**Changes:**

- Created `routes/(app)/` route group with full workspace layout
- Moved `+page.svelte`, `map/`, `canvas/`, `oracle/`, `help/`, `timeline/`, `import/` into `(app)`
- Stripped root `+layout.svelte` to minimal HTML shell with SEO meta tags
- Fixed relative imports in moved pages

### 7. `MapView.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-04-01)**
**Summary:** Split into a thin composition shell with extracted loader, fog painter, pin popover, and pure interaction helpers. The remaining component now focuses on orchestration and rendering glue rather than owning every map concern directly.
**Outcome:** Reduced from ~~681~~ 447 lines. The map-specific logic is now more testable and less tightly coupled.

---

## Conclusion

The highest priority for refactoring should now shift to **`SyncService.ts`**, followed by any remaining large UI shells such as `CanvasWorkspace.svelte` and `ChatMessage.svelte`. The successful refactors of `oracle.svelte.ts`, `vault.svelte.ts`, `GraphView.svelte`, `ZenModeModal.svelte`, `ai.ts`, and `MapView.svelte` have validated a modular extraction strategy that should now be applied to sync-core responsibilities and any remaining high-entropy UI containers.
