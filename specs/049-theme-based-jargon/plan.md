# Implementation Plan: Theme-Based UI Jargon

**Branch**: `049-theme-based-jargon` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/049-theme-based-jargon/spec.md`

## Summary

The goal is to enhance user immersion by replacing generic UI terminology (e.g., "Notes", "Save") with atmospheric jargon that adapts to the active theme. This will be implemented by extending the `StylingTemplate` in the `schema` package with a `JargonMap` and updating the `ThemeStore` in the web application to provide a centralized resolution helper.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Svelte 5 (Runes), Zod (Schema validation)  
**Storage**: N/A (Transient UI state derived from active theme)  
**Testing**: Vitest (Logic), Playwright (UI verification)  
**Target Platform**: Browser (WASM/Client-side)
**Project Type**: Web application + Shared package  
**Performance Goals**: Jargon resolution MUST occur in <1ms; Theme switch UI update <100ms.  
**Constraints**: MUST provide fallbacks for all jargon keys to ensure UI remains functional.  
**Scale/Scope**: Covers core interaction tokens across the entire web application.

## Constitution Check

| Principle               | Check                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| I. Library-First        | PASS: Core jargon mapping and schema live in `packages/schema`.                        |
| II. TDD                 | PASS: Unit tests for resolution logic and pluralization will be added to `themeStore`. |
| III. YAGNI              | PASS: Avoided full i18n libraries; using simple key-value maps.                        |
| V. Privacy              | PASS: All terminology resolution happens client-side.                                  |
| VII. User Documentation | PASS: Quickstart guide provided in `specs/049-theme-based-jargon/quickstart.md`.       |

## Project Structure

### Documentation (this feature)

```text
specs/049-theme-based-jargon/
├── plan.md              # This file
├── research.md          # Decision log
├── data-model.md        # JargonMap definition
├── quickstart.md        # Developer guide
└── contracts/
    └── jargon.ts        # Type definitions
```

### Source Code

```text
packages/
  schema/
    src/
      jargon.ts          # Define JargonMap type and Resolver signature
      theme.ts           # Extend StylingTemplate with jargon property
      index.ts           # Export new jargon types
apps/
  web/
    src/
      lib/
        stores/
          theme.svelte.ts # Implement jargon resolution logic
```

**Structure Decision**: Utilizing the existing monorepo structure. Terminology definitions are centralized in `packages/schema` for cross-package use, while the resolution reactive logic lives in the `web` application's `themeStore`.
