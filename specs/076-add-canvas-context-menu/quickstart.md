# Quickstart: Add to Canvas in Context Menu

**For**: Developers implementing this feature
**Date**: 2026-03-27

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

| Component                   | Location                              | Purpose                        |
| --------------------------- | ------------------------------------- | ------------------------------ |
| `GraphContextMenu.svelte`   | `apps/web/src/lib/components/graph/`  | Add "Add to Canvas" menu item  |
| `CanvasPicker.svelte`       | `apps/web/src/lib/components/canvas/` | NEW - Submenu with canvas list |
| `canvas-registry.svelte.ts` | `apps/web/src/lib/stores/`            | Add `addEntities()` method     |
| `help-content.ts`           | `apps/web/src/lib/config/`            | Add help article               |

## Implementation Checklist

- [ ] Add `addEntities(canvasId, entityIds)` to canvas store
- [ ] Create `CanvasPicker.svelte` component
- [ ] Add context menu handler in `GraphView.svelte`
- [ ] Add duplicate detection logic
- [ ] Add toast notifications
- [ ] Add keyboard navigation
- [ ] Write unit tests
- [ ] Write E2E test
- [ ] Add help article

## Testing Commands

```bash
# Unit tests
npm test --workspace=web -- canvas-add

# E2E test
npm run test:e2e --workspace=web -- add-to-canvas
```

## Related Files

- Spec: `specs/076-add-canvas-context-menu/spec.md`
- Data Model: `specs/076-add-canvas-context-menu/data-model.md`
- Research: `specs/076-add-canvas-context-menu/research.md`
