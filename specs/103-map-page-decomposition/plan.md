# Implementation Plan: Map Page Decomposition

**Branch**: `103-map-page-decomposition` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/103-map-page-decomposition/spec.md`

## Summary

Decompose the monolithic `+page.svelte` (738 lines) in the Map route into a thin view layer driven by a reactive `MapPageController`. Complex UI surfaces like the VTT Sidebar, GM Controls, and Map HUD will be extracted into focused sub-components to improve maintainability and testability.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes)
**Primary Dependencies**: SvelteKit, Tailwind CSS 4, Lucide Svelte (Iconify utility pattern)
**Storage**: N/A (Transient route state)
**Testing**: Vitest (Unit tests for Controller)
**Target Platform**: Browser (WASM/Client-side)
**Project Type**: Web Application
**Performance Goals**: Zero-overhead reactivity using Runes; eliminate unnecessary re-renders in the heavy Map component.
**Constraints**: Must maintain 100% functional parity; NO changes to existing `mapStore` or `mapSession` public APIs.
**Scale/Scope**: 1 Route coordinator, 1 Controller class, 4 primary extracted sub-components plus supporting existing map/VTT components.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                  | Status | Note                                                                 |
| :------------------------- | :----- | :------------------------------------------------------------------- |
| I. Library-First           | ✓ PASS | Moving orchestration logic into `stores/map/` controller.            |
| II. TDD                    | ✓ PASS | `MapPageController` will have dedicated unit tests.                  |
| III. Simplicity/YAGNI      | ✓ PASS | Solving only the monolithic component issue.                         |
| V. Privacy                 | ✓ PASS | All logic remains client-side.                                       |
| VI. Clean Implementation   | ✓ PASS | Adhering to Svelte 5 Runes and Tailwind 4.                           |
| VIII. Dependency Injection | ✓ PASS | Controller will use constructor DI for stores.                       |
| X. Quality/Coverage        | ✓ PASS | Aiming for 80%+ unit coverage on the new controller to match SC-003. |

## Project Structure

### Documentation (this feature)

```text
specs/103-map-page-decomposition/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── routes/(app)/map/
│   └── +page.svelte                  # Refactored thin view
├── lib/
│   ├── components/map/
│   │   ├── MapHUD.svelte             # Extracted top toolbar
│   │   ├── MapVTTControlsHUD.svelte  # Extracted GM/VTT controls HUD
│   │   └── MapUploadOverlay.svelte   # Extracted upload modal
│   ├── components/vtt/
│   │   └── MapVTTSidebar.svelte      # Extracted VTT sidebar
│   └── stores/map/
│       ├── map-page-controller.svelte.ts # New orchestration logic
│       └── map-page-controller.test.ts   # New controller tests
```

**Structure Decision**: Option 2: Web application. The refactor primarily affects the Map route and its supporting components/stores.

## Complexity Tracking

_No constitution violations detected._
