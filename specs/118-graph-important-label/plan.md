# Implementation Plan: Graph Important Label

**Branch**: `118-graph-important-label` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/118-graph-important-label/spec.md`

## Summary

Add a graph context-menu action that applies the existing `important` label to the clicked or selected entities, then make entities carrying that label visually distinct in the graph independently of visible label text or connection count. The web app owns the right-click menu and user feedback, while `packages/graph-engine` owns graph node data flags and Cytoscape styling so graph rendering remains library-first.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 runes, Bun 1.3.14 workspace
**Primary Dependencies**: Svelte 5, Cytoscape, `graph-engine`, `schema`, existing vault/entity stores, existing Tailwind 4 theme tokens
**Storage**: Existing local vault entity `labels` array persisted through IndexedDB-backed vault stores; no new storage shape
**Testing**: Vitest unit tests for `graph-engine` transformation/style contracts and Svelte controller tests for context-menu behavior; use Playwright only if visual regression cannot be verified by unit/style assertions
**Target Platform**: Browser PWA on desktop, tablet, and phone-sized mobile viewports
**Project Type**: Bun workspace with reusable graph library plus Svelte web app integration
**Performance Goals**: Marking selected entities should complete through the existing bulk label path without per-entity UI loops; graph style evaluation adds no layout pass beyond the existing Cytoscape style refresh
**Constraints**: Local-first privacy, no server processing, no duplicate labels, guest/read-only sessions cannot mutate labels, visual distinction must not depend on label text visibility
**Scale/Scope**: One context-menu action and one graph-level important-node visual treatment for all vault entities labeled `important`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Library-First**: PASS. Label application stays in the web controller/store path; graph node data and visual styling belong in `packages/graph-engine`.
- **TDD**: PASS. Plan requires controller tests for success/no-op/failure and graph-engine tests for important-node data and style before or alongside implementation.
- **Simplicity & YAGNI**: PASS. Reuse the existing `important` label, `bulkAddLabel`, Cytoscape stylesheet, and graph transformer; no new label type or settings screen.
- **AI-First Extraction**: PASS. Oracle extraction is not changed.
- **Privacy & Client-Side Processing**: PASS. Entity labels remain local vault data.
- **Clean Implementation**: PASS. Scope follows existing Svelte 5 runes and graph-engine patterns; validation remains required.
- **User Documentation**: PASS. Feature is small and discoverable from the graph context menu; quickstart documents the user-facing behavior. No changelog entry unless this ships as a user-facing release highlight.
- **Dependency Injection**: PASS. Context-menu behavior uses existing constructor-injected controller dependencies; no new service is introduced.
- **Natural Language**: PASS. UI feedback uses plain language: "Marked as important", "Already marked as important", and failure feedback.
- **Quality & Coverage**: PASS. Adds focused tests in affected web controller and graph-engine surfaces.
- **Agent Operational Protocol**: PASS. Scope is limited to importance labeling and visual distinction.
- **Terminology Unification**: PASS. Uses "Labels" only; no new "tags" terminology.

## Project Structure

### Documentation (this feature)

```text
specs/118-graph-important-label/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- graph-important-label.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
```

### Source Code (repository root)

```text
packages/graph-engine/
|-- src/
|   |-- transformer.ts
|   `-- transformer.test.ts

apps/web/src/lib/components/graph/
|-- ContextMenu.svelte
|-- graph-context-menu-controller.svelte.ts
`-- graph-context-menu-controller.test.ts
```

**Structure Decision**: Keep graph semantics and styling in `packages/graph-engine`; keep Svelte interaction and notifications in `apps/web`. The existing vault store remains the persistence boundary for labels.

## Complexity Tracking

No constitution violations require justification.

## Phase 0 Research

See [research.md](./research.md). All planning unknowns are resolved without introducing new dependencies.

## Phase 1 Design

See [data-model.md](./data-model.md), [contracts/graph-important-label.md](./contracts/graph-important-label.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Library-First**: PASS. The design places `isImportant` derivation and Cytoscape style rules in `graph-engine`, with the web app only invoking existing label mutations.
- **TDD / Quality**: PASS. Contracts identify focused assertions for graph transformer/style output and context-menu mutation/feedback behavior.
- **Privacy & Client-Side Processing**: PASS. No remote calls or new persistence surfaces are introduced.
- **Dependency Injection**: PASS. Existing controller dependencies are sufficient.
- **User Documentation / Natural Language**: PASS. Quickstart and UI copy remain plain and label-focused.
