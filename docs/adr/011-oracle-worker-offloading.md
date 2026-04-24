# ADR 011: Offloading Oracle AI Services to Background Worker

## Status

Accepted

## Context

The Lore Oracle is a central feature of Codex-Cryptica, providing streaming AI chat, entity discovery, and reconciliation. These operations involve:

1.  **Network I/O**: High-latency calls to the Gemini API.
2.  **Streaming**: Continuous UI updates as text chunks arrive.
3.  **Heuristic Parsing**: Regex-heavy discovery of entities and labels within generated text.
4.  **Complex Data Merging**: AI-driven reconciliation of new lore into existing vault entities.

Previously, these tasks were managed directly in the main thread within `DefaultTextGenerationService`. While `fetch` is asynchronous, the surrounding JavaScript execution (JSON parsing, heuristic loops, and state coordination) occurred on the UI thread. As the vault grows and AI responses become more complex, this pattern risks introducing noticeable UI stuttering ("jank"), particularly during the transition from text generation to entity discovery.

## Decision

We will offload the core intelligence of the Lore Oracle—specifically text generation, query expansion, and discovery heuristics—to a dedicated **Background Web Worker** (`OracleWorker`). We will adopt a **Hybrid Communication Architecture** to maximize responsiveness and decoupling.

### Key Implementation Details:

1.  **`OracleWorker`**: A background thread responsible for interacting with the `@google/generative-ai` SDK and running the `@codex/oracle-engine`'s `DraftingEngine`.
2.  **Hybrid Communication Pattern**:
    - **Comlink (RPC)**: Used for deterministic, request-response **Commands** (e.g., "Expand this query", "Start chat", "Reconcile this entity").
    - **BroadcastChannel (Event-Based)**: Used for asynchronous, fire-and-forget **Notifications** (e.g., `ORACLE_ENTITY_DISCOVERED`, `ORACLE_THINKING_START`). This allows the worker to push real-time discovery events to the UI thread as they occur, without waiting for the full chat response to complete.
3.  **State Separation**:
    - **Worker**: Handles computation, AI calls, and heuristic scanning.
    - **Main Thread**: Retains ownership of reactive Svelte stores (`VaultStore`, `OracleStore`) and I/O-heavy services (`ContextRetrievalService`) that depend on those stores.
4.  **Streaming Proxy**: Use `Comlink.proxy` for primary chat streaming, while utilizing the event bus for supplemental discovery metadata.
5.  **Graceful Fallback**: The `OracleStore` detects if the worker is available and falls back to main-thread execution during SSR or if the worker fails to initialize.

## Rationale

1.  **UI Responsiveness**: By moving CPU-intensive parsing and large-scale JSON processing off the main thread, we ensure that UI animations, graph interactions, and typing remain smooth even while the AI is "thinking" or "extracting."
2.  **Real-time Discovery**: The event-based approach allows the worker to notify the UI of discovered entities _incrementally_ during the stream, rather than in a single batch at the end.
3.  **Architectural Decoupling**: Offloading these services forces a cleaner separation between **Logic** (AI/Parsing) and **State** (Svelte Stores). The event bus allows multiple main-thread listeners (Activity Log, UI, Search) to react to Oracle findings independently.
4.  **Scalability**: Background workers provide a scalable path for future AI improvements (e.g., local LLM execution or more exhaustive RAG processing) without impacting the frontend experience.
5.  **Consistency**: This follows the established project pattern of offloading heavy tasks, consistent with `SearchWorker` and `ProposerWorker`.

## Consequences

- **Increased Complexity**: Communication between threads is now asynchronous and requires serialization via Comlink.
- **Serialization Overhead**: Large data sets (e.g., passing a snapshot of all vault entities for discovery) must be cloned across the worker boundary.
- **Dependency Management**: Services used in the worker must be "worker-safe," avoiding dependencies on browser globals like `window`, `document`, or `localStorage` unless appropriately guarded.
- **Debugging**: Errors in workers can be harder to trace; the `OracleBridge` must implement robust error propagation to the main-thread `debugStore`.
