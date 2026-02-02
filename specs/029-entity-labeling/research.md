# Research: Entity Labeling System

**Feature**: 029-entity-labeling | **Date**: 2026-02-01

## Technical Decisions

### D001: Data Persistence Strategy
**Decision**: Store labels in the YAML frontmatter of entity markdown files under a `labels` key.
**Rationale**: Aligns with Constitution Law I (Human-readable, interoperable Markdown). Allows easy parsing and indexing without a separate database.
**Format**:
```yaml
---
title: Eldrin the Wise
type: npc
labels: [Villain, Session 1, Dead]
---
```

### D002: Indexing & Search
**Decision**: Extend `VaultStore` to maintain a project-wide index of labels in memory (from IndexedDB/Cache).
**Rationale**: Enables autocomplete and global label management (renaming/deletion) without scanning every file on every keystroke.

### D003: Graph Filtering Interface
**Decision**: Use Cytoscape.js selectors to hide/show nodes based on labels.
**Rationale**: Law III (Sub-100ms performance). Re-running layout is expensive; hiding/showing elements using `display: none` or CSS classes is nearly instantaneous.

### D004: Global Management Implementation
**Decision**: Renaming a label will trigger a batch update across all affected markdown files.
**Rationale**: Law VI (Pure Functional Core). The "batch update" will be a pure function taking a label mapping and returning the updated file contents.

## Alternatives Considered

### A001: Global `tags.json` file
**Rejected Because**: Risk of synchronization lag. Markdown frontmatter is the source of truth for all entity metadata in this project.

### A002: SQLite/WASM for Tagging
**Rejected Because**: Overkill for simple string tagging. IndexedDB + FlexSearch (already in use) is sufficient.
