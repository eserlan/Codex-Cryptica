# Quickstart: Sync Reminder Implementation

**Feature Context**: `052-sync-reminder`
**Date**: 2026-02-20

## Summary

The "Sync Reminder" feature will monitor the number of unsynced (dirty) entities in the `vault` store. When the count reaches 5, a notification banner will appear, prompting the user to sync their changes to the local file system.

## Setup & Implementation

### Step 1: Update Vault Store (`vault.svelte.ts`)

Add reactive properties and methods to track the dirty state and the "last reminded" count.

- [ ] Add `$derived.by` for `dirtyEntitiesCount`.
- [ ] Add `lastRemindedDirtyCount` as a `$state` property.
- [ ] Implement `dismissSyncReminder` and `resetSyncState`.

### Step 2: Create UI Component (`SyncReminder.svelte`)

Create a new notification component that displays when `shouldShowReminder` is `true`.

- [ ] Use Tailwind 4 for styling.
- [ ] Include "Sync Now" and "Dismiss" buttons.
- [ ] Integrate with the existing `vault.sync()` workflow.

### Step 3: Global Notification Entry Point

Add the `SyncReminder.svelte` component to the main layout or root component of the app.

- [ ] Ensure it's positioned prominently but non-intrusively (e.g., top banner).

### Step 4: Add Help Content

Update `help-content.ts` to include information about the synchronization reminder.

- [ ] Describe the threshold (5 entities) and the value of syncing.

## Testing Strategy

### Unit Tests (Vitest)

- [ ] Test the `dirtyEntitiesCount` calculation.
- [ ] Test the reminder visibility logic (thresholds and suppression).
- [ ] Test reset behavior after sync.

### E2E Tests (Playwright)

- [ ] Create 5 entities and verify the reminder appears.
- [ ] Dismiss the reminder and verify it doesn't reappear until 5 more changes are made.
- [ ] Click "Sync Now" and verify the reminder disappears.
