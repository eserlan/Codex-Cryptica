# Implementation Plan: ZenModeModal Refactor

**Branch**: `071-zenmode-refactor` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)

## Summary

Refactor the `ZenModeModal.svelte` "God File" (~1,000 lines) by extracting UI overlays, complex clipboard logic, and entity editing state into modular components and domain-specific services. The goal is to reduce the main component to under 250 lines while ensuring zero functional regressions in viewing, editing, and sharing entities.

## Technical Context

**Language/Version**: TypeScript 5.x / Svelte 5 (Runes)  
**Primary Dependencies**: marked, isomorphic-dompurify, Lucide Svelte, Tailwind 4  
**Architecture**: Svelte 5 Component Decomposition + Service Isolation  
**Testing**: Vitest (Unit), Playwright (E2E)

## Constitution Check

- [x] Use Svelte 5 Runes ($state, $derived, $effect)
- [x] Maintain "Local-First" architecture
- [x] Extract complex logic to standalone services/hooks
- [x] **Dependency Injection**: Use constructor-based DI for all services (ADR 007).
- [x] **TDD**: Write unit tests for all extracted logic.
- [x] Prefix unused vars with `_`

## Project Structure

### Documentation (this feature)

```text
specs/071-zenmode-refactor/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task list
```

### Source Code Changes

```text
apps/web/src/lib/
├── components/
│   ├── modals/
│   │   └── ZenModeModal.svelte      # Main orchestrator (Reduced)
│   └── zen/
│       ├── ZenHeader.svelte         # extracted (Phase 3)
│       ├── ZenSidebar.svelte        # extracted (Phase 3)
│       ├── ZenContent.svelte        # extracted (Phase 3)
│       └── ZenImageLightbox.svelte  # extracted (Phase 1)
├── services/
│   └── ClipboardService.ts          # extracted (Phase 1)
└── hooks/
    ├── useZenModeActions.svelte.ts  # extracted (Phase 2)
    └── useEditState.svelte.ts       # extracted (Phase 2)
```

## Phase 1: Service Extraction (High Impact)

- **Goal**: Remove the complex "Copy to Clipboard" and Lightbox logic from the main component.
- **Logic**: `handleCopy` involves canvas processing and multi-mime-type blobs. Moving it to `ClipboardService.ts` makes it testable and reusable.
- **UI**: `ZenImageLightbox.svelte` will encapsulate the full-screen viewer and its accessibility/focus logic.

## Phase 2: State & Action Decoupling

- **Goal**: Decouple entity buffering and CRUD operations from the UI lifecycle.
- **Hooks**:
  - `useEditState.svelte.ts`: Manages the buffer of `$state` variables used during editing.
  - `useZenModeActions.svelte.ts`: Handles the `delete`, `save`, and `close` logic, including confirmation dialogs.

## Phase 3: Layout Decomposition

- **Goal**: Break the massive template into logical slices.
- **Components**:
  - `ZenHeader.svelte`: Handles the title, category, and action buttons.
  - `ZenSidebar.svelte`: Manages labels, images, and connections.
  - `ZenContent.svelte`: Orchestrates the temporal view and markdown editors.

## Phase 4: Integration & Polish

- **Goal**: Re-assemble the components in `ZenModeModal.svelte` and verify functionality.
- **Audit**: Ensure the main file stays under 250 lines and passes all E2E tests.
