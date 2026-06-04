# Tasks: Regen Instruction Modal

**Input**: Design documents from `/specs/1079-regen-instruction-modal/`
**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `apps/web/src/`
- **Engine**: `packages/oracle-engine/src/`

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Initialize git branch and verify setup

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure updates in stores and engine that all UI flows depend on.

- [x] T002 [P] Update `apps/web/src/lib/stores/ui/modal-ui.svelte.ts` to add `regenDialog` state, `openRegenDialog`/`closeRegenDialog` methods, and update the `isAnyModalOpen` getter.
- [x] T003 [P] Update `apps/web/src/lib/services/RegenerationService.svelte.ts` to accept an optional `instructions` argument and pass it to `oracle.regenerate`.
- [x] T004 [P] Update `apps/web/src/lib/stores/oracle/action-manager.svelte.ts` to accept `instructions` in the `regenerate` method and pass it inside the executor's intent.
- [x] T005 [P] Add `instructions?: string` to the `OracleIntent` interface in `packages/oracle-engine/src/types.ts`.
- [x] T006 [P] Update `packages/oracle-engine/src/executors/regenerate-executor.ts` to forward `intent.instructions` to the generator.
- [x] T007 [P] Update `packages/oracle-engine/src/oracle-generator.ts` to accept `instructions` and append them as the highest priority user directive in `buildRegenerationPrompt`.

---

## Phase 3: User Story 1 - Optional Instruction Modal (Priority: P1) 🎯 MVP

**Goal**: Open a modal prompting for instructions when click regenerate and proceed with regeneration on submit.

**Independent Test**: Click regenerate on sidebar or zen mode, modal appears, type instructions, click Generate, verify AI starts regeneration with the instructions.

### Implementation for User Story 1

- [x] T008 [US1] Create the `RegenInstructionModal.svelte` component under `apps/web/src/lib/components/modals/`.
- [x] T009 [US1] Register `RegenInstructionModal.svelte` in `apps/web/src/lib/components/modals/GlobalModalProvider.svelte`.
- [x] T010 [US1] Modify `apps/web/src/lib/components/entity/SidepanelRegenButton.svelte` to trigger `modalUIStore.openRegenDialog(entityId)`.
- [x] T011 [US1] Modify `apps/web/src/lib/components/entity/ZenModeRegenAction.svelte` to trigger `modalUIStore.openRegenDialog(selectedEntityId)`.
- [x] T012 [US1] Modify `apps/web/src/lib/components/canvas/CanvasContextMenu.svelte` and `apps/web/src/lib/components/graph/graph-context-menu-controller.svelte.ts` to trigger `modalUIStore.openRegenDialog` instead of direct regeneration.

---

## Phase 4: User Story 2 - Keyboard Accessibility and Escape Handling (Priority: P2)

**Goal**: Enable Esc to close, autofocus, and Ctrl+Enter to submit.

**Independent Test**: Open modal, press Ctrl+Enter to generate, or Esc to close.

### Implementation for User Story 2

- [x] T013 [US2] Implement autofocus, keydown event handlers for Escape, and Ctrl+Enter (or Cmd+Enter) in `RegenInstructionModal.svelte`.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T014 Write unit test for `RegenerationService` and the modal to verify instruction passing.
- [x] T015 Run `bun run test` and `bun run lint` to ensure everything compiles and passes cleanly.
