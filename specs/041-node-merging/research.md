# Research: Node Merging

**Feature Branch**: `041-node-merging`
**Status**: Complete

## Overview

This research phase confirms the technical approach for implementing node merging, focusing on the AI generation strategy and data integrity (connection preservation).

## Key Decisions

### 1. Merging Strategy: AI + Manual Fallback

**Decision**: The merge operation will primarily use Google's Gemini API to generate a consolidated summary of the node content. In case of API failure or user choice, a manual fallback (concatenation) will be available.

**Rationale**:

- **Consistency**: AI can rewrite multiple disparate descriptions into a coherent narrative.
- **Efficiency**: Users often import multiple files with slightly different wording; manual editing is tedious.
- **Fallback**: Concatenation is reliable and works offline.

### 2. Connection Handling: Graph Traversal

**Decision**: Before deletion, the system will identify all incoming and outgoing connections from the source nodes and re-map them to the target node. This will involve:

1.  Querying the graph store (Cytoscape/IDB) for edges connected to source nodes.
2.  Creating new edges with the same properties pointing to the target node.
3.  Deleting old edges.

**Rationale**:

- Ensures the knowledge graph structure is preserved.
- Prevents orphaned connections.

### 3. Backlink Updates: Regex Replacement

**Decision**: For internal links (wikilinks `[[...]]`) in other files, the system will perform a find-and-replace operation across the vault (or indexed referencing files if available).

**Rationale**:

- Maintaining link integrity is crucial for navigation.
- Simple regex replacement is performant for reasonable vault sizes.
- **Risk**: Global find-and-replace can be slow on very large vaults.
  - **Mitigation**: Use the existing `backlinks` index (if available) to target only relevant files. If not, scan all markdown files (fallback). _Current implementation suggests using `FlexSearch` or existing indices._

### 4. Storage Atomicity

**Decision**: Use `OPFS` for file operations. While full database-like transactions aren't supported natively for multi-file edits in OPFS, we will attempt to sequence operations to minimize risk:

1.  Write new merged file.
2.  Update referencing files.
3.  Delete old files.
    If step 2 fails, the user still has the new file and old files (duplicate state is better than data loss).

**Alternatives Considered**:

- **Database Transaction**: Not feasible with file-based storage.
- **Git-like Versioning**: Too complex for this feature.

## Open Questions Resolved

- **Q: How to handle conflicting frontmatter?**
  - **A**: The AI will be prompted to merge frontmatter logically (e.g., combine tags, pick most recent date). User can edit before saving.
- **Q: What if the target node already exists?**
  - **A**: The merge operation effectively _updates_ one node (target) and _deletes_ others. The target node's ID is preserved.
