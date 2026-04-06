# Implementation Plan: Add to Canvas in Context Menu

**Branch**: `076-add-canvas-context-menu` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/076-add-canvas-context-menu/spec.md`

## Summary

Add context menu option to graph view that allows users to add selected entities (single or multiple) to existing canvases or create new canvases. Implements submenu with recent canvases, duplicate detection, and confirmation notifications.

## Technical Context

**Language/Version**: TypeScript 6.0.2
**Primary Dependencies**: Svelte 5.54, SvelteKit 2.55, @codex/canvas-engine, @codex/graph-engine
**Storage**: OPFS (Origin Private File System) via canvas-engine
**Testing**: Vitest 4.0.18 (unit), Playwright (E2E)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari)
**Project Type**: Web application (SvelteKit SPA)
**Performance Goals**: Context menu appears <200ms, keyboard response <100ms
**Constraints**: Client-side only, no server calls, must work offline
**Scale/Scope**: Single feature in existing graph view component

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Library-First**: Feature uses existing canvas-engine and graph-engine packages. No new packages needed.
- [x] **TDD**: Unit tests for canvas add logic, E2E test for context menu flow
- [x] **Simplicity (YAGNI)**: Uses existing context menu patterns, no over-engineering
- [x] **AI-First**: Not applicable (no Oracle/AI integration needed)
- [x] **Privacy**: Client-side only, no data leaves browser
- [x] **Clean Implementation**: Will follow Svelte 5 patterns, Tailwind 4, comprehensive types
- [x] **User Documentation**: Help article task included, FeatureHint component available
- [x] **Dependency Injection**: Canvas store uses constructor DI (existing pattern)
- [x] **Natural Language**: User-facing text uses clear, simple language
- [x] **Quality & Coverage**: Unit tests for new logic, E2E for user flow

**Gate Status**: ✅ PASS - No violations

## Project Structure

### Documentation (this feature)

```text
specs/076-add-canvas-context-menu/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - internal feature)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/lib/
├── components/graph/
│   ├── GraphView.svelte           # Existing - add context menu handler
│   └── GraphContextMenu.svelte    # Existing - add "Add to Canvas" submenu
├── components/canvas/
│   └── CanvasPicker.svelte        # NEW - Canvas selection submenu component
├── stores/
│   ├── canvas-registry.svelte.ts  # Existing - addEntities method
│   └── graph.svelte.ts            # Existing - selection state
└── config/
    └── help-content.ts            # Existing - add help article
```

**Structure Decision**: Single project (web app) - feature integrates into existing graph and canvas components

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |
