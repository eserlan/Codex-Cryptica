# Feature Specification: Adjustable Sidebars

**Feature Branch**: `088-adjustable-sidebars`  
**Created**: 2026-04-22
**Status**: Implemented  
**Input**: User description: "adjustable sidebar width (both sides) https://github.com/eserlan/Codex-Cryptica/issues/697"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Resize Navigation/Left Sidebar (Priority: P1)

As a user, I want to dynamically adjust the width of the left sidebar by dragging its edge, so that I can see longer entity names or collapse it slightly to give more space to the main canvas.

**Why this priority**: Core usability improvement. Users with complex vaults or smaller screens need control over the layout of their workspace to view content effectively.

**Independent Test**: Can be fully tested by dragging the edge of the left sidebar and verifying that the layout adjusts without breaking and that min/max boundaries are respected.

**Acceptance Scenarios**:

1. **Given** the left sidebar is open, **When** the user hovers over the right edge, **Then** the cursor changes to indicate it is draggable.
2. **Given** the user is dragging the edge of the left sidebar, **When** they move their mouse left or right, **Then** the sidebar width adjusts continuously.
3. **Given** the user is dragging the sidebar edge, **When** they reach the minimum or maximum allowed width, **Then** the sidebar stops resizing.

---

### User Story 2 - Resize Tool/Right Sidebar (Priority: P1)

As a user, I want to dynamically adjust the width of the right sidebar (Oracle/Entity details) by dragging its edge, so that I can comfortably read dense lore or chat logs without feeling cramped.

**Why this priority**: The right sidebar often contains dense text (chat, entity lore), and adjusting its width is crucial for readability.

**Independent Test**: Can be fully tested by dragging the edge of the right sidebar and verifying that the layout adjusts without breaking and that min/max boundaries are respected.

**Acceptance Scenarios**:

1. **Given** the right sidebar is open, **When** the user hovers over the left edge, **Then** the cursor changes to indicate it is draggable.
2. **Given** the user is dragging the edge of the right sidebar, **When** they move their mouse left or right, **Then** the sidebar width adjusts continuously.

---

### User Story 3 - Persistent Layout Preferences (Priority: P2)

As a user, I want the application to remember my custom sidebar widths between sessions, so that I don't have to readjust my workspace every time I open the app.

**Why this priority**: Reduces friction and improves user satisfaction by preserving their personalized workspace setup.

**Independent Test**: Can be fully tested by setting a custom width for both sidebars, refreshing the browser, and verifying that the sidebars load with the customized widths.

**Acceptance Scenarios**:

1. **Given** the user has adjusted the sidebars to custom widths, **When** they close and reopen the application, **Then** the sidebars are restored to those exact custom widths.
2. **Given** the user has a custom width set for a sidebar, **When** they collapse and then expand that sidebar, **Then** it expands to their previously set custom width.

### Edge Cases

- What happens when the browser window is resized to be smaller than the combined width of the sidebars? (Sidebars should proportionally scale down or switch to a mobile/overlay view).
- What happens if the user drags the sidebar extremely fast? (The resize operation should not lag or lose the drag context).
- What happens if a side panel's content cannot shrink below a certain width without overflowing? (Content should gracefully handle overflow via text truncation or scrollbars).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a draggable handle on the inner edge of both the left and right sidebars.
- **FR-002**: System MUST allow users to continuously adjust the width of the sidebars by dragging the handles.
- **FR-003**: System MUST enforce a minimum width for both sidebars to prevent content from becoming completely unusable while the sidebar is conceptually "open".
- **FR-004**: System MUST enforce a maximum width for both sidebars to ensure the central canvas remains accessible.
- **FR-005**: System MUST persist the user-defined width for each sidebar across browser sessions.
- **FR-006**: System MUST restore a sidebar to its user-defined width when toggled from a collapsed state to an expanded state.
- **FR-007**: System MUST provide visual affordances (e.g., cursor change `col-resize`) when the user hovers over a draggable sidebar edge.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can resize both sidebars with a continuous, fluid drag interaction.
- **SC-002**: Sidebar widths are preserved upon a hard page reload.
- **SC-003**: Sidebars never exceed a predefined maximum width (e.g., 40vw) or shrink below a minimum usable width (e.g., 240px for left, 320px for right) when expanded.
- **SC-004**: The main central area automatically adjusts to fill the remaining space without layout breakages.
