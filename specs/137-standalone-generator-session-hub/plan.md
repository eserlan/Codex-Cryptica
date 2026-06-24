# Implementation Plan: Standalone Generator Session Hub

**Branch**: `137-standalone-generator-session-hub` | **Date**: 2026-06-25 | **Spec**: [spec.md](file:///home/espen/proj/Codex-Cryptica-v2/specs/137-standalone-generator-session-hub/spec.md)
**Input**: Feature specification from `/specs/137-standalone-generator-session-hub/spec.md`

## Summary

This feature transforms the standalone generator pages from single-use isolated tools into a cohesive "Session Hub". Generated entities automatically accumulate into a browser `sessionStorage` list, can be reviewed in detail, and default to being used as context for future generations. We will implement:

1. **Automatic Session List Accumulation**: Generate results automatically save to `sessionStorage` instead of requiring manual "Link to Hub".
2. **Context Selection & Budgeting**: A recency-first budgeting algorithm in `generator-engine` to select a subset of marked entities when context limits are reached, with a UI notice and support for manual opt-out/toggles.
3. **Post-Hoc Provenance Detection**: Clean client-side regex matching to check if a generated result actually references the name of any active session entity.
4. **Save Single, Selected, or All**: Extend the local-storage handoff mechanism to export any selection of drafts to a Codex Cryptica vault.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Bun 1.3.14  
**Primary Dependencies**: Svelte 5 (Runes), SvelteKit 2, Tailwind 4, `@codex/events`, `generator-engine`  
**Storage**: Client-side `sessionStorage` (session lifecycle) and `localStorage` (handoff payload `__codex_pending_import` for vault saving)  
**Testing**: Vitest (`bun run test`), Playwright E2E tests  
**Target Platform**: Modern web browsers  
**Project Type**: Workspace library (`packages/generator-engine`) + Web application (`apps/web`)  
**Performance Goals**: Instant page render, <5ms matching overhead for provenance, <50ms list updates  
**Constraints**: Purely client-side, offline-capable, strict data privacy (no server-side persistence of generated lore)  
**Scale/Scope**: ~16 different generators, supporting up to 50 active session entities per session

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Check/Constraint                                                                                                                                                                              | Status   |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **I. Library-First**           | All core session helpers (provenance matching, budgeting, prioritization) must reside in the `generator-engine` package, keeping the web-app a thin Svelte 5 presentation layer.              | ✅ Ready |
| **II. TDD**                    | The new `generator-engine` helpers and the Svelte store/services must have comprehensive unit tests with failure/boundary paths.                                                              | ✅ Ready |
| **III. Simplicity (YAGNI)**    | Avoid complex database/IndexedDB layers for the standalone path; simple `sessionStorage` matches requirements perfectly. Do not implement complex semantic/embedding analysis for provenance. | ✅ Ready |
| **V. Privacy**                 | All generator inputs and generated outputs are client-side only and stored browser-locally.                                                                                                   | ✅ Ready |
| **VI. Clean Implementation**   | Component layout uses Tailwind 4 semantic tokens (e.g., `bg-theme-surface`, `text-theme-primary`). Avoid direct styling utilities outside standard layout classes. Prefix unused vars.        | ✅ Ready |
| **VIII. Dependency Injection** | Store / services will use constructor-based DI to facilitate testing.                                                                                                                         | ✅ Ready |
| **XII. Terminology**           | Use the term "Labels" only. Never expose or use "Tags" in the codebase or user UI.                                                                                                            | ✅ Ready |
| **Icon Usage (AGENTS.md)**     | NEVER use `lucide-svelte` components. ALWAYS use Iconify utility class pattern (e.g., `class="icon-[lucide--name] h-4 w-4"`).                                                                 | ✅ Ready |

## Project Structure

### Documentation (this feature)

```text
specs/137-standalone-generator-session-hub/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 data models
├── quickstart.md        # Phase 1 developer guide
└── contracts/
    └── contracts.md     # Phase 1 interface definitions
```

### Source Code (repository root)

```text
packages/generator-engine/
└── src/
    ├── session-hub-helpers.ts      # Pure helpers for provenance matching, context budgeting, and selection
    └── session-hub-helpers.test.ts # Vitest unit tests for the helpers

apps/web/
└── src/
    └── lib/
        ├── stores/
        │   └── session-hub.svelte.ts       # Svelte 5 Rune-based session hub store (DI-capable)
        └── components/
            └── seo/
                ├── SessionHubWidget.svelte  # Reusable session hub sidebar panel with multi-select and toggle
                ├── SEOGeneratorLayout.svelte # Layout shell integrating SessionHubWidget, details view, and notifications
                └── ProvenanceBadge.svelte    # Component rendering "Used: ..." badges with navigation
```

**Structure Decision**: We will place the core business logic (provenance matching, budgeting) in `packages/generator-engine` to maintain the **Library-First** principle, and implement the Svelte 5 store and components in `apps/web`.

## Complexity Tracking

_No constitution violations detected._
