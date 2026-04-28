# Event-Driven Architecture Assessment: Codex-Cryptica

## Overview

Codex-Cryptica is migrating from a hybrid event architecture to a unified `@codex/events` package for application-wide coordination and cross-tab synchronization. This document describes the current state and the remaining migration direction.

## Current Patterns

| Pattern                | Scope              | Primary Use Case                                   | Example                                                |
| :--------------------- | :----------------- | :------------------------------------------------- | :----------------------------------------------------- |
| **`AppEventBus`**      | App / package      | Store and service coordination across domains.     | `VAULT:ENTITY_UPDATED` -> `SearchService` re-indexing. |
| **`VaultEventBus`**    | Legacy bridge      | Compatibility for existing vault-domain listeners. | `SYNC_CHUNK_READY` -> `VAULT:SYNC_CHUNK_READY`.        |
| **`BroadcastChannel`** | Cross-Tab / Worker | Transport used behind `CrossTabBroadcaster`.       | `ORACLE:UNDO_PERFORMED` mirrored across tabs.          |
| **Custom DOM Events**  | Global (`window`)  | Signaling state changes to decoupled systems.      | `vault-switched` -> `GraphView` (resetting camera).    |
| **Prop Callbacks**     | Local (Component)  | Svelte 5 standard for parent-child interaction.    | `onNodeTap` in `GraphView`.                            |

---

## 1. The `VaultEventBus`

The `VaultEventBus` is now a compatibility bridge. It still supports existing vault-domain listeners, but it also emits AppEvent equivalents onto `AppEventBus`.

- **Strengths**: Type-safety, predictable execution (async handling), and naming support (preventing duplicate listeners).
- **Weaknesses**: Hard-coded to the "Vault" domain and no longer the target architecture.

### Recommendation

**Migrate consumers to `AppEventBus`**. The project now includes a generalized `@codex/events` package that provides a type-safe, domain-based event bus.

- **Location**: `packages/events`
- **Pattern**: Current implementation uses a centralized discriminated union for payloads and map-based listener sets for domains. The follow-up proposal in `docs/ARCH_DISTRIBUTED_EVENTS.md` moves payload ownership into domain packages through a distributed registry.
- **Wildcards**: Supports `DOMAIN:*` for domain-wide listening and `*` for global listening.
- **Named listeners**: Names are globally unique. Reusing a name replaces the previous registration; `reset()` preserves named long-lived listeners.

---

## 2. Global DOM Events (`vault-switched`)

The `vault-switched` event is currently being migrated to the `AppEventBus` under the `VAULT:VAULT_SWITCHED` type.

- **Current Status**: Bridged. `VaultEventBus` automatically emits its events to `AppEventBus` to support incremental migration.

---

## 3. `BroadcastChannel` for Cross-Tab Sync

The `CrossTabBroadcaster` in `@codex/events` now unifies cross-tab communication.

- **Mechanism**: Attaches to `AppEventBus` and listens for events with `metadata.sync: true`.
- **Transport**: Serializes events with `JSON.stringify` before posting to `BroadcastChannel`, so synced payloads must be JSON-compatible.
- **Loop Prevention**: Automatically marks received remote events with `metadata.remote: true` to prevent re-broadcasting.
- **Validation**: Ignores non-string, invalid JSON, and malformed remote event envelopes.
- **Usage**: Replace `new BroadcastChannel()` with `appEventBus.emit({ ..., metadata: { sync: true } })`.

---

## 4. UI-to-Logic Signaling (Custom Events)

The `CanvasWorkspace` uses custom events like `add-to-canvas` and `edit-edge-label`. These are effectively "Action" signals.

- **Benefit**: Allows the deep UI hierarchy (e.g., `GraphHUD`) to trigger actions in the `CanvasWorkspace` without prop-drilling or store coupling.

### Recommendation

Keep this pattern but **standardize the event naming and payload schema**. Use a utility like `createAppEvent` to ensure consistent data structures.

---

## Proposed Roadmap

### Phase 1: Generalize the Event Bus

Completed in the current branch through `packages/events`.

- Define a top-level `AppEvent` union type.
- Migrate `vault-switched` from DOM events to the bus.

### Phase 2: Decouple Side Effects

Move side effects that currently live inside store setters (like search indexing or URL cache invalidation) into event listeners.

- **Example**: `EntityStore` emits `ENTITY_UPDATED` -> `SearchService` hears it and indexes.
- This prevents "Setter Bloat" and makes the core logic easier to test.

### Phase 3: Centralized Cross-Tab Coordination

Consolidate `BroadcastChannel` usage into a single service that mirrors specific `AppEventBus` events across tabs automatically based on a "sync" flag.

### Phase 4: Distributed Event Registry

Adopt `docs/ARCH_DISTRIBUTED_EVENTS.md` as the next architecture step:

- Keep `packages/events` independent from domain packages.
- Move event constants and payload definitions into owning packages.
- Register events through TypeScript module augmentation and package public entrypoints.
- Add type-level tests for exact payload inference, wildcard inference, and augmentation visibility.

## Why Do More?

1. **Testability**: Services can be tested by asserting they emit the correct events, rather than checking deep side effects in dependencies.
2. **Performance**: Heavy tasks (like re-indexing search) can be moved into a background task triggered by an event, ensuring the main UI update remains fast.
3. **Architecture Health**: Eliminates "God Stores" that try to manage their own state _and_ coordinate every other store's reaction.
