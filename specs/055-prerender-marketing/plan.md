# Implementation Plan: Public Route Prerendering

**Branch**: `055-prerender-marketing` | **Date**: 2026-02-21 | **Spec**: [specs/055-prerender-marketing/spec.md](spec.md)
**Input**: Feature specification from `/specs/055-prerender-marketing/spec.md`

## Summary

Enable static HTML generation for marketing and legal routes (`/`, `/features`, `/terms`, `/privacy`) to improve SEO and initial load performance. This will be achieved by configuring SvelteKit's prerender engine, moving data fetching to build-time `load` functions, and providing standard crawl metadata (`robots.txt`, `sitemap.xml`).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ / Svelte 5  
**Primary Dependencies**: SvelteKit, `@sveltejs/adapter-static`  
**Storage**: N/A (Static files)  
**Testing**: Playwright (E2E)  
**Target Platform**: GitHub Pages (Static Hosting)
**Project Type**: Web application (SvelteKit)  
**Performance Goals**: Lighthouse SEO score >= 90, LCP < 1.5s  
**Constraints**: Zero user data in prerendered HTML, absolute build-time safety for browser globals.  
**Scale/Scope**: 4 primary routes + crawl configuration files.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: PASSED (Configuration-focused, no logic suitable for packages).
- **II. TDD**: PASSED (Verified via E2E content checks).
- **III. Simplicity**: PASSED (Uses native SvelteKit prerendering).
- **IV. AI-First**: N/A.
- **V. Privacy**: PASSED (Only public routes are prerendered).
- **VI. Clean Implementation**: PASSED (Guarding globals with `browser` check).
- **VII. User Documentation**: PASSED (Feature is purely technical/SEO improvement).

## Project Structure

### Documentation (this feature)

```text
specs/055-prerender-marketing/
├── plan.md              # This file
├── research.md          # Prerender configuration and safety research
├── data-model.md        # Entities: Public Route, SEO Metadata
├── quickstart.md        # Build verification guide
└── checklists/
    └── requirements.md  # Quality validation
```

### Source Code (repository root)

```text
apps/web/
├── svelte.config.js     # Prerender entry configuration
├── static/
│   ├── robots.txt       # Crawl rules
│   └── sitemap.xml      # Route index
└── src/routes/
    ├── +page.svelte     # Landing page
    ├── features/
    │   ├── +page.svelte
    │   └── +page.ts     # Prerender enabling
    ├── privacy/
    │   ├── +page.svelte
    │   └── +page.ts     # Prerender + Load function
    └── terms/
        ├── +page.svelte
        └── +page.ts     # Prerender + Load function
```

**Structure Decision**: Standard SvelteKit route-based configuration. Prerendering settings and `load` functions will be defined in `+page.ts` files to override layout defaults.
