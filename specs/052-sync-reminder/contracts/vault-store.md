# Contract: VaultStore Sync Extension

**Feature Context**: `052-sync-reminder`
**Date**: 2026-02-20

## Store Interface (Svelte 5 Runes)

### Properties (State)

| Property                 | Type      | Access     | Description                                                        |
| ------------------------ | --------- | ---------- | ------------------------------------------------------------------ |
| `dirtyEntitiesCount`     | `number`  | `$derived` | Count of entities in the current campaign with unsynced changes.   |
| `lastRemindedDirtyCount` | `number`  | `$state`   | The value of `dirtyEntitiesCount` when the user was last reminded. |
| `shouldShowReminder`     | `boolean` | `$derived` | Flag for UI to show/hide the sync reminder.                        |

### Actions (Methods)

| Method                  | Parameters | Return | Description                                                                                       |
| ----------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------- |
| `dismissSyncReminder()` | `void`     | `void` | Sets `lastRemindedDirtyCount` to the current `dirtyEntitiesCount` and persists to `localStorage`. |
| `resetSyncState()`      | `void`     | `void` | Resets `lastRemindedDirtyCount` to 0. Called after any successful sync.                           |

## UI Notification Component

### Properties (Props)

| Prop         | Type      | Default | Description                                                             |
| ------------ | --------- | ------- | ----------------------------------------------------------------------- |
| `visible`    | `boolean` | `false` | Whether the reminder is shown. Derived from `vault.shouldShowReminder`. |
| `dirtyCount` | `number`  | `0`     | The current count of unsynced changes.                                  |

### Events (Callbacks)

| Event       | Parameters | Description                                           |
| ----------- | ---------- | ----------------------------------------------------- |
| `onsync`    | `void`     | Triggers a full sync using the vault's sync workflow. |
| `ondismiss` | `void`     | Dismisses the current reminder for the current batch. |
