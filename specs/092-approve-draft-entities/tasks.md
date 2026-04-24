---
description: "Actionable, dependency-ordered tasks for the Approve / Reject Draft Entities feature"
---

# Tasks: Approve / Reject Draft Entities

**Input**: Design documents from `/specs/092-approve-draft-entities/`
**Prerequisites**: Core entity storage and UI shell must be active.

## Phase 1: Setup & Foundational

Goal: Prepare the environment for the draft approval UI.
Independent Test: N/A

- [ ] T001 Verify the testing environment for UI components is ready in `apps/web/`.

## Phase 2: [US1] Quick Approve/Reject from the Review List

Goal: Allow users to approve or reject draft entities directly from the Explorer list.
Independent Test: Hover over a draft in the Review tab, click approve to see it turn active, click reject to see it deleted.

- [ ] T002 [US1] Add `onApproveDraft` and `onRejectDraft` optional callback props to `apps/web/src/lib/components/explorer/EntityList.svelte`.
- [ ] T003 [US1] Add "Approve" (`icon-[lucide--check]`) and "Reject" (`icon-[lucide--trash-2]`) buttons to the item snippet in `apps/web/src/lib/components/explorer/EntityList.svelte`, visible when callbacks are provided.
- [ ] T004 [US1] Update `apps/web/src/lib/components/explorer/EntityExplorer.svelte` to pass `onApproveDraft` and `onRejectDraft` callbacks to `EntityList` when `explorerTab === "review"`.
- [ ] T005 [US1] Implement the callback logic in `EntityExplorer.svelte`: `vault.updateEntity(id, { status: "active" })` for approve, and `vault.deleteEntity(id)` for reject.
- [ ] T006 [US1] Write or update unit tests for `EntityList` in `apps/web/src/lib/components/explorer/EntityList.test.ts` (if it exists) to verify conditional rendering of approve/reject buttons.

## Phase 3: [US2] Approve/Reject from the Entity Detail Panel

Goal: Provide an informed approval flow after reading the full draft in the right sidebar.
Independent Test: Open a draft in the right sidebar, verify the banner appears, click approve or reject and verify the status changes or the panel closes.

- [ ] T007 [P] [US2] Add a draft banner ("AI DRAFT — PENDING REVIEW") to `apps/web/src/lib/components/EntityDetailPanel.svelte`, rendered only when `entity.status === "draft"`.
- [ ] T008 [P] [US2] Add "Approve" and "Reject" buttons to the draft banner in `apps/web/src/lib/components/EntityDetailPanel.svelte`.
- [ ] T009 [P] [US2] Implement approval logic in `EntityDetailPanel.svelte` that updates the entity status to "active".
- [ ] T010 [P] [US2] Implement rejection logic in `EntityDetailPanel.svelte` that deletes the entity and calls `onClose()`.
- [ ] T011 [US2] Write or update unit tests for `EntityDetailPanel` to verify banner visibility and button actions.

## Phase 4: [US3] Approve/Reject from Zen Mode

Goal: Provide an approval flow in the full-screen Zen Mode reading experience.
Independent Test: Open a draft in Zen Mode, verify header buttons, click approve or reject.

- [ ] T012 [P] [US3] Add "Approve" and "Reject" buttons to `apps/web/src/lib/components/zen/ZenHeader.svelte`.
- [ ] T013 [P] [US3] Conditionally render the new buttons in `ZenHeader.svelte` only if `entity?.status === "draft"` and `!editState.isEditing`.
- [ ] T014 [P] [US3] Implement approval logic in `ZenHeader.svelte` (`vault.updateEntity(id, { status: "active" })`).
- [ ] T015 [P] [US3] Implement rejection logic in `ZenHeader.svelte` (`vault.deleteEntity(id)` and `onClose()`).
- [ ] T016 [US3] Write or update unit tests for `ZenHeader` to verify button visibility and actions.

## Phase 5: Polish & Cross-Cutting

Goal: Ensure the implementation is clean, robust, and matches the style guide.

- [ ] T017 Run `npm run lint` and fix any style or typing issues across the modified files.
- [ ] T018 Run `npm test` to ensure all tests pass and coverage is maintained.
- [ ] T019 Verify that clicking approve/reject rapidly does not crash the application (idempotency).

## Implementation Strategy & Dependencies

- **Dependencies**:
  - Phase 3 (US2) and Phase 4 (US3) can be executed in parallel [P] with each other as they modify different components (`EntityDetailPanel` vs `ZenHeader`).
  - Phase 2 (US1) is independent and modifies `EntityExplorer`.
- **MVP**: The MVP is completing Phase 2 to unblock rapid batch review.
- **Parallel Opportunities**: The detailed UI integrations in US2 and US3 can be built simultaneously by different agents/developers.
