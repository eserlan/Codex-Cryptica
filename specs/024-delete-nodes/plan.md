# Implementation Plan: Delete Nodes and Entities

**Branch**: `024-delete-nodes` | **Date**: 2026-01-31 | **Spec**: [specs/024-delete-nodes/spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-delete-nodes/spec.md`

## Summary

Implement a safe, relational-aware mechanism to delete lore entities from the vault. This involves UI triggers in the detail panel, atomic removal from the file system and search index, and a proactive cleanup of all connections in other entities to maintain graph integrity.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Svelte 5, Cytoscape.js, FlexSearch, `editor-core`
**Storage**: OPFS / Local Directory (Markdown files with YAML frontmatter)
**Testing**: Vitest (Unit/Integration), Playwright (E2E)
**Target Platform**: PWA (Web)
**Project Type**: Monorepo (Web App + Packages)
**Performance Goals**: UI feedback for deletion under 100ms; full cleanup under 500ms (per SC-001 in spec.md).
**Constraints**: Must adhere to Local-First Sovereignty and Relational-First Navigation.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Local-First Sovereignty**: PASS. Deletion is a local file system operation.
- **II. Relational-First Navigation**: PASS. Plan includes purging orphaned edges from the relational model.
- **III. Sub-100ms Performance**: PASS. Deletion uses O(1) state updates and non-blocking I/O.
- **VI. Pure Functional Core**: PASS. Graph logic remains decoupled from storage I/O.
- **VIII. Offline Integrity**: PASS. Deletion works entirely offline using local handles.

## Project Structure

### Documentation (this feature)

```text
specs/024-delete-nodes/
├── plan.md              # This file
├── research.md          # Decision log for cleanup and UI
├── data-model.md        # Deletion flow and state transitions
├── quickstart.md        # Implementation checklist
├── contracts/           
│   └── vault-store.md   # API contract for deleteEntity
└── checklists/          
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── EntityDetailPanel.svelte  # UI for deletion trigger
│   │   └── stores/
│   │       └── vault.svelte.ts           # Deletion logic and relational cleanup
├── tests/
│   └── vault-delete.spec.ts          # E2E test for deletion flow
packages/
└── editor-core/                          # No changes expected
```

**Structure Decision**: Standard monorepo layout. Modifications primarily in `apps/web` stores and components.

## Complexity Tracking

No constitution violations detected.