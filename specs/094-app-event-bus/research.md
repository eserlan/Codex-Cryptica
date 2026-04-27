# Research: AppEventBus Implementation

## Decisions

### 1. Type-Safe Event Bus Architecture

- **Decision**: Use a TypeScript Discriminated Union for `AppEvent` combined with a generic `EventBus<T>` class.
- **Rationale**: Discriminated unions provide the best type-safety for event payloads. The bus will use a Map of `domain` -> `Set<listeners>` to support domain-wide wildcards efficiently.
- **Alternatives Considered**:
  - EventEmitter (Node-style): Rejected due to weaker type-safety for varying payloads.
  - RxJS: Rejected as overkill for simple event distribution and to minimize external dependencies.

### 2. BroadcastChannel Integration

- **Decision**: Implement a `CrossTabBroadcaster` class that can be attached to the `AppEventBus`.
- **Rationale**: By separating the sync logic from the core bus, we keep the bus pure (transient). The coordinator will listen to specific events (marked with a `sync: true` flag in their type definition) and use `BroadcastChannel` to relay them to other tabs.
- **Alternatives Considered**:
  - Manual `BroadcastChannel` in every store: Rejected (current pain point).
  - `localStorage` events: Rejected as `BroadcastChannel` is more performant and designed specifically for this use case.

### 3. Migration Strategy

- **Decision**: "Bridge and Deprecate".
- **Rationale**: We will implement the `AppEventBus` first. `VaultEventBus` will be modified to emit its events to the `AppEventBus` internally. This allows existing code to continue working while new code uses the generalized bus. Once all listeners are migrated, `VaultEventBus` can be removed.
- **Alternatives Considered**:
  - Big Bang Migration: Rejected due to the risk of breaking core vault sync logic.

### 4. Implementation Location

- **Decision**: `packages/events`.
- **Rationale**: Adheres to the **Library-First** principle. Makes the bus accessible to other packages (like `sync-engine` or `vault-engine`) without circular dependencies on `apps/web`.

## Best Practices

- **Listener Cleanup**: Use the "functional unsubscribe" pattern (`const unsub = bus.subscribe(...)`).
- **Error Isolation**: Each listener must be wrapped in a `try/catch` to ensure one faulty listener doesn't break the entire bus.
- **Event Naming**: Use `DOMAIN:EVENT_TYPE` format (e.g., `VAULT:ENTITY_UPDATED`).
