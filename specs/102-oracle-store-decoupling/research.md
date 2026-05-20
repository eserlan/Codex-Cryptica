# Research: Oracle Store Decomposition

## Decisions

### 1. Manager Instantiation & DI

- **Decision**: The `OracleStore` facade will instantiate all 6 managers in its constructor. Each manager will receive a reference to the `OracleStore` instance (as `this`) or a specialized "Mediator" to avoid direct circular imports.
- **Rationale**: Managers often need cross-cutting state (e.g., `ActionManager` needs the context from `ContextManager`). Passing the facade allows them to access all other managers via the facade's public or internal properties.
- **Alternatives Considered**:
  - Using Svelte `getContext`/`setContext`: Rejected because these stores are often used outside of the component tree (in services or workers).
  - Pure functional managers: Rejected because many managers need to maintain their own reactive `$state`.

### 2. Context Manager & Comlink Proxies

- **Decision**: `OracleContextManager` will remain in the main thread (apps/web) because it needs to take snapshots of other Svelte stores (`vault`, `theme`, etc.) which are not accessible in the worker. The `Comlink.proxy` wrapping logic will be moved wholesale into this manager.
- **Rationale**: The `getExecutionContext` method is the most complex part of the store, acting as the "glue". Isolating it makes the facade significantly cleaner.

### 3. Facade Responsibility

- **Decision**: The `OracleStore` facade will handle the `init()` and `destroy()` lifecycle, delegating the actual work to the managers. It will also be responsible for the `BroadcastChannel` (event bus) and routing events to the appropriate managers.
- **Rationale**: Keeps the event bus logic centralized and prevents managers from having to know about each other's event handling needs.

### 4. Reconciliation Logic Isolation

- **Decision**: Move the heavy `reconcile*` methods and `proposerStore` imports into `OracleReconciliationManager`.
- **Rationale**: This logic is "heavy" and independent of the day-to-day chat UI, making it a perfect candidate for isolation.

## Research Tasks (Resolved)

### How to handle circular dependencies between managers?

- By using constructor injection where the `OracleStore` (facade) passes itself to the managers.
- Example: `this.ui = new OracleUiManager(this);`
- In the manager: `constructor(private store: OracleStore) {}`

### Where should `handleWorkerEvent` live?

- The facade will keep the `BroadcastChannel` and the master `handleWorkerEvent`. It will then call methods on managers:
  - `THINKING_START/END` -> `this.ui.updateThinking(delta)`
  - `ENTITY_DISCOVERED` -> `this.chat.addProposal(...)`

### How to preserve backward compatibility for 48+ importers?

- The `OracleStore` will keep all existing public method signatures and properties (`get messages()`, `get settings()`, `ask()`, etc.). These will simply delegate to the internal managers.
- Example: `get messages() { return this.chat.messages; }`
