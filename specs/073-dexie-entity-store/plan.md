# Implementation Plan: Dexie Entity Store

**Branch**: `073-dexie-entity-store` | **Date**: 2026-03-15 | **Spec**: [specs/073-dexie-entity-store/spec.md](./spec.md)
**Input**: Feature specification from `/specs/073-dexie-entity-store/spec.md`

## Summary

Replace the per-file `idb` `vault_cache` store with a structured Dexie database (`CodexEntityDb`) that separates graph metadata from heavy text fields, enabling lazy content loading and bulk warm-cache reads.

The plan introduces two Dexie tables (`graphEntities` for lightweight graph data, `entityContent` for heavy text), a `preloadVault()` bulk-read that replaces N per-file IDB transactions with a single table scan, and a `loadEntityContent(id)` API that populates `content`/`lore` on demand at exactly the right trigger points in the UI.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Dexie 4.3.0, Svelte 5 (Runes), SvelteKit 2  
**Storage**: OPFS (source of truth), Dexie IndexedDB (warm cache)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Web browser  
**Project Type**: `apps/web` monorepo workspace  
**Performance Goals**: 1 IDB table scan per vault load (was N per-file); content/lore deferred until entity opened.  
**Constraints**: OPFS is always the authoritative source; Dexie is a read-through cache only.  
**Scale/Scope**: Vaults with 100–1000 entities.

## Constitution Check

1. **Local-First Sovereignty**: PASS. Dexie is a browser-native IndexedDB wrapper; no network calls.
2. **Relational-First Navigation**: PASS. Graph nodes load faster; content is available when the user navigates to an entity.
3. **Sub-100ms Performance Mandate**: PASS. Warm-cache bulk read is the primary optimisation.
4. **Atomic Worldbuilding**: PASS. Dexie transactions ensure `graphEntities` + `entityContent` commit or rollback together.
5. **System-Agnostic Core**: PASS. No TTRPG-specific logic introduced.
6. **Pure Functional Core**: PASS. `CacheService` and `EntityDb` are pure classes with no UI coupling.
7. **Verifiable Reality**: PASS. Performance improvement is measurable via DevTools IDB profiling.
8. **Test-First PWA Integrity**: PASS. All 127 existing tests pass; offline functionality unaffected.

## Project Structure

### Documentation (this feature)

```text
specs/073-dexie-entity-store/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task checklist
```

### Source Code

```text
apps/web/
└── src/
    └── lib/
        ├── utils/
        │   └── entity-db.ts          # NEW: Dexie database class
        ├── services/
        │   └── cache.ts              # UPDATED: Dexie-backed CacheService
        ├── stores/
        │   └── vault.svelte.ts       # UPDATED: preloadVault, loadEntityContent, background indexer
        ├── hooks/
        │   └── useEditState.svelte.ts # UPDATED: VaultLike DI parameter
        ├── services/ai/
        │   └── context-retrieval.service.ts  # UPDATED: pre-load content before oracle context
        ├── components/modals/
        │   └── NodeReadModal.svelte   # UPDATED: load content on modal open
        └── routes/
            └── +page.svelte           # UPDATED: load content on node selection
```

## Complexity Tracking

| Violation              | Why Needed                              | Simpler Alternative Rejected Because                                                                                              |
| ---------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| New dependency (Dexie) | Structured IDB schema + transaction API | Raw `idb` lacks per-table bulk-cursor streaming (`each()`) and declarative compound-key indexes needed for the split-table design |

## Phase Design

### Phase 1: Database Layer

**Goal**: Introduce the Dexie schema without touching any existing code paths.

**Tasks**: Create `entity-db.ts`; verify Dexie imports correctly in the browser environment.

### Phase 2: Cache Layer Replacement

**Goal**: Replace per-file `idb vault_cache` lookups with the new Dexie-backed `CacheService`.

**Tasks**: Rewrite `cache.ts`; add `preloadVault`, `get`, `set`, `clearVault`, `invalidatePreload`.

### Phase 3: Vault Store Integration

**Goal**: Integrate the new cache into the vault load pipeline and expose `loadEntityContent`.

**Tasks**: Update `vault.svelte.ts` — call `preloadVault` before file scan, implement `loadEntityContent`, implement `indexContentInBackground`.

### Phase 4: Lazy-Load Triggers

**Goal**: Ensure content is loaded at all relevant entry-points in the UI.

**Tasks**: Update `+page.svelte`, `useEditState.svelte.ts`, `context-retrieval.service.ts`, `NodeReadModal.svelte`.

### Phase 5: Quality & Polish

**Goal**: Address review feedback — transactions, stale-snapshot fix, streaming indexer, DI parameter.

**Tasks**: Wrap `set()` and `clearVault()` in `transaction('rw', ...)`, fix stale entity snapshot in `loadEntityContent`, switch `indexContentInBackground` from `toArray()` to `each()`, add `VaultLike` DI to `createEditState`.
