# Implementation Plan: SEO & Performance Optimization

**Branch**: `feat/seo-automation` | **Date**: 2026-02-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/047-seo-performance-optimization/spec.md`

## Summary

Implement a comprehensive SEO and performance optimization layer for Codex Cryptica. This includes a crawlable marketing landing page at the root route, a dedicated features indexing page, and global SEO metadata. To ensure long-term maintainability and prevent regressions, an automated auditing pipeline using Unlighthouse is integrated into the development and CI workflows.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: `unlighthouse`, `start-server-and-test`, `svelte` (Runes), `@tailwindcss/postcss` (Tailwind 4)  
**Storage**: `localStorage` (for `skipWelcomeScreen` preference)  
**Testing**: Unlighthouse (SEO/Perf Audits), Playwright (E2E)  
**Target Platform**: Modern Browsers / Search Engine Crawlers  
**Performance Goals**: SEO Score > 90, Accessibility Score > 90, LCP < 1.2s on landing page.  
**Constraints**: Must remain "Local-First" once the user enters the workspace; only public-facing routes are optimized for crawlers.

## Constitution Check

1. **Library-First**: SEO logic is primarily route-based and configuration-driven within `apps/web`. [PASS]
2. **TDD**: Automated audits act as the primary "test suite" for SEO/Perf requirements. [PASS]
3. **Simplicity**: Uses standard `<svelte:head>` for metadata and a simple landing page toggle. [PASS]
4. **AI-First**: Improved discoverability helps onboard new users who will utilize Oracle features. [PASS]
5. **Privacy**: Marketing layer is separate from private vault data; audits exclude private `/test` routes. [PASS]
6. **Clean Implementation**: Adheres to Svelte 5 patterns and Tailwind 4 for the new landing page UI. [PASS]
7. **User Documentation**: Features page provides a human-readable and bot-crawlable guide to the app. [PASS]

## Project Structure

### Documentation

```text
specs/047-seo-performance-optimization/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Implementation tasks
```

### Source Code

```text
apps/web/
├── unlighthouse.config.ts # NEW: Audit configuration
├── package.json           # UPDATED: Added audit scripts
├── src/
│   ├── routes/
│   │   ├── +page.svelte   # UPDATED: Marketing Landing Page
│   │   ├── +layout.svelte # UPDATED: Global SEO Metadata & Logic
│   │   └── features/      # NEW: Static feature indexing route
│   └── lib/
│       └── stores/
│           └── ui.svelte.ts # UPDATED: skipWelcomeScreen state
```

## Implementation Strategy

1. **Audit Baseline**: Setup Unlighthouse to establish current scores and define budgets.
2. **Metadata Layer**: Implement global Open Graph, Twitter, and standard meta tags in the root layout.
3. **Marketing Layer**: Create a high-performance landing page at `/` that acts as the crawlable entry point with a streamlined single-button onboarding flow.
4. **Static Indexing**: Create `/features` to expose the app's capabilities to search engines without requiring JS interaction.
5. **Persistence**: Ensure users can opt-out of the landing page for a direct "app-like" experience on return visits.
6. **CI Integration**: Add audit scripts to `package.json` for automated verification.
