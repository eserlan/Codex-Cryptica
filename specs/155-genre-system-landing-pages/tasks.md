# Tasks: Genre and System Landing Pages (/for/[slug])

**Input**: Design documents from `/specs/155-genre-system-landing-pages/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- File paths are relative to repository root (`apps/web/...`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define the content schema, registry interfaces, and test harness

- [x] T001 Create content pack schema interface & Zod validation in `apps/web/src/lib/content/for/schema.ts`
- [x] T002 Create registry helper module with DI support in `apps/web/src/lib/content/for/registry.ts`
- [x] T003 [P] Add registry unit test suite in `apps/web/src/lib/content/for/registry.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core routing and UI shell layout that MUST be complete before user story packs are rendered

**⚠️ CRITICAL**: No user story content pack work can begin until this phase is complete

- [x] T004 Create dynamic route load function with `entries()` prerendering export in `apps/web/src/routes/(marketing)/for/[slug]/+page.ts`
- [x] T005 Create unified reusable landing page shell component layout in `apps/web/src/routes/(marketing)/for/[slug]/+page.svelte`

**Checkpoint**: Foundation ready — content packs can now be added and rendered through the shell

---

## Phase 3: User Story 1 - Discovering Codex Cryptica for a Specific RPG System (Priority: P1) 🎯 MVP

**Goal**: Render system-specific landing pages with RPG terminology, relationship graph previews, and non-affiliation disclaimers (e.g. _Vampire: The Masquerade_).

**Independent Test**: Navigate to `/for/vampire-the-masquerade` and verify VtM content, graph preview (`Prince → Sheriff → Primogen`), generator links, and non-affiliation disclaimer.

### Implementation for User Story 1

- [x] T006 [P] [US1] Unit test for VtM registry lookup and disclaimer presence in `apps/web/src/lib/content/for/registry.test.ts`
- [x] T007 [P] [US1] Create Vampire: The Masquerade content pack in `apps/web/src/lib/content/for/packs/vampire-the-masquerade.ts`
- [x] T008 [US1] Register `vampire-the-masquerade` content pack in `apps/web/src/lib/content/for/registry.ts`
- [x] T009 [US1] Implement disclaimer block and graph preview rendering in `apps/web/src/routes/(marketing)/for/[slug]/+page.svelte`

**Checkpoint**: User Story 1 (VtM system landing page) is fully functional and testable independently

---

## Phase 4: User Story 2 - Discovering Codex Cryptica for a Broad Genre (Priority: P1)

**Goal**: Render genre-specific landing pages (e.g. _Fantasy Worldbuilding_) with genre use cases, generator links, and CTA, without disclaimers.

**Independent Test**: Navigate to `/for/fantasy-worldbuilding` and verify fantasy content, generator links, and CTA without disclaimer block.

### Implementation for User Story 2

- [x] T010 [P] [US2] Unit test for Fantasy Worldbuilding registry lookup and omitted disclaimer in `apps/web/src/lib/content/for/registry.test.ts`
- [x] T011 [P] [US2] Create Fantasy Worldbuilding content pack in `apps/web/src/lib/content/for/packs/fantasy-worldbuilding.ts`
- [x] T012 [US2] Register `fantasy-worldbuilding` content pack in `apps/web/src/lib/content/for/registry.ts`

**Checkpoint**: User Stories 1 AND 2 work independently through the single shared shell

---

## Phase 5: User Story 3 - Adding New System or Genre Pages via Config (Priority: P2)

**Goal**: Ensure developers can add future pages by adding a configuration file without modifying Svelte UI components.

**Independent Test**: Verify adding a test configuration to `registry.ts` renders cleanly through `/for/[slug]` with optional sections collapsing properly.

### Implementation for User Story 3

- [x] T013 [P] [US3] Unit test for dynamic page addition and optional section collapsing in `apps/web/src/lib/content/for/registry.test.ts`
- [x] T014 [US3] Ensure developer quickstart guide is accurate in `specs/155-genre-system-landing-pages/quickstart.md`

**Checkpoint**: All user stories are independently functional and extensible via configuration only

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, prerendering check, and linting

- [x] T015 [P] Verify prerendering and sitemap inclusion for all `/for/[slug]` pages in build script
- [x] T016 [P] Run type-checking (`bun --filter web check`) and unit test suite (`bun --filter web test`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1)
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2); can run parallel to US1
- **User Story 3 (Phase 5)**: Depends on US1 & US2 completion
- **Polish (Phase 6)**: Depends on all user stories

### Parallel Opportunities

- T003 (test suite setup) can run parallel to T001/T002
- T006, T007 (US1 pack & tests) can run parallel
- T010, T011 (US2 pack & tests) can run parallel to US1 tasks
- T015, T016 (validation & linting) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup (Phase 1) + Foundational (Phase 2)
2. Implement US1 (`vampire-the-masquerade`)
3. **Validate MVP**: Test `/for/vampire-the-masquerade` independently

### Incremental Delivery

1. Foundation ready
2. Ship US1 (`/for/vampire-the-masquerade` MVP)
3. Ship US2 (`/for/fantasy-worldbuilding`)
4. Verify config extensibility (US3)
