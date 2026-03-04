# Implementation Plan: Move Oracle to Left Sidebar

**Branch**: `065-move-oracle-sidebar` | **Date**: 2026-03-04 | **Spec**: [/specs/065-move-oracle-sidebar/spec.md](/specs/065-move-oracle-sidebar/spec.md)
**Input**: Feature specification from `/specs/065-move-oracle-sidebar/spec.md`

## Summary

This feature relocates the Lore Oracle from a floating action button to a persistent left sidebar. The technical approach involves a layout refactor in `+layout.svelte` to introduce a `flex-row` container, the creation of a new `LeftSidebar.svelte` component for tool management, and the encapsulation of the Oracle chat interface into a fixed `OracleSidebarPanel.svelte`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+, Svelte 5 (Runes)  
**Primary Dependencies**: SvelteKit, Lucide Svelte, Tailwind 4  
**Storage**: LocalStorage (via `uiStore`)

**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Modern Browsers (Offline-capable)
**Project Type**: Web Application  
**Performance Goals**: 60fps transitions, <100ms response time  
**Constraints**: Fully responsive (Mobile support via bottom bar or overlay)  
**Scale/Scope**: Layout refactor + 2 components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: Navigation logic encapsulated in `uiStore`. (PASS)
- **II. TDD**: Tests planned for sidebar state transitions. (PASS)
- **III. Simplicity & YAGNI**: Reusing existing components where possible. (PASS)
- **IV. AI-First Extraction**: Oracle remains the core AI entry point. (PASS)
- **V. Privacy & Client-Side**: No server-side state added. (PASS)
- **VI. Clean Implementation**: Svelte 5 runes and Tailwind 4. (PASS)
- **VII. User Documentation**: Updating `help-content.ts`. (PASS)

## Project Structure

### Documentation (this feature)

```text
specs/065-move-oracle-sidebar/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ui-store.ts
└── tasks.md             # Phase 2 output (Future)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   ├── layout/
│   │   │   └── LeftSidebar.svelte       # NEW
│   │   └── oracle/
│   │       └── OracleSidebarPanel.svelte # NEW
│   └── stores/
│       └── ui.svelte.ts                 # UPDATED (Sidebar state)
└── routes/
    └── +layout.svelte                   # UPDATED (Layout refactor)
```

**Structure Decision**: Integrated the new sidebar into the existing layout hierarchy to ensure cross-view persistence.

## Complexity Tracking

No violations found.
