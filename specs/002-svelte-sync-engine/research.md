# Phase 0: Research & Key Decisions

## 1. Svelte Version

- **Context**: Spec mentioned Svelte 4 or 5.
- **Finding**: `apps/web/package.json` confirms `"svelte": "^5.45.6"`.
- **Decision**: Use **Svelte 5 Runes** (`$state`, `$derived`, `$effect`) for all store logic. This aligns with the "fine-grained reactivity" goal.

## 2. Persistence Strategy (OPFS-First)

- **Context**: The Constitution mandates local-first storage and interoperability.
- **Initial Approach**: The File System Access API (FSA) was chosen as the primary source of truth to allow users to directly edit their Markdown files.
- **Problem**: FSA handles on mobile devices (Chrome on Android) suffer from silent permission revocation, leading to `NoModificationAllowedError` and a highly unreliable user experience.
- **Decision**: **Hybrid OPFS-First Architecture**.
  - **Primary Storage**: The **Origin Private File System (OPFS)** is now the main storage for the vault's "working memory". It is fast, reliable, and does not require persistent permission prompts.
  - **User-Directed Export**: The **File System Access API (FSA)** is now used for a "Sync to Local Folder" feature. This allows users to create a durable, user-accessible backup of their vault, satisfying the "interoperability" requirement.
  - **Why this is better**: This approach provides the reliability needed for a good mobile experience while still giving users full control and ownership of their data via the export feature.

## 3. External File Watching

- **Challenge**: Neither OPFS nor FSA provide a reliable, native "file watching" mechanism to detect changes made by external applications.
- **Decision**:
  1.  The application will only be responsible for changes made within its own UI.
  2.  The "Sync to Local Folder" feature is a one-way export from OPFS to the local disk. Future work may explore a bi-directional sync, but it is not in the current scope.

## 4. Graph Data Structure

- **Requirement**: "The Graph Derived Store... automatically transforms Vault data into Cytoscape-ready JSON".
- **Decision**: Use a dedicated `GraphEngine` class (in `packages/graph-engine`) that accepts `Entity[]` and returns `{ nodes, edges }`. This keeps the transformation pure (Constitution Article VI).
