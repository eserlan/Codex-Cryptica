# Research: Offloading Oracle AI Services

## Decision: Hybrid RPC/Event Architecture

**Rationale**: To maintain zero-latency responsiveness in the UI while allowing for long-running AI tasks.

1. **Comlink for RPC**: Used for deterministic, request-response commands (e.g., "Expand this query", "Reconcile this entity"). Comlink handles the heavy lifting of marshalling data and callbacks (via proxies).
2. **BroadcastChannel for Notifications**: Used for fire-and-forget events (e.g., `ORACLE_ENTITY_DISCOVERED`). This bypasses the strict request-response loop of Comlink and allows the worker to push findings as they happen during a stream.

**Alternatives considered**:

- **Pure Comlink**: Rejected because it makes incremental discovery harder to coordinate without many complex proxy callbacks.
- **Pure PostMessage**: Rejected due to high boilerplate and lack of type safety. Comlink provides a superior developer experience for the majority of the worker interaction.

## Decision: Main-Thread Context Retrieval

**Rationale**: The `ContextRetrievalService` depends on the `VaultStore` (Svelte reactive state) and `SearchService` (FlexSearch index).

1. **Keep in Main Thread**: Retrieving RAG context happens in the main thread. The resulting string context is then passed to the worker.
2. **Benefit**: Avoids the complexity of syncing the reactive vault state or sharing the search index across thread boundaries.

## Decision: Idempotent Discovery State

**Rationale**: Incremental discovery can identify the same entity multiple times as more text arrives.

1. **Worker-Side Filter**: The `OracleWorker` maintains a `Set` of discovered titles per request to avoid duplicate event emissions.
2. **Main-Thread Merge**: The `OracleActionExecutor` merges final discovery results with existing proposals to ensure consistency and handle any entities missed during the incremental scan.

## Unknowns Resolved

- **Streaming in Workers**: Resolved by using `Comlink.proxy` for the `onUpdate` callback.
- **Worker-Safe Dependencies**: Resolved by refactoring `capability-guard.ts` to use browser-check guards.
- **SSR Compatibility**: Resolved by implementing a fallback mechanism in `OracleStore` that detects if the bridge is ready.
