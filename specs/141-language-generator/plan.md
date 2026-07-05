# Implementation Plan: Language Generator

**Branch**: `141-language-generator` | **Date**: 2026-07-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/141-language-generator/spec.md`

## Summary

We will add a new **Language Generator** to the Codex Cryptica generator ecosystem. It will allow users to generate functional, campaign-ready fictional languages (conlangs) with sound profiles, naming conventions, and basic word glossaries. The core logic will be implemented as a library-first module in `packages/generator-engine`, and the SvelteKit web application (`apps/web`) will handle the user interface, campaign workspace integration, and marketing routes.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Bun 1.3.14  
**Primary Dependencies**: Svelte 5 Runes, SvelteKit, `@google/generative-ai`  
**Storage**: OPFS (Vault notes) & IndexedDB (via vault stores)  
**Testing**: Vitest (`bun test`)  
**Target Platform**: Browser (Client-side)  
**Project Type**: Monorepo library workspace (`packages/generator-engine`) and SvelteKit frontend (`apps/web`)  
**Performance Goals**: AI generation under 5 seconds; local fallback under 50ms  
**Constraints**: Zero internet dependency for the fallback generator; must use Svelte 5 Runes and Tailwind 4 semantic tokens  
**Scale/Scope**: 1 package module, 1 marketing tool route, 1 campaign integration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I: Library-First**: PASS. Core generation logic, prompt construction, and local fallbacks will reside in `packages/generator-engine/src/public-language.ts`.
- **Principle II: TDD**: PASS. Unit tests covering both the prompt builders and the local syllable combiner will be written in `packages/generator-engine/src/public-language.test.ts`.
- **Principle V: Privacy**: PASS. AI runs locally using the user's API key (or through the client-directed proxy). The fallback generator runs entirely client-side.
- **Principle VIII: Dependency Injection**: PASS. The new generator hooks into the existing `CampaignGeneratorService` which uses DI for AI and vault gateways.
- **Principle XII: Labels Over Tags**: PASS. The generated language outputs and vault notes will only use the unified term "Labels".

## Project Structure

### Documentation (this feature)

```text
specs/141-language-generator/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── language.ts      # TypeScript interfaces and contracts
└── tasks.md             # Phase 2 output (tasks list)
```

### Source Code (repository root)

```text
packages/generator-engine/src/
├── campaign-generator-registry.ts # Register generator ID 'language'
├── campaign-generator-types.ts    # Add 'language' to GeneratorId
├── public-language.ts            # Core language generator prompt & local logic
├── public-language.test.ts       # Core unit tests
└── index.ts                      # Exports new modules

apps/web/src/
├── lib/
│   ├── config/
│   │   └── seo-pages.ts          # SEO page data for /generators/language-generator
│   └── components/
│       └── seo/
│           └── LanguageFormFields.svelte # UI options form for Language
└── routes/
    └── (marketing)/
        └── generators/
            └── language-generator/  # Marketing tool page
```

**Structure Decision**: Monorepo multi-package project layout. Core logic belongs in `@codex/generator-engine` package; UI layers belong in `apps/web`.

## Complexity Tracking

_No constitution violations detected._
