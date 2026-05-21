# Repository Code Structure & Quality Assessment

This document provides a deep, comprehensive assessment of the **Codex-Cryptica** repository (as of May 20, 2026). It details the overall codebase architecture, design patterns, quality metrics, testing state, complexity watch-list, and recommended roadmap.

---

## 1. Executive Summary

Codex-Cryptica is a high-performance, local-first, offline-capable application built around Svelte 5 (Runes), TypeScript 6.0, and Tailwind CSS 4. The project organizes its logic as a monorepo containing multiple decoupled engine packages and SvelteKit-based UI surfaces.

### Key Architectural Strengths

- **Decoupled Business Logic**: Core capabilities (graphs, search, importers, vaults, synchronization, maps) are developed as standalone packages under `packages/` with strict boundaries.
- **Modern Svelte 5 Runes**: The UI utilizes `$state`, `$derived`, and `$props` instead of legacy stores, enhancing responsiveness and predictability.
- **Dependency Injection**: Services and stores utilize constructor-based DI with fallback singletons, allowing simple mock injection during testing.
- **Local-First State Persistence**: Fast client-side storage utilizing Origin Private File System (OPFS), IndexedDB, and PeerJS P2P connections.
- **Strong Test Coverage**: The project maintains over 1,200 unit tests spanning 178 test suites, ensuring that core modules maintain a high coverage baseline (70-100%).

---

## 2. Repository & Workspace Structure

The project is structured as a **pnpm workspace** orchestrated by **Turborepo** to maximize build caching and test efficiency.

```text
apps/
  web/                  # SvelteKit client application with static pre-rendering
  workers/
    oracle-proxy/       # Cloudflare Worker proxy for Google Gemini requests
packages/
  canvas-engine/        # Spatial canvas logic using @xyflow/svelte
  chronology-engine/    # Campaign timeline and date history rules
  dice-engine/          # Web Crypto-backed random number generators and roll history
  editor-core/          # Rich text editor (Tiptap / Milkdown) formatting & frontmatter parsing
  events/               # Unified in-memory event bus (appEventBus)
  graph-engine/         # Cytoscape.js core logic and fcose layout management
  importer/             # Raw file import queues, validations, and markdown parser helpers
  map-engine/           # VTT coordinate projection, rendering loops, and asset caching
  oracle-engine/        # AI engines, prompt construction, and message serialization
  proposer/             # LLM relationship proposal logic and UI triggers
  schema/               # Shared Zod validation schemas for all entities and events
  search-engine/        # FlexSearch indexing run off-main-thread via Web Workers & Comlink
  sync-engine/          # Vault reconciliation, file registries, and Google Drive cloud mirroring
  vault-engine/         # File-level CRUD, metadata caching, and local directory tracking
```

### Assessment of Package Boundaries

Each package is highly focused. For example, `@codex/search-engine` exposes its main functionality in an isolated module that does not import Svelte or browser UI APIs. This clean division ensures that business logic packages remain environment-agnostic, portable, and easily unit-testable under pure Node/JSDOM runners.

---

## 3. Code Quality & Design Patterns

### A. Svelte 5 Reactive Architecture

The codebase has successfully adapted Svelte 5 Runes. By avoiding direct `$state` initialization from props and using `$derived` values instead, the application avoids typical reactivity pitfalls:

- Unused callback arguments or event parameters are consistently prefixed with an underscore (e.g., `_evt`) to satisfy strict linting.
- Stale closure issues in async handlers are avoided by using `$state.snapshot(object)` to pass clean, non-reactive JSON clones to network layers or databases.

### B. Store Manager Architecture (Oracle & UI Store)

A major architectural victory in Codex-Cryptica is the decomposition of historical monolith stores:

1. **`OracleStore`**: Decomposed into 6 distinct, reactive managers:
   - `ui-manager.svelte.ts`: Layout, modal, and drawer visibility.
   - `chat-manager.svelte.ts`: Chat history appending and deletion.
   - `context-manager.svelte.ts`: RAG context extraction and document chunking.
   - `action-manager.svelte.ts`: Triggering vault updates and entity modifications.
   - `settings-manager.svelte.ts`: Local setting overrides and API keys.
   - `reconciliation-manager.svelte.ts`: Merging AI-suggested content with existing vault entities.
2. **`ui.svelte.ts`**: Replaced entirely by modular stores under `apps/web/src/lib/stores/ui/` (e.g., `connection-mode.svelte.ts`, `layout-ui.svelte.ts`, `notification.svelte.ts`).
3. **P2P Services**: Historically represented by large host/guest stores, the network layers are split into transport layers (`P2PClientTransport`), dispatchers (`p2p-dispatcher`), and domain-specific message handlers (Spec 098/100).

### C. Dependency Injection (DI)

The codebase strictly follows constructor-based dependency injection for its services:

```ts
// Example pattern utilized across stores
export class VaultService {
  constructor(
    private repository = VaultRepository.getInstance(),
    private eventBus = appEventBus,
  ) {}
}
```

_Impact:_ This prevents tight coupling to singletons and lets unit tests run in isolation by passing mocked repositories or event buses.

### D. Styling & Iconography Guidelines

- **Tailwind CSS 4**: Utilizes Tailwind 4 semantic tokens (e.g. `bg-theme-surface`, `border-theme-border`, `text-theme-primary`) to allow dynamic switching of the application's "Fantasy" visual theme.
- **Iconography Restrictions**: The codebase strictly forbids the direct use of Svelte components from `lucide-svelte`. Instead, it uses Iconify utility classes (e.g. `class="icon-[lucide--search]"`). This significantly decreases bundle sizes and enforces uniform icon layout constraints.

---

## 4. Testing, Coverage, and Code Health

### A. Testing Infrastructure

- **Unit Tests**: Executed via Vitest. Tests run concurrently inside Turborepo with caching enabled.
- **E2E Tests**: Managed by Playwright. Crucially, the repository has an enforced global rule to run Playwright tests using `--reporter=list` to prevent background processes from hanging in CI environments.

### B. Coverage Status & Debt Reassessment

The project maintains a healthy coverage baseline that meets the **70-80% Constitutional Coverage Floor** established in the repository's rules.

- **100% Covered Modules**:
  - `@codex/canvas-engine`
  - `graph.svelte.ts` (Graph View state)
  - `search.svelte.ts` (Fuzzy search state)
  - `dice-history.svelte.ts`
  - `vault/crud.ts` (Base filesystem CRUD)
- **High-Coverage Modules (>80%)**:
  - `@codex/chronology-engine` (95.8%)
  - `@codex/importer` (90.4%)
  - `@codex/graph-engine` (89.2%)
  - `@codex/oracle-engine` (82.5%)
- **Test Debt (Moderate Risk)**:
  - `guest-service.ts` (~61.5%) and `host-service.svelte.ts` (~61.8%). The P2P synchronization logic represents the remaining moderate-risk test debt. Because P2P state depends on real-time network states (PeerJS connections, RTC channels), mocking is complex, leaving a 10% gap under the constitutional goal.

---

## 5. Complexity & Monoliths Watch-List

While the layout and stores are largely decoupled, a few core engines and complex UI views remain large. These files are monitored via the project's internal **God File Watch-List**:

| File Path                                                 | Line Count | Primary Responsibility                                                      | Mitigation Strategy                                                                                                                      |
| :-------------------------------------------------------- | :--------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/map-engine/src/renderer.ts`                     | 672        | WebGL Canvas rendering, coordinate projecting, and draw loops               | Extract the WebGL context setup, shader compiling, and buffer configuration out of the runtime draw loops.                               |
| `apps/web/src/lib/components/oracle/ChatMessage.svelte`   | 660        | Svelte view for rendering AI outputs, wizards, actions, and auto-completers | Extract message-type subcomponents (`SystemLog.svelte`, `AIChronicler.svelte`) and use local components for complex autocomplete inputs. |
| `packages/graph-engine/src/LayoutManager.ts`              | 637        | Graph Layout configuration and fcose algorithm properties                   | Offload layout physics to a dedicated Web Worker headlessly to avoid blocking the main UI thread.                                        |
| `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts` | 605        | Token movement, grid collisions, and VTT map states                         | Extract collision detection arithmetic and token synchronization APIs into small math helper files.                                      |

---

## 6. Strategic Recommendations

1. **Offload Layout Math to Workers**:
   Implement a Headless Layout worker for `@codex/graph-engine`'s layout algorithms. Offloading fcose computations to a background thread will eliminate the 200-800ms frames drops encountered on graphs with >500 nodes.
2. **WebGL Renderer Refactor**:
   Extract raw WebGL pipeline initialization from `packages/map-engine/src/renderer.ts`. Breaking down shaders and buffer loaders into isolated classes will reduce this file's length below 300 lines.
3. **Address P2P Sync Test Debt**:
   Write dedicated mock-connection suites for `host-service.svelte.ts` and `guest-service.ts` to raise their testing coverage above the 70% threshold.
4. **Decompose `ChatMessage.svelte`**:
   The component handles too many UI layout variations. Extracting `ConnectionWizard.svelte` and `MergeWizard.svelte` logic, and creating specific renderers for custom output blocks, will significantly reduce templates complexity.
