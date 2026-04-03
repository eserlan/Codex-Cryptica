# Implementation Plan: Entity Explorer Sidebar & Embedded Content View

**Branch**: `078-entity-traditional-view` | **Date**: 2026-04-02 | **Spec**: [specs/078-entity-traditional-view/spec.md](./spec.md)

## Summary

Refactor the global application layout to support a multi-pane sidebar architecture. Implement a persistent **Entity Explorer** sidebar, mirroring the Canvas Palette, and a central **Embedded Entity View** that provides a Zen-like focus experience for lore work. The feature utilizes the **Dexie-backed warm cache** for high-performance listing and implements **lazy-loading** for heavy text content in the focused view.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Svelte 5 (Runes)  
**Primary Dependencies**: SvelteKit, Lucide Svelte, Tailwind 4, `@codex/search-engine`, **Dexie 4.x**  
**Storage**: OPFS (authoritative), **Dexie IndexedDB (warm cache)**  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Performance Goals**: <100ms list filtering (via Dexie `graphEntities`); <200ms content lazy-load.  
**Constraints**: Hierarchical layout integrity (Oracle leftmost); Sidebars MUST remain persistent.

## Constitution Check

_GATE: Passed._

- **V. Privacy**: All entity listing and content rendering happens 100% client-side using Dexie/OPFS. [PASS]
- **IX. Natural Language**: UI labels will use approachable terms like "Explorer" and "Focus". [PASS]
- **X. Quality & Coverage**: Refactored shared components will include unit tests for lazy-loading triggers. [PASS]

## Project Structure

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ActivityBar.svelte       # NEW: Leftmost tool rail
│   │   │   └── SidebarPanelHost.svelte  # NEW: Toggles Oracle/Explorer
│   │   ├── explorer/
│   │   │   └── EntityExplorer.svelte    # NEW: Dexie-backed searchable list
│   │   └── entity/
│   │       └── EmbeddedEntityView.svelte # NEW: Lazy-loads content from Dexie
│   └── stores/
│       └── ui.svelte.ts                 # UPDATED: mainViewMode & focusedEntityId
```

## Phase 0: Outline & Research

- [x] **Dexie Integration**: Verified `graphEntities` (metadata) and `entityContent` (lazy text) split.
- [x] **Research Sidebar Stacking**: Adopted `[ActivityBar] [SidebarPanel] [MainView]` split.
- [x] **Identify Component Reuse**: Reusing `EntityPalette` card styles and `ZenMode` content logic.

## Phase 1: Design & Contracts

- [x] **Data Model**: Defined `mainViewMode` and `focusedEntityId` in `uiStore`.
- [x] **UI Contracts**: Defined standard props for sidebar tool components.
- [x] **Agent Context Update**: Synchronized with Dexie-aware service definitions.

## Phase 2: Implementation

1.  **Layout Refactor**: Implement the `ActivityBar` and `SidebarPanelHost`.
2.  **Entity Explorer**: Build `EntityExplorer.svelte` reading from Dexie metadata.
3.  **Embedded View**: Build `EmbeddedEntityView.svelte` with `vault.loadEntityContent(id)` trigger.
4.  **Wiring**: Link ActivityBar toggles and Explorer selection.
5.  **Verification**: Verify zero "content flash" using Dexie preloading logic.
