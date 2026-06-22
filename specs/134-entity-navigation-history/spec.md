# Feature Specification: Entity Navigation History

**Feature Branch**: `134-entity-navigation-history`  
**Created**: 2026-06-22  
**Status**: Draft  
**Input**: User description: "https://github.com/eserlan/Codex-Cryptica/issues/1476"

## Clarifications

### Session 2026-06-22

- Q: How should we gracefully handle navigating back to a deleted or missing entity? → A: Skip the missing entity silently and navigate to the next available history entry.
- Q: How does the system handle shortcuts when a modal is open over the main interface? → A: Disable history navigation shortcuts entirely while any modal is open, with an exception for Zen Mode (navigation should still be possible if Zen Mode is the active "modal" or full-screen state).
- Q: Should the history stack have a maximum size limit? → A: Limit the history stack to the 50 most recent items to prevent memory leaks.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Basic Forward/Backward Navigation (Priority: P1)

Users can seamlessly navigate backward and forward through entities they have opened in the current session, much like a web browser's history, without manually searching or re-opening them from the explorer.

**Why this priority**: Core functionality that delivers the biggest QoL improvement by reducing manual search time when jumping between related entities.

**Independent Test**: Can be fully tested by opening multiple entities and using the back/forward browser or app buttons.

**Acceptance Scenarios**:

1. **Given** no entities are open, **When** the user opens an entity, **Then** it is recorded in the entity navigation history.
2. **Given** entity history exists, **When** the user clicks the back button, **Then** the previously opened entity is displayed.
3. **Given** the user has navigated backward, **When** the user clicks the forward button, **Then** the next entity in the history stack is displayed.
4. **Given** the user has navigated backward, **When** the user opens a new entity, **Then** the forward history is truncated and the new entity becomes the latest entry.
5. **Given** the user opens Entity A, **When** the user opens Entity A again consecutively, **Then** a duplicate consecutive entry is avoided.
6. **Given** the user has exhausted the entity history by going all the way back, **When** they click the back button again, **Then** normal browser/app navigation takes over.

---

### User Story 2 - Keyboard Shortcuts (Priority: P2)

Users can use keyboard shortcuts (`Shift + Left Arrow`, `Shift + Right Arrow`) to navigate the entity history without using the mouse.

**Why this priority**: Power user feature that complements the basic navigation but is not strictly blocking the primary use case.

**Independent Test**: Can be tested independently by using the keyboard shortcuts while entities are open.

**Acceptance Scenarios**:

1. **Given** entity history exists, **When** the user presses `Shift + Left Arrow`, **Then** the previous entity is opened.
2. **Given** the user has navigated backward, **When** the user presses `Shift + Right Arrow`, **Then** the next entity is opened.
3. **Given** the user is typing in a text input or editor, **When** they press `Shift + Left Arrow` or `Shift + Right Arrow`, **Then** the shortcut does NOT fire and history navigation does not occur.

---

### User Story 3 - State Consistency & Guards (Priority: P2)

The Entity Explorer selection stays in sync with the active entity, and unsaved changes are protected during navigation.

**Why this priority**: Essential for preventing data loss and maintaining UI consistency, but relies on the core navigation working first.

**Independent Test**: Can be tested by navigating while having unsaved changes and observing the explorer state.

**Acceptance Scenarios**:

1. **Given** the user navigates to an entity via history, **When** the entity loads, **Then** the Entity Explorer selection updates to match the active entity.
2. **Given** an entity has unsaved changes, **When** the user attempts to navigate backward or forward via history, **Then** the existing unsaved-change protection guard is triggered.
3. **Given** the previous entity in the history was deleted or is missing, **When** the user navigates backward, **Then** the navigation gracefully skips it silently and navigates to the next available history entry.

### Edge Cases

- What happens when a user navigates back to an entity that has been deleted by another client or process? (It is skipped silently to find the next valid entry).
- What happens when a user mashes the back shortcut quickly?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST maintain an in-app entity navigation history stack per session, limited to the 50 most recent items.
- **FR-002**: System MUST intercept browser/app back and forward actions to navigate the entity history when applicable.
- **FR-003**: System MUST provide keyboard shortcuts (`Shift + Left Arrow` / `Shift + Right Arrow`) for previous/next entity navigation.
- **FR-004**: System MUST NOT trigger navigation shortcuts when the user is focused on an input, textarea, editable field, or when any modal is open (except for Zen Mode, which allows navigation).
- **FR-005**: System MUST NOT record duplicate consecutive history entries for the same entity.
- **FR-006**: System MUST truncate forward history if a new entity is opened after navigating backwards.
- **FR-007**: System MUST sync the main view's active entity with the Entity Explorer selection during history navigation.
- **FR-008**: System MUST respect existing unsaved-change guards when navigating via history.
- **FR-009**: System MUST allow normal browser/app navigation once the internal entity history stack is exhausted.
- **FR-010**: System MUST gracefully skip missing or deleted entities silently and navigate to the next available history entry without crashing.

### Key Entities

- **Entity History Stack**: Tracks the chronological order of opened entities (past, present, future).
- **Active Entity**: The currently viewed entity in the main workspace.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can navigate back and forth between at least 10 previously opened entities seamlessly.
- **SC-002**: Keyboard shortcuts do not interfere with text input or editing tasks 100% of the time.
- **SC-003**: No data loss occurs during history navigation due to proper unsaved changes guard triggering.
- **SC-004**: The feature does not break standard browser navigation when the user navigates outside of the app or when history is exhausted.
