# Research: Entity Explorer Desktop Two-Column Layout

## Decision 1: Reuse the existing embedded Zen reader/editor

- **Decision**: Render the existing `EmbeddedEntityView`, which already composes
  `ZenView`, in the desktop workspace rather than creating a second entity detail
  implementation.
- **Rationale**: It meets the requirement for the right column to look and behave
  exactly like current Zen Mode while preserving editing, tabs, entity navigation,
  lazy content loading, and close handling in one implementation.
- **Alternatives considered**:
  - Build a desktop-only reader component: rejected because it would duplicate Zen
    behavior and drift from the existing editor.
  - Render the modal `ZenModeModal` inside the workspace: rejected because it keeps
    modal/backdrop semantics and is not appropriate for a persistent split layout.

## Decision 2: Reuse the existing sidebar persistence, not a new pin preference

- **Decision**: Workspace eligibility is `viewport >= 1280px`,
  `leftSidebarOpen === true`, and `activeSidebarTool === "explorer"`.
- **Rationale**: The layout store already persists Explorer visibility and active
  tool selection. The clarification explicitly chose this state as the meaning of
  a pinned Explorer, so a new control, preference, or storage migration is not
  justified.
- **Alternatives considered**:
  - Add a pin/unpin button and persistence key: rejected because no such interaction
    exists today and it expands the feature beyond the requested behavior.
  - Split whenever any sidebar is open: rejected because Oracle must retain its
    current panel behavior and should not activate an entity reader.

## Decision 3: Add an injectable wide-viewport signal to `LayoutUIStore`

- **Decision**: Extend the existing `UIViewport` port and `LayoutUIStore` watcher
  with `matchMedia("(min-width: 1280px)")`, exposing transient wide-viewport and
  derived workspace-eligibility state.
- **Rationale**: The store already uses constructor-injected `matchMedia` for mobile
  state, so this keeps the breakpoint testable and avoids direct window access in
  Explorer components.
- **Alternatives considered**:
  - Check `window.innerWidth` in `EntityExplorer`: rejected because it is harder to
    test and can become stale after a resize.
  - Use only CSS media queries: rejected because selection must choose between an
    embedded reader and full-screen modal behavior before rendering.

## Decision 4: Overlay the workspace above route content

- **Decision**: Mount a bounded workspace overlay inside the app shell's main pane
  while keeping `{@render children()}` mounted underneath.
- **Rationale**: This preserves graph, map, canvas, and route-local state while the
  desktop reader is open. Removing the overlay immediately restores the normal
  single-column route without remounting it.
- **Alternatives considered**:
  - Replace `children()` when focused: rejected because it would destroy and recreate
    route state each time the user selects or closes an entity.
  - Implement the workspace only in the graph route: rejected because the Explorer
    is global app chrome and its behavior would vary across workspace routes.

## Decision 5: Use the existing flex shell with bounded overflow

- **Decision**: Retain the current activity-bar/sidebar/main flex layout, add
  `min-w-0` to the main workspace boundary, and rely on existing Explorer and Zen
  internal scroll containers for vertical scrolling.
- **Rationale**: The shell is a one-dimensional layout and does not need a grid
  rewrite. `min-w-0` lets long entity content shrink inside flex space instead of
  causing page-level horizontal overflow; independent pane scrolling keeps the
  explorer usable during long-form reading or editing.
- **Alternatives considered**:
  - Rebuild the shell with CSS Grid: rejected because the existing flex layout
    already expresses the required fixed rail, bounded sidebar, and flexible main
    pane without a structural refactor.
  - Use a fixed 100vw workspace width: rejected because viewport-width sizing can
    include scrollbar width and introduce horizontal overflow.

## Decision 6: Keep modal behavior below the desktop threshold

- **Decision**: On viewports below 1280px, Explorer selection continues to call the
  existing modal Zen Mode flow.
- **Rationale**: This preserves the current drawer and full-screen reading behavior
  on medium and small screens, with no new responsive detail surface to maintain.
- **Alternatives considered**:
  - Squeeze the two-column layout onto smaller screens: rejected because it violates
    the feature's responsive constraint and compromises editor readability.
