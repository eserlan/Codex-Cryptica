# Implementation Plan: Rich Text Formatting Controls

**Branch**: `030-rich-text-formatting` | **Date**: 2026-02-01 | **Spec**: [Link](spec.md)
**Input**: Feature specification from `/specs/030-rich-text-formatting/spec.md`

## Summary

Implement a visual rich text formatting toolbar for the Tiptap-based Markdown editor and add a fullscreen "Zen Mode" editing experience.

## Technical Context

**Language/Version**: TypeScript 5.x / Svelte 5
**Primary Dependencies**: `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-table` (existing)
**Storage**: N/A (UI state only)
**Testing**: Playwright (E2E)
**Target Platform**: Web (SvelteKit)
**Project Type**: Web application
**Performance Goals**: Instant toolbar response (<16ms)
**Constraints**: Must match existing "cyberpunk" aesthetic (green/black).

## Constitution Check

- [x] **Local-First Sovereignty**: No data format changes; standard markdown.
- [x] **Relational-First Navigation**: N/A
- [x] **Sub-100ms Performance**: Tiptap is performant; toolbar uses local state.
- [x] **Atomic Worldbuilding**: Editor logic isolated in components.
- [x] **System-Agnostic Core**: N/A
- [x] **Pure Functional Core**: N/A
- [x] **Verifiable Reality**: E2E tests for toolbar interactions.
- [x] **Test-First PWA Integrity**: Offline functional.

## Project Structure

### Documentation (this feature)

```text
specs/030-rich-text-formatting/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code

```text
apps/web/src/lib/components/editor/
├── MarkdownEditor.svelte        # Refactored to include toolbar
├── EditorToolbar.svelte         # NEW: Formatting buttons
├── EditorBubbleMenu.svelte      # NEW: Floating menu on selection
└── icons/                       # (Optional) specific icons if needed
```

**Structure Decision**: Refactor existing `MarkdownEditor` to orchestrate new sub-components (`EditorToolbar`, `EditorBubbleMenu`). Keep all editor-related logic in `apps/web/src/lib/components/editor/`.

## Complexity Tracking

N/A - Standard Svelte component composition.
