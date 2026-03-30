# Quickstart: Add to Canvas in Context Menu

**For**: Developers implementing this feature
**Date**: 2026-03-28

## What This Feature Does

Allows users to right-click selected entities in the graph view and quickly add them to:

- An existing canvas (from recent list or full picker)
- A new canvas (created on-the-fly)

## User Flow

```
1. User selects 1+ entities in graph
2. User right-clicks on selection
3. Context menu shows "Add to Canvas" →
   ├─ Recent Canvas 1
   ├─ Recent Canvas 2
   ├─ ...
   ├─ Choose Canvas...
   └─ + New Canvas
4. User selects canvas (or creates new)
5. Toast notification: "Added 3 entities to 'Combat Map'"
```

## Key Components

| Component                   | Location                              | Purpose                       |
| --------------------------- | ------------------------------------- | ----------------------------- |
| `ContextMenu.svelte`        | `apps/web/src/lib/components/graph/`  | Add "Add to Canvas" menu item |
| `CanvasPicker.svelte`       | `apps/web/src/lib/components/canvas/` | Submenu with canvas list      |
| `canvas-registry.svelte.ts` | `apps/web/src/lib/stores/`            | Add `addEntities()` method    |
| `canvas-add-entities.md`    | `apps/web/src/lib/content/help/`      | Help article                  |
| `help-content.ts`           | `apps/web/src/lib/config/`            | Register help article         |

## Implementation Checklist

- [x] Add `addEntities(canvasId, entityIds)` to canvas store
- [x] Create `CanvasPicker.svelte` component
- [x] Add context menu handler in `ContextMenu.svelte`
- [x] Add duplicate detection logic
- [x] Add toast notifications
- [x] Add keyboard navigation
- [x] Write unit tests in `apps/web/src/lib/stores/canvas-registry.test.ts`
- [x] Write E2E test in `apps/web/tests/canvas-add-context-menu.spec.ts`
- [x] Add help article

## Testing Commands

```bash
# Unit tests
npm test -- apps/web/src/lib/stores/canvas-registry.test.ts

# E2E test
npm run test:e2e -- tests/canvas-add-context-menu.spec.ts
```

## Final Implementation Details

- **Duplicate Detection**: `addEntities` returns a `CanvasAddResult` indicating how many entities were added and how many were skipped as duplicates.
- **Recent Canvases**: The `CanvasPicker` shows up to 5 most recently modified canvases.
- **New Canvas Creation**: Users can create a new canvas directly from the context menu; a default name is generated based on the selection if no name is provided.
- **User Feedback**: Integrated with `ui.notify` for success, info (duplicates), and error states.
- **Accessibility**: Submenu supports keyboard navigation (Arrow keys, Enter, Escape).

## Related Files

- Spec: `specs/076-add-canvas-context-menu/spec.md`
- Data Model: `specs/076-add-canvas-context-menu/data-model.md`
- Research: `specs/076-add-canvas-context-menu/research.md`
- Plan: `specs/076-add-canvas-context-menu/plan.md`
