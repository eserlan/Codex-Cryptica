# Feature Specification: Entity Explorer Desktop Two-Column Layout

**Feature Branch**: `133-entity-explorer-layout`
**Created**: 2026-06-21
**Status**: Draft
**Input**: User description: "Issue #1475: On large screens, when the Entity Explorer is open, use a two-column workspace layout with the Entity Explorer on the left and a focused entity view on the right. Only apply this on wide screens and only when the explorer is open. Preserve current drawer behavior on smaller screens, restore single-column layout when closed or another sidebar tool is active, keep main content readable, and avoid horizontal scrolling."

## Clarifications

### Session 2026-06-21

- Q: When an entity is selected from the open desktop Entity Explorer, what should appear in the right-hand column? -> A: The entity reader/editor, matching the current Zen Mode exactly.
- Q: When the Entity Explorer is not in the wide-screen two-column layout, what should selecting an entity do? -> A: Preserve current behavior by opening the selected entity in full-screen Zen Mode.
- Q: What existing state should activate the desktop two-column layout? -> A: The Explorer is open and active on a wide screen, reusing the existing persisted sidebar state.

### Session 2026-06-22

- Q: At which viewport width should the two-column layout begin? -> A: The `xl` breakpoint, 1280px and wider.
- Q: In the desktop two-column layout, what should the Zen Mode close action do? -> A: Clear the focused entity from the right column and leave the Entity Explorer open.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse and Focus Side by Side (Priority: P1)

As a desktop user working in a wide browser window, I want the open Entity Explorer to stay visible beside the current entity view, so I can navigate while reading or editing without losing focus.

**Why this priority**: This is the core value of the feature and directly addresses the desktop productivity problem described in the issue.

**Independent Test**: Open the Entity Explorer at a viewport width of 1280px or greater and verify the workspace switches into a stable two-column layout with persistent navigation on the left and focused entity content on the right.

**Acceptance Scenarios**:

1. **Given** a viewport at least 1280px wide and an open, active Entity Explorer, **When** the user selects or switches entities, **Then** the app shows a two-column workspace with the explorer on the left and the selected entity reader/editor on the right.
2. **Given** an entity reader/editor is shown in the right column, **When** the user compares it with the current Zen Mode, **Then** it provides the same visual presentation and editing capabilities.
3. **Given** the two-column workspace is active, **When** the user continues reading or editing entity content, **Then** the primary reading/editor column remains visible without page-level horizontal scrolling and preserves at least 640px of usable content width at a 1440px viewport.
4. **Given** the selected entity reader/editor is shown in the two-column workspace, **When** the user uses its Zen Mode close action, **Then** the right column returns to its empty state while the Entity Explorer remains open.

---

### User Story 2 - Preserve Existing Responsive Behavior (Priority: P2)

As a user on a smaller laptop, tablet, or mobile screen, I want the Entity Explorer to keep its current drawer behavior, so the new desktop layout does not make smaller screens harder to use.

**Why this priority**: The issue explicitly requires no regression to the current responsive experience on small and medium screens.

**Independent Test**: Open the app below 1280px, open the Entity Explorer, and verify it still behaves as the existing drawer or side panel instead of forcing a two-column workspace.

**Acceptance Scenarios**:

1. **Given** a viewport narrower than 1280px, **When** the user opens the Entity Explorer, **Then** the app preserves the current responsive drawer or sidepanel behavior.
2. **Given** the user resizes from 1280px or wider to a narrower viewport, **When** the layout re-evaluates, **Then** the app returns to the existing smaller-screen behavior without clipping or horizontal scrolling.
3. **Given** the Entity Explorer is not in the wide-screen two-column layout, **When** the user selects an entity, **Then** the app opens it in the existing full-screen Zen Mode.

---

### User Story 3 - Return to Single-Column Focus (Priority: P3)

As a user who no longer wants persistent navigation visible, I want closing the Entity Explorer or switching to another sidebar tool to restore the normal single-column workspace, so I can return to a distraction-free reading or editing mode.

**Why this priority**: The feature must remain reversible and respect the user’s current sidepanel preference.

**Independent Test**: Activate the two-column layout at a viewport width of 1280px or greater, then close the Entity Explorer or switch to another sidebar tool and verify the workspace returns to the standard single-column layout.

**Acceptance Scenarios**:

1. **Given** the two-column workspace is active at a viewport width of 1280px or greater, **When** the user closes the Entity Explorer or activates another sidebar tool, **Then** the app restores the normal single-column layout.
2. **Given** the app remembers the active sidebar state, **When** the user returns to the workspace later, **Then** the remembered open Entity Explorer state produces the matching layout for the current screen size.

### Edge Cases

- If the viewport sits near 1280px, layout changes must not flicker or repeatedly switch while the user resizes the window; each threshold crossing should produce at most one workspace mode change.
- If the open Entity Explorer contains enough content to scroll, the explorer and the main content area must remain usable without introducing page-level horizontal scrolling.
- If there is no active entity selected, the main column must still present a stable, readable empty or placeholder state beside the open Entity Explorer.
- If the user closes the selected entity reader/editor in the two-column workspace, the right column must return to its stable empty state without closing the Entity Explorer.
- If the user closes the Entity Explorer or activates another sidebar tool while already on a smaller screen, the layout must remain in the existing responsive mode instead of trying to enter desktop split view.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST activate a two-column workspace layout only when the viewport is at least 1280px wide (`xl`) and the Entity Explorer is open and active, reusing the existing persisted sidebar state.
- **FR-002**: The system MUST place the Entity Explorer in the left column and the selected entity reader/editor in the main right column while the two-column workspace is active.
- **FR-002a**: The selected entity reader/editor in the right column MUST match the current Zen Mode visual presentation and editing capabilities.
- **FR-002b**: In the two-column workspace, the Zen Mode close action MUST clear the selected entity from the right column while leaving the Entity Explorer open.
- **FR-003**: The system MUST preserve the current drawer or sidepanel behavior for viewports narrower than 1280px.
- **FR-003a**: Outside the two-column layout, selecting an entity from the Entity Explorer MUST continue to open the existing full-screen Zen Mode.
- **FR-004**: The system MUST restore the standard single-column workspace when the Entity Explorer is closed or another sidebar tool becomes active.
- **FR-005**: The system MUST keep the main content area within a readable width while the two-column workspace is active by preserving at least 640px of usable width for the primary entity content column at a 1440px viewport.
- **FR-006**: The system MUST avoid horizontal scrolling and visible clipping in both the two-column and single-column states.
- **FR-007**: The system MUST keep the layout stable while users switch entities, read content, edit content, and resize across supported viewport ranges such that each crossing of the 1280px threshold triggers at most one workspace mode transition.
- **FR-008**: The system MUST honor the existing remembered sidebar-open and active-tool state when deciding whether to use the two-column workspace.

### Key Entities _(include if feature involves data)_

- **Entity Explorer State**: The existing persisted sidebar state that determines whether the explorer is open and active, closed, or another sidebar tool is active.
- **Workspace Layout Mode**: The current presentation mode of the entity workspace, either the standard single-column layout or the wide-screen two-column layout.
- **Viewport Class**: A viewport at least 1280px wide (`xl`) is eligible for the two-column workspace; narrower viewports retain the existing responsive behavior.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On a viewport at least 1280px wide with the Entity Explorer open and active, users can keep navigation visible while viewing entity content without horizontal scrolling.
- **SC-002**: On viewports narrower than 1280px, users continue to experience the existing Entity Explorer behavior with no new split-layout presentation.
- **SC-003**: Closing the Entity Explorer or activating another sidebar tool at a viewport width of 1280px or greater returns the workspace to the normal single-column layout in a single interaction.
- **SC-003a**: Closing the focused entity in the two-column workspace clears the right column while the Entity Explorer remains open.
- **SC-004**: During manual resizing across supported viewport sizes, each crossing of the 1280px threshold results in at most one workspace mode transition, with no persistent clipping or overlapping panels after the transition settles.
- **SC-005**: In the two-column workspace at a 1440px viewport, the primary entity content column retains at least 640px of usable width and introduces no page-level horizontal scrolling during typical reading and editing tasks.
