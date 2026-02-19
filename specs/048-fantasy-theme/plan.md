# Implementation Plan: Ancient Parchment Theme

**Branch**: `048-fantasy-theme` | **Date**: 2026-02-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-fantasy-theme/spec.md`

## Summary

This plan outlines the implementation of the "Ancient Parchment Theme," which will become the new default theme for the application. The implementation will focus on updating the existing theme schema and engine to incorporate a new, highly-detailed styling template. This includes a typography overhaul using a distinct Serif font for headers, a muted "ink and dye" color palette for the graph, and texture integration into UI components to create a more immersive, "enchanted book" feel.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte 5 (Runes)
**Primary Dependencies**: Tailwind CSS 4.0, Cytoscape.js
**Storage**: `localStorage` (for persisting the theme choice)
**Testing**: Vitest (Unit), Playwright (E2E for visual regression)
**Target Platform**: Modern Browsers
**Project Type**: Web (Monorepo)
**Performance Goals**: Theme switching must complete in under 200ms without layout shifts. All themed components must maintain WCAG AA contrast ratios.
**Constraints**: All new styling must be implemented via the existing `StylingTemplate` schema and CSS variables to ensure theme-switching remains robust.
**Scale/Scope**: Affects all visual components of the `apps/web` application.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: The core theme engine (`theme.svelte.ts`) and `StylingTemplate` schema are already part of the reusable architecture. This change is primarily a data and configuration update. [PASS]
2. **TDD**: E2E tests will be created to verify theme application and visual consistency. Unit tests are not practical for validating visual styles. [PASS]
3. **Simplicity**: Leverages the existing theme engine rather than introducing a new system. [PASS]
4. **AI-First**: N/A for a purely stylistic feature.
5. **Privacy**: All theme data and preferences are stored locally in the browser. [PASS]
6. **Clean Implementation**: Adheres to Svelte 5 and Tailwind 4 standards. [PASS]
7. **User Documentation**: A new help article will be created to describe the theme system and how to use it. [PASS]

## Project Structure

### Documentation (this feature)

```text
specs/048-fantasy-theme/
├── plan.md              # This file
├── research.md          # N/A for this feature
├── data-model.md        # N/A (updates existing schema)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
apps/
└── web/
    └── src/
        ├── lib/
        │   └── stores/
        │       └── theme.svelte.ts # UPDATED: Logic to set new default
        └── static/
            └── themes/             # ADDED: New textures/assets

packages/
└── schema/
    └── src/
        └── themes/
            ├── ancient-parchment.ts # NEW: Theme definition
            └── index.ts             # UPDATED: Export new theme
```

**Structure Decision**: The implementation will modify the existing theme engine within the `apps/web` application and update the shared `packages/schema` to include the new theme definition, following the established monorepo pattern.

## Complexity Tracking

N/A - No violations of the constitution.
