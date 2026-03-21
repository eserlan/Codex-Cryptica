# Implementation Plan: Staging Indicator

**Branch**: `074-staging-indicator` | **Date**: 2026-03-20 | **Spec**: [specs/074-staging-indicator/spec.md](specs/074-staging-indicator/spec.md)
**Input**: Feature specification from `/specs/074-staging-indicator/spec.md`

## Summary

Implement a visual environment indicator for the staging environment to prevent accidental data modification. This will be a thin UI layer detecting the environment via Vite build-time variables or URL patterns.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)
**Primary Dependencies**: SvelteKit, Tailwind CSS 4
**Storage**: N/A (Transient UI State)
**Testing**: Vitest (Unit), Playwright (E2E)
**Target Platform**: Web (Responsive for Mobile)
**Project Type**: Web Application
**Performance Goals**: <50ms impact on render time
**Constraints**: Must not obstruct main navigation on mobile

## Constitution Check

| Principle            | Check                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| Library-First        | UI only, no package required.                                           |
| TDD                  | Plan includes unit tests for environment detection and visual presence. |
| Simplicity & YAGNI   | Simple banner/badge, no complex state needed.                           |
| AI-First Extraction  | N/A                                                                     |
| Privacy              | All processing is local/client-side.                                    |
| Clean Implementation | Svelte 5 Runes and Tailwind 4 standards followed.                       |
| User Documentation   | Help article update in `help-content.ts` (minimal).                     |
| Dependency Injection | UI store pattern followed.                                              |
| Natural Language     | "STAGING" text used.                                                    |
| Quality & Coverage   | 100% test coverage for this feature.                                    |

## Project Structure

### Documentation

```text
specs/074-staging-indicator/
├── spec.md              # Feature Spec
├── plan.md              # This file
├── research.md          # Research findings
├── data-model.md        # No entities
└── quickstart.md        # Testing instructions
```

### Source Code

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   └── layout/
│   │       └── StagingIndicator.svelte  # NEW component
│   └── stores/
│       └── ui.svelte.ts                # Update with isStaging state
└── routes/
    └── +layout.svelte                  # Include StagingIndicator
```

**Structure Decision**: Integrated directly into the existing web app layout as it's a small UI-only feature.

## Complexity Tracking

No violations found.
