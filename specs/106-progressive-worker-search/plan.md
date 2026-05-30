# Implementation Plan: Progressive Worker-Backed Search Indexing

**Branch**: `106-progressive-worker-search` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/106-progressive-worker-search/spec.md`

## Summary

Implement progressive search-index rebuilding through the existing `@codex/search-engine` Web Worker and `SearchService` pipeline. The package remains the library-first owner of FlexSearch indexing behavior, while the web app coordinates vault lifecycle, cancellation, progress state, per-vault persistence, retry, and plain UI status. Rebuilds use bounded batches, run identities, and stale-result guards so cold or corrupt indexes can rebuild without freezing the UI or leaking data across vault switches.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 runes, Node >=24, pnpm >=10  
**Primary Dependencies**: FlexSearch, Comlink, Dexie-backed `entityDb`, `@codex/events`, `@codex/vault-engine`, `schema`, `@codex/search-engine`  
**Storage**: Browser-local IndexedDB via `entityDb.searchIndex`, `entityDb.graphEntities`, and `entityDb.entityContent`; per-vault persisted index snapshots only  
**Testing**: Vitest unit/service tests for `@codex/search-engine`, `SearchService`, `SearchStore`, and worker exposure; existing workspace lint/test scripts  
**Target Platform**: Browser PWA across desktop, tablet, and mobile; no server-side indexing  
**Project Type**: pnpm workspace with a library package plus Svelte web app integration  
**Performance Goals**: Partial search results within 2 seconds after cold metadata availability for indexed records; no user-visible main-thread freeze longer than 100ms during 1,000-entity rebuilds  
**Constraints**: Local-first privacy, no remote indexing, cancellation on vault switch, no cross-vault contamination, constructor-based DI for testability, clear user-facing copy  
**Scale/Scope**: Initial target is 1,000+ entities per vault, with chunked design suitable for larger vaults without adding new infrastructure

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Library-First**: PASS. FlexSearch batching/progress primitives stay in `packages/search-engine`; web code coordinates vault-specific lifecycle and UI state.
- **TDD**: PASS. Implementation must start with failing tests for worker progress, cancellation/stale run guards, corrupt snapshot fallback, and store-visible partial status.
- **Simplicity & YAGNI**: PASS. Reuse the existing worker, service, store, and persistence flow; no new indexing backend or second worker.
- **AI-First Extraction**: PASS. Not directly affected; entity content continues to flow through existing validated entities.
- **Privacy & Client-Side Processing**: PASS. All indexing and persisted search snapshots remain browser-local and scoped by vault ID.
- **Clean Implementation**: PASS. Planned changes require lint and tests before merge.
- **User Documentation**: PASS. Add/update help content for search status and degraded/retry behavior.
- **Dependency Injection**: PASS. Any new service/store dependencies must be constructor-injected with production defaults.
- **Natural Language**: PASS. UI status must use plain terms like "Search is still indexing" and "Retry indexing".
- **Quality & Coverage**: PASS. New behavior needs success plus cancellation/failure-path tests.
- **Agent Operational Protocol**: PASS. Scope is limited to progressive indexing, progress, cancellation, persistence fallback, and documentation.

## Project Structure

### Documentation (this feature)

```text
specs/106-progressive-worker-search/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── search-indexing.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/search-engine/
├── src/
│   └── index.ts
└── tests/
    ├── progressive-indexing.test.ts
    └── search-engine-advanced.test.ts

apps/web/src/lib/
├── services/
│   ├── search.ts
│   └── search.test.ts
├── stores/
│   ├── search.svelte.ts
│   └── search.test.ts
├── workers/
│   ├── search.worker.ts
│   └── search.worker.test.ts
├── components/search/
│   ├── SearchModal.svelte
│   └── SearchModal.test.ts
└── config/
    └── help-content.ts
```

**Structure Decision**: Extend the current library-plus-web structure. `packages/search-engine` owns worker-side indexing primitives and tests. `apps/web/src/lib/services/search.ts` owns vault lifecycle orchestration, per-vault persistence, and cancellation. `apps/web/src/lib/stores/search.svelte.ts` exposes reactive status to UI consumers. `SearchModal.svelte` and help content provide visible status and retry affordances.

## Complexity Tracking

No constitution violations require justification.

## Phase 0 Research

See [research.md](./research.md). All planning unknowns are resolved without introducing new dependencies.

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/search-indexing.md](./contracts/search-indexing.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Library-First**: PASS. Contracts split worker primitives from app orchestration.
- **TDD**: PASS. Quickstart and contracts define testable success, cancellation, and failure paths.
- **Privacy & Client-Side Processing**: PASS. Saved snapshots are per-vault browser-local records.
- **Dependency Injection**: PASS. Service/store contracts allow injected worker, database, event bus, and search service test doubles.
- **User Documentation / Natural Language**: PASS. UI/help requirements are explicit.
