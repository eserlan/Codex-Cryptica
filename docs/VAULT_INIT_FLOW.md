# Vault Initialization & Tiered Storage Flow

This document describes the interaction between the `VaultStore`, `CacheService` (Dexie), and the `VaultRepository` (OPFS) during application startup, vault switching, and user interaction.

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
        P2_CS2 --> P2_SE{SearchEngine: index metadata+content+lore}:::search

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

    %% Interaction
    subgraph Interaction [Tiered Content Loading]
        direction TB
        I_UI[UI: selectNode id]:::ui --> I_VS1[VaultStore: loadEntityContent id]:::store

        I_VS1 --> I_Tier1[Tier 1: Dexie Cache]:::db
        I_Tier1 -.->|"content + lore"| I_VS2[Immediate UI update]:::store

        I_VS2 --> I_Tier2[Tier 2: OPFS file]:::fs
        I_Tier2 -.->|"chronicle + lore (verified)"| I_VS3[Verified update]:::store

        I_Tier2 --"Not found"--> I_Tier3[Tier 3: Local FS fallback]:::fs
        I_Tier3 -.->|"chronicle + lore"| I_VS3
    end
```

## Storage vs. Memory Strategy

A critical design goal of Codex Cryptica is to support massive vaults (1,000+ entities) with extensive GM lore while maintaining a low memory footprint and instant startup.

### 1. Persistent Storage (Disk)

- **OPFS (Origin Private File System)**: The source of truth. Data is stored as standard Markdown files on the user's hard drive.
- **Dexie (IndexedDB)**: A high-performance structured cache on the user's hard drive. It mirrors the OPFS data but splits it into metadata (`graphEntities`) and heavy text (`entityContent`).
- **RAM Impact**: Zero. 100MB of lore on disk uses 0MB of RAM while dormant.

### 2. Reactive Store (RAM)

- **VaultStore (Svelte 5 Runes)**: Holds the active state of the vault in JavaScript memory.
- **Initial Load**: Only **Metadata** (ID, Title, Type, Tags, Connections) is loaded into RAM. The `content` and `lore` fields for all entities are initialized as empty strings (`""`).
- **Lazy Loading**: Heavy text is only moved from **Disk (Dexie/OPFS)** to **RAM (VaultStore)** when a specific entity is "opened" or "queried". This ensures that even if a vault contains 1 million words, the browser only ever holds the few thousand words the user is currently reading.

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
  - If they match (**HIT**), no file read or parsing occurs.
  - If they don't match (**MISS**), the file is re-parsed, the Dexie cache is updated via an **atomic transaction** (updating both metadata and content tables), and the search engine is notified.
- **Quiet Mode**: On warm loads where no files have changed, this phase is completely silent and consumes minimal CPU/IO.

### Phase 3: Lazy Content Indexing

- **Background Indexing**: Since metadata-only loads skip file parsing, the full-text search index for `content` and `lore` is populated by streaming from the Dexie `entityContent` table in the background. It uses the `each()` cursor API to keep memory usage constant and avoid UI jank.

### User Interaction: Tiered Content Loading

When a user opens an entity (Detail Panel, Edit Mode, Read Modal) or the Lore Oracle needs context, `VaultStore.loadEntityContent(id)` is called:

1.  **Tier 1 (Dexie Cache)**: The system first checks the `entityContent` table in Dexie. If found, both **Content** and **Lore** are applied immediately to the UI.
2.  **Tier 2 (OPFS)**: In parallel, the app reads the source Markdown file from OPFS. This is the **Source of Truth** for the latest version of the data.
3.  **Tier 3 (Local FS Fallback)**: If the file is missing from OPFS (e.g. during an active sync), the app attempts to read directly from the user's linked local folder.
4.  **Sync**: Once the file is read, the Dexie cache is updated to match the disk state if they differ.

## Key Performance Design Decisions

1.  **Cache-First UI**: Graph visibility is decoupled from filesystem I/O latency.
2.  **In-Memory Search Index**: While Dexie persists the raw data, the **Search Engine (FlexSearch)** is currently purely in-memory (running in a Web Worker). This means it **must** be re-fed from Dexie on every app load to enable filtering and search.
3.  **Fast Metadata Warming**: To provide immediate searchability, Phase 1 performs a lightweight metadata-only index (Titles/Tags) in the background.
4.  **Differential Sync**: Phase 2 only processes actual filesystem changes, skipping redundant work for 99% of typical loads.
5.  **Table Splitting**: Metadata is separated from Content/Lore. The graph view only needs metadata, allowing the heavy text to stay on disk until needed.
6.  **Streaming Indexing**: Avoids `toArray()` when indexing the full vault to prevent JS heap spikes.
7.  **Timestamp Normalization**: `lastModified` is floored to integer milliseconds to ensure consistent cache hits across different browsers and storage engines.
8.  **Atomic Persistence**: Writes to metadata and content are wrapped in a single transaction to prevent "split-brain" states where a node exists but its content is missing.
