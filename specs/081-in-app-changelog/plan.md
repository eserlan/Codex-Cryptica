# Implementation Plan: In-App & Dedicated Changelog

**Branch**: `feat/changelog-page` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/081-in-app-changelog/spec.md`
**Status**: In Progress

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature extends the existing in-app changelog modal to include a dedicated, SEO-friendly public changelog page at `/changelog`. It leverages the existing `releases.json` data source to ensure consistency across both the app-space (modal) and marketing-space (page).

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)
**Primary Dependencies**: SvelteKit 2, Tailwind CSS 4, Lucide Svelte
**Storage**: Static JSON (`apps/web/src/lib/content/changelog/releases.json`)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Browser (Web)
**Performance Goals**: <1s LCP for the dedicated page; 0ms impact on workspace performance (lazy-loaded).
**Constraints**: Must share the same data source for both modal and page; Page must be SSR/Prerendered for SEO.

## Constitution Check

| Gate                           | Status  | Notes                                                                        |
| ------------------------------ | ------- | ---------------------------------------------------------------------------- |
| **I. Library-First**           | ✅ PASS | Uses shared `releases.json` and existing UI stores.                          |
| **II. TDD**                    | ✅ PASS | Will add Playwright tests for the new route and landing page link.           |
| **III. Simplicity & YAGNI**    | ✅ PASS | Reuses existing data structure; avoids complex CMS for simple release notes. |
| **IV. AI-First Extraction**    | ⚠️ N/A  | Static content management.                                                   |
| **V. Privacy & Client-Side**   | ✅ PASS | Public page only shows public release notes; no user data involved.          |
| **VI. Clean Implementation**   | ✅ PASS | Svelte 5 Runes for component logic; Tailwind 4 for styling.                  |
| **VII. User Documentation**    | ✅ PASS | The feature _is_ documentation (changelog).                                  |
| **VIII. Dependency Injection** | ✅ PASS | Data is passed via SvelteKit `load` functions.                               |
| **IX. Natural Language**       | ✅ PASS | Clear, user-facing release highlights.                                       |
| **X. Quality & Coverage**      | ✅ PASS | Ensuring 100% route coverage for the new `/changelog` path.                  |

## Project Structure

### Documentation (this feature)

```text
specs/081-in-app-changelog/
├── spec.md              # Original requirements
├── plan.md              # This file
├── research.md          # Route and layout investigation
├── data-model.md        # releases.json schema (existing)
├── quickstart.md        # Usage guidelines
└── tasks.md             # Implementation checklist
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── content/changelog/
│   │   └── releases.json               # Canonical data source
│   ├── components/modals/
│   │   └── ChangelogModal.svelte       # In-app view (existing)
├── routes/
│   ├── (app)/
│   │   └── +page.svelte                # Updated with landing page link
│   └── (marketing)/
│       └── changelog/
│           ├── +page.svelte            # New dedicated page
│           └── +page.ts                # New load function & SEO config
```

## Complexity Tracking

[None currently]
