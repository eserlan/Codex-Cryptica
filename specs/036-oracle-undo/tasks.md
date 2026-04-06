---
description: "Task list for Oracle Undo feature"
---

# Tasks: Oracle Undo

**Input**: Design documents from `/specs/036-oracle-undo/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Store Logic (Foundational & TDD)

- [x] T001 Define `UndoableAction` interface in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T002 Implement `undoStack`, `pushUndoAction`, and `undo` method in `OracleStore`
- [x] T003 Create unit test `apps/web/src/lib/stores/oracle.test.ts` to verify stack mechanics (push/pop/undo) independent of UI

## Phase 2: User Story 1 - Undo Overwrite

- [x] T004 Refactor `applySmart` in `ChatMessage.svelte` to capture state using `structuredClone` and push undo action
- [x] T005 Refactor `copyToChronicle` in `ChatMessage.svelte` to capture state using `structuredClone` and push undo action
- [x] T006 Refactor `copyToLore` in `ChatMessage.svelte` to capture state using `structuredClone` and push undo action
- [x] T007 Add "Undo" button UI in `ChatMessage.svelte` (visible when `isSaved` is true)
- [x] T008 [Test] Verify "Smart Apply" undo restores exact text using `structuredClone` snapshot

## Phase 3: User Story 2 - Undo Creation

- [x] T009 Refactor `createAsNode` in `ChatMessage.svelte` to push delete action to undo stack
- [x] T010 Ensure `vault.deleteEntity` correctly cleans up index and graph; handle partial failures if possible
- [x] T011 [Test] Verify "Create Node" undo removes node from graph and list

## Phase 4: Keyboard Shortcuts & Polish

- [x] T012 Add global `keydown` listener for `Ctrl+Z` / `Cmd+Z` in `OracleWindow.svelte`
- [x] T013 Implement guard clauses (don't undo if input focused)
- [x] T014 Add toast/notification when undo is successful (UI feedback)
