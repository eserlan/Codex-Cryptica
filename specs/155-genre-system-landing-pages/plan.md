# Implementation Plan: Genre and System Landing Pages (/for/[slug])

**Branch**: `155-genre-system-landing-pages` | **Date**: 2026-08-10 | **Spec**: [specs/155-genre-system-landing-pages/spec.md](file:///home/espen/proj/Codex-Arcana/specs/155-genre-system-landing-pages/spec.md)
**Input**: Feature specification from `specs/155-genre-system-landing-pages/spec.md`

## Summary

Implement a single, data-driven `/for/[slug]` landing page shell in `apps/web` that renders both RPG system-specific welcome pages (e.g. _Vampire: The Masquerade_) and broad genre worldbuilding pages (e.g. _Fantasy Worldbuilding_). The shell receives a structured `LandingPageConfig` object from a central registry (`apps/web/src/lib/content/for/`) and renders 5 standard sections (Hero, Use Cases, Example Graph Preview, Useful Tools, CTA + optional Disclaimer). New landing pages are added strictly by defining configuration entries without writing new UI components.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes (`$props`, `$derived`), SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: SvelteKit 2 (prerendering), Tailwind CSS 4 (`@reference`, semantic tokens), Iconify utility syntax (`class="icon-[lucide--...]"`), Zod / TypeScript schema  
**Storage**: N/A (Static in-code configuration registry under `apps/web/src/lib/content/for/`)  
**Testing**: Vitest (`bun --filter web test`), Svelte-Check (`bun --filter web check`)  
**Target Platform**: Web (Prerendered static pages via SvelteKit static adapter & SSR fallback)  
**Project Type**: Web application (`apps/web`)  
**Performance Goals**: 100% prerendered static HTML at build time, 0 runtime bundle bloat per new page  
**Constraints**: Zero new Svelte UI components required per additional landing page; 100% shared shell UI; Svelte 5 Runes & Tailwind 4 compliance; non-affiliation disclaimers for trademarked RPG systems  
**Scale/Scope**: Unified `/for/[slug]` route, content schema, registry, and 2 initial launch packs (`/for/vampire-the-masquerade` and `/for/fantasy-worldbuilding`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle I (Library-First)**: PASS — The landing page shell and content packs are purely web marketing and onboarding routes (`apps/web`), appropriate for `apps/web/src/routes/(marketing)/for/[slug]` and `apps/web/src/lib/content/for/`.
- **Principle II (TDD)**: PASS — `LandingPageRegistry` functions (lookup, schema parsing, slug enumeration, 404 validation) will have comprehensive unit tests in `registry.test.ts`.
- **Principle III (Simplicity & YAGNI)**: PASS — Driven entirely by structured data configurations rather than 15+ bespoke routes. Re-uses existing UI components (marketing hero, generator cards, CTA section).
- **Principle VI (Style Guide & Clean Implementation)**: PASS — Components use Svelte 5 Runes (`$props()`), Tailwind 4 semantic classes, Iconify utility syntax (`icon-[lucide--...]`), no `lucide-svelte` imports.
- **Principle VII (User Documentation)**: PASS — Pages serve as interactive onboarding/use-case documentation for prospective and new users.
- **Principle VIII (Dependency Injection)**: PASS — Registry lookup functions receive optional injected content dictionaries for easy unit testing without disk I/O.
- **Principle IX (Natural Language)**: PASS — Marketing copy is grounded, plain, and avoids artificial hype or pretentious jargon.

## Project Structure

### Documentation (this feature)

```text
specs/155-genre-system-landing-pages/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── landing-page-schema.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   └── content/
│   │       └── for/
│   │           ├── schema.ts                   # LandingPageConfig interface & Zod validation
│   │           ├── registry.ts                 # Registry & lookup helpers (getLandingPage, getAllSlugs)
│   │           ├── registry.test.ts            # Unit tests for registry & resolution
│   │           └── packs/
│   │               ├── vampire-the-masquerade.ts # VtM system content pack
│   │               └── fantasy-worldbuilding.ts   # Fantasy genre content pack
│   └── routes/
│       └── (marketing)/
│           └── for/
│               └── [slug]/
│                   ├── +page.ts                # Load function & entries() for SvelteKit prerendering
│                   └── +page.svelte            # The unified data-driven landing page shell
```

**Structure Decision**: Web Application (`apps/web`). All code belongs inside `apps/web/src/lib/content/for/` and `apps/web/src/routes/(marketing)/for/[slug]/`.

## Complexity Tracking

> **No Constitution violations detected.**
