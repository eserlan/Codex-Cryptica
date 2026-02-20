# Tasks: Sync Reminder

**Feature Context**: `052-sync-reminder`
**Date**: 2026-02-20
**Implementation Plan**: [/specs/052-sync-reminder/plan.md]

## Summary

Implement a dynamic, reactive synchronization reminder that alerts users when they have accumulated 5 or more unsynced changes (new or modified entities). The system will use Svelte 5 Runes to monitor the "dirty" state of the vault and provide a single-click sync action within a non-intrusive UI notification.

## Phase 1: Setup

- [x] T001 Initialize feature documentation and task list in `specs/052-sync-reminder/tasks.md`

## Phase 2: Foundational (Dirty Tracking Logic)

- [x] T002 Add `synced?: boolean` property to `LocalEntity` type in `apps/web/src/lib/stores/vault/types.ts`
- [x] T003 Update `updateEntity` in `apps/web/src/lib/stores/vault/entities.ts` to set `synced: false` on every modification
- [x] T004 [P] Add `dirtyEntitiesCount` ($derived) to `VaultStore` in `apps/web/src/lib/stores/vault.svelte.ts` that counts entities with `synced === false`
- [x] T005 Add `lastRemindedDirtyCount` ($state) to `VaultStore` and initialize it from `localStorage` (scoped by campaign ID)
- [x] T006 Implement `shouldShowReminder` ($derived) in `VaultStore` based on threshold (5 changes) and suppression logic
- [x] T007 [P] Implement `dismissSyncReminder()` and `resetSyncState()` methods in `VaultStore`
- [x] T008 Update `syncToLocal` success callback in `apps/web/src/lib/stores/vault/io.ts` to set `synced: true` for all entities and call `vault.resetSyncState()`

## Phase 3: User Story 1 - Work-Volume Sync Reminder (P1)

**Story Goal**: Remind users to sync after 5 unsynced changes.
**Independent Test**: Create 5 entities and verify the reminder appears.

- [x] T009 [US1] Create unit tests for dirty count calculation and reminder visibility in `apps/web/src/tests/sync-reminder.test.ts`
- [x] T010 [P] [US1] Create the `SyncReminder.svelte` component in `apps/web/src/lib/components/notifications/SyncReminder.svelte`
- [x] T011 [US1] Integrate the `SyncReminder` component into the root layout `apps/web/src/routes/+layout.svelte`
- [x] T012 [US1] Implement E2E test for basic reminder visibility after 5 changes in `apps/web/tests/sync-reminder.spec.ts`

## Phase 4: User Story 2 - Dismissal and Silence (P2)

**Story Goal**: Allow users to dismiss the reminder or clear it via sync.
**Independent Test**: Dismiss reminder at 5 changes, verify it reappears at 10 changes.

- [x] T013 [US2] Update unit tests to cover dismissal and suppression thresholds in `apps/web/src/tests/sync-reminder.test.ts`
- [x] T014 [US2] Wire up the "Dismiss" button in `SyncReminder.svelte` to call `vault.dismissSyncReminder()`
- [x] T015 [US2] Wire up the "Sync Now" button in `SyncReminder.svelte` to call `vault.syncToLocal()`
- [x] T016 [US2] Implement E2E test for dismissal and threshold re-triggering in `apps/web/tests/sync-reminder.spec.ts`

## Phase 5: User Story 3 - Visual Consistency (P3)

**Story Goal**: Match the reminder style with the app's visual identity.
**Independent Test**: Visual inspection against theme changes and mobile responsiveness.

- [x] T017 [P] [US3] Style `SyncReminder.svelte` with Tailwind 4 using theme-aware colors (e.g., `bg-theme-surface`, `text-theme-primary`)
- [x] T018 [US3] Add Svelte transitions (fade/slide) to the reminder component for a polished feel

## Phase 6: Polish & Cross-cutting Concerns

- [x] T019 Add user-facing help description about sync reminders in `apps/web/src/lib/config/help-content.ts`
- [x] T020 [P] Ensure `lastRemindedDirtyCount` is correctly saved to `localStorage` on dismissal and reset on campaign switch
- [x] T021 [US1] Add a safety check in `VaultStore.shouldShowReminder` to suppress the reminder if no local sync folder handle is configured

## Dependencies

- All User Stories depend on Phase 2 (Foundational Logic).
- US2 depends on US1 (UI component existence).
- US3 depends on US1 (UI component existence).

## Parallel Execution Examples

- T004, T007 (Foundational Store updates)
- T010 (UI Component) and T009 (Unit Tests)
- T017 (Styling) and T020 (Persistence)

## Implementation Strategy

1. **Phase 2 First**: Enable the underlying tracking logic.
2. **Phase 3 (MVP)**: Implement the UI component and basic trigger. This is the minimum viable increment.
3. **Phase 4-6**: Iterate on UX, persistence, and styling.
