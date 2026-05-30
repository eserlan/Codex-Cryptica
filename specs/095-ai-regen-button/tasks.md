# Tasks: AI Regenerate Entity Description

**Feature**: AI Regenerate Entity Description  
**Branch**: `095-ai-regen-button`

## Dependencies

- **US1** (Quick Regeneration) depends on **Foundational** (Oracle Engine updates).
- **US2** (Refining Content) depends on **US1**.
- **US3** (Zen Mode) depends on **US1**.
- **US4** (Selection & Persistence) depends on **US1**.

## Parallel Execution

- T006, T007, T008 (Oracle Engine updates) can be worked on in parallel once types are defined.
- T012 (Sidepanel UI) and T016 (Zen Mode UI) can be worked on in parallel once `RegenerationService` is foundational.

## Implementation Strategy

We will implement the core AI logic in the `oracle-engine` first, followed by the `RegenerationService` in the web app to manage the transient state. We will then build out the UI components incrementally, starting with the Sidepanel button and the Inline Preview overlay.

---

## Phase 1: Setup

Goal: Initialize the feature environment and documentation.

- [x] T001 Create documentation structure in `specs/095-ai-regen-button/`
- [x] T002 Update help content placeholders in `apps/web/src/lib/config/help-content.ts`

---

## Phase 2: Foundational

Goal: Update the core engines to support description regeneration.

- [x] T003 [P] Define regeneration types and interfaces in `packages/oracle-engine/src/types.ts`
- [x] T004 [P] Update `packages/schema/src/entity.ts` to ensure `lore` field is consistently handled
- [x] T005 [P] Add unit tests for regeneration prompt logic in `packages/oracle-engine/src/oracle-generator.test.ts`
- [x] T006 [P] Implement dual-output (Chronicle/Lore) prompt generation in `packages/oracle-engine/src/oracle-generator.ts`
- [x] T007 [P] Implement structured response parsing for Chronicle/Lore in `packages/oracle-engine/src/oracle-parser.ts`
- [x] T008 [P] Add unit tests for response parsing in `packages/oracle-engine/src/oracle-parser.test.ts`
- [x] T009 Implement `executeRegenerate` logic in `packages/oracle-engine/src/oracle-executor.ts`

---

## Phase 3: User Story 1 - Quick Description Regeneration (Priority: P1)

Goal: Enable GMs to trigger AI regeneration from the Sidepanel.

- [x] T010 [US1] Create `RegenerationService.svelte.ts` with basic `$state` in `apps/web/src/lib/services/RegenerationService.svelte.ts`
- [x] T011 [US1] Implement `RegenerationService.regenerate()` method using Oracle Engine
- [x] T012 [P] [US1] Create `SidepanelRegenButton.svelte` in `apps/web/src/lib/components/entity/SidepanelRegenButton.svelte`
- [x] T013 [US1] Integrate `SidepanelRegenButton` into `apps/web/src/lib/components/EntityDetailPanel.svelte`

**Independent Test**:

- Open an entity in the sidepanel.
- Click the "AI Regenerate" button.
- Verify the "Loading" state is displayed.
- Verify the AI produces a response (check console/network).

---

## Phase 4: User Story 2 - Refining Existing Content (Priority: P1)

Goal: Ensure AI uses existing content as context for expansion.

- [x] T014 [US2] Update `RegenerationService.svelte.ts` to gather existing `content` and `lore` as context
- [x] T015 [US2] Refine Oracle prompt to emphasize "retain and expand" in `packages/oracle-engine/src/oracle-generator.ts`

**Independent Test**:

- Add a partial note to an entity's description.
- Trigger regeneration.
- Verify the output preserves the core idea of the note.

---

## Phase 5: User Story 3 - Regeneration in Zen Mode (Priority: P1)

Goal: Enable AI regeneration within the Zen Mode interface.

- [x] T016 [P] [US3] Create `ZenModeRegenAction.svelte` in `apps/web/src/lib/components/entity/ZenModeRegenAction.svelte`
- [x] T017 [US3] Integrate `ZenModeRegenAction` into the Zen Mode header/toolbar in `apps/web/src/lib/components/editor/EditorToolbar.svelte`

**Independent Test**:

- Open an entity in Zen Mode.
- Trigger regeneration using the new action icon.
- Verify the draft is generated and previewed correctly.

---

## Phase 6: User Story 4 - Selection and Persistence (Priority: P2)

Goal: Implement the Inline Preview and Save/Discard workflow.

- [x] T018 [US4] Create `InlinePreviewOverlay.svelte` with Save/Discard controls in `apps/web/src/lib/components/ui/InlinePreviewOverlay.svelte`
- [x] T019 [US4] Update `EntityDetailPanel.svelte` to show the `InlinePreviewOverlay` when a draft is pending
- [x] T020 [US4] Implement `acceptDraft()` and `discardDraft()` in `RegenerationService.svelte.ts`
- [x] T021 [US4] Add visual "pending" highlights to Description and Lore fields in `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte` and `DetailLoreTab.svelte`

**Independent Test**:

- Trigger a regeneration.
- Verify fields are read-only and highlighted during preview.
- Click "Discard" and verify the original text returns.
- Click "Save" and verify the vault is updated.

---

## Phase 7: Polish & Cross-Cutting Concerns

Goal: Final validation and documentation.

- [x] T022 [P] Update `apps/web/src/lib/config/help-content.ts` with finalized guide
- [x] T023 Run project-wide linting and type checks
- [x] T024 Perform final E2E test pass using Playwright
