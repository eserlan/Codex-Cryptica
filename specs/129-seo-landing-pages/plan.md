# Implementation Plan: SEO Landing Page and Generator System

**Branch**: `129-seo-landing-pages` | **Date**: 2026-06-02 | **Spec**: [spec.md](file:///home/espen/proj/remotecodexarcana/specs/129-seo-landing-pages/spec.md)
**Input**: Feature specification from `/specs/129-seo-landing-pages/spec.md`

---

## Summary

We will build a high-performance, crawler-friendly SEO landing page system inside the statically pre-rendered `(marketing)` route group of the SvelteKit web application. The system will feature solutions, comparisons, and interactive client-side generators (NPC, Name, Settlement, Magic Item) using Svelte 5 and Tailwind 4 semantic tokens. The generators will utilize the default shared system proxy for AI outputs out-of-the-box, with instant local deterministic tables as a fallback. An onboarding transfer mechanism using `localStorage` will pass generated draft entities directly to the app shell, which automatically imports and focuses the draft inside the active vault.

---

## Technical Context

**Language/Version**: TypeScript 6.0.3  
**Primary Dependencies**: Svelte 5 (Runes), SvelteKit, `@google/generative-ai` (Gemini SDK via `aiClientManager`), `@codex/vault-engine`  
**Storage**: `localStorage` (transient transfer), OPFS & IndexedDB (via vault stores)  
**Testing**: Vitest (`bun test`), Playwright E2E (`bun run test` via `--reporter=list`)  
**Target Platform**: Modern web browsers supporting OPFS and File System Access API  
**Project Type**: SvelteKit web application extension  
**Performance Goals**: Static landing pages loaded in <500ms, generator processing in <100ms  
**Constraints**: 100% client-side operation, statically pre-rendered routes (`prerender = true; ssr = true;`)

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Pass. The implementation uses the existing `@codex/vault-engine` and `apps/web/src/lib/services/ai` client manager. No new low-level packages are required; pages are clean UI layouts.
2. **TDD (Test-Driven Development)**: Pass. We will write unit tests for the sitemap XML generator, configuration parser, and draft importer logic.
3. **Simplicity & YAGNI**: Pass. No complex frameworks or dynamic server backends will be introduced; SvelteKit static adapter handles all SSG requirements.
4. **AI-First Extraction**: Pass. When in AI mode, prompts are fed to the shared system proxy and generated JSON/Markdown is parsed and verified.
5. **Privacy & Client-Side Processing**: Pass. Transfer is handled in the browser's `localStorage` and final vault storage is handled in OPFS/IndexedDB.
6. **Clean Implementation**: Pass. All components will utilize Svelte 5 runes, Tailwind 4 semantic tokens (`text-theme-primary`, etc.), and Iconify classes (`class="icon-[lucide--...]"`).
7. **Dependency Injection**: Pass. Services (e.g. `SeoImportService`) will use constructor-based DI with singleton exports.
8. **Terminology Unification**: Pass. All generated metadata will be created and displayed as "Labels", strictly avoiding the word "Tags".

---

## Project Structure

### Documentation (this feature)

```text
specs/129-seo-landing-pages/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/
└── web/
    ├── static/
    │   └── sitemaps/                 # (Prerendered files will output here)
    └── src/
        ├── lib/
        │   ├── config/
        │   │   └── seo-pages.ts      # Solutions, Comparisons, and Generators static copy data
        │   ├── services/
        │   │   └── seo/
        │   │       ├── import-handler.ts # Intercepts localStorage pending drafts and imports to vault
        │   │       └── generator-engine.ts # Client-side name tables and procedural fallback lists
        │   └── components/
        │       └── seo/
        │           ├── SEOPageLayout.svelte  # Reusable Solutions/Comparison template
        │           └── SEOGeneratorLayout.svelte # Reusable Interactive Generator template
        └── routes/
            └── (marketing)/
                ├── solutions/
                │   └── [slug]/
                │       ├── +page.svelte  # Solution details
                │       └── +page.ts      # Entries & dynamic loader
                ├── vs/
                │   └── [slug]/
                │       ├── +page.svelte  # Comparison cards/grids
                │       └── +page.ts      # Entries & dynamic loader
                ├── generators/
                │   └── [slug]/
                │       ├── +page.svelte  # Client-side generators page
                │       └── +page.ts      # Entries & dynamic loader
                └── sitemap.xml/
                    └── +server.ts        # Dynamic sitemap renderer
```

**Structure Decision**: Fully decoupled marketing sub-routes using SvelteKit page parameters (`[slug]`) with static entries pre-rendering, combined with modular configuration files for the landing page copy and generator tables.

---

## Complexity Tracking

No violations of the Constitution identified.
