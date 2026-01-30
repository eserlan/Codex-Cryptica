# Implementation Plan: Help and Guide System

**Branch**: `020-help-guide-system` | **Date**: 2026-01-30 | **Spec**: [specs/020-help-guide-system/spec.md](spec.md)
**Input**: Feature specification from `/specs/020-help-guide-system/spec.md`

## Summary
Implement a local-first, offline-capable help system including a static multi-step onboarding walkthrough and a searchable Help Center integrated into the Settings Modal. The walkthrough will use a custom Svelte 5 engine with CSS `mask-image` spotlights to ensure zero-latency performance and PWA integrity.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5, FlexSearch, marked (markdown parsing)  
**Storage**: LocalStorage (progress tracking), Static JSON/Markdown (content)  
**Testing**: Vitest (unit/store logic), Playwright (E2E tour flow)  
**Target Platform**: Web / PWA  
**Project Type**: Monorepo (Turbo) - Web app focused  
**Performance Goals**: Sub-100ms UI transitions, <100ms help search  
**Constraints**: 100% offline functionality, no external asset loading  
**Scale/Scope**: ~10 initial walkthrough steps, ~20 initial help articles  

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Local-First Sovereignty**: PASSED. Help content is bundled and progress is stored in LocalStorage.
2. **Relational-First**: N/A. (This is a support system, not lore data).
3. **Sub-100ms Performance**: PASSED. Custom Svelte engine avoids heavy library overhead.
4. **Atomic Worldbuilding**: PASSED. Help components will be isolated in `$lib/components/help`.
5. **System-Agnostic Core**: PASSED. The help system only explains the UI/Engine, not specific RPG rules.
6. **Pure Functional Core**: PASSED. Search logic and progress calculation will be pure functions.
7. **Verifiable Reality**: PASSED. Tour steps and search will be fully covered by tests.
8. **Test-First PWA Integrity**: PASSED. Acceptance criteria includes offline verification.

## Project Structure

### Documentation (this feature)

```text
specs/020-help-guide-system/
├── plan.md              # This file
├── research.md          # Decision log
├── data-model.md        # Entities and state
├── quickstart.md        # Implementation guide
├── contracts/           
│   └── stores.md        # Store interfaces
└── tasks.md             # Tasks (TBD)
```

### Source Code

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── help/
│   │   │   │   ├── TourOverlay.svelte   # The spotlight engine
│   │   │   │   ├── GuideTooltip.svelte  # The "Next/Skip" box
│   │   │   │   └── HelpTab.svelte       # Settings integration
│   │   ├── stores/
│   │   │   └── help.svelte.ts           # Help logic & state
│   │   ├── config/
│   │   │   └── help-content.ts          # Static content definitions
└── tests/
    └── help-system.spec.ts              # E2E Tour tests
```

**Structure Decision**: Web application integration within `apps/web`. New components isolated in `lib/components/help`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| None | N/A | N/A |