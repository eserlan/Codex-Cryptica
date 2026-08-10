# Implementation Plan: Delta-Based Mutations and Bulk Vault Operations

**Branch**: `2145-vault-bulk-mutations` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

## Summary

Replace whole-map mutation diffing and serial bulk writes with explicit deltas and batch APIs in the existing `EntityMutationService`, `EntityPersistenceService`, `EntityIndexMaintainer`, and vault facade. Preserve existing repository queues, OPFS durability/retry behavior, guest/demo guards, and vault-event contracts while adding batch-level result/error reporting.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes, SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: `@codex/vault-engine`, `schema`, existing OPFS/IndexedDB cache, `@codex/events`, `@codex/performance-observability`  
**Storage**: Local OPFS entity files, browser IndexedDB cache, in-memory `VaultRepository.entities`  
**Testing**: Vitest/Bun workspace tests, Svelte checks, repository lint  
**Target Platform**: Browser-local SvelteKit app with OPFS and IndexedDB  
**Project Type**: Local-first web application with reusable vault services  
**Performance Goals**: Single edits use explicit O(changed-entity) deltas; 100-entity batches avoid serial debounce waits and whole-map comparisons  
**Constraints**: Preserve durability, retries, active-vault safety, guest/demo restrictions, relationship consistency, and current public facade compatibility  
**Scale/Scope**: 1,600+ entities and large selections; scope limited to vault mutation, index, persistence, and affected event/test contracts

## Constitution Check

Passes Principles I, II, III, V, VI, VIII, and X: this is an app-facing mutation feature built on existing vault services, with tests for success and failure/cancellation paths, constructor DI retained, and local-first storage preserved. No new package is planned because the mutation behavior is app/vault-store specific; reusable storage primitives remain in `@codex/vault-engine`.

## Project Structure

```text
apps/web/src/lib/stores/vault/
├── entity-mutations.ts                 # delta and batch mutation orchestration
├── entity-persistence.ts               # coalesced saves and explicit flush
├── entity-index-maintainer.svelte.ts   # delta-aware secondary-index updates
├── entities.ts                          # pure entity/relationship mutation helpers
├── entity-store.svelte.ts               # DI facade delegation
└── *.test.ts                            # unit and regression coverage

apps/web/src/lib/stores/vault.svelte.ts # public vault facade methods
packages/vault-engine/src/repository.svelte.ts # existing save queue/durability boundary
packages/events/src/*                         # existing vault event contracts
```

**Structure Decision**: Keep the feature within the existing vault store/service decomposition. `EntityMutationService` owns mutation orchestration, pure helpers own deterministic state transforms, `EntityIndexMaintainer` receives explicit old/new entity deltas, and `EntityPersistenceService` owns debounced/coalesced durability. The top-level `VaultStore` only delegates the new public batch methods.

## Constitution Re-evaluation

The design retains DI, library-first boundaries, local-first storage, TDD coverage, and existing user-facing behavior. No constitution exception is required.

## Delivery Phases

1. Add delta-aware index-maintainer operations and tests; retain full rebuild for cache load/recovery.
2. Add coalesced explicit batch persistence and tests for debounce versus flush, partial failure, and vault switching.
3. Add pure batch type-change and relationship-aware delete helpers.
4. Add mutation-service orchestration and public `EntityStore`/`VaultStore` delegation.
5. Update table/bulk callers only where they currently loop over per-entity operations.
6. Run focused vault tests, Svelte autofixer for touched `.svelte.ts` files, workspace lint/type checks, and the affected web test suite.

## Complexity Tracking

No violations. Existing DI service boundaries are sufficient; introducing a new package or repository abstraction would add scope without improving this feature.
