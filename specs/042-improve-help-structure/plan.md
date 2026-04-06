# Implementation Plan: Improve Help Structure

**Branch**: `042-improve-help-structure` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/042-improve-help-structure/spec.md`

## Summary

Migrate the hardcoded `HELP_ARTICLES` array from `help-content.ts` to individual Markdown files with YAML frontmatter. This enables developers and content creators to manage help documentation more easily. The system will load these files at build/runtime using Vite's `import.meta.glob`.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte 5
**Primary Dependencies**: `js-yaml` (for frontmatter), `marked` (for rendering, already in use), Vite (for `import.meta.glob`).
**Storage**: Filesystem (source code), bundled into the app.
**Testing**: Vitest for unit tests.
**Target Platform**: Web (PWA).

## Constitution Check

_GATE: Must pass before Phase 0 research._

1.  **Local-First**: Content is bundled with the app, available offline. Pass.
2.  **No External Dependencies**: Uses existing libraries. Pass.

## Project Structure

### Documentation (this feature)

```text
specs/042-improve-help-structure/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task list
```

### Source Code

```text
apps/web/src/lib/
├── config/
│   └── help-content.ts      # Updated to load from content/
├── content/
│   ├── help/                # New directory for .md files
│   │   ├── getting-started.md
│   │   └── ...
│   └── index.ts             # Loader logic
└── utils/
    └── markdown.ts          # Frontmatter parsing utility
```

## Complexity Tracking

No major complexity added. Replaces a large JSON object with a file-based approach, which is standard for CMS-like features.

## Phase 1: Infrastructure & Loader

**Goal**: Create the mechanism to load Markdown files with frontmatter.

1.  Create `apps/web/src/lib/content/help/` directory.
2.  Implement `loadHelpArticles()` in `apps/web/src/lib/content/loader.ts`.
    - Use `import.meta.glob('./help/*.md', { eager: true, query: '?raw', import: 'default' })`.
    - Parse frontmatter using `js-yaml` (or simple regex if dependency avoidance is preferred, but `js-yaml` is already in package.json).
    - Return `HelpArticle[]`.

## Phase 2: Content Migration

**Goal**: Move existing help content to Markdown files.

1.  Extract each article from `HELP_ARTICLES` in `help-content.ts`.
2.  Create a corresponding `.md` file in `apps/web/src/lib/content/help/`.
    - Format:

      ```markdown
      ---
      id: article-id
      title: Article Title
      tags: [tag1, tag2]
      rank: 1
      ---

      Markdown content here...
      ```

## Phase 3: Integration

**Goal**: Connect the loader to the application.

1.  Update `apps/web/src/lib/config/help-content.ts` to export the result of `loadHelpArticles()`.
2.  Verify `help.svelte.ts` (store) receives the data correctly.
3.  Verify the Help UI renders the content.

## Phase 4: Cleanup & Verification

1.  Remove the old hardcoded array.
2.  Run tests to ensure search and rendering work.
