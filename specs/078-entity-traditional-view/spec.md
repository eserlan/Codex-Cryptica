# Feature Specification: Entity Explorer Sidebar

**Feature Branch**: `078-entity-traditional-view`  
**Created**: 2026-04-02  
**Status**: Implemented  
**Input**: User description: "a more traditional view/listing of entities, organized around categories and labels. List view as left sidebar (to the right of the Oracle). Clicking opens in a Zen-mode-like view in the main area while sidebars remain visible. The list view should be similar to the entity palette in the canvas."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Quick Scanning via Entity Explorer (Priority: P1)

As a Game Master, I want a persistent list of my entities in a left sidebar, styled similarly to the Canvas Entity Palette, so that I can quickly find and scan my characters and locations using a familiar interface.

**Why this priority**: Core navigation improvement. Provides a high-density reference that complements the spatial visualizations and maintains UI consistency with the Canvas tools.

**Independent Test**: Open the sidebar, verify the "Entity Explorer" appears to the right of the Oracle tool icons, and ensure its layout (search bar + entity cards) matches the aesthetic of the Canvas Entity Palette.

**Acceptance Scenarios**:

1. **Given** the application is open, **When** I toggle the Explorer tool, **Then** a sidebar panel appears showing all entities in a compact list format.
2. **Given** the Explorer is open, **When** I type in the search bar, **Then** the list filters in real-time exactly like the Canvas Entity Palette.

---

### User Story 2 - Main View Entity Focus (Priority: P1)

As a user, when I select an entity in the Explorer list, I want its full content to replace the central workspace (Graph/Map) so that I can work on lore in a spacious, Zen-like environment while the Explorer remains available for further navigation.

**Why this priority**: Optimizes the central real estate for deep reading/writing while maintaining the functional multi-sidebar layout.

**Independent Test**: Click an entity in the Explorer and verify the main area (where the Graph was) now displays the entity details using the spacious Zen-mode layout, while sidebars remain visible.

**Acceptance Scenarios**:

1. **Given** the Entity Explorer is open, **When** I click on an entity, **Then** the Graph is replaced by an Embedded Entity View in the center area.
2. **Given** an entity is focused, **When** I click "Close" or "Back to Graph" in the HUD, **Then** the main area restores the previous spatial visualization.

---

### User Story 3 - Hierarchical Layout Integrity (Priority: P2)

As a user, I want the UI tools to follow a logical hierarchy where the Oracle is always the most leftward element, followed by the Explorer, ensuring my workspace remains organized and predictable.

**Independent Test**: Verify that even when the Explorer is active and an entity is open in the center, the Oracle icon/panel remains to the far left.

---

### Edge Cases

- **Search Performance**: Real-time filtering must remain responsive even with 1,000+ entities (SC-002).
- **Navigation State**: If I have an entity open in the center and I click another in the Explorer, the view should update to the new entity immediately.
- **Empty States**: If no entities match the search, show a "No results" message similar to the Canvas palette.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an "Entity Explorer" sidebar panel.
- **FR-002**: The Explorer MUST be positioned to the right of the Oracle tool icons/panel.
- **FR-003**: The Explorer UI MUST mirror the **Entity Palette** from the Canvas mode (Search Bar at top, compact list/cards below).
- **FR-004**: Each list item MUST show: Name, Category icon, and assigned Labels (metadata field).
- **FR-005**: Users MUST be able to search and filter the Explorer list in real-time using the internal indexing service.
- **FR-006**: System MUST provide an **Embedded Entity View** that renders in the main workspace area.
- **FR-007**: Clicking an entity in the Explorer MUST swap the central visualization (Graph/Map/Canvas) for the Embedded Entity View.
- **FR-008**: The Embedded Entity View MUST reuse the modular tabbed layout logic (Status, Lore, Inventory) from Zen Mode.
- **FR-009**: All sidebars (Oracle, Explorer) MUST remain visible and interactive while the Embedded Entity View is active.
- **FR-010**: The Explorer MUST be toggleable via a dedicated icon in the leftmost tool bar.

### Key Entities _(include if feature involves data)_

- **Explorer Panel**: The left-sidebar UI container, styled like the Canvas Entity Palette.
- **Embedded Entity View**: The central workspace component for high-density entity management.

## Dependencies & Assumptions

- **Dependency**: Relies on `UIStore` to manage `activeSidebarTool` and the `mainViewMode`.
- **Dependency**: Reuses components from `packages/editor-core` or `apps/web` used in the Canvas Entity Palette.
- **Assumption**: The search logic is shared with the existing `searchStore`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Transitioning from Graph to Embedded Entity View takes less than 200ms.
- **SC-002**: Filtering a list of 1,000 entities in the Explorer takes less than 100ms.
- **SC-003**: UI consistency: 100% match in styling between the Explorer list and the Canvas Entity Palette.
- **SC-004**: 100% of entity metadata remains editable within the embedded central view.
