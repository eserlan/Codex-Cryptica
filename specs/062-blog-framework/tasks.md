# Tasks: Blog Path and First Article

**Input**: Design documents from `/specs/062-add-blog-path/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Create content directory for blog at apps/web/src/lib/content/blog/
- [x] T002 [P] Create initial article file apps/web/src/lib/content/blog/gm-guide-data-sovereignty.md with content from issue #296
- [x] T003 [P] Configure pre-rendering for blog routes in apps/web/svelte.config.js (verify if dynamic entries need explicit config)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T004 [P] Define BlogArticle and BlogIndexItem types in packages/editor-core/src/blog/types.ts
- [x] T005 Implement parseBlogArticle logic in packages/editor-core/src/blog/parser.ts
- [x] T005a Update apps/web/src/lib/content/loader.ts to import and use the editor-core parser
- [x] T006 Implement loadBlogArticles function in apps/web/src/lib/content/loader.ts using import.meta.glob
- [x] T007 Create shared ArticleRenderer.svelte component in apps/web/src/lib/components/blog/ArticleRenderer.svelte using marked for Markdown parsing

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Accessing the Blog (Priority: P1) 🎯 MVP

**Goal**: Establish the /blog path and index page showing the list of articles.

**Independent Test**: Navigate to /blog and verify the list of articles (at least the first one) is displayed with title and summary.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create route directory apps/web/src/routes/(marketing)/blog/
- [x] T009 [US1] Implement apps/web/src/routes/(marketing)/blog/+page.ts to load blog index items
- [x] T010 [US1] Implement apps/web/src/routes/(marketing)/blog/+page.svelte to render the index list with Tailwind 4 styling
- [x] T011 [US1] Add basic Playwright test in apps/web/tests/blog.spec.ts to verify /blog path loads

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Reading the First Article (Priority: P2)

**Goal**: Implement individual article pages at /blog/[slug] and render the first article.

**Independent Test**: Click an article link on the index and verify it navigates to /blog/gm-guide-data-sovereignty with full content and SEO metadata.

### Implementation for User Story 2

- [x] T012 [P] [US2] Create route directory apps/web/src/routes/(marketing)/blog/[slug]/
- [x] T013 [US2] Implement apps/web/src/routes/(marketing)/blog/[slug]/+page.ts to load specific article data and enable prerendering
- [x] T014 [US2] Implement apps/web/src/routes/(marketing)/blog/[slug]/+page.svelte to render the article using ArticleRenderer and set SEO metadata in <svelte:head>
- [x] T015 [US2] Add Playwright test in apps/web/tests/blog.spec.ts to verify navigation to article and content rendering

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final touches and verification

- [x] T016 [P] Update apps/web/src/lib/config/help-content.ts to include a guide or link to the new blog
- [x] T017 [P] Verify 404 behavior for non-existent slugs in /blog/[slug]
- [x] T018 Run apps/web/static/sitemap.xml update (if manual) or verify auto-generation includes new blog paths
- [x] T019 Final lint and type check across modified files
- [x] T020 Run Lighthouse performance audit to verify <500ms load time and 90+ accessibility score

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1.
- **User Story 1 (Phase 3)**: Depends on Phase 2.
- **User Story 2 (Phase 4)**: Depends on User Story 1 (for navigation) and Phase 2.
- **Polish (Final Phase)**: Depends on all user stories.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and 2.
2. Complete Phase 3 (US1).
3. Verify that the blog index appears at /blog.

### Incremental Delivery

1. Foundation ready.
2. US1 adds the "Home" for the blog.
3. US2 adds the actual content pages.
