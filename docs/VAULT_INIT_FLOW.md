# Vault Initialization & Cache Flow

This document describes the interaction between the `VaultStore`, `CacheService` (Dexie), and the `VaultRepository` (OPFS) during the application startup and vault switching.

## High-Level Sequence

```mermaid
sequenceDiagram
    participant UI as Layout/UI
    participant VS as VaultStore
    participant CS as CacheService (Dexie)
    participant VR as VaultRepository (OPFS)
    participant SE as SearchEngine

    UI->>VS: init()
    VS->>VS: loadFiles()

    rect rgb(240, 240, 240)
    Note over VS,CS: Phase 1: Cache-First Render (Warm)
    VS->>CS: preloadVault(vaultId)
    CS->>CS: Scan Dexie 'graphEntities' table
    CS-->>VS: In-memory Metadata Map populated
    VS->>VS: repository.entities = cachedMetadata
    Note right of VS: UI renders Graph immediately
    VS->>SE: index(metadata)
    Note right of SE: Search works for Titles/Tags
    end

    alt skipSyncIfWarm is false (or cache was empty)
    rect rgb(220, 240, 220)
    Note over VS,VR: Phase 2: Optimized FS Sync (Background)
    VS->>VS: getActiveVaultHandle()
    VS->>VR: loadFiles(vaultId, handle)
    loop For each file in OPFS
        VR->>CS: getCachedEntity(path)
        CS-->>VR: cached metadata + lastModified
        alt Cache HIT (lastModified matches)
            VR->>VR: Use metadata from cache (No parsing)
        else Cache MISS
            VR->>VR: Read & Parse OPFS file
            VR->>CS: setCachedEntity(metadata + content)
            CS->>CS: Save to Dexie (Atomic Transaction)
            VR->>VS: onProgress(newOrChanged)
            VS->>SE: index(metadata + content)
        end
    end
    end
    else skipSyncIfWarm is true (Fast Boot)
    Note over VS: Skip Phase 2 entirely for zero-FS-read startup.
    end

    rect rgb(240, 240, 200)
    Note over VS,SE: Phase 3: Lazy Content Indexing
    VS->>VS: indexContentInBackground()
    loop For each record in Dexie 'entityContent'
        VS->>SE: index(id, content) [Streaming]
    end

    UI->>VS: selectNode(id)
    VS->>VS: loadEntityContent(id)
    VS->>CS: Get content from Dexie 'entityContent'
    CS-->>VS: content + lore
    VS->>VS: Reactive update of entity in memory
    end
```

## Detailed Breakdown

### Phase 1: Cache-First Render

- **Trigger**: `VaultStore.loadFiles()`
- **Action**: `CacheService.preloadVault()` performs a **single bulk read** from the `graphEntities` table in Dexie.
- **Optimization**: The UI is populated with cached metadata **before** the app even requests the OPFS directory handle or starts scanning files. This makes the initial graph appearance near-instant (~50ms for 300+ entities).
- **Search**: Title and Tag indexing happens immediately so the user can filter the graph while the filesystem syncs in the background.

### Phase 2: Optimized File System Synchronization

- **Trigger**: `VaultRepository.loadFiles()` (after `getActiveVaultHandle()`)
- **Background Sync**: This phase ensures the cache is consistent with the actual files on disk.
- **Cache Check**: For each file, it compares the OPFS `lastModified` timestamp with the preloaded cache entry.
- **Differential Update**:
  - If they match (**HIT**), no file read or parsing occurs, and the search engine is **not** notified (avoiding redundant async indexing).
  - If they don't match (**MISS**), the file is re-parsed, the Dexie cache is updated via an **atomic transaction**, and only then is the search engine notified of the change.
- **Quiet Mode**: On warm loads where no files have changed, this phase is completely silent and consumes minimal CPU/IO.

### Phase 3: Lazy Content Loading & Background Indexing

- **Background Indexing**: Since metadata-only loads skip file parsing, the full-text search index for `content` is populated by streaming from the Dexie `entityContent` table in the background. It uses the `each()` cursor API to keep memory usage constant.
- **On-Demand Content**: When a user opens an entity (Detail Panel, Edit Mode, Read Modal), `VaultStore.loadEntityContent(id)` is called.
- **Dexie Fetch**: It retrieves the heavy `content` and `lore` fields from the dedicated Dexie table and merges them into the reactive Svelte state.

## Key Performance Design Decisions

1.  **Cache-First UI**: Graph visibility is decoupled from filesystem I/O latency.
2.  **Differential Sync**: Phase 2 only processes actual filesystem changes, skipping redundant work for 99% of typical loads.
3.  **Table Splitting**: Metadata is separated from Content/Lore. The graph view only needs metadata, allowing the heavy text to stay on disk until needed.
4.  **Streaming Indexing**: Avoids `toArray()` when indexing the full vault to prevent JS heap spikes.
5.  **Timestamp Normalization**: `lastModified` is floored to integer milliseconds to ensure consistent cache hits across different browsers and storage engines.
