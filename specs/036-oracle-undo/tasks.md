---
description: "Task list for Oracle Undo feature"
---

# Tasks: Oracle Undo

**Input**: Design documents from `/specs/036-oracle-undo/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Store Logic (Foundational & TDD)

- [ ] T001 Define `UndoableAction` interface in `apps/web/src/lib/stores/oracle.svelte.ts`
- [ ] T002 Implement `undoStack`, `pushUndoAction`, and `undo` method in `OracleStore`
- [ ] T003 Create unit test `apps/web/src/lib/stores/oracle.test.ts` to verify stack mechanics (push/pop/undo) independent of UI

## Phase 2: User Story 1 - Undo Overwrite

- [ ] T004 Refactor `applySmart` in `ChatMessage.svelte` to capture state using `structuredClone` and push undo action
- [ ] T005 Refactor `copyToChronicle` in `ChatMessage.svelte` to capture state using `structuredClone` and push undo action
- [ ] T006 Refactor `copyToLore` in `ChatMessage.svelte` to capture state using `structuredClone` and push undo action
- [ ] T007 Add "Undo" button UI in `ChatMessage.svelte` (visible when `isSaved` is true)
- [ ] T008 [Test] Verify "Smart Apply" undo restores exact text using `structuredClone` snapshot

## Phase 3: User Story 2 - Undo Creation

- [ ] T009 Refactor `createAsNode` in `ChatMessage.svelte` to push delete action to undo stack
- [ ] T010 Ensure `vault.deleteEntity` correctly cleans up index and graph; handle partial failures if possible
- [ ] T011 [Test] Verify "Create Node" undo removes node from graph and list

## Phase 4: Keyboard Shortcuts & Polish

- [ ] T012 Add global `keydown` listener for `Ctrl+Z` / `Cmd+Z` in `OracleWindow.svelte`
- [ ] T013 Implement guard clauses (don't undo if input focused)
- [ ] T014 Add toast/notification when undo is successful (UI feedback)
