# ADR 014: Entity Store Hot-Path Optimizations

## Context and Problem Statement

As Codex Cryptica vaults scale to thousands of entities and relationship links, the performance of common "hot-path" operations in the `EntityStore` and cache subsystem becomes a primary factor in application responsiveness. We identified several $O(N)$ scaling bottlenecks and expensive redundant computations:

1. **Sequential DB Preload Cache Writing:** During startup or vault switches, the repository preloads metadata by parsing markdown files. When there was a cache miss, each entity was written to IndexedDB (Dexie) sequentially, resulting in hundreds or thousands of separate database write transactions.
2. **Redundant Multi-Pass Label Computations:** The `labelIndex` and `labelCounts` reactive values were computed in separate, independent traversals over all entities.
3. **Substring Search for Subject Detection:** During AI context retrieval and "Available Records" generation, detecting explicit subjects required scanning, collecting, and sorting all entities and aliases, resulting in $O(N \log N)$ compute cycles even when an early match was possible.
4. **Reactive Full-Map Rebuilds:** The `inboundConnections` map was computed dynamically as a Svelte 5 `$derived` block. On _any_ entity save or synchronization update, Svelte's reactive graph triggered a complete reconstruction of the inbound connection map ($O(N)$), even if the entity's connections remained unchanged.
5. **Full-Vault Traversal on Deletion:** When deleting an entity, the store scanned _every_ entity in the entire vault to prune connections and parent-child links that referenced the deleted node.

We needed a unified, highly optimized architecture to eliminate these scaling limitations and achieve fluid, local-first performance.

## Decision Drivers

- **Responsiveness & UX:** Boot time, save latency, and deletion times must feel instantaneous, even in extremely large vaults (e.g., 5000+ entities).
- **Efficiency:** Minimize CPU overhead and redundant database transactions.
- **Maintainability:** Ensure backward compatibility and clean Svelte 5 Runes design.

## Considered Options

- **Option 1: Rely on Dexie/Svelte defaults (Status Quo)** - Simple but suffers from severe latency under load due to sequential I/O and full-store reactive updates.
- **Option 2: Progressive Hot-Path Optimizations** - Apply bulk caching, single-pass derivations, flat sorted indexing, and surgical delta connection patching.

## Decision Outcome

Chosen option: **Option 2: Progressive Hot-Path Optimizations**.

We systematically resolved each bottleneck with targeted, high-performance architectural improvements:

### Implementation Details:

1. **Dexie Bulk Caching (`bulkSet`):**
   - Introduced a `bulkSet` method in `CacheService` to batch IndexedDB operations.
   - Updated `IFileIOAdapter` with an optional `setCachedEntitiesBulk` method, which is called after each chunk of files is parsed, grouping up to 40 entities into a single, high-speed transaction.
2. **Consolidated Single-Pass Labeling (`labelData`):**
   - Merged the calculation of `labelIndex` and `labelCounts` into a single, cohesive `$derived` block (`labelData`), scanning the active entities list only once.
3. **Length-Sorted Flat Search Index (`titleAndAliasIndex`):**
   - Built a lightweight, pre-sorted (by length descending) flat array containing all entity titles and aliases.
   - Optimized AI context subject matching to perform early exit checks against this index, returning immediately on the first exact match instead of collecting and sorting all matches.
4. **State-Managed Inbound Connections Map (`inboundConnections`):**
   - Converted `inboundConnections` from a reactive `$derived` property to a manual `$state` property.
   - Initialized it fully during bulk events (`CACHE_LOADED`, `SYNC_COMPLETE`, `VAULT_SWITCHED`) and wired surgical $O(1)$ delta patching callbacks (`onConnectionAdded`, `onConnectionRemoved`, `onConnectionUpdated`) into the mutation service.
5. **Surgical Deletion with Inbound and Parent Mappings:**
   - Introduced a derived `parentToChildren` map inside `EntityStore`.
   - Updated the `deleteEntity` algorithm to accept `inboundConnections` and `childrenIds`. By taking the union of inbound connection source IDs and children IDs, we surgically locate only the affected entities to clean up their linkages, turning an $O(N)$ search into an $O(1)$ lookup.

## Consequences

### Positive

- **Start-up Speed:** Writing parsed entities to the Dexie cache in bulk reduces database commit overhead, dramatically accelerating cold boots.
- **Instantaneous Deletion:** Pruning relationships on deletion is now restricted solely to nodes with active linkages, avoiding global vault scans.
- **Minimal Save Latency:** Editing markdown content or metadata no longer triggers full inbound connection map rebuilds.
- **Highly Accurate AI Context Retrieval:** Sorting titles/aliases by length descending ensures that compound entities (e.g., "The Grand Temple") are matched before their sub-phrases (e.g., "Temple"), while early exits reduce search times.

### Negative

- **Slight Memory Footprint:** Maintaining a flat `titleAndAliasIndex` and a `parentToChildren` map uses a small amount of extra client-side memory, which is negligible compared to the rendering savings.
