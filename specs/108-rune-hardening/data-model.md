# Data Model: Svelte 5 Rune Hardening

This specification focuses on the reactive state representation rather than persistent data schemas.

## Entities

### Reactive Store (Transformed)

- **State Properties**: Defined using `$state` (replaces `writable.set/update`).
- **Derived Properties**: Defined using `$derived` or `$derived.by` (replaces `derived` stores).
- **Methods**: Class methods for state mutations.

### State Snapshot

- **Snapshot Object**: An immutable, plain-object representation of a reactive state tree at a specific moment in time.
- **Usage**: Mandatory for cross-worker communication (Search engine) and AI prompt construction.

## State Transitions

- **Idle to Updating**: Triggered by user interaction or background sync events.
- **Updating to Ready**: Signal propagation completion via Svelte 5 scheduler.
- **Snapshot Creation**: Occurs immediately before dispatching async tasks to prevent data drift.
