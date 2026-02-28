# Implementation Plan: Blog Path and First Article

**Branch**: `062-add-blog-path` | **Date**: 2026-02-28 | **Spec**: [/specs/062-add-blog-path/spec.md](spec.md)
**Input**: Feature specification from `/specs/062-add-blog-path/spec.md`

## Summary

The goal is to implement a public blog at `/blog` with support for individual articles at `/blog/[slug]`. The first article, "The GM’s Guide to Data Sovereignty," will be published to improve SEO and user education. The technical approach involves using static Markdown files with YAML frontmatter, loaded via Vite's `import.meta.glob`, and rendered as static pages in SvelteKit for optimal performance and SEO.

## Technical Context

**Language/Version**: TypeScript 5.x / Svelte 5 / SvelteKit 2
**Primary Dependencies**: SvelteKit (routing, pre-rendering), `marked` (for Markdown-to-HTML)
**Storage**: Static Markdown files in `src/lib/content/blog/`
**Testing**: Playwright (E2E for routing), Vitest (unit tests for parsing)
**Target Platform**: Web (Modern Browsers)
**Project Type**: Web (apps/web)
**Performance Goals**: <500ms p95 for blog pages
**Constraints**: SEO friendly, local-first theme consistency, offline-capable (bundled content)
**Scale/Scope**: ~10-50 articles initially, static rendering

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                | Condition                                          | Status |
| ------------------------ | -------------------------------------------------- | ------ |
| I. Library-First         | Core parsing logic moved to `packages/editor-core` | PASS   |
| II. TDD                  | Playwright tests for routing and content rendering | PASS   |
| III. Simplicity & YAGNI  | Use standard SvelteKit static generation           | PASS   |
| IV. AI-First Extraction  | N/A (Marketing content)                            | PASS   |
| V. Privacy               | Client-side only or static pre-rendered            | PASS   |
| VI. Clean Implementation | Adhere to Svelte 5 and Tailwind 4 standards        | PASS   |
| VII. User Documentation  | Corresponds to blog content itself                 | PASS   |

## Project Structure

### Documentation (this feature)

```text
specs/062-add-blog-path/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # API/Data contracts
│   └── blog.ts          # BlogArticle and BlogIndexItem interfaces
```

### Source Structure (affected)

```text
packages/editor-core/src/
└── blog/
    └── parser.ts        # New: Shared parsing logic

apps/web/src/
├── lib/
│   ├── content/
│   │   ├── blog/        # New: Markdown files
│   │   └── loader.ts    # Modified: Use editor-core parser
│   └── components/
│       └── blog/
│           └── ArticleRenderer.svelte # New: Shared renderer
```

└── routes/
└── (marketing)/
└── blog/
├── +page.svelte # Blog index
├── +page.ts # Index data loader
└── [slug]/
├── +page.svelte # Individual article
└── +page.ts # Article data loader (prerender: true)

```

## Phase 0: Outline & Research
_Complete. See [research.md](research.md)_

## Phase 1: Design & Contracts
_Complete. See [data-model.md](data-model.md), [contracts/blog.ts](contracts/blog.ts)_

## Phase 2: Implementation Plan

1. **Content Logic**:
   - Update `apps/web/src/lib/content/loader.ts` to include `loadBlogArticles()`.
   - Create `apps/web/src/lib/content/blog/` directory.
   - Add `gm-guide-data-sovereignty.md` with the content from the issue.

2. **Routes**:
   - Create `apps/web/src/routes/(marketing)/blog/+page.svelte` (Index).
   - Create `apps/web/src/routes/(marketing)/blog/[slug]/+page.svelte` (Article).
   - Ensure `+page.ts` files enable `prerender = true`.

3. **Components**:
   - Create `ArticleRenderer.svelte` using `marked` for Markdown rendering.
   - Apply Tailwind 4 styles consistent with the Codex Cryptica theme.

4. **Verification**:
   - Add Playwright tests to check:
     - `/blog` loads correctly.
     - Clicking an article navigates to the correct slug.
     - Article content and metadata are correctly rendered.
   - Run performance audit (Lighthouse or similar).
```
