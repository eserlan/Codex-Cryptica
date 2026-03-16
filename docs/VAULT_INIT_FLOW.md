# Vault Initialization & Cache Flow

This document describes the interaction between the `VaultStore`, `CacheService` (Dexie), and the `VaultRepository` (OPFS) during the application startup and vault switching.

## High-Level Sequence

```mermaid
flowchart TD
    %% Styling Classes
    classDef ui fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef store fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef db fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef fs fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    classDef search fill:#fce4ec,stroke:#c2185b,stroke-width:2px;
    classDef cond fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;

    %% Phase 1
    subgraph Phase1 [Phase 1: Cache-First Render Warm]
        direction TB
        P1_UI[UI: init]:::ui --> P1_VS1[VaultStore: loadFiles]:::store
        P1_VS1 --> P1_CS1[(CacheService: Scan 'graphEntities')]:::db
        P1_CS1 -.->|"In-memory Metadata Map"| P1_VS2[VaultStore: Render Graph]:::store
        P1_VS2 --> P1_SE{SearchEngine: Index metadata Background}:::search
    end

    %% Sync Condition
    P1_SE --> Cond{skipSyncIfWarm?}:::cond

    Cond -->|"Yes (Fast Boot)"| SkipSync[Skip Phase 2 entirely]
    Cond -->|"No (false or empty)"| P2_VS1

    %% Phase 2
    subgraph Phase2 [Phase 2: Optimized FS Sync Background]
        direction TB
        P2_VS1[VaultStore: getActiveVaultHandle]:::store --> P2_VR1([VaultRepository: loadFiles]):::fs
        P2_VR1 --> P2_Loop[For each OPFS file]
        P2_Loop --> P2_CS1[(CacheService: getCachedEntity)]:::db
        P2_CS1 --> P2_Cond{Cache Match?}:::cond

        P2_Cond -->|"HIT"| P2_Hit[Use metadata from cache No parsing]:::store
        P2_Cond -->|"MISS"| P2_Miss([Read & Parse OPFS file]):::fs

        P2_Miss --> P2_CS2[(CacheService: setCachedEntity)]:::db
        P2_CS2 --> P2_SE{SearchEngine: index metadata+content}:::search

        P2_Hit --> P2_Next[Next file]
        P2_SE --> P2_Next
    end

    SkipSync --> Phase3
    P2_Next --> Phase3

    %% Phase 3
    subgraph Phase3 [Phase 3: Lazy Content Indexing]
        direction TB
        P3_VS[VaultStore: indexContentInBackground]:::store --> P3_SE{SearchEngine: Streaming Index}:::search
    end

    %% User Interaction
    subgraph Interaction [Lazy Content Loading]
        direction TB
        I_UI[UI: selectNode id]:::ui --> I_VS1[VaultStore: loadEntityContent id]:::store
        I_VS1 --> I_CS[(CacheService: Get 'entityContent')]:::db
        I_CS -.->|"content + lore"| I_VS2[VaultStore: Reactive update]:::store
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
2.  **In-Memory Search Index**: While Dexie persists the raw data, the **Search Engine (FlexSearch)** is currently purely in-memory (running in a Web Worker). This means it **must** be re-fed from Dexie on every app load to enable filtering and search.
3.  **Fast Metadata Warming**: To provide immediate searchability, Phase 1 performs a lightweight metadata-only index (Titles/Tags) in the background.
4.  **Differential Sync**: Phase 2 only processes actual filesystem changes, skipping redundant work for 99% of typical loads.
5.  **Table Splitting**: Metadata is separated from Content/Lore. The graph view only needs metadata, allowing the heavy text to stay on disk until needed.
6.  **Streaming Indexing**: Avoids `toArray()` when indexing the full vault to prevent JS heap spikes.
7.  **Timestamp Normalization**: `lastModified` is floored to integer milliseconds to ensure consistent cache hits across different browsers and storage engines.
