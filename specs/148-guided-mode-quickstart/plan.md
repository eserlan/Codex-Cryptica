# Implementation Plan: Guided Mode & Quick Start Experience

**Branch**: `148-guided-mode-quickstart` | **Date**: 2026-07-30 | **Spec**: [`spec.md`](./spec.md)  
**Input**: Feature specification from [`specs/148-guided-mode-quickstart/spec.md`](./spec.md)

---

## Summary

This feature implements a Guided Mode & Quick Start onboarding experience for Codex Cryptica. It enables new users to generate an interconnected ~4–6 entity starter constellation from a theme and premise, use an intent-first `+ Create` flow (`Generate → Evaluate → Customize`), toggle a non-destructive Guided UI mode, and receive deterministic structural next-step recommendations on entity detail panels.

---

## Technical Context

**Language/Version**: TypeScript 6.0.3, Bun 1.3.14  
**Primary Dependencies**: Svelte 5 (Runes), SvelteKit 2, `@codex/generator-engine`, `@google/generative-ai`  
**Storage**: OPFS (Vault notes), IndexedDB (via vault stores), `localStorage` (`codex_guided_mode_active` preference)  
**Testing**: Bun Test runner (`bun test`), Vitest unit suite  
**Target Platform**: Web Browsers (Chrome, Firefox, Safari)  
**Project Type**: Monorepo Workspace (`packages/generator-engine`, `apps/web`)  
**Performance Goals**: Starter constellation generation <30s (AI) / <1s (local); Guided Mode UI toggle <100ms  
**Constraints**: Client-side local offline fallback required; zero state loss on mode toggle; adherence to `@docs/STYLE_GUIDE.md` (Svelte 5 Runes, Tailwind 4 semantic tokens, Iconify utility icons)  
**Scale/Scope**: 15 themes supported in generator engine; 1 global Guided Mode preference; 4 intent types  

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Principle I (Library-First)**:  
   *Pass*. Starter constellation generation service (`StarterConstellationService`) is implemented within `packages/generator-engine`. `apps/web` consumes this package without duplicating generator tables.
2. **Principle II (TDD)**:  
   *Pass*. All new generator services, UI stores, and recommendation heuristics will have accompanying unit test suites (`.test.ts`).
3. **Principle III (Simplicity & YAGNI)**:  
   *Pass*. Structural recommendation engine uses pure, deterministic rule checks rather than costly LLM calls. Reuses existing `GeneratorDraftReview` and vault entity saving flows.
4. **Principle IV (AI-First Extraction)**:  
   *Pass*. Starter constellations and intent generation produce clean JSON/Markdown output validated against schemas before rendering.
5. **Principle V (Privacy & Client-Side Processing)**:  
   *Pass*. Guided Mode toggle is stored locally in `localStorage`. Deterministic offline fallback works completely in-browser.
6. **Principle VI (Clean Implementation / Style Guide)**:  
   *Pass*. Uses Svelte 5 Runes (`$state`, `$derived`), Tailwind 4 semantic tokens (`text-theme-primary`, `bg-theme-surface`), and Iconify classes (`icon-[lucide--...]`).
7. **Principle VII (User Documentation)**:  
   *Pass*. Feature hint and help content entry will be added to `apps/web/src/lib/config/help-content.ts`.
8. **Principle VIII (Dependency Injection)**:  
   *Pass*. `StarterConstellationService` and `ContextualRecommendationsService` accept injected dependencies for testing.

---

## Project Structure

### Documentation (this feature)

```text
specs/148-guided-mode-quickstart/
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 output (architecture decisions)
├── data-model.md        # Phase 1 output (data shapes & schemas)
├── quickstart.md        # Phase 1 output (test & verification guide)
└── contracts/           # Phase 1 output (TypeScript contracts)
    └── starter-constellation-contract.ts
```

### Source Code

```text
packages/generator-engine/
├── src/
│   ├── starter-constellation.ts          # Core starter constellation generator service
│   ├── starter-constellation.test.ts     # Unit tests for starter constellation
│   ├── starter-constellation-types.ts    # Types & interfaces
│   └── index.ts                          # Package exports

apps/web/src/
├── lib/
│   ├── components/
│   │   ├── guided/
│   │   │   ├── QuickStartModal.svelte          # Quick Start World creation modal card & wizard
│   │   │   ├── QuickStartModal.test.ts         # Modal tests
│   │   │   ├── IntentCreateModal.svelte        # Intent-first + Create modal
│   │   │   ├── IntentCreateModal.test.ts       # Intent modal tests
│   │   │   ├── StructuralSuggestionBanner.svelte # Next-step prompt banner
│   │   │   └── StructuralSuggestionBanner.test.ts
│   │   ├── canvas/
│   │   │   └── CanvasHUD.svelte                # Integrated + Create & Guided toggle
│   │   └── entity-detail/
│   │       └── DetailHeader.svelte             # Integrated suggestion banner
│   ├── services/
│   │   ├── contextual-recommendations.ts      # Heuristic recommendation engine
│   │   └── contextual-recommendations.test.ts # Unit tests for recommendations
│   └── stores/
│       └── ui/
│           ├── ui.svelte.ts                    # Guided Mode state & persistence
│           └── ui.svelte.test.ts               # UI store tests
```

**Structure Decision**: Standard SvelteKit monorepo structure. Engine logic in `packages/generator-engine`, UI components and stores in `apps/web`.

---

## Plan Phases & Execution Output

- **Phase 0 (Research)**: Complete → [`research.md`](./research.md)
- **Phase 1 (Design & Contracts)**: Complete → [`data-model.md`](./data-model.md), [`contracts/starter-constellation-contract.ts`](./contracts/starter-constellation-contract.ts), [`quickstart.md`](./quickstart.md)
- **Phase 2 (Tasks)**: To be generated by `/speckit-tasks` command.
