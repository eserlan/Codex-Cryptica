# Implementation Plan: Adjustable Sidebars

**Branch**: `088-adjustable-sidebars` | **Date**: 2026-04-22 | **Spec**: [/specs/088-adjustable-sidebars/spec.md](/specs/088-adjustable-sidebars/spec.md)
**Input**: Feature specification from `/specs/088-adjustable-sidebars/spec.md`

## Summary

Implement draggable resize handles for both the left sidebar (Entity Explorer / Tools) and the right sidebar (Entity Details / Oracle). The sidebars will enforce minimum widths and maximum viewport percentages to maintain layout integrity. The user-defined widths will be persisted in `localStorage` via the `uiStore` and seamlessly restored across sessions or panel toggles. The dragging mechanism will use standard Pointer Events for high-performance 60fps resizing without layout jank.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)  
**Primary Dependencies**: SvelteKit, Tailwind 4  
**Storage**: `localStorage` (via existing `uiStore` integration)  
**Testing**: Playwright (E2E), Vitest (Unit for store logic)  
**Target Platform**: Browser (Web)  
**Project Type**: Web Application (`apps/web`)  
**Performance Goals**: 60 fps during resize drag interactions; sub-16ms layout updates.  
**Constraints**: Must strictly bound widths (min/max) to prevent breaking the center graph canvas; Client-side only.  
**Scale/Scope**: Impacts layout container components and global UI state.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: (Pass) This is a UI-layer layout feature, correctly placed in `apps/web`.
2. **TDD**: (Pass) Plan requires E2E tests for the drag interactions and unit tests for the store logic boundaries.
3. **Simplicity & YAGNI**: (Pass) Uses native DOM Pointer Events instead of a heavy 3rd-party drag-and-drop or layout splitting library.
4. **Privacy & Client-Side**: (Pass) Layout preferences remain strictly local in `localStorage`.
5. **Clean Implementation**: (Pass) Uses Svelte 5 `$state` runes bound to inline styles for performant updates, matching current architectural standards.

## Project Structure

### Documentation (this feature)

```text
specs/088-adjustable-sidebars/
├── plan.md              # This file
├── research.md          # Technical decisions (Pointer Events vs Drag API)
├── data-model.md        # UIStore extensions and constants
├── quickstart.md        # User verification steps
├── checklists/
│   └── requirements.md  # Spec validation checklist
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── ResizerHandle.svelte     # NEW: Reusable draggable handle component
│   │   │   │   └── SidebarPanelHost.svelte  # UPDATED: Bind to dynamic width
│   │   │   └── EntityDetailPanel.svelte     # UPDATED: Bind to dynamic width
│   │   └── stores/
│   │       └── ui.svelte.ts                 # UPDATED: Add width states and persistence
│   └── routes/
│       └── (app)/
│           └── +layout.svelte               # UPDATED: Layout flex integration
└── tests/
    └── adjustable-sidebars.spec.ts          # NEW: E2E tests for resizing behavior
```

**Structure Decision**: The logic will reside entirely within the `apps/web` project, as it's a presentation-layer feature. A reusable `ResizerHandle.svelte` component will encapsulate the Pointer Event logic to keep the layout files clean.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |
