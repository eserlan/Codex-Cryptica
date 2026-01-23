# Phase 0: Research & Key Decisions

## 1. Svelte Version
*   **Context**: Spec mentioned Svelte 4 or 5.
*   **Finding**: `apps/web/package.json` confirms `"svelte": "^5.45.6"`.
*   **Decision**: Use **Svelte 5 Runes** (`$state`, `$derived`, `$effect`) for all store logic. This aligns with the "fine-grained reactivity" goal.

## 2. Persistence Strategy (RxDB vs. Native FS)
*   **Context**: Spec mentions "RxDB + OPFS" but also "The Vault Store" and "File System Access API". The Constitution mandates "interoperability with other tools (e.g., Obsidian)".
*   **Constraint**: OPFS (Origin Private File System) is sandboxed and invisible to the user's OS file explorer (without special export steps). The File System Access API allows direct read/write to a user-selected folder.
*   **Conflict**: RxDB typically uses IndexedDB or OPFS (via SQLite/dedicated workers) for its storage. It doesn't natively sync to a tree of Markdown files in a user's folder.
*   **Decision**: **Hybrid Approach**.
    *   **Source of Truth**: The Local File System (accessed via File System Access API handle). This satisfies "interoperability".
    *   **In-Memory "Hot" State**: The `Vault Store` (Svelte Map/Array).
    *   **Why drop RxDB (for this scope)?**: Syncing RxDB <-> Markdown Files bi-directionally is complex and might be overkill for the initial "Sync Loop". The goal is "Markdown <-> Graph".
    *   **Revised Plan**: Implement the `Vault Store` as a custom class backed by the File System Access API. We will *not* use RxDB for this specific feature unless strictly necessary for query performance (which for <1000 files might not be needed yet). *Correction*: Check if RxDB is already installed/used. (It is in `package.json`).
    *   **Refinement**: If RxDB is already there, we might use it as the *index* (cache) for the Markdown files to enable fast graph queries, but the *files* themselves are the master record.
    *   **Final Decision for this Spec**: Focus on the **Svelte Store -> File System** link. The "Vault" *is* the in-memory representation. We will defer complex indexing.

## 3. File System Access API & "The File Watcher"
*   **Challenge**: The Web File System Access API does *not* natively support "watching" a directory for changes made by *other* apps (unless using specific browser flags or polling).
*   **Workaround**: We can only reliably detect changes made *within* our app. For external changes, we might need a "Rescan/Reload" button or a polling mechanism (carefully managed).
*   **Decision**: 
    1.  Primary Loop: App Edit -> Store Update -> File Write (Debounced).
    2.  External Edit: Manual "Reload Vault" or simple polling (every 30s?) if active. *Note*: Implementing robust "File Watching" from the browser is non-trivial. We will start with "App-driven updates" and "Load on Startup".

## 4. Graph Data Structure
*   **Requirement**: "The Graph Derived Store... automatically transforms Vault data into Cytoscape-ready JSON".
*   **Decision**: Use a dedicated `GraphEngine` class (in `packages/graph-engine`) that accepts `Entity[]` and returns `{ nodes, edges }`. This keeps the transformation pure (Constitution Article VI).
