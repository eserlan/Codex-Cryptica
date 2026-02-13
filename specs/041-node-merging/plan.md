# Implementation Plan: Node Merging

**Branch**: `041-node-merging` | **Date**: 2026-02-13 | **Spec**: [specs/041-node-merging/spec.md](./spec.md)
**Input**: Feature specification from `specs/041-node-merging/spec.md`

## Summary

This feature enables users to merge multiple nodes (entities) into a single consolidated node. This addresses the problem of duplicate content, particularly after bulk imports. The system will leverage the configured AI provider to generate a cohesive description and metadata for the merged entity, while preserving all existing connections and updating references in the graph.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**:

- `svelte` (UI Framework)
- `cytoscape` (Graph visualization & selection)
- `@google/generative-ai` (AI Content Generation)
- `idb` (IndexedDB for metadata)
- `editor-core` (Markdown parsing/storage)
  **Storage**: OPFS (Primary content storage), IndexedDB (Metadata & Graph Cache)
  **Testing**: Vitest (Unit), Playwright (E2E)
  **Target Platform**: Browser (PWA capable)
  **Project Type**: Monorepo (Web App + Packages)
  **Performance Goals**: Merge operation should complete within < 5s (excluding network latency for AI).
  **Constraints**: Must handle large files gracefully. Must ensure data integrity (atomic operation where possible).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Local-First**: Does this respect local storage? Yes, all operations are on OPFS/IDB.
2. **AI-Assisted**: Does this use AI effectively? Yes, core value is AI summarization.
3. **Performance**: Is it performant? Yes, local file operations are fast.

## Project Structure

### Documentation (this feature)

```text
specs/041-node-merging/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── dialogs/
│   │   │       └── MergeNodesDialog.svelte  # New dialog for merge UI
│   │   └── services/
│   │       └── node-merge.service.ts        # Core logic for merging
│   └── routes/
│       └── +page.svelte                     # Updates to invoke merge
packages/editor-core/
├── src/
│   └── index.ts                             # Export relevant types/utils if needed
```

**Structure Decision**:

- `MergeNodesDialog.svelte`: Handles the UI for selecting the "target" node (if not obvious) and previewing the merged content.
- `node-merge.service.ts`: Encapsulates the logic:
  1. Fetch content of source nodes.
  2. Call AI to generate merged content.
  3. Update connections (re-link edges).
  4. Update back-links (find & replace in other files).
  5. Delete old files, write new file.
  6. Update index.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :-------- | :--------- | :----------------------------------- |
| N/A       |            |                                      |
