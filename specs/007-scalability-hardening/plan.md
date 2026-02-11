# Plan: Scalability Hardening

## Overview

This feature implements persistent caching for the vault's file metadata to drastically reduce startup time and computational load. It also improves the perceived performance by streaming graph updates to the UI.

## Architecture

### 1. IndexedDB Cache Layer

We will utilize the existing `idb` utility to add a `vault_cache` store.

- **Store Name**: `vault_cache`
- **Key**: `path` (string)
- **Value**:
  ```typescript
  interface CachedFile {
    path: string;
    lastModified: number;
    entity: LocalEntity; // The parsed result
  }
  ```

### 2. Streaming Loader

The `VaultStore.loadFiles` method currently waits for a chunk of 20 to finish before moving on. We will modify this to update the Svelte `$state` incrementally, allowing the graph to grow visually as files are processed.

## Proposed Changes

### Frontend (`apps/web`)

- **`src/lib/utils/idb.ts`**: Update schema to include `vault_cache`.
- **`src/lib/stores/vault.svelte.ts`**:
  - Inject `idb` caching logic into the `loadFiles` loop.
  - Implement "Stale-While-Revalidate" or "Cache-First" strategy based on `lastModified`.
  - Trigger `this.entities = { ...this.entities, ...newChunk }` (or similar granular update) to animate progress.

## Risks

- **Cache Invalidation**: If the cache gets out of sync (e.g. file edited externally without `lastModified` update - rare but possible), user might see stale data. _Mitigation_: Add a "Rebuild Index" button in Settings.
