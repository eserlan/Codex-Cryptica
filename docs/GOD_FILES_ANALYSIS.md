# God File Analysis Report: Codex-Cryptica

This report identifies the top 10 potential "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                   | Line Count      | Type                | Status   |
| :--- | :---------------------------------------------------------- | :-------------- | :------------------ | :------- |
| 1    | `apps/web/src/lib/stores/oracle.svelte.ts`                  | ~~1,484~~ 304   | Store (State/Logic) | ✅ FIXED |
| 2    | `apps/web/src/lib/stores/vault.svelte.ts`                   | ~~1,381~~ 1,261 | Store (State/Logic) | ✅ FIXED |
| 3    | `apps/web/src/lib/components/GraphView.svelte`              | ~~1,371~~ 561   | UI Component        | ✅ FIXED |
| 4    | `apps/web/src/lib/components/modals/ZenModeModal.svelte`    | ~~1,058~~ 372   | UI Component        | ✅ FIXED |
| 5    | `apps/web/src/lib/services/ai.ts`                           | ~~819~~ 1       | Service (API/Logic) | ✅ FIXED |
| 6    | `apps/web/src/routes/(app)/+layout.svelte`                  | ~~795~~ 222     | UI Layout           | ✅ FIXED |
| 7    | `apps/web/src/lib/components/map/MapView.svelte`            | ~~681~~ 448     | UI Component        | ✅ FIXED |
| 8    | `packages/sync-engine/src/SyncService.ts`                   | 711             | Engine Core         | 🟡 SOON  |
| 9    | `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte` | 835             | UI Component        |          |
| 10   | `apps/web/src/lib/components/oracle/ChatMessage.svelte`     | 629             | UI Component        |          |

---

## Evaluation & Refactoring Strategies

### 1. `oracle.svelte.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-11)**
**Summary:** Refactored into `@codex/oracle-engine`. Logic isolated into `ChatHistoryService`, `OracleSettingsService`, `OracleCommandParser`, `OracleActionExecutor`, `OracleGenerator`, and `UndoRedoService`.
**Outcome:** Reduced from ~1,600 lines to 304 lines. Established Dependency Injection as a core principle.

### 2. `vault.svelte.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-11)**
**Summary:** Refactored into `@codex/vault-engine` and specialized stores. Logic decoupled into `VaultRegistryStore`, `MapRegistryStore`, `CanvasRegistryStore`, and `VaultRepository`.
**Outcome:** Reduced from ~1,400 lines to 1,261 lines. Improved data separation and persistence logic.

### 3. `GraphView.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-12)**
**Summary:** Refactored into modular components and decoupled logic. Extracted `GraphHUD`, `GraphToolbar`, `GraphTooltip`, and `EdgeEditorModal` UI components. Moved layout execution to `LayoutManager`, styling to `GraphStyles`, event handling to `useGraphEvents`, and element synchronization to `useGraphSync`.
**Outcome:** Reduced from 1,371 lines to 561 lines. Improved viewport stability and eliminated image loading jitter. Established a clear separation between the UI layer and the visualization engine.

### 4. `ZenModeModal.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-12)**
**Summary:** Refactored into a modal orchestration shell with extracted editor/view subcomponents and isolated state handling.
**Outcome:** Reduced from 1,058 lines to 372 lines and aligned with the modular component patterns established by GraphView.

### 5. `ai.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-13)**
**Summary:** Decomposed into specialized services under `services/ai/` for orchestration, prompts, generation, and retrieval.
**Outcome:** `ai.ts` now serves as a compatibility/export shim (1 line), dramatically reducing coupling and making AI capabilities independently testable.

### 6. `+layout.svelte` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-22)**
**Summary:** Restructured layout architecture using SvelteKit route groups. Created `(app)` route group for workspace routes, moved workspace routes into it, and stripped root layout to minimal shell.
**Outcome:**

- Root `+layout.svelte` reduced from 261 lines to 222 lines
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
**Outcome:** Reduced from ~~681~~ 448 lines. The map-specific logic is now more testable and less tightly coupled.

---

## Conclusion

The biggest remaining risks are no longer the historically-fixed monoliths, but the live high-coupling shells at the top of the current list. The next refactor pass should focus on files that combine UI, state, and side effects in a way that is still hard to test or reason about, rather than simply chasing line count.

## Next Actions

The next pass should focus on the four or five files below. Each one either concentrates too many responsibilities in one module or is likely to hide a reusable boundary that can be extracted cleanly.

### 1. `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte`

**Why now:** This is the largest remaining file and the strongest signal that the canvas workspace still mixes rendering, pointer interaction, selection, keyboard shortcuts, tool dispatch, and workspace coordination in one place.
**Recommended split:** Extract tool-specific interaction handlers, selection/command state, and rendering helpers into separate modules or child components. Keep the shell focused on composition and event wiring.

### 2. `apps/web/src/lib/stores/vault/entity-store.svelte.ts`

**Why now:** This store is the biggest vault-adjacent state module and likely carries entity lifecycle, indexing, sync hooks, and persistence boundaries.
**Recommended split:** Separate pure entity CRUD/state from persistence and indexing concerns. If this file still knows too much about vault-wide coordination, move that logic into a dedicated service or coordinator.

### 3. `packages/oracle-engine/src/oracle-executor.ts`

**Why now:** Engine code tends to accumulate orchestration, validation, and side effects behind a single entrypoint. It is a good candidate for clearer seams because the behavior is usually deterministic enough to test in layers.
**Recommended split:** Isolate command routing, execution policy, and effectful integrations so the executor becomes a thin dispatcher instead of a multi-role coordinator.

### 4. `apps/web/src/lib/components/settings/SettingsModal.svelte`

**Why now:** Settings modals commonly become a dumping ground for vault, sync, theme, export/import, and preference flows.
**Recommended split:** Extract the modal sections by concern, and move non-visual settings logic into store/service modules so the modal becomes a layout shell with tabs or sections.

### 5. `apps/web/src/lib/components/settings/ImportSettings.svelte`

**Why now:** Import flows often hide parsing, validation, preview, and merge logic in a component that should mostly just present state.
**Recommended split:** Pull parsing and file/format validation out of the component. Keep the Svelte file responsible for UX and status display only.

### Secondary Candidates

`apps/web/src/lib/components/GraphView.svelte`, `apps/web/src/routes/(app)/+page.svelte`, `apps/web/src/lib/components/world/FrontPage.svelte`, and `apps/web/src/lib/stores/ui.svelte.ts` should stay on watch, but they are lower priority than the files above. They may still be large shells, but they are less obviously the source of architectural coupling than `CanvasWorkspace`, `entity-store`, and `oracle-executor`.
