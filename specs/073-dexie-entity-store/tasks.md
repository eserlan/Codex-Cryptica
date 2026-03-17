---
description: "Task list for Dexie Entity Store implementation"
---

# Tasks: Dexie Entity Store

**Input**: Design documents from `/specs/073-dexie-entity-store/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by phase. Phases 1–4 implement the core feature; Phase 5 addresses review feedback.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

---

## Phase 1: Database Layer (Shared Infrastructure)

**Purpose**: Introduce the Dexie schema without touching existing code paths.

- [x] T001 Add `dexie@4.3.0` to `apps/web/package.json` via `npm install`
- [x] T002 Create `apps/web/src/lib/utils/entity-db.ts` with `EntityDb` (Dexie subclass), `GraphEntityRecord`, `EntityContentRecord` types, and `entityDb` singleton
- [x] T003 Define `graphEntities` table: compound primary key `[vaultId+id]`, secondary indexes `vaultId` and `[vaultId+filePath]`
- [x] T004 Define `entityContent` table: compound primary key `[vaultId+entityId]`, secondary index `vaultId`

**Checkpoint**: `entity-db.ts` imports cleanly; no TypeScript errors.

---

## Phase 2: Cache Layer Replacement (Blocking Prerequisites)

**Purpose**: Replace per-file `idb vault_cache` lookups with Dexie.

- [x] T005 [P] Rewrite `apps/web/src/lib/services/cache.ts` — remove `idb` imports, add Dexie-backed `get()`, `set()`, `clearVault()`, `invalidatePreload()`
- [x] T006 [P] Implement `preloadVault(vaultId)` in `CacheService` — single `graphEntities` table scan into in-memory Map (do NOT preload `entityContent`)
- [x] T007 Wrap `set()` in `entityDb.transaction('rw', [graphEntities, entityContent], ...)` for atomic writes (FR-008)
- [x] T008 Wrap `clearVault()` in `entityDb.transaction('rw', ...)` for atomic deletes

**Checkpoint**: `cache.ts` passes TypeScript check; `cacheService.get/set` integrate with `fileIOAdapter` via `adapters.ts`.

---

## Phase 3: Vault Store Integration

**Purpose**: Integrate the new cache into the vault load pipeline and expose `loadEntityContent`.

- [x] T009 [US1] Call `cacheService.preloadVault(vaultId)` in `VaultStore.loadFiles()` before `repository.loadFiles()` to warm the in-memory cache
- [x] T010 [US1] Track cache-miss entities in `_contentLoadedIds` set — entities from OPFS (cache miss) have content populated; Dexie hits do not
- [x] T011 [US2] Implement `VaultStore.loadEntityContent(id)` — reads `entityContent` table, merges `content`/`lore` onto the current (fresh) entity reference (FR-005, FR-009)
- [x] T012 [US2] Fix stale entity snapshot in `loadEntityContent` — re-read `this.entities[id]` after the Dexie round-trip, not before (review feedback)
- [x] T013 [US2] Only add to `_contentLoadedIds` on definitive result (record found OR record is null); do NOT mark on transient Dexie error (review feedback, FR-009)
- [x] T014 [US3] Implement `VaultStore.indexContentInBackground()` — uses Dexie `each()` cursor (not `toArray()`) to stream `entityContent` and re-index in FlexSearch without materialising the full table (FR-007, review feedback)

**Checkpoint**: Vault loads correctly on warm cache; search returns body-text matches.

---

## Phase 4: Lazy-Load Triggers

**Purpose**: Ensure content is loaded at all relevant UI entry-points (FR-006).

- [x] T015 [P] [US4] Add `$effect` in `apps/web/src/routes/+page.svelte` — call `vault.loadEntityContent(id)` when `vault.selectedEntityId` changes
- [x] T016 [P] [US4] Update `apps/web/src/lib/hooks/useEditState.svelte.ts` — call `loadEntityContent` in `start()` and refresh `editContent`/`editLore` after load; add stale-entity guard (FR-010)
- [x] T017 [P] [US4] Update `apps/web/src/lib/services/ai/context-retrieval.service.ts` — batch `loadEntityContent` for all oracle candidate IDs (active entity, search results, connections) before building context
- [x] T018 [P] [US4] Add `$effect` in `apps/web/src/lib/components/modals/NodeReadModal.svelte` — call `vault.loadEntityContent(id)` when `ui.readModeNodeId` changes

**Checkpoint**: Opening a node, read modal, or sending an Oracle query all produce populated content.

---

## Phase 5: Quality & Review Feedback

**Purpose**: Address automated code review findings.

- [x] T019 [P] `cache.ts` — remove bulk `entityContent` preload; keep only `graphEntities` scan to preserve lazy-loading goal (review feedback)
- [x] T020 [P] `useEditState.svelte.ts` — extract `VaultLike` interface; accept optional `vaultInstance: VaultLike = defaultVault` DI parameter (review feedback, FR-010)
- [x] T021 Verify all 127 unit tests pass (`npm test --workspace=apps/web`)
- [x] T022 Verify `svelte-check` reports 0 errors

---

## Phase 6: Speckit Documentation

**Purpose**: Document the feature for future reference.

- [x] T023 Create `specs/073-dexie-entity-store/spec.md` with user stories, requirements, success criteria
- [x] T024 Create `specs/073-dexie-entity-store/plan.md` with technical context, constitution check, phase design
- [x] T025 Create `specs/073-dexie-entity-store/tasks.md` (this file)

---

## Dependencies & Execution Order

| Phase                 | Depends on |
| --------------------- | ---------- |
| Phase 1 (DB layer)    | —          |
| Phase 2 (Cache layer) | Phase 1    |
| Phase 3 (Vault store) | Phase 2    |
| Phase 4 (Triggers)    | Phase 3    |
| Phase 5 (Quality)     | Phase 4    |
| Phase 6 (Docs)        | Phase 5    |

---

## Files Changed

| File                                                        | Status      | Description                                               |
| ----------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `apps/web/src/lib/utils/entity-db.ts`                       | **NEW**     | Dexie database class and types                            |
| `apps/web/src/lib/services/cache.ts`                        | **UPDATED** | Dexie-backed CacheService                                 |
| `apps/web/src/lib/stores/vault.svelte.ts`                   | **UPDATED** | preloadVault, loadEntityContent, indexContentInBackground |
| `apps/web/src/lib/hooks/useEditState.svelte.ts`             | **UPDATED** | VaultLike DI parameter                                    |
| `apps/web/src/lib/services/ai/context-retrieval.service.ts` | **UPDATED** | Pre-load content for oracle candidates                    |
| `apps/web/src/lib/components/modals/NodeReadModal.svelte`   | **UPDATED** | Load content on modal open                                |
| `apps/web/src/routes/+page.svelte`                          | **UPDATED** | Load content on node selection                            |
| `apps/web/package.json`                                     | **UPDATED** | Added `dexie@^4.3.0`                                      |
