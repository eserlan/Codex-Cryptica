# Implementation Plan: Core Entity & Relationship Schema

**Branch**: `001-core-entity-schema` | **Date**: 2026-01-23 | **Spec**: [SPEC-001](./spec.md)
**Input**: Feature specification from `specs/001-core-entity-schema/spec.md`

## Summary

Implement the foundational "Triangle of Truth" architecture for Codex Cryptica. This involves setting up a SvelteKit PWA with a local-first data layer (RxDB + OPFS), a graph visualization engine (Cytoscape.js), and a rich text editor (Tiptap) that syncs bidirectional links to the graph and file system in real-time.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: SvelteKit 2+, Svelte Stores (State), Tailwind CSS v4 (Styling), RxDB (Local DB), Cytoscape.js (Graph), Tiptap (Editor), Zod (Validation).
**Storage**: Origin Private File System (OPFS) via RxDB storage adapter.
**Testing**: Vitest (Unit/Integration), Playwright (Mandatory E2E).
**Target Platform**: Modern Web Browsers (PWA support required).
**Project Type**: Monorepo (Turborepo or NPM Workspaces recommended).
**Performance Goals**: <100ms response for typing and graph updates.
**Constraints**: Fully offline capable (Service Worker), no server-side logic for core features.
**Scale/Scope**: Foundation for infinite scalability of local files.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Local-First Sovereignty**: ✅ Compliant. Data stored in OPFS via RxDB.
- **Relational-First Navigation**: ✅ Compliant. Cytoscape integration is central.
- **Sub-100ms Performance**: ✅ Compliant. Using Svelte stores for state and Web Workers for heavy lifting.
- **Atomic Worldbuilding (Modularity)**: ✅ Compliant. Using monorepo with distinct packages.
- **Pure Functional Core**: ✅ Compliant. Business logic isolated in `packages/schema` and `graph-engine`.
- **System-Agnostic Core**: ✅ Compliant. Schema is generic ("Entity").
- **Test-First Integrity**: ✅ Compliant. Mandatory Unit, Integration, and Playwright E2E tests.
- **Forbidden Patterns**: ✅ Compliant. No telemetry, no external DB.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-entity-schema/
├── plan.md              # This file
├── research.md          # (To be created)
├── data-model.md        # (To be created)
├── quickstart.md        # (To be created)
└── tasks.md             # (To be created)
```

### Source Code (repository root)

```text
├── apps/
│   └── web/                  # SvelteKit PWA Application
│       ├── static/           # Static assets & Service Worker
│       ├── src/
│       │   ├── routes/       # SvelteKit routes
│       │   ├── store/        # Svelte stores
│       │   └── components/   # Svelte components
    └── ...

packages/
├── graph-engine/         # Cytoscape.js logic & graph algorithms
│   ├── src/
│   └── tests/
├── editor-core/          # Tiptap extensions & editor logic
│   ├── src/
│   └── tests/
└── schema/               # Shared TypeScript interfaces & Zod schemas
    ├── src/
    └── tests/
```

**Structure Decision**: Monorepo structure chosen to strictly enforce modularity (Constitution Article IV). `apps/web` consumes `packages/*`.

## Complexity Tracking

| Violation | Why Needed                                                    | Simpler Alternative Rejected Because                                                          |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Monorepo  | Enforces strict boundaries between Editor, Graph, and Schema. | Single `src/` folder leads to tight coupling of UI and Logic, violating Modularity principle. |
