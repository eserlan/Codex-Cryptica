# Feature Specification: Move Oracle to Left Sidebar

**Feature Branch**: `065-move-oracle-sidebar`  
**Created**: 2026-03-04  
**Status**: Draft  
**Input**: User description: "move oracle to left sidebar https://github.com/eserlan/Codex-Cryptica/issues/352"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Dedicated Oracle Sidebar Access (Priority: P1)

As a Game Master, I want to access the Oracle via a dedicated icon in a left sidebar instead of a floating button so that the main workspace (graph/map) remains unobstructed.

**Why this priority**: Improves core navigation and reduces visual clutter in the primary workspace. It establishes a consistent location for AI interactions.

**Independent Test**: Can be tested by opening the application and observing that the "floating orb" is gone, replaced by a sidebar icon on the left that toggles the Oracle panel.

**Acceptance Scenarios**:

1. **Given** I am on the Graph View, **When** I look at the left side of the screen, **Then** I should see a narrow vertical sidebar with an Oracle icon.
2. **Given** the sidebar is visible, **When** I click the Oracle icon, **Then** the sidebar should expand or open a panel containing the full Oracle chat interface.
3. **Given** the Oracle panel is open, **When** I click the Oracle icon again (or a collapse button), **Then** the panel should close, returning the sidebar to its icon-only state.

---

### User Story 2 - Persistent Navigation Hub (Priority: P2)

As a user, I want the left sidebar to remain visible across different views (Graph, Map, Canvas) so that I can consult the Oracle without losing my place or switching contexts manually.

**Why this priority**: Ensures AI assistance is universally accessible and predictable across all application modules.

**Independent Test**: Navigate between Graph and Map views and verify the left sidebar remains present and in the same state.

**Acceptance Scenarios**:

1. **Given** the Oracle panel is open in Graph View, **When** I navigate to the Map View, **Then** the Oracle panel should remain open and accessible in the left sidebar.

---

### User Story 3 - Mobile Responsive Layout (Priority: P3)

As a mobile user, I want the Oracle to be accessible without taking up permanent screen real estate so that I can use the tool effectively on small devices.

**Why this priority**: Maintains usability on mobile where space is extremely limited.

**Independent Test**: View the app on a mobile device and verify the sidebar transitions to a bottom bar or overlay menu.

**Acceptance Scenarios**:

1. **Given** a small screen (mobile), **When** I open the app, **Then** the left sidebar should be hidden or replaced by a bottom navigation bar.
2. **Given** the mobile view, **When** I trigger the Oracle, **Then** it should open as a full-screen overlay or a large slide-up panel.

---

### Edge Cases

- **Large Conversation History**: What happens when the Oracle is in a narrow sidebar and has 50+ messages? (Requirement: Scrollbar must be functional and not break layout).
- **Concurrent Sidebars**: What happens when both the Left Sidebar (Oracle) and Right Sidebar (Entity Detail) are open simultaneously? (Requirement: Main content area should resize or sidebars should overlap appropriately based on screen width).
- **Settings Conflict**: How does the "Oracle Offline" (missing API key) state look in the sidebar? (Requirement: It should display the same call-to-action to open settings within the sidebar panel).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST remove the floating "Oracle Orb" button.
- **FR-002**: System MUST implement a vertical left sidebar (approx. 48-64px wide in collapsed state).
- **FR-003**: System MUST provide an Oracle trigger button within the left sidebar using the existing sparkles/target icon.
- **FR-004**: System MUST allow the Oracle panel to be toggled (Expanded/Collapsed) via the sidebar icon.
- **FR-005**: System MUST ensure the Oracle chat remains functional within the new sidebar container (messages, input, slash commands).
- **FR-006**: System MUST maintain the Oracle state (open/closed, scroll position) when navigating between main views.
- **FR-007**: System MUST support "Pop out" functionality from the sidebar header, opening the Oracle in a new browser window as per current behavior.
- **FR-008**: System MUST display a clear "Active" state on the sidebar icon when the Oracle panel is open.
- **FR-009**: System MUST transition the left sidebar to a bottom navigation bar or a hideable drawer on mobile viewports (< 768px).

### Key Entities _(include if feature involves data)_

- **UI Navigation State**: Represents the current state of the sidebar (collapsed/expanded) and active tool.
- **Oracle Context**: The ongoing chat session and image generation history, now rendered within the sidebar.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of users can access the Oracle chat within 1 click from any view.
- **SC-002**: Main workspace (Graph/Map) expands to utilize all available screen width (minus the 48-64px sidebar) when the Oracle panel is collapsed.
- **SC-003**: Zero regressions in Oracle functionality (chat, slash commands, image generation) after the move.
- **SC-004**: Layout remains stable (no horizontal scrolling or broken elements) when both left and right sidebars are open on a 1080p display.

## Assumptions

- The left sidebar will initially be narrow and icon-based, similar to VS Code or Discord.
- The right sidebar (Entity Detail) remains on the right side.
- For this release, only the Oracle will reside in the left sidebar, but the architecture will support adding more tools (e.g., Search, Vaults) later.
