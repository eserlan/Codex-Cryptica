# ADR 010: Lazy Loading and Performance Optimization

## Context and Problem Statement

As Codex-Cryptica added more features—including the Lore Oracle (AI), advanced search (FlexSearch), and complex settings—the initial bundle size grew significantly. This led to slower "Time to Interactive" (TTI), as the browser had to download, parse, and execute several heavy libraries (like `@google/generative-ai` and `flexsearch`) before the user could even begin interacting with the Knowledge Graph.

Specifically, we identified three major bottlenecks:

1. **AI SDK Bloat:** The `@google/generative-ai` library was being imported statically at the layout level, adding several hundred kilobytes to the initial payload, even for users who never used the Oracle.
2. **Immediate Modal Initialization:** Heavy UI components for Search, Settings, and the Oracle Window were being imported and rendered into the DOM immediately upon application start, regardless of whether they were visible.
3. **Eager Worker Spawning:** The search worker was being spawned and initialized immediately, consuming CPU and memory resources during the critical boot phase.

We needed a strategy to defer the loading of these non-essential resources until they were actually required by the user.

## Decision Drivers

- **Time to Interactive (TTI):** The core Knowledge Graph and navigation should be usable as quickly as possible.
- **Resource Efficiency:** Avoid downloading and executing code for features the user may not interact with in a given session.
- **Bundle Hygiene:** Remove unused legacy dependencies to minimize the application footprint.

## Considered Options

- **Option 1: Static Imports with Better Chunking (Status Quo)** - Rely on SvelteKit/Vite's default code-splitting. Rejected because it doesn't prevent layout-level dependencies from entering the main bundle.
- **Option 2: Manual Lazy Loading (Dynamic Imports)** - Use `import()` to fetch heavy libraries and components on demand. Chosen for its precision and immediate impact on the initial bundle size.
- **Option 3: Route-Level Separation** - Move heavy features to separate routes. Rejected because many of these features (Oracle, Search) are designed to be available as overlays across all routes.

## Decision Outcome

Chosen option: **Option 2: Manual Lazy Loading (Dynamic Imports)**.

We implemented a comprehensive lazy loading strategy across the application:

### Implementation Details:

1.  **Dynamic AI SDK:** Modified `DefaultAIClientManager` to dynamic-import `@google/generative-ai` only when `getModel()` is called. This keeps the AI SDK out of the main bundle.
2.  **UI Gating in GlobalModalProvider:** Transitioned `SearchModal`, `SettingsModal`, `OracleWindow`, and `MobileMenu` to dynamic imports. These components are now only fetched when their respective state flags (e.g., `searchStore.isOpen`) are set to true.
3.  **Deferred Search Worker:** Modified `SearchService` to delay the creation of the `SearchWorker` until the first search query or indexing operation. This ensures the main thread has full priority during initial vault loading.
4.  **Dependency Cleanup:** Removed the unused `mermaid` library from the web application to reduce the total dependency weight.

## Consequences

### Positive

- **Significantly Smaller Initial Bundle:** By moving heavy libraries to separate chunks, we've reduced the amount of JavaScript that must be processed before the app becomes interactive.
- **On-Demand Resource Loading:** Heavy UI and logic (like the AI SDK) are only downloaded if the user actually opens those features.
- **Cleaner Application Footprint:** Removing dead dependencies like `mermaid` simplifies the dependency tree.
- **Unblocked App Bootstrap:** Deferring the search worker ensures that the Knowledge Graph rendering and OPFS synchronization have maximum priority during startup.

### Negative

- **Micro-Lag on First Interaction:** The first time a user opens Search, Settings, or the Oracle, there may be a very slight delay (milliseconds) as the browser fetches the required code chunk. We have mitigated this by using small, focused chunks.
- **Increased Asynchrony:** Services like `AIClientManager` and `SearchService` now have more asynchronous methods, requiring more careful handling of promises in the UI.
