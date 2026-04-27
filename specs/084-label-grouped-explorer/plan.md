# Implementation Plan: Label-Grouped Entity Explorer & Filtering

**Branch**: `issue/701-label-filtering` | **Date**: 2026-04-23 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `./spec.md`

## Summary

Add label grouping as an alternate explorer layout and implement a robust label-based filtering system. Make label pills interactive to allow quick drilling down into sub-collections using "AND" logic. Preserve the current explorer selection flow, let users collapse label sections, and persist both the chosen view mode and collapsed-group state.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)
**Primary Dependencies**: SvelteKit web app, Lucide Svelte, workspace `schema` types, `uiStore`
**Storage**: Existing vault entity state in memory plus browser `localStorage` for the explorer view preference, per-vault collapsed label sections, and active label filters (if persistence is desired).
**Testing**: Vitest unit tests for filtering logic and UI interactions.
**Target Platform**: Web application on desktop and mobile browsers.
**Performance Goals**: Explorer mode switches and label filtering should feel immediate (<100ms) for normal vault browsing.
**Constraints**: Preserve search/category filtering, keep behavior client-side, and avoid introducing a new explorer subsystem.
**Scale/Scope**: Sidebar explorer rendering, explorer UI state, filtering logic in `EntityList.svelte`, and validation for label grouping and filtering behavior.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Pass. This is an explorer presentation and filtering enhancement inside the existing web layer.
2. **TDD**: Pass. The implementation will include tests for the new "AND" filtering logic and label search integration.
3. **Simplicity & YAGNI**: Pass. The feature extends the existing `EntityList.svelte` filtering logic instead of creating a separate system.
4. **Privacy & Client-Side Processing**: Pass. Filtering and preference persistence remain entirely client-side.
5. **User Documentation**: Pass. The feature stays focused on label discovery without inventing new concepts.
6. **Dependency Injection**: Pass. Uses existing `uiStore` and `vault` store.
7. **Natural Language**: Pass. Uses standard terminology like "labels" and "filters".
8. **Quality & Coverage Enforcement**: Pass. Adds focused automated coverage for the new filtering behavior.

## Project Structure

### Documentation (this feature)

```text
specs/084-label-grouped-explorer/
├── checklists/
│   └── requirements.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/web/src/lib/components/explorer/
├── EntityList.svelte
├── EntityList.test.ts
└── EntityListGrouping.test.ts

apps/web/src/lib/stores/
└── ui.svelte.ts
```

**Structure Decision**: Keep the implementation inside the existing explorer component because the filtering logic is tightly coupled with the list rendering. Supporting documentation lives entirely in the feature spec directory.

## Generated Artifacts

- **research.md**: Documents the grouping strategy, store choice, and fallback behavior decisions.
- **data-model.md**: Defines the user-facing preference, grouping, and collapsed-section concepts introduced by this enhancement.
- **quickstart.md**: Provides manual validation steps for list mode, label mode, and collapsed label persistence.
- **checklists/requirements.md**: Captures the retroactive quality check for the finalized specification.
