# God File Analysis Report: Codex-Cryptica

This report identifies the top 10 potential "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                   | Line Count    | Type                | Status   |
| :--- | :---------------------------------------------------------- | :------------ | :------------------ | :------- |
| 1    | `apps/web/src/lib/stores/oracle.svelte.ts`                  | ~~1,484~~ 233 | Store (State/Logic) | ✅ FIXED |
| 2    | `apps/web/src/lib/stores/vault.svelte.ts`                   | ~~1,381~~ 364 | Store (State/Logic) | ✅ FIXED |
| 3    | `apps/web/src/lib/components/GraphView.svelte`              | ~~1,371~~ 449 | UI Component        | ✅ FIXED |
| 4    | `apps/web/src/lib/components/modals/ZenModeModal.svelte`    | ~~1,058~~ 364 | UI Component        | ✅ FIXED |
| 5    | `apps/web/src/lib/services/ai.ts`                           | ~~819~~ 1     | Service (API/Logic) | ✅ FIXED |
| 6    | `apps/web/src/routes/+layout.svelte`                        | 795           | UI Layout           | 🔥 NEXT |
| 7    | `apps/web/src/lib/components/map/MapView.svelte`            | 681           | UI Component        | 🔥 NEXT |
| 8    | `packages/sync-engine/src/SyncService.ts`                   | 663           | Engine Core         | 🟡 SOON |
| 9    | `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte` | 618           | UI Component        |          |
| 10   | `apps/web/src/lib/components/oracle/ChatMessage.svelte`     | 632           | UI Component        |          |

---

## Evaluation & Refactoring Strategies

### 1. `oracle.svelte.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-11)**
**Summary:** Refactored into `@codex/oracle-engine`. Logic isolated into `ChatHistoryService`, `OracleSettingsService`, `OracleCommandParser`, `OracleActionExecutor`, `OracleGenerator`, and `UndoRedoService`.
**Outcome:** Reduced from ~1,600 lines to 233 lines. Established Dependency Injection as a core principle.

### 2. `vault.svelte.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-11)**
**Summary:** Refactored into `@codex/vault-engine` and specialized stores. Logic decoupled into `VaultRegistryStore`, `MapRegistryStore`, `CanvasRegistryStore`, and `VaultRepository`.
**Outcome:** Reduced from ~1,400 lines to 364 lines. Improved data separation and persistence logic.

### 3. `GraphView.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-12)**
**Summary:** Refactored into modular components and decoupled logic. Extracted `GraphHUD`, `GraphToolbar`, `GraphTooltip`, and `EdgeEditorModal` UI components. Moved layout execution to `LayoutManager`, styling to `GraphStyles`, event handling to `useGraphEvents`, and element synchronization to `useGraphSync`.
**Outcome:** Reduced from 1,371 lines to 449 lines. Improved viewport stability and eliminated image loading jitter. Established a clear separation between the UI layer and the visualization engine.

### 4. `ZenModeModal.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-12)**
**Summary:** Refactored into a modal orchestration shell with extracted editor/view subcomponents and isolated state handling.
**Outcome:** Reduced from 1,058 lines to 364 lines and aligned with the modular component patterns established by GraphView.

### 5. `ai.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-13)**
**Summary:** Decomposed into specialized services under `services/ai/` for orchestration, prompts, generation, and retrieval.
**Outcome:** `ai.ts` now serves as a compatibility/export shim (1 line), dramatically reducing coupling and making AI capabilities independently testable.

### 6. `+layout.svelte` (795 lines)

**Current State:** The root layout handles global app initialization (checking OS, setting up OPFS, checking tokens), the main shell layout, sidebar toggling, global keyboard shortcuts, and mounting all global modals.
**Refactoring Strategy:**

- **Extract Modal Registry:** Move all the `{#if ui.showModal}` blocks into a single `GlobalModalProvider.svelte` component to clean up the layout DOM.
- **Extract Keyboard Shortcuts:** Move the global `window.onkeydown` logic into a Svelte action or a dedicated `ShortcutManager` module.
- **Extract Init Logic:** Move the heavy asynchronous bootstrapping (OPFS checks, migration scripts) into a dedicated `app-init.ts` function called in `onMount`.

---

## Conclusion

The highest priority for refactoring should now shift to **`+layout.svelte`** and **`MapView.svelte`**, followed by **`SyncService.ts`**. The successful refactors of `oracle.svelte.ts`, `vault.svelte.ts`, `GraphView.svelte`, `ZenModeModal.svelte`, and `ai.ts` have validated a modular extraction strategy that should now be applied to global shell orchestration, map interactions, and sync-core responsibilities.
