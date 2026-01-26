# Research: Fuzzy Search Implementation

## Decisions

### 1. Search Engine Library
- **Decision**: Use `FlexSearch` (specifically `flexsearch` package).
- **Rationale**: 
  - **Performance**: The Constitution mandates sub-100ms response times (Article III). `FlexSearch` is significantly faster than `Fuse.js` for full-text search, which is required by User Story 2.
  - **Memory Efficiency**: Optimized for browser-based indexing.
  - **Flexibility**: Supports contextual search and relevance scoring (Title > Content).
- **Alternatives Considered**:
  - `Fuse.js`: Excellent for simple lists and strictly fuzzy matching, but performance degrades linearly with content size. Risk of blocking main thread with 10k notes.
  - `MiniSearch`: Good alternative, but `FlexSearch` benchmarks generally show higher throughput.

### 2. Architecture
- **Decision**: Run search index in a **Web Worker**.
- **Rationale**: 
  - **Non-blocking UI**: Indexing 10,000 notes is CPU intensive. Doing this on the main thread violates Constitution "No Blocking UI" (Forbidden Patterns).
  - **Responsiveness**: Keeps the UI thread free for keystroke handling and rendering.

### 3. Index Structure
- **Decision**: Dual Index Strategy (Document vs. Index).
- **Rationale**:
  - We need strict field-based weighting (Title vs. Content).
  - `FlexSearch.Document` allows defining fields with different resolutions/contexts.

## Implementation Details

- **Package**: `flexsearch`
- **Worker**: `apps/web/src/lib/workers/search.worker.ts`
- **Communication**: Request/Response pattern via `Comlink` or raw `postMessage` (Stick to raw or existing patterns).
