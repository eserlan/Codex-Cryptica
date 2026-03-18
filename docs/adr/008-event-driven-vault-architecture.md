# ADR 008: Event-Driven Vault Architecture

## Context and Problem Statement

As the application grew, the `VaultStore` gradually evolved into an orchestrator "God object". It was responsible not only for loading and managing the core entity data but also for manually coordinating secondary services: updating the `SearchService`, initializing the `mapRegistry` and `canvasRegistry`, and managing the persistence state of the search index.

This tight coupling introduced severe performance and UX issues:

1. **Blocked UI (The "Flash and Disappear" bug):** During vault initialization, the `VaultStore` remained in a `"loading"` state while awaiting background search indexing to complete. This caused the UI to hide the graph (which had already loaded instantly from the Dexie cache) for several seconds until indexing finished.
2. **Fragile CRUD Operations:** Every time a new CRUD method was added or modified in the `VaultStore`, the developer had to remember to manually call `search.index()` or `search.saveIndex()`. Forgetting this led to silent desynchronization between the UI and the search index.
3. **Complex State Management:** The `VaultStore` was tracking things like `_searchIndexDirty` and managing `visibilitychange` events on behalf of the `SearchService`.

We needed a way to decouple the data loading lifecycle from the secondary services that rely on that data, ensuring the cache always has absolute priority and the UI remains unblocked.

## Decision Drivers

- **Time to Interactive (TTI):** The graph and UI must become usable the exact millisecond the local cache is loaded, regardless of other background operations.
- **Decoupling:** Services should manage their own lifecycles and persistence.
- **Maintainability:** CRUD operations should focus only on data manipulation, not side-effect orchestration.

## Considered Options

- **Option 1: Continue with manual orchestration (Status Quo)** - Try to carefully arrange `await` calls and `status` toggles in `VaultStore`. Rejected because it scales poorly and is highly error-prone.
- **Option 2: Callback Injection** - Pass callbacks from `SearchService` into `VaultStore`. Rejected because it still tightly couples the store to specific service interfaces.
- **Option 3: Event-Driven Architecture (Pub/Sub)** - Introduce a central Event Bus for vault lifecycle events. Chosen for its superior decoupling and scalability.

## Decision Outcome

Chosen option: **Option 3: Event-Driven Architecture (Pub/Sub)**.

We implemented a centralized `VaultEventBus` (`apps/web/src/lib/stores/vault/events.ts`). The `VaultStore` has been stripped of all manual service orchestration. Its sole responsibility is now managing the entity data and broadcasting specific lifecycle events:

- `VAULT_OPENING`
- `CACHE_LOADED`
- `SYNC_CHUNK_READY`
- `SYNC_COMPLETE`
- `ENTITY_UPDATED` / `ENTITY_DELETED` / `BATCH_CREATED`

### Implementation Details:

1.  **Immediate Idle State:** `VaultStore.loadFiles` now sets `status = "idle"` immediately after emitting `CACHE_LOADED`. This allows the graph to render instantly and begin resolving image URLs.
2.  **Autonomous Services:** `SearchService` now subscribes to the `VaultEventBus`. When it hears `CACHE_LOADED`, it begins indexing in the background. When it hears `ENTITY_UPDATED`, it updates its internal index.
3.  **Self-Managed Persistence:** `SearchService` now tracks its own `isDirty` state, uses a 2-second debounced auto-save, and registers its own `visibilitychange` listener to reliably persist the FlexSearch index to IndexedDB before the page unloads.

## Consequences

### Positive

- **Zero-Blocking UI:** The graph appears instantly from the cache and remains visible and interactive while search indexing and OPFS synchronization happen silently in the background.
- **High Cohesion, Low Coupling:** `VaultStore` is significantly cleaner and smaller. It no longer imports or knows about `SearchService` internals.
- **Robustness:** CRUD operations broadcast events by default. New features or services can simply subscribe to the bus without modifying the core `VaultStore` logic, eliminating the risk of "forgotten updates".
- **Search Persistence:** The search index is now reliably persisted to IndexedDB by an autonomous service, making subsequent page loads incredibly fast.

### Negative

- **Indirection:** The flow of execution is less explicit. A developer tracing what happens after `VaultStore.loadFiles` finishes must know to look at the subscribers of `VaultEventBus` rather than following direct function calls.
- **Error Handling Complexity:** Errors thrown within asynchronous event listeners might be swallowed if not carefully caught and logged at the bus level (which we have mitigated by adding `try/catch` wrappers inside the bus emitter).
