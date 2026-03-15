# Feature Specification: Dexie Entity Store

**Feature Branch**: `073-dexie-entity-store`  
**Created**: 2026-03-15  
**Status**: Implemented  
**Input**: Issue #450 — "Introduce Dexie on top of idb — Then start to use it as the primary store for the graph db — This should improve perf significantly. Only load entity details when needed (Ie when the node is opened)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Fast Vault Startup (Priority: P1)

As a lore keeper with a large vault, I want the graph to appear quickly on repeated visits so that I can get back to world-building without waiting for files to re-parse.

**Why this priority**: Vault startup time is the first impression for returning users. Parsing hundreds of OPFS markdown files on every visit is the biggest single-page-load bottleneck.

**Independent Test**: Open the app with a 100+ entity vault that was previously loaded. Open DevTools → Network → IndexedDB. Verify that the graph appears before OPFS file reads complete and that the number of IDB transactions during load is proportional to changed files, not total files.

**Acceptance Scenarios**:

1. **Given** a vault with 100+ entities has been loaded at least once, **When** the user reopens the app, **Then** the graph nodes appear within 500ms (warm cache) without waiting for all OPFS files to be read again.
2. **Given** a vault with 100+ entities, **When** the app starts, **Then** the number of IndexedDB read transactions during load equals 1 (graph-entities table scan) rather than N (one per file).
3. **Given** only 3 of 100 entities have changed since last visit, **When** the vault loads, **Then** only those 3 files are re-parsed from OPFS; the remaining 97 are served from the Dexie cache.

---

### User Story 2 - Low Memory Usage on Startup (Priority: P1)

As a user on a mobile device or low-RAM laptop, I want the app to load the graph without consuming large amounts of memory for text content I haven't opened yet, so that the tab does not get killed by the OS.

**Why this priority**: `content` and `lore` fields can contain thousands of words per entity. Loading all of them upfront for a 500-entity vault can consume 50–200 MB of JS heap unnecessarily.

**Independent Test**: Load a large vault. Open Chrome DevTools → Memory → Heap Snapshot. Verify that `LocalEntity.content` values in memory are empty strings (`""`) for entities that have not been opened.

**Acceptance Scenarios**:

1. **Given** a vault with 100 entities, **When** the vault finishes loading, **Then** `vault.entities[id].content` is `""` for all entities not yet opened by the user.
2. **Given** the user opens an entity's detail panel, **When** the panel renders, **Then** `vault.entities[id].content` is populated with the full Markdown body within 200ms.

---

### User Story 3 - Full-Text Search Works on Warm Loads (Priority: P1)

As a user, I want the Oracle and the search bar to find entities by their content text even when the vault was loaded from the warm Dexie cache (not re-parsed), so that search quality is not degraded on subsequent visits.

**Why this priority**: The lazy-loading approach means entity content starts empty, which would break FlexSearch if the background re-indexing step is skipped.

**Independent Test**: Load a vault (warm cache). Type a keyword that appears only in the `content` body of an entity (not in the title or tags). Verify the entity appears in search results.

**Acceptance Scenarios**:

1. **Given** the vault has been loaded from cache and the background indexer has run, **When** the user searches for a keyword found only in an entity's body text, **Then** that entity appears in the search results.
2. **Given** an entity whose content was loaded from OPFS (cache miss), **When** the search index is built, **Then** the entity's content text is indexed without waiting for background indexing.

---

### User Story 4 - Content Available When Entity Is Opened (Priority: P1)

As a user, I want to read, edit, and query the full content and lore of an entity as soon as I open it, so that I never see blank panels or incomplete AI context.

**Why this priority**: Lazy loading is meaningless if the UX shows blank content. The trigger points (detail panel open, read modal, edit mode, oracle query) must seamlessly populate the data.

**Independent Test**: Load the app (warm cache), click a node, open the detail panel. Verify that `content` and `lore` are visible within one render tick (no blank flash).

**Acceptance Scenarios**:

1. **Given** a vault loaded from Dexie cache, **When** the user selects an entity node, **Then** the entity's `content` and `lore` fields are loaded from Dexie before the first render of the detail panel.
2. **Given** the Oracle is queried about a specific entity, **When** the context is assembled, **Then** the entity's `content` and `lore` are included in the prompt context.
3. **Given** the user opens the edit panel for an entity, **When** they see the editor, **Then** the editor's content area is pre-filled with the full Markdown text.
4. **Given** the user opens the read-mode modal, **When** the modal renders, **Then** the rendered Markdown body is visible (not blank).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST use a Dexie database (`CodexEntityDb`) as the primary warm-cache store for vault entity graph metadata.
- **FR-002**: The Dexie schema MUST split entity data into two tables: `graphEntities` (all fields except `content`/`lore`) and `entityContent` (`content` + `lore` only).
- **FR-003**: On vault load, the system MUST perform a single bulk read of `graphEntities` for the active vault before iterating OPFS files (replacing N per-file IDB reads).
- **FR-004**: `vault.entities` MUST hold entities with `content = ""` after a warm-cache load; `content`/`lore` are populated lazily.
- **FR-005**: `vault.loadEntityContent(id)` MUST populate `vault.entities[id].content` and `vault.entities[id].lore` by reading the `entityContent` Dexie table.
- **FR-006**: `loadEntityContent` MUST be called automatically when an entity is selected, the edit panel is opened, the read-mode modal is opened, or the Oracle assembles context.
- **FR-007**: The background search indexer MUST use Dexie's `each()` cursor API (not `toArray()`) to stream `entityContent` records without materialising the full table.
- **FR-008**: Writes to `graphEntities` and `entityContent` MUST be wrapped in a Dexie `transaction('rw', ...)` to ensure atomicity.
- **FR-009**: `loadEntityContent` MUST NOT mark an entity as loaded if the Dexie read fails with a transient error, allowing the next invocation to retry.
- **FR-010**: `useEditState.createEditState` MUST accept an optional `VaultLike` parameter for dependency injection to improve testability.

### Key Entities

- **`EntityDb`** (`apps/web/src/lib/utils/entity-db.ts`): Dexie database class with `graphEntities` and `entityContent` tables.
- **`GraphEntityRecord`**: Row type for `graphEntities` — entity graph fields plus `vaultId`, `lastModified`, `filePath`.
- **`EntityContentRecord`**: Row type for `entityContent` — `entityId`, `vaultId`, `content`, `lore`.
- **`CacheService`** (`apps/web/src/lib/services/cache.ts`): Wraps Dexie; provides `preloadVault`, `get`, `set`, `clearVault`, `invalidatePreload`.
- **`VaultStore.loadEntityContent`** (`apps/web/src/lib/stores/vault.svelte.ts`): Public method for on-demand content loading.
- **`VaultStore.indexContentInBackground`** (private): Streams `entityContent` via `each()` and re-indexes in FlexSearch.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Warm vault load (100+ entities) performs exactly 1 Dexie `graphEntities` table scan instead of N per-file reads.
- **SC-002**: `vault.entities` heap usage is ≤10% of total entity content size after initial graph render.
- **SC-003**: Full-text search returns body-text matches within 2 seconds of warm-cache vault load completion.
- **SC-004**: Entity content is visible in the detail panel within 200ms of node selection (warm cache).
- **SC-005**: All 127 existing unit tests pass without modification.
- **SC-006**: `svelte-check` reports 0 errors.
