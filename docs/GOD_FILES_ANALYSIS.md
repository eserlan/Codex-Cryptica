# God File Analysis Report: Codex-Cryptica

_(Last updated: May 28, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

## Executive Summary (May 2026 Reassessment)

The **Map Interaction Manager Decomposition** refactor has resolved `MapInteractionManager` (626 → 407 lines) by extracting 11 focused handler modules into `components/map/interactions/` — each covering a single interaction concern (token drag, grid fit, fog painting, pin editing, measurement, box selection, etc.) and backed by its own test file.

With the UI store, P2P services, Map route, Graph surface, and Map interaction layer now modular, the largest remaining pressure points are a mix of **service-layer monoliths** (`search.svelte.ts`, `sound-bite-generator.ts`) that have grown into the critical zone, a **TemporalPicker regression** (594 → 782 lines), and the perennial **engine cores** (`renderer.ts`, `LayoutManager.ts`) and **store managers** (`map.svelte.ts`, `vtt-token-manager.svelte.ts`).

## Top 10 Largest Files (Excluding Tests & Generated Code)

| Rank | File Path                                                          | Line Count | Type          | Status        |
| :--- | :----------------------------------------------------------------- | :--------- | :------------ | :------------ |
| 1    | `packages/oracle-engine/src/sound-bite-generator.ts`               | 852        | Engine Core   | 🔴 CRITICAL   |
| 2    | `apps/web/src/lib/components/timeline/TemporalPicker.svelte`       | 782        | UI Component  | 🔴 REGRESSION |
| 3    | `apps/web/src/lib/components/zen/ZenSidebar.svelte`                | 675        | UI Component  | 🟡 WATCH      |
| 4    | `packages/map-engine/src/renderer.ts`                              | 672        | Engine Core   | 🟡 WATCH      |
| 5    | `apps/web/src/lib/services/ai/text-generation.service.svelte.ts`   | 649        | Service       | 🟡 WATCH      |
| 6    | `packages/graph-engine/src/LayoutManager.ts`                       | 637        | Engine Core   | 🟡 WATCH      |
| 7    | `apps/web/src/lib/components/zen/ZenContent.svelte`                | 617        | UI Component  | 🟡 WATCH      |
| 8    | `apps/web/src/lib/stores/map.svelte.ts`                            | 616        | Store (State) | 🟡 WATCH      |
| 9    | `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte` | 607        | UI Component  | 🟡 WATCH      |
| 10   | `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts`          | 605        | Store Manager | 🟡 WATCH      |

---

## Evaluation & Refactoring Strategies

### 1. Service-Layer Monoliths (`sound-bite-generator.ts`, `text-generation.service.svelte.ts`)

**Analysis:** `sound-bite-generator.ts` at 852 lines likely mixes generation strategy, prompt building, and output post-processing. `text-generation.service.svelte.ts` at 649 lines sits at the AI request boundary and may benefit from per-model adapters.
**Recommended Split:**

- For `sound-bite-generator.ts`, decompose into 9 modules: LM adapter (retry + content-policy), TTS backends (`gemini`, `web-speech`, `cascading`, `pcm-to-wav`), voice mapping, prompt builders, and response parser. Target: main file drops to ~120 lines (see `docs/refactoring/SOUND_BITE_GENERATOR_GODFILE_ANALYSIS.md`).
- For `text-generation.service.svelte.ts`, extract per-model request builders and response adapters to keep the service itself as a thin dispatcher.

### 2. UI Component Regression (`TemporalPicker.svelte`, `ZenSidebar.svelte`, `ZenContent.svelte`, `DetailStatusTab.svelte`)

**Analysis:** `TemporalPicker.svelte` jumped from 594 to 782 lines — a notable regression. The Zen pair (`ZenSidebar` + `ZenContent`) together account for ~1,300 lines of tightly related UI. `DetailStatusTab.svelte` at 607 lines suggests mixed display/edit/validation logic.
**Recommended Split:**

- For `TemporalPicker.svelte`, break out picker views (year, month, day) and date parsing/formatting into sub-components or pure helpers.
- For the Zen pair, audit whether each has a single clear responsibility; extract shared logic into a `ZenController` if needed.
- For `DetailStatusTab.svelte`, extract field-level editors and validation into focused sub-components.

### 3. Engine and Manager Cores (`renderer.ts`, `LayoutManager.ts`, `map.svelte.ts`, `vtt-token-manager.svelte.ts`)

**Analysis:** These files are inherently complex but their size poses a long-term maintenance risk. The map-interaction refactor showed that natural seams do exist even in engine-adjacent code.
**Recommended Split:**

- For `renderer.ts`, separate WebGL setup/teardown from the per-frame render loop.
- For `LayoutManager.ts`, isolate force-simulation configuration from layout application.
- For `map.svelte.ts` / `vtt-token-manager.svelte.ts`, continue extracting interaction-adjacent logic following the pattern established by the `interactions/` modules.

---

## Next Recommended Refactor Order

1. **`packages/oracle-engine/src/sound-bite-generator.ts`**: Largest remaining file; pure engine with clear prompt/generation/output seams.
2. **`apps/web/src/lib/components/timeline/TemporalPicker.svelte`**: Regression from 594 → 782 lines warrants attention before it grows further.
3. **`packages/map-engine/src/renderer.ts` / `packages/graph-engine/src/LayoutManager.ts`**: Reduce engine-core breadth before more UI layers depend on them.

---

## Historical Successes (Previously Fixed & Maintained)

- **`SearchService` (`search.svelte.ts`)**: **RESOLVED**. Reduced from 923 to 287 lines by extracting core indexing into `packages/search-engine` (499 lines) and decomposing orchestration into four focused collaborators — `SearchIndexPipeline` (370 lines), `SearchIndexLifecycle` (143 lines), `SearchIndexPersistence` (141 lines), and `SearchProgressCoordinator` (144 lines) (Spec 962).
- **`MapInteractionManager` (`map-interactions.svelte.ts`)**: **RESOLVED**. Reduced from 626 to 407 lines by decomposing 11 interaction concerns into focused handler modules under `components/map/interactions/` — `TokenDragHandler`, `TokenResizeHandler`, `TokenSelectionManager`, `GridInteractionHandler`, `FogInteractionHandler`, `MeasurementInteractionHandler`, `PinInteractionHandler`, `BoxSelectionHandler`, `ContextMenuInteractionHandler`, `CreationInteractionHandler`, and `MapInteractionHandlerFactory` — each backed by its own test file (Spec 965).
- **`GraphView.svelte` & `ContextMenu.svelte`**: **RESOLVED**. Reduced from ~700 lines each to ~340 and ~290 lines respectively by extracting orchestration and action logic into `GraphViewController` and `GraphContextMenuController` (Spec 825/826).
- **`oracle-executor.ts`**: **RESOLVED**. Reduced from 1,135 to 153 lines by extracting logic into 9 specialized command executors (Spec 097).
- **`host-service.svelte.ts`**: **RESOLVED**. Reduced from 917 to 263 lines by extracting P2P transport, dispatcher, and specialized handlers (Spec 098).
- **`map-session.svelte.ts`**: **RESOLVED**. Reduced from 896 to 47 lines by extracting snapshot, lifecycle, composition, and compatibility facade modules (Spec 099).
- **`guest-service.ts`**: **RESOLVED**. Reduced from 657 to 197 lines by mirroring the host-side architecture &mdash; sibling `P2PClientTransport`, generalized dispatcher, six focused guest handlers, dedicated `GuestFileClient`, `MapAssetUrlCache`, and `TokenMoveCoalescer` (Spec 100).
- **`ui.svelte.ts`**: **RESOLVED**. Reduced from 872 lines to a deleted facade by extracting notification, onboarding, session mode, modal, discovery policy, connection mode, explorer, layout, and navigation state into focused `stores/ui/*` modules (Spec 101).
- **`(app)/map/+page.svelte`**: **RESOLVED**. Reduced from 738 to 148 lines by moving route orchestration into `MapPageController` and extracting `MapHUD`, `MapUploadOverlay`, `MapVTTControlsHUD`, and `MapVTTSidebar` (Spec 103).
- **`MapView.svelte`**: **RESOLVED**. Reduced from 1,536 to ~330 lines by decomposing into focused modules.
- **`vault.svelte.ts`**: Holding steady at ~500 lines (down from 1,381).
- **`CanvasWorkspace.svelte`**: Staying modular at ~326 lines (down from 835).
- **`entity-store.svelte.ts`**: Maintaining boundaries at ~450 lines (down from 920).
- **`ai.ts`**: Effectively eliminated as a god file.
- **EntityList.svelte**: **RESOLVED**. Reduced from 510 to 349 lines (despite adding multi-level tree hierarchy, child creation, and drag-and-drop mechanics) by decomposing card rendering into `EntityListItem.svelte` (~253 lines), search/autocomplete logic into `EntityListSearch.svelte` (~189 lines), and filter/label bar UI into `EntityListFilterBar.svelte` (~140 lines) with core filtering logic isolated to pure helper `entityListFiltering.ts` (Spec 120).
