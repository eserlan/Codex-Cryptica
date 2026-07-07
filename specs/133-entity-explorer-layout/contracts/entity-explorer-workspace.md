# UI Contract: Entity Explorer Workspace

## Purpose

Defines the internal UI contract between the layout store, Entity Explorer, and the
desktop workspace overlay. This feature exposes no network or public API contract.

## Eligibility Contract

The app shell displays the workspace only when all of the following are true:

```ts
layoutUIStore.isWideViewport &&
  layoutUIStore.leftSidebarOpen &&
  layoutUIStore.activeSidebarTool === "explorer";
```

`isWideViewport` is true at `min-width: 1280px` (`xl`). It is transient and derives
from the constructor-injected `UIViewport.matchMedia` port.

## Selection Contract

| Condition            | Explorer action                     | Result                                                                                     |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Workspace eligible   | Select entity or use its Zen action | Use existing `focusEntity(entity.id)` flow; show that entity through `EmbeddedEntityView`. |
| Workspace ineligible | Select entity or use its Zen action | Use existing `modalUIStore.openZenMode(entity.id)` flow.                                   |

## Workspace Component Contract

`EntityExplorerWorkspace.svelte` accepts the focused entity identifier from the
layout store.

```ts
type EntityExplorerWorkspaceProps = {
  entityId: string | null;
};
```

- A non-null identifier renders existing `EmbeddedEntityView` without changing Zen
  visual or editing capabilities.
- A null identifier renders a stable, accessible empty state that prompts the user to
  select an entity.
- The component is bounded by the main pane and must use `min-w-0`/`min-h-0` so its
  children can scroll without expanding the document horizontally.

## Close And Resize Contract

- The embedded Zen close action clears the focused reader via the existing focus
  flow; the Explorer remains open and the workspace shows its empty state.
- Closing the Explorer, activating another sidebar tool, or changing below 1280px
  hides the overlay. The normal route remains mounted and becomes visible.
- The workspace must not add a modal backdrop, focus trap, or `aria-modal` state.
  Existing `ZenView` uses its non-modal `region` semantics in this mode.
