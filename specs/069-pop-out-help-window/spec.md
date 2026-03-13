# Feature Specification: Pop-out Help Window

**Feature Branch**: `069-pop-out-help-window`  
**Created**: 2026-03-13  
**Status**: Draft

## Goal

Enable users to open the help section in a dedicated **Standalone Help** window to facilitate learning/reference while simultaneously working on the Knowledge Graph or Spatial Canvas.

## User Scenarios & Testing

### User Story 1 - Side-by-Side Reference (Priority: P1)

As a user building a complex regional map in the Spatial Canvas, I want to keep the "Spatial Canvas" guide visible in a separate window on my second monitor so that I can look at the instructions without constantly switching contexts or closing my work pane.

**Why this priority**: Directly addresses the "context switch" friction in CC.

**Independent Test**:

1. Open Codex Cryptica.
2. Navigate to Help.
3. Click "Pop out" icon.
4. Verify a new window opens with only the Help content.
5. Search for a term in the pop-out and verify results display correctly.

### User Story 2 - Real Estate Optimization (Priority: P2)

As a user with a smaller laptop screen, I want to move help documentation into a separate tab/window so that I can maximize the Knowledge Graph visualization area while still having access to the Lore Oracle command reference.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a new route at `/help` that renders the full help guide without the main app shell (sidebar, navigation, etc.).
- **FR-002**: System MUST add a "Pop out Window" button/icon in the existing Help modal and sidebar.
- **FR-003**: The `/help` standalone page MUST maintain all interactive features: Search, Article selection, and Tag filtering.
- **FR-004**: The `/help` page MUST use the current theme (Themes) to maintain visual consistency.
- **FR-005**: The `/help` page MUST be responsive and usable at smaller window sizes.

### Technical Requirements

- **TR-001**: Component `HelpTab.svelte` (or equivalent) MUST be decoupled from the main app layout stores if they cause side-effects in the standalone route.
- **TR-002**: Trigger MUST use `window.open` with a default dimension of 800x900, centered on the screen if possible.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of help articles visible in the app modal are also visible in the `/help` route.
- **SC-002**: "Pop out" action takes less than 500ms to launch the window.
- **SC-003**: Standalone help page passes Svelte accessibility check (`svelte-check`).
