# Implementation Plan: Staging Indicator

**Branch**: `074-staging-indicator` | **Date**: 2026-03-20 | **Spec**: [specs/074-staging-indicator/spec.md](specs/074-staging-indicator/spec.md)
**Input**: Feature specification from `/specs/074-staging-indicator/spec.md`

## Summary

Implement a visual environment indicator by applying distinct "Staging" styling directly to the brand title in the application header. This prevents environment confusion while maintaining a clean, responsive UI.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)
**Primary Dependencies**: SvelteKit, Tailwind CSS 4
**Storage**: N/A (Transient UI State)
**Testing**: Vitest (Unit), Playwright (E2E)
**Target Platform**: Web (Responsive for Mobile)
**Project Type**: Web Application
**Performance Goals**: 0ms CLS impact, <10ms render impact
**Constraints**: MUST NOT use additional vertical or horizontal space.

## Constitution Check

| Principle            | Check                                                          |
| -------------------- | -------------------------------------------------------------- |
| Library-First        | UI only, no package required.                                  |
| TDD                  | Implementation verified with unit and E2E tests.               |
| Simplicity & YAGNI   | Inline styling instead of a new component layer.               |
| AI-First Extraction  | N/A                                                            |
| Privacy              | All processing is local/client-side.                           |
| Clean Implementation | Svelte 5 Runes and Tailwind 4 conditional classes used.        |
| Dependency Injection | UI store pattern followed for global state.                    |
| Quality & Coverage   | High coverage achieved across detection logic and UI presence. |

## Project Structure

### Documentation

```text
specs/074-staging-indicator/
├── spec.md              # Updated Feature Spec
├── plan.md              # This file
├── research.md          # Research findings (Hostname/Pathname detection)
├── data-model.md        # No entities
└── quickstart.md        # Testing instructions
```

### Source Code

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   └── layout/
│   │       └── AppHeader.svelte        # Apply conditional styling
│   ├── config/
│   │   └── index.ts                    # IS_STAGING logic (Hostname + Pathname)
│   └── stores/
│       └── ui.svelte.ts                # isStaging reactive state
└── app/
    └── init/
        └── app-init.ts                 # Boot sequence integration
```

## Complexity Tracking

No violations found.
