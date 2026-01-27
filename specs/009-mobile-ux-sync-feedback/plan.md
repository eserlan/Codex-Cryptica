# Implementation Plan: Mobile UX Refinement & Sync Feedback

**Branch**: `009-mobile-ux-sync-feedback` | **Date**: 2026-01-27 | **Spec**: [specs/009-mobile-ux-sync-feedback/spec.md]

## Summary
Refactor the Codex Arcana web application for mobile responsiveness and enhanced synchronization feedback. This involves updating the header layout using Tailwind breakpoints, implementing a mobile-friendly EntityDetailPanel, and refining the CloudStatus component with clear visual animations and status updates.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Svelte 5, Tailwind CSS 4.x  
**Storage**: N/A (UI layer only)  
**Testing**: Vitest (Unit), Playwright (E2E Responsiveness)  
**Target Platform**: Web (Mobile-first refactor)
**Project Type**: Monorepo / apps/web
**Performance Goals**: <100ms UI response time for all layout transitions.
**Constraints**: Zero horizontal scrolling on 320px+ viewports.
**Scale/Scope**: Refactoring 4 core UI components (`+layout`, `VaultControls`, `CloudStatus`, `EntityDetailPanel`).

## Constitution Check

- **I. Local-First Sovereignty**: PASS. UI refinements do not impact local-first storage.
- **III. Sub-100ms Performance Mandate**: PASS. Using Svelte 5 runes for efficient reactivity and Tailwind for performant CSS transitions.
- **VII. Verifiable Reality**: PASS. Plan includes E2E tests for mobile viewports and sync feedback.
- **VIII. Test-First PWA Integrity**: PASS. Enhanced sync feedback specifically improves the offline/online transition experience.

## Project Structure

### Documentation (this feature)

```text
specs/009-mobile-ux-sync-feedback/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── settings/
│   │   │   │   └── CloudStatus.svelte
│   │   │   ├── VaultControls.svelte
│   │   │   └── EntityDetailPanel.svelte
│   │   └── stores/
│   │       └── sync-stats.ts
│   └── routes/
│       └── +layout.svelte
└── tests/
    └── sync-feedback.spec.ts
```

**Structure Decision**: Standard SvelteKit application structure within the `apps/web` package.
