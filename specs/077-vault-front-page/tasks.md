# Tasks: Vault Front Page

**Input**: Design documents from `/specs/077-vault-front-page/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database and project-level updates

- [x] T001 Update `EntityDb` schema with `vaultMetadata` table in `apps/web/src/lib/utils/entity-db.ts`
- [x] T002 Bump `EntityDb` to `version(4)` in `apps/web/src/lib/utils/entity-db.ts`
- [x] T003 [P] Create directory `packages/vault-engine/src/services` if not exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic and service interfaces with **Constructor DI**

- [x] T004 [P] Create `CampaignService.ts` as a class with **Constructor DI** for `EntityDb` in `packages/vault-engine/src/services/CampaignService.ts`
- [x] T005 [P] Create `ActivityService.ts` as a class with **Constructor DI** for `EntityDb` in `packages/vault-engine/src/services/ActivityService.ts`
- [x] T006 Create `CampaignStore` class in `apps/web/src/lib/stores/campaign.svelte.ts` using **Constructor DI** for `CampaignService` and `ActivityService`

**Checkpoint**: Core services and stores initialized with clean DI patterns.

---

## Phase 3: User Story 1 - Campaign Overview (Priority: P1) 🎯 MVP

**Goal**: Display basic vault title and description on a new landing page.

**Independent Test**: Opening a vault should show the "Front Page" component with the vault's name and summary.

### Tests for User Story 1 (TDD with Mocks)

- [x] T007 [P] [US1] Unit test for `CampaignService.getMetadata` using a mocked `EntityDb` in `packages/vault-engine/src/services/CampaignService.test.ts`
- [x] T008 [P] [US1] Component test for `FrontPage.svelte` using a mocked `CampaignStore` in `apps/web/src/lib/components/campaign/FrontPage.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Implement `getMetadata` using `this.db.vaultMetadata` in `packages/vault-engine/src/services/CampaignService.ts`
- [x] T010 [US1] Create `FrontPage.svelte` in `apps/web/src/lib/components/campaign/FrontPage.svelte` with Markdown rendering for metadata (FR-002, FR-007)
- [x] T011 [US1] Implement description editing UI and save logic in `FrontPage.svelte` (FR-006)
- [x] T012 [US1] Update `apps/web/src/routes/(app)/vault/[id]/+page.svelte` to render `FrontPage` when no entity is active

---

## Phase 4: User Story 2 - Customizable Front Page via Tag (Priority: P1)

**Goal**: Use an entity tagged with "frontpage" as the main landing page content.

**Independent Test**: Tag an entity with "frontpage", edit its content, and verify it appears on the front page instead of the default summary.

### Tests for User Story 2

- [x] T013 [P] [US2] Unit test for `CampaignService.getFrontPageEntity` using mocked `EntityDb` in `packages/vault-engine/src/services/CampaignService.test.ts`

### Implementation for User Story 2

- [x] T014 [US2] Implement `getFrontPageEntity` using `this.db.graphEntities` query in `packages/vault-engine/src/services/CampaignService.ts`
- [x] T015 [US2] Update `FrontPage.svelte` to fetch and render the tagged entity content using `ArticleRenderer`

---

## Phase 5: User Story 3 - Cohesive Entity Visualization (Priority: P2)

**Goal**: Display recently modified entities as styled cards in a responsive grid.

**Independent Test**: Edit multiple entities and verify they appear as cards on the front page, adjusting layout on window resize.

### Tests for User Story 3

- [x] T016 [P] [US3] Unit test for `ActivityService.getRecentActivity` using mocked `EntityDb` in `packages/vault-engine/src/services/ActivityService.test.ts`

### Implementation for User Story 3

- [x] T017 [US3] Implement `getRecentActivity` using `this.db.graphEntities.orderBy('lastModified')` query in `packages/vault-engine/src/services/ActivityService.ts`
- [x] T018 [P] [US3] Create `EntityCard.svelte` component in `apps/web/src/lib/components/campaign/EntityCard.svelte`
- [x] T019 [US3] Integrate `EntityCard` grid into `FrontPage.svelte` with Tailwind 4 responsive classes

---

## Phase 6: User Story 4 - Navigation to Core Views (Priority: P2)

**Goal**: Provide quick-access buttons to Graph, Files, and Oracle views.

**Independent Test**: Click navigation buttons on the front page and verify they switch the application to the correct view.

### Implementation for User Story 4

- [x] T020 [US4] Add navigation action buttons to `FrontPage.svelte` (Graph, Vault, Oracle)

---

## Phase 7: User Story 5 - Visual World Identity (Priority: P2)

**Goal**: Support cover images via local upload, URL, or AI generation.

**Independent Test**: Set a cover image using all three methods and verify correct display and persistence.

### Implementation for User Story 5

- [x] T021 [US5] Implement `generateCoverImage` using Oracle and Dexie persistence in `packages/vault-engine/src/services/CampaignService.ts`
- [x] T022 [P] [US5] Create `CoverImage.svelte` component in `apps/web/src/lib/components/campaign/CoverImage.svelte`
- [x] T023 [US5] Add image management modal/controls to `FrontPage.svelte`

---

## Phase 8: User Story 6 - AI-Powered Campaign Summary (Priority: P2)

**Goal**: Generate or refine the campaign description using the Lore Oracle.

**Independent Test**: Click "AI Generate" and verify the description is updated with relevant vault content.

### Implementation for User Story 6

- [x] T024 [US6] Implement AI description generation logic in `CampaignService.ts` (Deriving prompt from existing entities)
- [x] T025 [US6] Add "Generate Summary" button and loading state to `FrontPage.svelte`

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final cleanup

- [x] T026 Update `apps/web/src/lib/config/help-content.ts` with Front Page user guide
- [x] T027 [P] Run `npm run lint` and `npm test` across workspace packages
- [x] T028 [P] Performance audit: Front Page render (<500ms), AI Image Gen (<10s), AI Summary Gen (<15s)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 & 2**: MUST be completed first.
- **Phase 3 (US1)**: First functional increment (MVP).
- **Phase 4-8**: Depend on Phase 3 structure.
- **Phase 9**: Final stabilization.

### User Story Dependencies

- **US1**: Foundation for all other stories.
- **US2-US6**: Independent additions.

### Parallel Opportunities

- T003, T004, T005
- T007, T008
- T013
- T016, T018
- T022

---

## Implementation Strategy

### MVP First (User Story 1 & 2)

1. Setup Dexie Schema Version 4.
2. Implement metadata retrieval and **Editing UI** (US1).
3. Enable the "frontpage" tag override (US2).
4. **Checkpoint**: Basic functional landing page delivered.

### Incremental Delivery

1. Add Recent Activity cards (US3).
2. Add Navigation buttons (US4).
3. Add Cover Image system (US5).
4. Add AI Description Generation (US6).
5. Documentation and polish.
