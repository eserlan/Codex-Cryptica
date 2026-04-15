# Implementation Plan: Label-Grouped Entity Explorer

**Branch**: `084-label-grouped-explorer` | **Date**: 2026-04-15 | **Spec**: [./spec.md](./spec.md)
**Input**: Feature specification from `./spec.md`

## Summary

Add label grouping as an alternate explorer layout on top of the existing flat list. Preserve the current explorer selection flow, let users collapse label sections, and persist both the chosen view mode and collapsed-group state in local storage.

## Technical Context

**Language/Version**: TypeScript 6.0.2, Svelte 5.55.2  
**Primary Dependencies**: SvelteKit web app, Lucide Svelte, workspace `schema` types  
**Storage**: Existing vault entity state in memory plus browser `localStorage` for the explorer view preference and per-vault collapsed label sections  
**Testing**: Vitest unit tests plus manual explorer verification  
**Target Platform**: Web application on desktop and mobile browsers  
**Project Type**: Monorepo web application  
**Performance Goals**: Explorer mode switches should feel immediate for normal vault browsing with no noticeable delay compared with the existing flat list  
**Constraints**: Preserve search/category filtering, keep behavior client-side, and avoid introducing a new explorer subsystem for a UI-only enhancement  
**Scale/Scope**: Sidebar explorer rendering, explorer UI state, and validation for label grouping and per-vault collapse behavior

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Pass. This is an explorer presentation enhancement inside the existing web layer and does not introduce new domain logic that warrants a standalone workspace package.
2. **TDD**: Pass. The implementation includes a dedicated grouping test for the new explorer grouping behavior.
3. **Simplicity & YAGNI**: Pass. The feature extends the existing `uiStore` and `EntityList.svelte` instead of creating a separate explorer state system.
4. **Privacy & Client-Side Processing**: Pass. Grouping and preference persistence remain entirely client-side.
5. **User Documentation**: Pass for this scope. The existing entity explorer help entry remains the user-facing entry point, and the feature stays focused on label grouping without inventing new organizational concepts.
6. **Dependency Injection**: Pass. No new services or stores requiring constructor DI were introduced.
7. **Natural Language**: Pass. View labels remain simple and user-facing terms are limited to list and label.
8. **Quality & Coverage Enforcement**: Pass. The feature adds focused automated coverage for the new grouping behavior and keeps the change set inside the existing explorer surface.

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

apps/web/src/lib/config/
└── help-content.ts
```

**Structure Decision**: Keep the implementation inside the existing explorer component and shared UI store because the feature only changes explorer presentation and persisted UI preference. Supporting documentation lives entirely in the feature spec directory.

## Generated Artifacts

- **research.md**: Documents the grouping strategy, store choice, and fallback behavior decisions.
- **data-model.md**: Defines the user-facing preference, grouping, and collapsed-section concepts introduced by this enhancement.
- **quickstart.md**: Provides manual validation steps for list mode, label mode, and collapsed label persistence.
- **checklists/requirements.md**: Captures the retroactive quality check for the finalized specification.
