# Tasks: Public Route Prerendering

**Input**: Design documents from `/specs/055-prerender-marketing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Create `robots.txt` with sitemap link in `apps/web/static/robots.txt`
- [ ] T002 [P] Create initial `sitemap.xml` with marketing routes in `apps/web/static/sitemap.xml`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T003 Configure `adapter-static` and `prerender.entries` in `apps/web/svelte.config.js`
- [ ] T004 Guard browser-only globals (window, document, localStorage) in shared components using `browser` from `$app/environment`

---

## Phase 3: User Story 1 - SEO Optimization for Marketing Content (Priority: P1) 🎯 MVP

**Goal**: Ensure search engine crawlers see full content of marketing pages without JS.

**Independent Test**: Run `npm run build` and verify HTML files exist for all marketing routes. Use `curl` to verify content presence in static files.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Create `apps/web/src/routes/+page.ts` to enable prerendering for the root route
- [ ] T006 [P] [US1] Create `apps/web/src/routes/features/+page.ts` to enable prerendering for the features route
- [ ] T007 [P] [US1] Create `apps/web/src/routes/privacy/+page.ts` to enable prerendering for the privacy route
- [ ] T008 [P] [US1] Create `apps/web/src/routes/terms/+page.ts` to enable prerendering for the terms route
- [ ] T009 [US1] Move legal document fetching logic from `onMount` to a server-safe `load` function in `apps/web/src/routes/privacy/+page.ts` and `apps/web/src/routes/terms/+page.ts`
- [ ] T010 [US1] Update `LegalDocument.svelte` to use the data provided by the `load` function instead of client-side fetching

---

## Phase 4: User Story 2 - Instant Visual Feedback for New Visitors (Priority: P2)

**Goal**: Landing page loads visual content immediately without JS initialization lag.

**Independent Test**: Disable JavaScript in browser and verify `/`, `/features`, `/privacy`, and `/terms` render correctly.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Verify and ensure all CSS styles for marketing pages are correctly bundled for SSR in `apps/web/src/app.css`
- [ ] T012 [P] [US2] Ensure image assets in marketing routes use relative paths compatible with static hosting in `apps/web/src/routes/features/+page.svelte`

---

## Phase 5: User Story 3 - Social Media Metadata (Priority: P3)

**Goal**: Link previews show correct title and description on social platforms.

**Independent Test**: Inspect generated HTML files in `apps/web/build/` and verify `<meta>` and `<title>` tags are populated.

### Implementation for User Story 3

- [ ] T013 [P] [US3] Add consistent SEO meta tags to `apps/web/src/routes/+page.svelte`
- [ ] T014 [P] [US3] Add consistent SEO meta tags to `apps/web/src/routes/features/+page.svelte`
- [ ] T015 [P] [US3] Ensure `LegalDocument.svelte` sets the document title in a way that is captured during prerendering (via `svelte:head`)

---

## Phase 6: User Story 4 - Crawl Essentials (Priority: P4)

**Goal**: Crawlers find and follow `sitemap.xml` and `robots.txt`.

**Independent Test**: Verify static files are accessible at `/robots.txt` and `/sitemap.xml` after build.

### Implementation for User Story 4

- [ ] T016 [US4] Finalize `sitemap.xml` entries to match all prerendered routes in `apps/web/static/sitemap.xml`
- [ ] T017 [US4] Verify sitemap link in `robots.txt` points to the correct production domain in `apps/web/static/robots.txt`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T018 [P] Create new E2E test `apps/web/tests/seo.spec.ts` to verify static route accessibility and metadata
- [ ] T018a [P] Verify that non-prerendered routes (e.g., `/oracle`) correctly resolve via the SPA fallback in `apps/web/tests/seo.spec.ts`
- [ ] T019 Run full build and validate with Unlighthouse using `npm run build:audit` in `apps/web/`
- [ ] T020 [P] Add "Search Engine Optimization" technical note to the help guide in `apps/web/src/lib/config/help-content.ts`
- [ ] T021 [P] Final documentation update in `apps/web/README.md` regarding static build requirements

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) is the MVP and should be completed first.
  - User Stories 2, 3, and 4 can proceed in parallel once the prerender logic (US1) is verified.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation for all subsequent stories.
- **User Story 2 (P2)**: Depends on T005-T008 (routes being prerendered).
- **User Story 3 (P3)**: Depends on T005-T008 (metadata placement).
- **User Story 4 (P4)**: Depends on T001-T002.

---

## Parallel Execution Examples

```bash
# Launch setup and foundational tasks together (where possible):
Task T001: Create robots.txt
Task T002: Create sitemap.xml

# Prerender enabling tasks can run in parallel:
Task T005: Root prerender
Task T006: Features prerender
Task T007: Privacy prerender
Task T008: Terms prerender
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Prerendering core routes)
4. **STOP and VALIDATE**: Run `npm run build` and `curl` local files.

### Incremental Delivery

1. Foundation ready.
2. User Story 1 (MVP) -> Full indexable HTML.
3. User Story 2 -> Perceived performance / Visuals.
4. User Story 3 -> Social sharing presence.
5. User Story 4 -> Crawl discovery.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify build success after each major configuration change (T003, T009)
