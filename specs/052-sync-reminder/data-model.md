# Data Model: Sync Reminder

**Feature Context**: `052-sync-reminder`
**Date**: 2026-02-20

## Entities

### SyncStatus (in VaultStore)

Represents the state of unsynced changes in the current campaign.

- **`dirtyEntitiesCount`** (`number`):
  - **Description**: Number of entities (Markdown files) in the current vault that have unsynced changes (dirty state).
  - **Source**: `$derived.by(() => Object.values(vault.entities).filter(e => e.synced === false).length)`.
  - **Validation**: `count >= 0`.

- **`lastRemindedDirtyCount`** (`number`):
  - **Description**: The dirty count at the time the user was last reminded.
  - **Source**: Loaded from `localStorage` on campaign switch; updated when a reminder is shown.
  - **Validation**: `count >= 0`.

- **`shouldShowReminder`** (`boolean`):
  - **Description**: Reactive flag indicating if the sync reminder should be displayed.
  - **Rule**: `dirtyEntitiesCount >= 5 && (dirtyEntitiesCount - lastRemindedDirtyCount >= 5)`.

## State Transitions

### 1. Entity Change (Add/Edit)

- **Input**: Entity modification.
- **Action**: `dirtyEntitiesCount` increases.
- **Transition**: If `dirtyEntitiesCount >= 5` and threshold is met, `shouldShowReminder` becomes `true`.

### 2. Manual Sync

- **Input**: Sync operation starts.
- **Action**: All entities in `vault.entities` are marked `synced: true`.
- **Transition**: `dirtyEntitiesCount` becomes `0`. `lastRemindedDirtyCount` is reset to `0`. `shouldShowReminder` becomes `false`.

### 3. Reminder Dismissal

- **Input**: User clicks "Dismiss".
- **Action**: `lastRemindedDirtyCount` is set to the current `dirtyEntitiesCount`.
- **Transition**: `shouldShowReminder` becomes `false` until the threshold (another 5 changes) is reached.
