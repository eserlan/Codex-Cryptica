# Implementation Plan: Entity Labeling System

**Branch**: `029-entity-labeling` | **Date**: 2026-02-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-entity-labeling/spec.md`

## Summary

Implement a project-wide labeling system for campaign entities. Labels will be stored in Markdown YAML frontmatter, indexed reactively in Svelte stores, and used for graph filtering and search. Includes project-wide label renaming/deletion.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5, Cytoscape.js, FlexSearch, js-yaml  
**Storage**: OPFS (Vault), IndexedDB (Metadata Store)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: PWA (Desktop/Mobile)
**Project Type**: Monorepo (Web App + Shared Packages)
**Performance Goals**: <100ms for filter application, <200ms for global index updates.  
**Constraints**: 100% Offline-capable, human-readable metadata.

## Constitution Check

- **Law I (Local-First)**: PASSED. Using YAML frontmatter in local Markdown files.
- **Law III (Performance)**: PASSED. Using reactive stores and Cytoscape selectors for instantaneous filtering.
- **Law VI (Testing)**: PASSED. Plan includes Vitest for schema updates and Playwright for E2E user stories.

## Project Structure

### Documentation (this feature)

```text
specs/029-entity-labeling/
├── plan.md              # This file
├── research.md          # Decision log
├── data-model.md        # Schema updates
├── quickstart.md        # Test scenarios
└── tasks.md             # Task breakdown
```

### Source Code (affected areas)

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   ├── labels/      # New label UI components
│   │   └── graph/       # Filter integration
│   └── stores/
│       └── vault.svelte.ts # Label indexing logic
packages/
└── schema/src/
    └── index.ts         # Zod schema extension
```

**Structure Decision**: Monorepo extension. Update shared `schema` first, then implement indexing in `apps/web/src/lib/stores`, and finally UI in `apps/web/src/lib/components`.
