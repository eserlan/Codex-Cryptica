# Implementation Plan: Node Merging

**Branch**: `041-node-merging` | **Date**: 2026-02-13 | **Spec**: [specs/041-node-merging/spec.md](./spec.md)
**Input**: Feature specification from `specs/041-node-merging/spec.md`

## Summary

This feature enables users to merge multiple nodes (entities) into a single consolidated node. The system will leverage the configured AI provider to generate a cohesive description and metadata for the merged entity, preserving connections and updating references.

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

1. **Library-First**: The core logic for content manipulation (merging strings, frontmatter conflict resolution) will reside in `packages/editor-core`. The orchestration (AI calls, file IO) will be in the web app service.
2. **TDD**: Tests will be written for `editor-core` logic first.
3. **Simplicity**: Using standard string manipulation and existing AI SDK.
4. **AI-First Extraction**: Utilizing Gemini for intelligent merging.
5. **Privacy**: All processing happens client-side (OPFS) except for the AI generation call (if using cloud).
6. **Clean Implementation**: Following Svelte 5 runes and strict typing.
7. **User Documentation**: Will add a help article on merging nodes.

## Project Structure

### Documentation (this feature)

```text
specs/041-node-merging/
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # Data structures for merge operation
├── contracts/           # API definitions
│   └── api.ts           # Service interface
└── quickstart.md        # Usage guide
```

### Source Code (repository root)

```text
apps/web/src/lib/services/
└── node-merge.service.ts        # Orchestrator (UI -> AI -> Core -> Storage)

apps/web/src/lib/components/dialogs/
└── MergeNodesDialog.svelte      # UI for selection/preview

apps/web/src/lib/config/
└── help-content.ts              # Help articles and feature hints

packages/editor-core/src/operations/
└── merge-utils.ts               # Pure functions for merging frontmatter/content
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
- `merge-utils.ts`: Pure logic for merging frontmatter (handling conflicts) and concatenating body text.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :-------- | :--------- | :----------------------------------- |
| N/A       |            |                                      |
