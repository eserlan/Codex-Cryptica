# Event-Driven Architecture Assessment: Codex-Cryptica

## Overview

Codex-Cryptica currently employs a hybrid event architecture to manage state synchronization, cross-tab coordination, and UI-to-logic signaling. This document assesses the current patterns and proposes a more unified strategy to improve maintainability and performance.

## Current Patterns

| Pattern                | Scope              | Primary Use Case                                                   | Example                                                      |
| :--------------------- | :----------------- | :----------------------------------------------------------------- | :----------------------------------------------------------- |
| **`VaultEventBus`**    | Internal (Svelte)  | Store-to-store coordination within the vault domain.               | `SYNC_CHUNK_READY` -> `SearchService` (re-indexing).         |
| **`BroadcastChannel`** | Cross-Tab / Worker | Synchronizing state across multiple windows or background threads. | `UNDO_PERFORMED` in Oracle store -> `ChatMessage` component. |
| **Custom DOM Events**  | Global (`window`)  | Signaling state changes to decoupled systems.                      | `vault-switched` -> `GraphView` (resetting camera).          |
| **Prop Callbacks**     | Local (Component)  | Svelte 5 standard for parent-child interaction.                    | `onNodeTap` in `GraphView`.                                  |

---

## 1. The `VaultEventBus`

The `VaultEventBus` is the most robust internal event system in the project. It uses a strongly-typed pattern that ensures subscribers handle predictable payloads.

- **Strengths**: Type-safety, predictable execution (async handling), and naming support (preventing duplicate listeners).
- **Weaknesses**: Hard-coded to the "Vault" domain. Other systems (Oracle, Timeline, UI) lack a similarly structured bus and instead rely on more brittle DOM events.

### Recommendation

**Promote to a Core `AppEventBus`**. The project now includes a generalized `@codex/events` package that provides a type-safe, domain-based event bus.

- **Location**: `packages/events`
- **Pattern**: Discriminated unions for payloads, Map-based listener sets for domains.
- **Wildcards**: Supports `DOMAIN:*` for domain-wide listening and `*` for global listening.

---

## 2. Global DOM Events (`vault-switched`)

The `vault-switched` event is currently being migrated to the `AppEventBus` under the `VAULT:VAULT_SWITCHED` type.

- **Current Status**: Bridged. `VaultEventBus` automatically emits its events to `AppEventBus` to support incremental migration.

---

## 3. `BroadcastChannel` for Cross-Tab Sync

The `SyncCoordinator` in `@codex/events` now unifies cross-tab communication.

- **Mechanism**: Attaches to `AppEventBus` and listens for events with `metadata.sync: true`.
- **Loop Prevention**: Automatically marks received remote events with `metadata.remote: true` to prevent re-broadcasting.
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

Refactor `VaultEventBus` into a generic `EventBus<T>` and move it to a shared location.

- Define a top-level `AppEvent` union type.
- Migrate `vault-switched` from DOM events to the bus.

### Phase 2: Decouple Side Effects

Move side effects that currently live inside store setters (like search indexing or URL cache invalidation) into event listeners.

- **Example**: `EntityStore` emits `ENTITY_UPDATED` -> `SearchService` hears it and indexes.
- This prevents "Setter Bloat" and makes the core logic easier to test.

### Phase 3: Centralized Cross-Tab Coordination

Consolidate `BroadcastChannel` usage into a single service that mirrors specific `AppEventBus` events across tabs automatically based on a "sync" flag.

## Why Do More?

1. **Testability**: Services can be tested by asserting they emit the correct events, rather than checking deep side effects in dependencies.
2. **Performance**: Heavy tasks (like re-indexing search) can be moved into a background task triggered by an event, ensuring the main UI update remains fast.
3. **Architecture Health**: Eliminates "God Stores" that try to manage their own state _and_ coordinate every other store's reaction.
