# Implementation Plan: Connection Labels & Visual Representation

**Branch**: `033-connection-labels` | **Date**: 2026-02-02 | **Spec**: [specs/033-connection-labels/spec.md](spec.md)
**Input**: Feature specification from `/specs/033-connection-labels/spec.md`

## Summary

Implement user-assignable connection categories (Friendly, Enemy, Neutral) and custom text labels for graph edges. This involves updating the schema to support rich connection metadata, enhancing the Graph Engine to render colored edges and labels, and updating the UI to allow editing these properties.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `cytoscape` (Graph Visualization), `svelte` (UI), `zod` (Validation)
**Storage**: Markdown YAML Frontmatter (Local-First) via `vault` store
**Testing**: Vitest (Unit/Integration), Playwright (E2E)
**Target Platform**: Browser (Web)
**Project Type**: Monorepo (Web App + Packages)
**Performance Goals**: Rendering <100ms for edge updates.
**Constraints**: Must maintain backward compatibility with existing simple connections (target string only vs object).

## Constitution Check

_GATE: Passed._

- **Local-First Sovereignty**: Compliant. Data persisted in Markdown frontmatter.
- **Relational-First Navigation**: Compliant. Directly enhances the graph's utility.
- **The Sub-100ms Performance Mandate**: Compliant. Edge styling is efficient in Cytoscape.
- **Atomic Worldbuilding**: Compliant. Updates `schema` and `graph-engine` packages modularly.

## Project Structure

### Documentation (this feature)

```text
specs/033-connection-labels/
├── plan.md              # This file
├── research.md          # N/A (Standard feature)
├── data-model.md        # Schema updates
├── quickstart.md        # User guide
├── contracts/           # N/A
└── tasks.md             # To be generated
```

### Source Code (repository root)

```text
packages/
  schema/
    src/
      connection.ts      # Update Connection schema
  graph-engine/
    src/
      transformer.ts     # Map schema to Cytoscape elements (colors, labels)
      defaults.ts        # Default edge styles

apps/
  web/
    src/
      lib/
        components/
          EntityDetailPanel.svelte # Update connection editor UI
        stores/
          vault.svelte.ts          # Update connection add/edit logic
```

**Structure Decision**: enhance existing packages (`schema`, `graph-engine`) and UI components rather than creating new ones, as this is an enhancement to core functionality.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| N/A | | |