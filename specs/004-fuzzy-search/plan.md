# Implementation Plan - Fuzzy Search

**Feature**: Fuzzy Search (`004-fuzzy-search`)
**Status**: Planned

## Technical Context

| Question | Answer |
|----------|--------|
| **Language** | TypeScript / Svelte |
| **Framework** | SvelteKit (UI) |
| **Data Storage** | In-Memory (Worker), initialized from OPFS |
| **Key Libraries** | `flexsearch` (New Dependency) |
| **New patterns** | Search Worker (Dedicated Web Worker for indexing/searching) |

## Constitution Check

| Principle | Check | Implementation Strategy |
|-----------|-------|-------------------------|
| **I. Local-First** | ✅ | Index built locally from OPFS files. No external API. |
| **III. Sub-100ms** | ✅ | Search logic runs in Web Worker to prevent main thread blocking. `FlexSearch` chosen for speed. |
| **VII. Testing** | ✅ | Unit tests for Worker logic. E2E tests for Search Modal interaction. |
| **VIII. Offline** | ✅ | Works fully offline (client-side index). |
| **No Blocking UI** | ✅ | Heavy indexing confined to Web Worker. |

## Phases

### Phase 0: Outline & Research _(Completed)_

- [x] Select search library (`FlexSearch`)
- [x] Define worker architecture
- [x] Artifacts: `research.md`

### Phase 1: Design & Contracts _(Completed)_

- [x] Define Data Model (`data-model.md`)
- [x] Define API Contracts (`contracts/search-api.ts`)
- [x] Create Developer Guide (`quickstart.md`)

### Phase 2: Implementation

#### Step 1: Core Engine
- **Task**: Install `flexsearch` and configure dependencies.
- **Task**: Implement `search.worker.ts` with `FlexSearch` initialization and query logic.
- **Task**: Create `SearchService` (bridge) to communicate with worker.
- **Verification**: Unit tests for `SearchService` mocking the worker.

#### Step 2: Indexing Integration
- **Task**: Connect `SearchService` to `Vault` stores.
- **Task**: Trigger `index()` on file create/update/delete.
- **Task**: Implement bulk indexing on startup.
- **Verification**: Integration test - add note, verify it appears in search results.

#### Step 3: UI Implementation
- **Task**: Create `SearchModal.svelte` component.
- **Task**: Implement keyboard navigation (Arrow keys, Enter).
- **Task**: Implement highlighting of matches.
- **Verification**: Playwright E2E test for modal open, type, navigate, select.

#### Step 4: Polish & Performance
- **Task**: Optimize index settings for relevance (Title > Content).
- **Task**: Ensure large vault (mock 10k notes) doesn't freeze UI during initial index.
- **Verification**: Performance benchmark.