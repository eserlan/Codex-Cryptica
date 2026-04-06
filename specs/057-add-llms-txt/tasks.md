---
description: "Task list for Implement llms.txt standard"
---

# Tasks: Implement llms.txt standard

**Input**: Design documents from `/specs/057-add-llms-txt/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: E2E tests are required to verify file presence and discoverability.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1 (AI Ingestion), US2 (Developer Onboarding)

## Phase 1: Setup

**Purpose**: Infrastructure and directory preparation

- [x] T001 [P] Ensure `apps/web/static/` directory exists for asset placement
- [x] T002 [P] Create `scripts/generate-llms-full.mjs` skeleton with executable permissions

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites for both user stories

- [x] T003 Update `apps/web/static/robots.txt` to include `Allow: /llms.txt` and `Allow: /llms-full.txt`
- [x] T004 Add `<link rel="llms" href="/llms.txt">` to `apps/web/src/app.html` head

---

## Phase 3: User Story 1 - AI Agent Context Ingestion (Priority: P1) 🎯 MVP

**Goal**: Enable AI agents to ingest project context via `/llms.txt` and `/llms-full.txt`

**Independent Test**: Fetch `/llms.txt` and `/llms-full.txt` from local server and verify 200 OK and content accuracy.

### Tests for User Story 1

- [x] T005 [P] [US1] Create E2E test in `apps/web/tests/seo.spec.ts` to verify `/llms.txt` exists and has correct content-type
- [x] T006 [P] [US1] Create E2E test in `apps/web/tests/seo.spec.ts` to verify `/llms-full.txt` exists and is not empty

### Implementation for User Story 1

- [x] T007 [US1] Author `apps/web/static/llms.txt` with H1, blockquote summary, and curated H2 sections per spec
- [x] T008 [US1] Implement concatenation logic in `scripts/generate-llms-full.mjs` to pull from root README and package READMEs
- [x] T009 [US1] Update `scripts/generate-llms-full.mjs` to include schema interfaces from `packages/schema/src/*.ts`
- [x] T010 [US1] Integrate `node scripts/generate-llms-full.mjs` (executed from root) into `apps/web/package.json` as a `prebuild` step
- [x] T011 [US2] Update `apps/web/tests/seo.spec.ts` to verify `<link rel="llms">` presence in the homepage head
- [x] T012 [US2] Refine `apps/web/static/llms.txt` link descriptions to specifically help coding agents (e.g. "Core state logic", "Schema definitions")

**Checkpoint**: Developer IDEs like Cursor can now automatically discover and use project documentation.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T013 [P] Verify `llms.txt` file size is under 10KB
- [x] T014 Run full E2E suite to ensure no regressions in SEO or site boot
- [x] T015 Final validation of `llms-full.txt` (verify Markdown structure and check for broken internal anchors)

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 & 2 are foundational and block Phase 3.
- Phase 3 (US1) is the MVP and should be completed first.
- Phase 4 (US2) adds discoverability enhancements.

### Parallel Opportunities

- T001, T002 can run in parallel.
- T003, T004 can run in parallel.
- T005, T006 (tests) can be written in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational tasks.
2. Author `llms.txt`.
3. Implement `generate-llms-full.mjs`.
4. Verify files are served correctly.

### Incremental Delivery

1. Add E2E validation for link tags and robots.txt.
2. Refine link descriptions for better agent guidance.
