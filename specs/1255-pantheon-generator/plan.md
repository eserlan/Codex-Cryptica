# Implementation Plan: Pantheon / God Generator Landing Tool

**Branch**: `1255-pantheon-generator` | **Date**: 2026-06-11 | **Spec**: [spec.md](file:///home/espen/proj/remotecodexarcana/specs/1255-pantheon-generator/spec.md)
**Input**: Feature specification from `/specs/1255-pantheon-generator/spec.md`

## Summary

We will implement a public Pantheon / God Generator tool inside the web application at the route `/generators/pantheon-generator` (and `/generators/god-generator` as a valid slug pointing to the same page or alias).
The implementation will follow the design of existing SEO generators in the repository:

1. Define the generator configuration and generation functions in `apps/web/src/lib/services/seo/generators/pantheon.ts`.
2. Register the `pantheon` generator in the central `generator-engine.ts` and `+page.ts` route loader.
3. Create a visual form fields component `apps/web/src/lib/components/seo/PantheonFormFields.svelte` to configure options (Divine Type, Domains, Worshippers, Conflict Themes, etc.).
4. Add the Svelte route layout configuration in `apps/web/src/routes/(marketing)/generators/[slug]/+page.svelte` to map inputs, call the engine, and show the results.
5. Save generated deities as `character` entities and pantheons as `faction` entities with connections, integrating with the app's standard local import workflow.

## Technical Context

- **Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit
- **Primary Dependencies**: `@google/generative-ai` (Gemini SDK via `aiClientManager`), `zod`, SvelteKit pre-rendering
- **Storage**: Browser `sessionStorage` (transient drafts) and `localStorage` (transient transfer for IndexedDB/OPFS imports)
- **Testing**: Vitest (`apps/web/src/lib/services/seo/generator-engine.test.ts`), Playwright E2E tests
- **Target Platform**: Desktop and mobile web browsers (Chrome, Safari, Firefox)
- **Project Type**: Web Application
- **Performance Goals**: Under 5s generation time under normal API response; immediate fallback to local table generation.
- **Constraints**: Offline-capable local tables, SEO compliance (indexable, sitemap included, clean semantic structure).
- **Scale/Scope**: 1 new generator type, 2 new routes, 1 new Svelte form fields component, unit tests.

## Constitution Check

| Principle                      | Check                                                                                                                          | Status |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :----- |
| **I. Library-First**           | Reuses the existing generator layout and engine architecture inside `apps/web` as this is specific to public marketing routes. | Pass   |
| **II. TDD**                    | Add comprehensive unit tests covering single deity generation, pantheon generation, option mapping, and fallback logic.        | Pass   |
| **III. Simplicity & YAGNI**    | Leverages the existing `SEOGeneratorLayout` component, avoiding creation of new layout components or custom Markdown parsers.  | Pass   |
| **IV. AI-First Extraction**    | Feeds clean parameters to Gemini and parses structured JSON deity details and connection mappings.                             | Pass   |
| **V. Privacy**                 | All campaign context is processed locally; no server-side database storage is used.                                            | Pass   |
| **VI. Clean Implementation**   | Strict Svelte 5 runes, Tailwind 4 theme tokens, and lint validation will be executed.                                          | Pass   |
| **VII. User Documentation**    | The generator is self-contained with built-in descriptive copy and SEO intro text.                                             | Pass   |
| **VIII. Dependency Injection** | Reuses `aiClientManager` singleton injected into the generator service.                                                        | Pass   |
| **IX. Natural Language**       | Simple, clear, non-jargon copy for options and description fields.                                                             | Pass   |
| **X. Quality & Coverage**      | Maintain test coverage of the generator engine package above the 70% floor.                                                    | Pass   |
| **XII. Labels Over Tags**      | Metadata and taxonomy strictly use the term "Labels" instead of "Tags".                                                        | Pass   |

## Project Structure

### Documentation (this feature)

```text
specs/1255-pantheon-generator/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Quality checklist
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 data model definitions
└── quickstart.md        # Phase 1 quickstart documentation
```

### Source Code

```text
apps/web/
├── src/
│   ├── components/
│   │   └── seo/
│   │       └── PantheonFormFields.svelte   # New form inputs component
│   ├── lib/
│   │   └── services/
│   │       └── seo/
│   │           ├── generator-engine.ts     # Register pantheon generator
│   │           └── generators/
│   │               └── pantheon.ts         # Deity/Pantheon generation logic & local tables
│   └── routes/
│       └── (marketing)/
│           └── generators/
│               └── [slug]/
│                   ├── +page.svelte        # Add layout mapping for pantheon
│                   └── +page.ts            # Register "pantheon" and "god-generator" in validSlugs
```

**Structure Decision**: Standard SvelteKit layout. Form fields and business logic are integrated directly into the `apps/web/src/lib/services/seo/` subfolders to match existing generators.
