# Tasks: Comprehensive Help Guide Blog Post

**Input**: Design documents from `/specs/064-help-blog-post/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Tests are NOT explicitly requested for this content-only feature, but verification steps are included in Phase 5.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize the comprehensive guide file with YAML frontmatter in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Content extraction that MUST be complete before the user story implementation can be finalized.

- [x] T002 Extract and synthesize content from all help articles in `apps/web/src/lib/content/help/*.md`
- [x] T003 Extract and synthesize all feature definitions from `FEATURE_HINTS` in `apps/web/src/lib/config/help-content.ts`
- [x] T004 Extract and synthesize feature descriptions from `apps/web/src/routes/(marketing)/features/+page.svelte`

**Checkpoint**: Foundation ready - content synthesis can now begin in user story phases.

---

## Phase 3: User Story 1 - Onboarding New Users (Priority: P1) 🎯 MVP

**Goal**: Create a comprehensive 5-phase journey from setup to mastery.

**Independent Test**: Verify that the guide is accessible at `/blog/comprehensive-help-guide` and covers all required phases.

### Implementation for User Story 1

- [x] T005 [US1] Write "Phase 1: Getting Started" (Welcome, Vault creation, Sync setup) in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T006 [US1] Write "Phase 2: Building Your World" (Entities, Chronicles, Lore, Categories, Themes) in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T007 [US1] Write "Phase 3: Visualizing & Connecting" (Knowledge Graph, Map Mode, Spatial Canvas, Fog of War) in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T008 [US1] Write "Phase 4: Advanced Mastery" (Oracle Slash Commands, Image Gen, Node Merging, Connection Proposer) in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T009 [US1] Write "Phase 5: Privacy & Best Practices" (Data Sovereignty, Offline use, Obsidian integration) in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T010 [US1] Add descriptive placeholders for visual content (e.g., `![Vault Setup Screen Placeholder]`) in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T011 [US1] Verify all features from the Features page are explained with practical use cases in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`

**Checkpoint**: At this point, the guide is content-complete and testable as an onboarding journey.

---

## Phase 4: User Story 2 - Feature Reference (Priority: P2)

**Goal**: Enable power users to quickly jump to specific sections.

**Independent Test**: Verify that the Table of Contents links navigate to the correct sections of the guide.

### Implementation for User Story 2

- [x] T012 [US2] Implement a manual Markdown Table of Contents with anchor links in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T013 [US2] Ensure all headings have appropriate IDs (standard GFM slugification) to support anchor links in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`

**Checkpoint**: All user stories are now implemented and functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final adjustments for readability, SEO, and quality.

- [x] T014 Review and edit content to achieve Flesch-Kincaid Grade Level 8-10 in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T015 Verify all internal blog links use relative paths in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T016 Final SEO metadata validation (title, description, keywords) in `apps/web/src/lib/content/blog/comprehensive-help-guide.md`
- [x] T017 Run all validation steps defined in `specs/064-help-blog-post/quickstart.md`
- [x] T018 Add a link to the Comprehensive Help Guide within `apps/web/src/lib/config/help-content.ts` (e.g., in `the-archive` hint or a new hint) to ensure in-app discoverability.
- [x] T019 Update `apps/web/static/sitemap.xml` to include the new `/blog/comprehensive-help-guide` URL.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1.
- **User Story 1 (Phase 3)**: Depends on Phase 2 content extraction.
- **User Story 2 (Phase 4)**: Can run in parallel with or after Phase 3, but requires Phase 3's headings for anchor links.
- **Polish (Phase 5)**: Depends on all implementation tasks.

### User Story Dependencies

- **User Story 1 (P1)**: The MVP journey.
- **User Story 2 (P2)**: Enhancement to the MVP journey.

### Parallel Opportunities

- Content extraction (T002, T003, T004) can be performed in parallel.
- Drafting individual phases of US1 (T005-T009) can be performed in parallel if using temporary files, but sequential is recommended for a cohesive narrative.
- SEO and Readability reviews (T014, T016) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational extraction.
2. Complete the 5-phase onboarding journey (US1).
3. Validate that the guide is readable and covers all core features.

### Incremental Delivery

1. Foundation: Extracted knowledge base.
2. MVP: Full-length onboarding guide.
3. Power User Add-on: Table of Contents and deep linking.
4. Polish: Final readability and SEO tuning.

---

## Summary of Task Counts

- **Total Tasks**: 19
- **Setup**: 1
- **Foundational**: 3
- **User Story 1 (P1)**: 7
- **User Story 2 (P2)**: 2
- **Polish**: 6

**Parallel Opportunities Identified**: 5 tasks (T002-T004, T014, T016)
**Independent Test Criteria**: Defined for US1 (Onboarding) and US2 (Reference).
**MVP Scope**: Phase 1 through Phase 3.
**Format Validation**: All tasks follow the strict `- [ ]` or `- [x] TXXX [P?] [US?] Description` format.
