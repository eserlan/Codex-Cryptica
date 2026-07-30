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
   _Pass_. Starter constellation generation service (`StarterConstellationService`) is implemented within `packages/generator-engine`. `apps/web` consumes this package without duplicating generator tables.
2. **Principle II (TDD)**:  
   _Pass_. All new generator services, UI stores, and recommendation heuristics will have accompanying unit test suites (`.test.ts`).
3. **Principle III (Simplicity & YAGNI)**:  
   _Pass_. Structural recommendation engine uses pure, deterministic rule checks rather than costly LLM calls. Reuses existing `GeneratorDraftReview` and vault entity saving flows.
4. **Principle IV (AI-First Extraction)**:  
   _Pass_. Starter constellations and intent generation produce clean JSON/Markdown output validated against schemas before rendering.
5. **Principle V (Privacy & Client-Side Processing)**:  
   _Pass_. Guided Mode toggle is stored locally in `localStorage`. Deterministic offline fallback works completely in-browser.
6. **Principle VI (Clean Implementation / Style Guide)**:  
   _Pass_. Uses Svelte 5 Runes (`$state`, `$derived`), Tailwind 4 semantic tokens (`text-theme-primary`, `bg-theme-surface`), and Iconify classes (`icon-[lucide--...]`).
7. **Principle VII (User Documentation)**:  
   _Pass_. Feature hint and help content entry will be added to `apps/web/src/lib/config/help-content.ts`.
8. **Principle VIII (Dependency Injection)**:  
   _Pass_. `StarterConstellationService` and `ContextualRecommendationsService` accept injected dependencies for testing.

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
│   │   │   ├── QuickStartModal.svelte          # Quick Start World creation modal & wizard
│   │   │   ├── QuickStartModal.test.ts         # Modal tests
│   │   │   ├── IntentCreateModal.svelte        # Intent-first + Create category menu
│   │   │   ├── IntentCreateModal.test.ts       # Intent modal tests
│   │   │   ├── contextual-intent-helper.ts     # Intent category → generator id + context inference
│   │   │   ├── contextual-intent-helper.test.ts
│   │   │   ├── GuidedModeToggle.svelte         # Guided ↔ Full Toolbox switch
│   │   │   ├── GuidedModeToggle.test.ts
│   │   │   ├── StructuralSuggestionBanner.svelte # Next-step prompt banner
│   │   │   └── StructuralSuggestionBanner.test.ts
│   │   ├── layout/
│   │   │   └── AppHeader.svelte                # + Create button, GuidedModeToggle; hides
│   │   │                                        # advanced toolbar utilities in Guided Mode
│   │   ├── canvas/
│   │   │   └── CanvasHUD.svelte                 # Floating + Create action button (FAB)
│   │   ├── vaults/
│   │   │   └── VaultSwitcherModal.svelte        # "QUICK START WORLD" entry point (real
│   │   │                                        # New World/vault-creation modal)
│   │   ├── modals/
│   │   │   └── GlobalModalProvider.svelte       # Mounts IntentCreateModal & QuickStartModal
│   │   │                                        # exactly once, globally
│   │   ├── generators/
│   │   │   ├── CampaignGeneratorModal.svelte    # autoGenerate mode (skip configure), redraw
│   │   │   │                                    # request on save
│   │   │   └── GeneratorDraftReview.svelte      # "Customize" back-button label
│   │   └── entity-detail/
│   │       └── DetailHeader.svelte              # Integrated suggestion banner
│   ├── services/
│   │   ├── contextual-recommendations.ts      # Heuristic recommendation engine
│   │   └── contextual-recommendations.test.ts # Unit tests for recommendations
│   ├── stores/
│   │   ├── ui/
│   │   │   ├── guided-mode.svelte.ts           # Guided Mode state & persistence (not
│   │   │   │                                   # ui.svelte.ts — follows the repo's existing
│   │   │   │                                   # per-concern store convention)
│   │   │   ├── guided-mode.test.ts
│   │   │   └── modal-ui.svelte.ts              # + showIntentCreateMenu, showQuickStartModal,
│   │   │                                       #   generatorWorkflow.autoGenerate
│   │   └── graph.svelte.ts                     # + layoutRequest / requestLayout() — external
│   │                                            #   redraw signal GraphView reacts to
│   └── config/
│       └── help-content.ts                     # Guided Mode / Quick Start feature hints
└── routes/(app)/
    └── +page.svelte                            # Welcome page: Quick Start is the primary CTA
```

**Structure Decision**: Standard SvelteKit monorepo structure. Engine logic in `packages/generator-engine`, UI components and stores in `apps/web`.

**Deviations from the original plan** (see `research.md` for the reasoning driving each):

- Quick Start's "New World creation modal" (FR-001) turned out to be `VaultSwitcherModal.svelte`, not a separate modal — the welcome page's "Create New Vault" button was also repointed at Quick Start directly.
- `QuickStartModal` and `IntentCreateModal` are mounted exactly once, globally, via `GlobalModalProvider` (not duplicated inline per call site) — an early duplicate-inline-mount design caused a focus-trap race that broke keyboard input.
- Entity content for Quick Start's generated entities is produced via `oracle.reviseNewEntityDraft` (the same AI content-revision pipeline used elsewhere), auto-applied without the manual diff-review step, rather than splicing the theme's raw entity template behind the generated text — the raw-splice approach left unfilled template placeholder prose in the saved entity.
- `ConstellationRelationship.bidirectional` is accepted from local/AI generation but intentionally **not** acted on when saving: only a single, correctly-directed connection is created per relationship (e.g. `Settlement → located in → Region`). A single connection already renders as one graph edge; creating the reverse direction too produced duplicate and backwards-reading edges.
- Bulk/incremental entity+connection creation (Quick Start, and the intent-first `+ Create` / "Add Leader" suggestion flow via `CampaignGeneratorModal`) explicitly requests a graph layout redraw (`graph.requestLayout()`) once done — the incremental graph sync only re-lays-out on new _nodes_, not on edges added afterward to already-synced nodes, so newly created constellations piled up at one point without this.

---

## Plan Phases & Execution Output

- **Phase 0 (Research)**: Complete → [`research.md`](./research.md)
- **Phase 1 (Design & Contracts)**: Complete → [`data-model.md`](./data-model.md), [`contracts/starter-constellation-contract.ts`](./contracts/starter-constellation-contract.ts), [`quickstart.md`](./quickstart.md)
- **Phase 2 (Tasks)**: To be generated by `/speckit-tasks` command.
