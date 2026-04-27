# Research: AppEventBus Implementation

## Decisions

### 1. Type-Safe Event Bus Architecture

- **Decision**: Use a TypeScript discriminated union for the first AppEventBus implementation, then migrate to the distributed registry pattern described in `docs/ARCH_DISTRIBUTED_EVENTS.md`.
- **Rationale**: A centralized discriminated union is simple for the first implementation and gives immediate type-safety. As domains grow, payload ownership should move to the packages that own those domains through TypeScript module augmentation, avoiding circular dependencies and `any` fallbacks. The bus will use maps of domain/type filters to listener sets to support wildcard dispatch efficiently.
- **Alternatives Considered**:
  - EventEmitter (Node-style): Rejected due to weaker type-safety for varying payloads.
  - RxJS: Rejected as overkill for simple event distribution and to minimize external dependencies.
  - Permanent centralized union: Rejected as the long-term model because it makes `packages/events` responsible for payloads owned by other packages.

### 2. BroadcastChannel Integration

- **Decision**: Implement a `CrossTabBroadcaster` class that can be attached to the `AppEventBus`.
- **Rationale**: By separating the sync logic from the core bus, we keep the bus pure (transient). The broadcaster listens to events marked with `metadata.sync: true`, serializes them with `JSON.stringify`, and relays them through `BroadcastChannel`. Remote messages are parsed defensively, rejected if malformed, and re-emitted with `metadata.remote: true` to prevent broadcast loops.
- **Alternatives Considered**:
  - Manual `BroadcastChannel` in every store: Rejected (current pain point).
  - `localStorage` events: Rejected as `BroadcastChannel` is more performant and designed specifically for this use case.

### 3. Migration Strategy

- **Decision**: "Bridge and Deprecate".
- **Rationale**: We will implement the `AppEventBus` first. `VaultEventBus` will be modified to emit its events to the `AppEventBus` internally. This allows existing code to continue working while new code uses the generalized bus. The bridge must preserve lifecycle and indexing events such as `VAULT_OPENING`, `CACHE_LOADED`, `SYNC_CHUNK_READY`, and `SYNC_COMPLETE`. Once all listeners are migrated, `VaultEventBus` can be removed.
- **Alternatives Considered**:
  - Big Bang Migration: Rejected due to the risk of breaking core vault sync logic.

### 4. Implementation Location

- **Decision**: `packages/events`.
- **Rationale**: Adheres to the **Library-First** principle. Makes the bus accessible to other packages (like `sync-engine` or `vault-engine`) without circular dependencies on `apps/web`.

## Best Practices

- **Listener Cleanup**: Use the "functional unsubscribe" pattern (`const unsub = bus.subscribe(...)`).
- **Named Listeners**: Treat names as globally unique across the bus. Re-registering a name replaces the old listener, and old unsubscribe closures must not remove newer replacements.
- **Reset Semantics**: `reset()` clears non-named listeners and preserves named long-lived listeners.
- **Error Isolation**: Each listener must be wrapped in a `try/catch` to ensure one faulty listener doesn't break the entire bus.
- **Event Naming**: Use `DOMAIN:EVENT_TYPE` format (e.g., `VAULT:ENTITY_UPDATED`).
- **Domain Ownership**: Future event constants and payload types should live in their owning domain packages and be registered through public package entrypoints.
