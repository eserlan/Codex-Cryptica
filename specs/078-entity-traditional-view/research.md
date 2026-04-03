# Research: Entity Explorer Sidebar & Embedded Content View

## Decision: Layout Architecture (The "Three-Pane" Split)

**Decision**: Adopt a multi-column flex layout in `+layout.svelte`:
`[ActivityBar (Fixed)] [SidebarPanel (Toggleable)] [MainView (Flexible)]`

**Rationale**: This architecture satisfies the "Oracle leftmost" and "Explorer to the right" requirements while allowing both tools to remain persistent. The `ActivityBar` serves as the primary anchor for tool selection, while the `SidebarPanel` expands to provide the "Palette-like" interface.

**Alternatives Considered**:

- Stacking sidebars on top of each other: Rejected as it reduces vertical scanning efficiency.
- Floating panels: Rejected as it obscures the main visualization.

## Decision: mainViewMode for Content Swapping

**Decision**: Introduce a `mainViewMode` property in `uiStore` with values: `'visualization'` (default) and `'entity-focus'`.

**Rationale**: Allows the application to reactively swap the central area between Graph/Map/Canvas and the new `EmbeddedEntityView`. This maintains the same URL structure while providing a "Zen-like" experience within the main app shell.

## Decision: Component Reuse from EntityPalette

**Decision**: Extract the `FilteredEntityList` logic from `EntityPalette.svelte` into a shared utility or component.

**Rationale**: Both the Canvas Palette and the new Entity Explorer share the exact same requirements: real-time search, category filtering, and high-density entity cards. Reuse ensures consistency and reduces maintenance overhead.

## Decision: Embedded Entity View Implementation

**Decision**: Create `EmbeddedEntityView.svelte` using the modular `ZenHeader`, `ZenSidebar`, and `ZenContent` components from the 071 refactor.

**Rationale**: These components are already designed for a spacious, multi-column layout. By wrapping them in a non-modal container, we can instantly provide a "Zen-like" experience in the main workspace.

## Research Tasks (Resolved)

- **Sidebar Persistence**: Sidebars will be anchored outside the `children()` render block in `+layout.svelte`, ensuring they do not re-initialize during transitions between visualization and focus modes.
- **Hierarchical Integrity**: The Oracle will always be the first item in the `ActivityBar`, maintaining its status as the most leftward interaction point.
