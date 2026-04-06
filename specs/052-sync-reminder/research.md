# Research: Sync Reminder Implementation

**Feature Context**: `052-sync-reminder`
**Date**: 2026-02-20

## Unknowns & Decisions

### 1. Reactive Dirty State Tracking

- **Question**: How to track `dirtyCount` across `vault.entities` efficiently?
- **Decision**: Add a `dirtyEntitiesCount` `$derived` property to the `vault` store.
- **Rationale**: The `vault.entities` is already a reactive `$state` object. Svelte 5's `$derived` can efficiently compute the count of entities whose `synced` status is false.
- **Alternatives considered**:
  - Manual counter updated on every `add/update/delete`. (Error-prone and redundant).
  - Polling. (Inefficient and non-reactive).

### 2. Persistence of "Last Reminded Count"

- **Question**: Where to store the count when the user was last reminded?
- **Decision**: Use `localStorage` with a key specific to the active campaign (`codex_last_reminded_count_[campaignId]`).
- **Rationale**: This is a transient UI preference/state. It doesn't need the durability of IndexedDB or file system sync. LocalStorage is fast and persists across reloads.
- **Alternatives considered**:
  - IndexedDB `settings` store. (Overkill for a simple number).
  - In-memory only. (Would re-prompt immediately on page refresh).

### 3. Notification Signal Mechanism

- **Question**: How should the UI know to show the reminder?
- **Decision**: A new `SyncReminder.svelte` component will be added to the main layout. It will use a `$derived` visibility condition based on the `vault` store's state.
- **Rationale**: Keeps the UI decoupled from the store's internal logic. The store manages the state, and the component reacts to it.
- **Alternatives considered**:
  - Event-driven (e.g., `vault.emit('remind')`). (Less idiomatic in Svelte 5).

## Best Practices

- **Svelte 5 Runes**: Use `$derived.by` for complex logic if the `dirtyCount` calculation involves filtering and mapping.
- **Debouncing**: Ensure the "dirty" calculation is efficient to avoid UI lag during rapid edits.

## Integration Patterns

- **Vault Store Integration**: Add `dirtyEntitiesCount` and `lastRemindedDirtyCount` to the `VaultStore` class.
- **Sync Workflow Integration**: Ensure any sync operation (manual or auto) resets the `lastRemindedDirtyCount`.
