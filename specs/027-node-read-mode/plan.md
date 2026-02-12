# Implementation Plan: Entity Zen Mode

**Branch**: `027-node-read-mode` | **Date**: 2026-01-31 | **Spec**: [link](./spec.md)
**Input**: Feature specification from `/specs/027-node-read-mode/spec.md`

## Summary

Implement "Zen Mode," a full-screen, distraction-free environment for viewing and editing entities. This replaces the concept of a simple "Read Mode" with a robust workspace supporting deep work, tabbed data organization, and seamless graph navigation.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ + Svelte 5 (Runes)
**Primary Dependencies**: `marked` (Markdown rendering), `isomorphic-dompurify` (Sanitization), `$lib/components/MarkdownEditor` (Editing)
**Storage**: `vault.svelte.ts` (Data), `ui.svelte.ts` (Transient State)
**Testing**: Playwright (E2E)
**Target Platform**: Web (PWA)
**Performance Goals**: <100ms modal open time
**Constraints**: Must work offline (local-first)

## Constitution Check

- [x] **Local-First Sovereignty**: All edits persist to local files.
- [x] **Relational-First Navigation**: Modal includes navigation links.
- [x] **Sub-100ms Performance**: Lightweight stores and optimized rendering.
- [x] **Atomic Worldbuilding**: Implemented as self-contained `EntityReadModal`.
- [x] **System-Agnostic Core**: UI is generic (Status/Lore/Inventory).
- [x] **Verifiable Reality**: E2E tests for Edit/Save cycles.
- [x] **Test-First PWA Integrity**: Offline compatible.

## Project Structure

### Documentation

```text
specs/027-node-read-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code

```text
apps/
  web/
    src/
      lib/
        components/
          modals/
            EntityReadModal.svelte  # [NEW] Full-screen Zen Mode component
          EntityDetailPanel.svelte  # [UPDATE] Add Zen Mode trigger
        stores/
          ui.svelte.ts              # [NEW] Global UI state store
      routes/
        +layout.svelte              # [UPDATE] Mount global modal
```

## Complexity Tracking

| Violation       | Why Needed                                                        | Mitigation                                                |
| :-------------- | :---------------------------------------------------------------- | :-------------------------------------------------------- |
| Global UI Store | Modal needs to be accessible from anywhere (Graph, Search, Panel) | Restrict store scope to UI state only (no business logic) |
