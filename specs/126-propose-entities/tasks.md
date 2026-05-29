# Implementation Tasks: Propose Entities

## Phase 1: Setup & Foundation

These tasks establish the foundational utilities and services required before building the UI.

- [x] T001 Create regex-based extraction utility in `packages/editor-core/src/utils/text-parsing.ts`
- [x] T002 Add unit tests for `text-parsing.ts` ensuring it ignores markdown links
- [x] T003 Create `IEntityProposalService` interface and base implementation in `apps/web/src/lib/services/entity-proposal.service.ts`
- [x] T004 Add unit tests for `entity-proposal.service.ts` ensuring filtering works correctly with existing entities

## Phase 2: User Story 1 - View Entity Proposals in Sidebar (P1)

**Story Goal**: Display proposed entities in the sidebar detail view.

- [x] T005 [P] [US1] Create `DetailProposals.svelte` component in `apps/web/src/lib/components/entity-detail/`
- [x] T006 [P] [US1] Integrate `DetailProposals.svelte` into the existing sidebar detail view
- [x] T007 [P] [US1] Connect sidebar view to `EntityProposalService` to extract and display unlinked bolded terms, ensuring the current entity's markdown content is passed as a prop

## Phase 3: User Story 2 - View Entity Proposals in Zen Mode (P1)

**Story Goal**: Display proposed entities in Zen mode maintaining parity with the sidebar.

- [x] T008 [P] [US2] Update `ZenSidebar.svelte` in `apps/web/src/lib/components/zen/` to include the `DetailProposals` component
- [x] T009 [P] [US2] Ensure Zen mode correctly passes the current entity's markdown content to `EntityProposalService`

## Phase 4: User Story 3 - Accept Entity Proposals (P2)

**Story Goal**: Allow users to click a proposal to automatically create a new entity with an AI-guessed category, using its template, and retaining the current page context.

- [x] T010 [US3] Implement `acceptProposal` method in `EntityProposalService` integrating with Gemini text-generation for category inference
- [x] T011 [US3] Add unit tests for `acceptProposal` to verify fallback template behavior on AI failure
- [x] T012 [P] [US3] Update `DetailProposals.svelte` to add a click handler (e.g., a "Create" button) that calls `acceptProposal`
- [x] T013 [P] [US3] Implement UI feedback (e.g., a toast notification) upon successful creation and remove the accepted proposal from the list without navigating away
- [x] T014 [P] [US3] Implement fallback UI feedback (warning toast) when AI fails or times out

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T015 Verify end-to-end functionality across both Sidebar and Zen mode flows
- [x] T016 Run linter and ensure no type errors (`pnpm run lint`)
- [x] T017 Ensure all new Vitest unit tests pass (`pnpm test`)
