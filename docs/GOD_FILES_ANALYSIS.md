# God File Analysis Report: Codex-Cryptica

This report identifies the top 10 potential "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                   | Line Count    | Type                | Status      |
| :--- | :---------------------------------------------------------- | :------------ | :------------------ | :---------- |
| 1    | `apps/web/src/lib/stores/oracle.svelte.ts`                  | ~~1,484~~ 233 | Store (State/Logic) | ✅ FIXED    |
| 2    | `apps/web/src/lib/stores/vault.svelte.ts`                   | ~~1,381~~ 364 | Store (State/Logic) | ✅ FIXED    |
| 3    | `apps/web/src/lib/components/GraphView.svelte`              | 1,371         | UI Component        | IN PROGRESS |
| 4    | `apps/web/src/lib/components/modals/ZenModeModal.svelte`    | 1,058         | UI Component        |             |
| 5    | `apps/web/src/lib/services/ai.ts`                           | 819           | Service (API/Logic) |             |
| 6    | `apps/web/src/routes/+layout.svelte`                        | 753           | UI Layout           |             |
| 7    | `packages/sync-engine/src/SyncService.ts`                   | 663           | Engine Core         |             |
| 8    | `apps/web/src/lib/components/oracle/ChatMessage.svelte`     | 620           | UI Component        |             |
| 9    | `apps/web/src/lib/components/canvas/CanvasWorkspace.svelte` | 618           | UI Component        |             |
| 10   | `apps/web/src/lib/components/map/MapView.svelte`            | 535           | UI Component        |             |

---

## Evaluation & Refactoring Strategies

### 1. `oracle.svelte.ts` (Refactored)

**Status:** ✅ **COMPLETED (2026-03-11)**
**Summary:** Refactored into `@codex/oracle-engine`. Logic isolated into `ChatHistoryService`, `OracleSettingsService`, `OracleCommandParser`, `OracleActionExecutor`, `OracleGenerator`, and `UndoRedoService`.
**Outcome:** Reduced from ~1,600 lines to 233 lines. Established Dependency Injection as a core principle.

### 2. `vault.svelte.ts` (1,381 lines)

**Current State:** The heart of the application. It manages the in-memory entity graph, coordinates OPFS file I/O, handles bulk updates, manages map and canvas metadata, and orchestrates the search index.
**Refactoring Strategy:**

- **Decouple I/O:** While some I/O is in `vault/io.ts`, the store still directly manages a lot of persistence logic. We can move more of the specific entity creation/update logic to a dedicated `VaultRepository` class.
- **Separate Indexes:** The store currently manages the active vault ID, the entities, the maps, and the canvases. We could split these into domain-specific stores (e.g., `CanvasRegistryStore`, `MapRegistryStore`) that are derived from or sync alongside a much leaner `VaultCoreStore`.

### 3. `GraphView.svelte` (1,371 lines)

**Current State:** Handles Cytoscape initialization, complex layout algorithms (FCOSE, Timeline, Orbit), event listeners (taps, drags, hovers), tooltips, the minimap overlay, filtering logic, and complex state synchronization.
**Refactoring Strategy:**

- **Extract Layout Logic:** Move the complex FCOSE parameter generation and animation sequences into an external `LayoutManager.ts` file.
- **Extract Event Handlers:** The massive `onMount` block containing all Cytoscape `.on()` listeners should be extracted into a hook (e.g., `useGraphEvents(cy, vault)`).
- **Componentize UI Overlays:** The bottom-left control bar and the hover tooltip should be extracted into their own standalone components (`GraphControls.svelte`, `GraphTooltip.svelte`) that accept `cy` or the `hoveredEntity` as props.

### 4. `ZenModeModal.svelte` (1,058 lines)

**Current State:** Likely contains a massive amount of inline editing logic, Tiptap editor initialization, markdown parsing, and complex UI state for reading/writing lore.
**Refactoring Strategy:**

- **Extract Editor Instance:** Move the Tiptap setup and plugin configuration into a dedicated `RichTextEditor.svelte` component.
- **Split Read/Write Modes:** If Zen Mode handles both viewing and editing, consider creating separate `ZenReader.svelte` and `ZenEditor.svelte` components, and have the modal act as a simple toggle between them.

### 5. `ai.ts` (819 lines)

**Current State:** Manages the Gemini API SDK, system prompt construction, RAG (Retrieval-Augmented Generation) context fusion, fuzzy matching for known entities, and specialized tasks like JSON extraction and image generation.
**Refactoring Strategy:**

- **Split by Capability:** Divide this file into domain-specific services: `TextGenerationService.ts`, `ImageGenerationService.ts`, and `ContextRetrievalService.ts`.
- **Prompt Library:** Move large string templates (like the system constitution or JSON extraction prompts) into a dedicated `prompts/` folder.

### 6. `+layout.svelte` (753 lines)

**Current State:** The root layout handles global app initialization (checking OS, setting up OPFS, checking tokens), the main shell layout, sidebar toggling, global keyboard shortcuts, and mounting all global modals.
**Refactoring Strategy:**

- **Extract Modal Registry:** Move all the `{#if ui.showModal}` blocks into a single `GlobalModalProvider.svelte` component to clean up the layout DOM.
- **Extract Keyboard Shortcuts:** Move the global `window.onkeydown` logic into a Svelte action or a dedicated `ShortcutManager` module.
- **Extract Init Logic:** Move the heavy asynchronous bootstrapping (OPFS checks, migration scripts) into a dedicated `app-init.ts` function called in `onMount`.

---

## Conclusion

The highest priority for refactoring should be **`GraphView.svelte`** and **`oracle.svelte.ts`**. These files represent the core interactive loops of the application, and their current size makes extending them highly prone to regressions (as seen with recent flickering issues). By extracting logic into modular services and smaller UI components, we can significantly improve the codebase's velocity and stability.
