---
description: "Task list for Improve Help Structure feature"
---

# Tasks: Improve Help Structure

**Input**: Design documents from `specs/042-improve-help-structure/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by phase to enable independent implementation and testing.

## Phase 1: Infrastructure & Loader

**Purpose**: Create the mechanism to load Markdown files with frontmatter.

- [x] T001 Create directory `apps/web/src/lib/content/help/`
- [x] T001.5 Create unit tests for help loader in `apps/web/src/lib/content/loader.test.ts` (Red phase - ensure tests fail initially)
- [x] T002 Implement `loadHelpArticles` in `apps/web/src/lib/content/loader.ts` using `import.meta.glob` and `js-yaml`
  - Import `js-yaml` for frontmatter parsing.
  - Use `import.meta.glob('./help/*.md', { eager: true, query: '?raw', import: 'default' })`.
  - Parse frontmatter and content.
  - Return `HelpArticle[]`.

## Phase 2: Content Migration

**Purpose**: Move existing help content to Markdown files. **Ensure `rank` property is added to frontmatter to preserve current order.**

- [x] T003 Migrate `intro` article to `apps/web/src/lib/content/help/intro.md` (rank: 1)
- [x] T004 Migrate `proposer-guide` article to `apps/web/src/lib/content/help/proposer-guide.md` (rank: 2)
- [x] T005 Migrate `graph-basics` article to `apps/web/src/lib/content/help/graph-basics.md` (rank: 3)
- [x] T006 Migrate `oracle-guide` article to `apps/web/src/lib/content/help/oracle-guide.md` (rank: 4)
- [x] T007 Migrate `offline-sync` article to `apps/web/src/lib/content/help/offline-sync.md` (rank: 5)
- [x] T008 Migrate `gemini-api-key` article to `apps/web/src/lib/content/help/gemini-api-key.md` (rank: 6)
- [x] T009 Migrate `node-merging` article to `apps/web/src/lib/content/help/node-merging.md` (rank: 7)

## Phase 3: Integration

**Purpose**: Connect the loader to the application and clean up.

- [x] T010 Update `apps/web/src/lib/config/help-content.ts` to export the result of `loadHelpArticles()` instead of the hardcoded array
- [x] T011 Verify `help.svelte.ts` works correctly with the new data source
- [x] T012 Verify Help UI renders the content correctly (Markdown formatting, titles)
- [x] T013 Verify Search functionality finds the new articles
- [x] T013.5 Create and verify E2E tests in `apps/web/tests/help-system.spec.ts`

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T014 Add documentation for how to add new help articles (e.g., in `README.md` or a new developer guide)
