# Feature Specification: Implement Generalized AppEventBus

**Feature Branch**: `094-app-event-bus`  
**Created**: 2026-04-27  
**Status**: Draft  
**Input**: User description: "Implement a generalized AppEventBus as proposed in docs/ARCHITECTURE_EVENTS.md to unify VaultEventBus, BroadcastChannel, and custom DOM events."

## Clarifications

### Session 2026-04-27

- Q: Event Persistence → A: Transient/In-memory only (Lost on page refresh)
- Q: Cross-Tab Event Scope → A: Selective (Only specific event types are broadcasted)
- Q: Performance & Priority → A: Synchronous (Listeners execute immediately on emission)
- Q: Wildcard & Domain Subscriptions → A: Hybrid (Support both specific event types and entire domain wildcards)
- Q: Unsubscription Lifecycle → A: Functional (Subscribe returns an `unsubscribe()` function)

## User Scenarios & Testing

### User Story 1 - Unified System Coordination (Priority: P1)

As a developer, I want a single, type-safe mechanism to coordinate actions between decoupled systems (like Vault, Oracle, and UI), so that I can implement cross-cutting features without creating complex dependencies between stores.

**Why this priority**: Essential for architectural health and reducing "God Store" complexity. It establishes the foundation for all subsequent event-driven features.

**Independent Test**: Can be tested by emitting a generic event from one system and verifying that a listener in a completely unrelated system receives the correct payload.

**Acceptance Scenarios**:

1. **Given** a new application-wide event bus, **When** a "Vault Switched" event is emitted, **Then** all registered listeners (e.g., Timeline, Graph, Search) receive the event and can reset their state accordingly.
2. **Given** a listener registered for a specific domain (e.g., Oracle), **When** an unrelated event (e.g., Vault sync) is emitted, **Then** the listener does not receive unnecessary notifications.

---

### User Story 2 - Automated Side-Effect Decoupling (Priority: P2)

As a system architect, I want heavy side effects (like search indexing or URL cache invalidation) to react to state changes via events rather than being hard-coded into store setters, so that the core application logic remains fast and testable.

**Why this priority**: Improves performance and maintainability by moving expensive operations out of the critical path of user interactions.

**Independent Test**: Can be tested by updating an entity and verifying that the search indexer is triggered via an event rather than a direct method call.

**Acceptance Scenarios**:

1. **Given** an entity is updated in the Vault, **When** the `ENTITY_UPDATED` event is emitted, **Then** the Search Service automatically re-indexes that entity without the Vault store needing a direct reference to the Search Service.

---

### User Story 3 - Cross-Window/Tab Synchronization (Priority: P3)

As a user with multiple tabs open, I want my actions in one tab (like undoing an Oracle action) to be reflected in all other open tabs, so that my workspace stays consistent across my entire browser session.

**Why this priority**: Improves user experience and data consistency in multi-tab workflows.

**Independent Test**: Can be tested by opening two browser windows, performing an action in one, and verifying the change appears in the other via a coordinated event.

**Acceptance Scenarios**:

1. **Given** two tabs open to the same vault, **When** an "Undo" is performed in the Oracle chat of tab A, **Then** the corresponding message in tab B updates its "Saved" status automatically.

---

### Edge Cases

- **Listener Failures**: How does the system handle an event listener that throws an error? (It should not crash the emitter or prevent other listeners from firing).
- **Rapid Bursts**: How does the system handle hundreds of events firing in a few milliseconds? (Should support debouncing or batching for specific event types).
- **Circular Dependencies**: What happens if listener A emits an event that listener B hears, which then emits an event listener A hears? (Should have safeguards or patterns to avoid infinite loops).
- **Stale Listeners**: Ensuring listeners are properly cleaned up when components unmount to prevent memory leaks.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a centralized `AppEventBus` that supports multiple event domains (Vault, Oracle, UI, System).
- **FR-002**: Event payloads MUST be strictly typed using TypeScript union types.
- **FR-003**: System MUST allow listeners to subscribe to specific event types, entire domains (wildcards), or all events.
- **FR-004**: System MUST support named listeners to prevent duplicate registrations and aid debugging.
- **FR-005**: System MUST provide a mechanism to broadcast events marked with `sync: true` across browser tabs/windows (unifying `BroadcastChannel` usage).
- **FR-006**: Event emission MUST be synchronous by default, executing all registered listeners immediately on the same task.
- **FR-007**: Event state MUST be transient and in-memory; events are not persisted across page reloads.
- **FR-008**: System MUST only broadcast events explicitly marked with the `sync: true` property in their payload to prevent sync loops and redundant processing.
- **FR-009**: Subscribing to the bus MUST return an unsubscription function for clean lifecycle management.

### Key Entities

- **AppEvent**: A unified data structure representing a change or action in the system, containing a type, domain, and payload.
- **EventListener**: A callback function or object that reacts to specific `AppEvent` instances.
- **EventDomain**: A logical grouping of events (e.g., `vault`, `oracle`, `sync`, `ui`).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Reduce the number of direct store-to-store imports in `apps/web/src/lib/stores/` by at least 20% by moving coordination to events.
- **SC-002**: Eliminate all direct `new BroadcastChannel()` calls in components, replacing them with a centralized service.
- **SC-003**: 100% of event listeners catch and log errors without interrupting the main execution flow.
- **SC-004**: System-wide "Vault Switch" duration (time from click to all stores reset) remains under 200ms despite moving to an event-based trigger.
