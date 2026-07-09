# God File Analysis Report: Codex-Cryptica

_(Last updated: July 4, 2026)_

This report identifies the top "God Files" (files with excessive responsibilities and high line counts) in the Codex-Cryptica repository. Refactoring these files will improve maintainability, testability, and long-term project health.

Large data/config files (e.g. `packages/generator-engine/src/public-*.ts` generator tables, `apps/web/src/lib/config/seo-pages.ts`, `packages/schema/src/theme-templates.ts`, `EntityTemplateConstants.ts`) are excluded from this ranking — they are single-responsibility data definitions whose size comes from content volume, not coupling, so decomposition would add indirection without reducing complexity.

## Executive Summary (July 2026 Reassessment)

The **SoundBiteGenerator Decomposition** refactor remains resolved (`sound-bite-generator.ts` at 169 lines). `GeneratorPageContent.svelte` (formerly 1467 lines) is **RESOLVED** at 581 lines (#1601). `SEOGeneratorLayout.svelte` (formerly 1462 lines, was the top offender) is now also **RESOLVED** at 831 lines — unlike its sibling, its bloat wasn't per-slug branching (that file is fully generic over slug via props/snippet) but four independently-extractable concerns: JSON-LD builders (`generator-json-ld.ts`), a self-contained generator-switcher dropdown (`GeneratorSwitcherMenu.svelte`), two modals (`SaveToCodexModal.svelte`, `EntityDetailModal.svelte`), and the large generated-content display block (`GeneratorOutputCard.svelte`), plus two trivial sections (`FaqSection.svelte`, `RelatedLinksSection.svelte`). No new top-of-list offender has surfaced yet — `text-generation.service.svelte.ts` (894 lines) is next. `TemporalPicker.svelte` grew slightly (856 → 859) and remains a regression risk. `DetailStatusTab.svelte` improved (902 → 715) and `ZenSidebar.svelte` improved (867 → 738), likely from incidental cleanup during other feature work — both downgraded from WATCH accordingly. `import-settings-controller.svelte.ts` (830 lines) is a new entrant combining import parsing, validation, and settings-mutation concerns.

## Top 10 Largest Files (Excluding Tests, Generated Code & Data/Config Files)

| Rank | File Path                                                                   | Line Count | Type          | Status        |
| :--- | :-------------------------------------------------------------------------- | :--------- | :------------ | :------------ |
| 1    | `apps/web/src/lib/services/ai/text-generation.service.svelte.ts`            | 894        | Service       | 🟡 WATCH      |
| 2    | `apps/web/src/lib/components/timeline/TemporalPicker.svelte`                | 859        | UI Component  | 🔴 REGRESSION |
| 3    | `apps/workers/oracle-proxy/src/index.ts`                                    | 856        | Worker Router | 🟡 WATCH      |
| 4    | `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts` | 830        | Controller    | 🔴 NEW        |
| 5    | `apps/web/src/lib/stores/vault/entity-store.svelte.ts`                      | 825        | Store (State) | 🟡 WATCH      |
| 6    | `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`                 | 831        | UI Component  | 🟢 RESOLVED   |
| 7    | `apps/web/src/lib/components/zen/ZenSidebar.svelte`                         | 738        | UI Component  | 🟢 IMPROVED   |
| 8    | `packages/generator-engine/src/public-social-hub.ts`                        | 731        | Generator     | ⚪ DATA       |
| 9    | `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte`          | 715        | UI Component  | 🟢 IMPROVED   |
| 10   | `apps/web/src/lib/components/seo/GeneratorPageContent.svelte`               | 581        | UI Component  | 🟢 RESOLVED   |

---

## Evaluation & Refactoring Strategies

### 1. Service-Layer Monoliths (`text-generation.service.svelte.ts`)

**Analysis:** `text-generation.service.svelte.ts` at 894 lines sits at the AI request boundary and may benefit from per-model adapters.
**Recommended Split:**

- For `text-generation.service.svelte.ts`, extract per-model request builders and response adapters to keep the service itself as a thin dispatcher.

### 2. UI Component Regression (`TemporalPicker.svelte`)

**Analysis:** `TemporalPicker.svelte` remains elevated at 859 lines (previously flagged as a regression from 594). `ZenSidebar.svelte` (738) and `DetailStatusTab.svelte` (715) have both improved since the last pass and no longer need urgent attention.
**Recommended Split:**

- For `TemporalPicker.svelte`, break out picker views (year, month, day) and date parsing/formatting into sub-components or pure helpers.

### 3. New Entrant: `import-settings-controller.svelte.ts`

**Analysis:** At 830 lines, this controller appears to combine import-file parsing, schema validation, and settings-store mutation in one place.
**Recommended Split:**

- Separate the parsing/validation layer (pure, testable) from the settings-mutation/apply layer (stateful), following the pattern used for `host-service.svelte.ts` and `guest-service.ts`.

### 4. Worker Router (`oracle-proxy/src/index.ts`)

**Analysis:** At 856 lines, this Cloudflare Worker entry point routes requests across Gemini proxying, vault publishing, asset upload/delete, and public-listing handlers. `publish.ts` (864 lines) already carries much of the publish-specific logic, so `index.ts`'s size is mostly routing/CORS/auth boilerplate repeated per handler.
**Recommended Split:**

- Extract a small router/middleware helper (CORS + auth check) shared across handlers so `index.ts` reduces to route registration.

### 5. Engine and Manager Cores (`renderer.ts`, `LayoutManager.ts`, `map.svelte.ts`, `vtt-token-manager.svelte.ts`)

**Analysis:** These files are inherently complex but their size poses a long-term maintenance risk. The map-interaction refactor showed that natural seams do exist even in engine-adjacent code.
**Recommended Split:**

- For `renderer.ts`, separate WebGL setup/teardown from the per-frame render loop.
- For `LayoutManager.ts`, isolate force-simulation configuration from layout application.
- For `map.svelte.ts` / `vtt-token-manager.svelte.ts`, continue extracting interaction-adjacent logic following the pattern established by the `interactions/` modules.

---

## Next Recommended Refactor Order

1. **`apps/web/src/lib/services/ai/text-generation.service.svelte.ts`**: Now the largest non-resolved file at 894 lines; extract per-model request builders and response adapters.
2. **`apps/web/src/lib/components/timeline/TemporalPicker.svelte`**: Still elevated at 859 lines; address before it grows further.
3. **`apps/web/src/lib/components/settings/import-settings-controller.svelte.ts`**: New 830-line entrant mixing parsing and mutation concerns.
4. **`apps/workers/oracle-proxy/src/index.ts`**: Extract shared routing/CORS boilerplate.

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
- **`SoundBiteGenerator` (`sound-bite-generator.ts`)**: **RESOLVED**. Reduced from 852 to 169 lines by decomposing prompt builders, voice mapping, JSON parsing, and TTS drivers into 9 focused modules under `packages/oracle-engine` (closes #1303).
- **`GeneratorPageContent.svelte`**: **RESOLVED**. Reduced from 1467 to 581 lines by extracting `slugMeta`/`slugDrafts` into standalone data files, finishing the `*FormFields.svelte` pattern for the 3 slugs (`settlement`, `magic-item`, `ship-generator`) that were still inlined, and moving hub/theme mapping tables into `generator-theme-maps.ts` (#1601).
- **`SEOGeneratorLayout.svelte`**: **RESOLVED**. Reduced from 1462 to 831 lines by extracting JSON-LD builders (`generator-json-ld.ts`), the generator-switcher dropdown (`GeneratorSwitcherMenu.svelte`), the FAQ and related-links sections (`FaqSection.svelte`, `RelatedLinksSection.svelte`), two modals (`SaveToCodexModal.svelte`, `EntityDetailModal.svelte`), and the large generated-content display block (`GeneratorOutputCard.svelte`) (#1601).
