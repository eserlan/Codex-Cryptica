# Feature Specification: Map Page Decomposition

**Feature Branch**: `103-map-page-decomposition`
**Created**: 2026-05-20
**Status**: Implemented
**Input**: User description: "Decompose monolithic map page route coordinator into focused controller and sub-components based on analysis in MAP_PAGE_ANALYSIS.md"

## Clarifications

### Session 2026-05-20

- Q: What should own the chat/sidebar offset behavior after the refactor? -> A: `layoutUIStore` owns offsets; controller reads derived values.
- Q: When a guest user drops an entity onto the map, what should happen? -> A: Block the drop and show a guest-safe message.
- Q: If the active vault changes while a map upload session is open, what should the controller do? -> A: Cancel the upload session and clear pending state.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Centralized Interaction Management (Priority: P1)

As a developer, I want all drag-and-drop and map orchestration logic extracted into a controller so that the main route component is focused strictly on layout.

**Why this priority**: Core architecture shift. It enables all subsequent component extractions by providing a unified API for interaction logic.

**Independent Test**: Drag an entity onto the map and verify it still adds a pin (Standard) or token (VTT) correctly, using the new controller's handlers.

**Acceptance Scenarios**:

1. **Given** the map page is open, **When** an entity is dropped on the map, **Then** the `MapPageController` handles the unprojection and entity creation logic.
2. **Given** no map is uploaded, **When** a file is dropped, **Then** the `MapPageController` triggers the upload session state.

---

### User Story 2 - Modular Map Toolbars (Priority: P2)

As a user, I want the map interface to remain responsive and functional while its internal components (HUD, GM Controls) are refactored into modular units.

**Why this priority**: Improves maintainability of the high-density map UI.

**Independent Test**: Toggle Fog of War and Grid settings using the extracted `MapVTTControlsHUD` and verify the `mapStore` state updates correctly.

**Acceptance Scenarios**:

1. **Given** GM mode is active, **When** the Fog toggle is clicked in the new HUD, **Then** the map fog visibility updates.

---

### User Story 3 - Streamlined VTT Sidebar (Priority: P3)

As a user, I want a dedicated VTT sidebar component that handles token management and initiative without bloating the main page logic.

**Why this priority**: Reduces visual noise and nesting depth in the route coordinator.

**Independent Test**: Open the initiative panel and select a token from the extracted `MapVTTSidebar`; verify detail view updates.

**Acceptance Scenarios**:

1. **Given** VTT is enabled, **When** the VTT sidebar is expanded, **Then** it correctly renders the entity list and token details using localized logic.

### Edge Cases

- **Rapid Initialization**: If the active vault changes while a map upload session is open, the controller MUST cancel the upload session and clear pending file and name state before continuing initialization.
- **Guest Restriction**: When a guest user attempts a GM-only interaction such as dropping an entity onto the map, the controller MUST block the action and show a guest-safe message.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Decompose `+page.svelte` into a `MapPageController` and at least 4 sub-components.
- **FR-002**: Move all drag-and-drop orchestration to the controller.
- **FR-003**: Encapsulate upload form state (name, file list) within the controller or a dedicated sub-component.
- **FR-004**: Replace hardcoded CSS layout offsets by making `layoutUIStore` the single source of truth for layout offsets, with `MapPageController` consuming derived values from that store.
- **FR-005**: Maintain 100% functional parity with the existing monolithic implementation.
- **FR-006**: When a guest user attempts a GM-only map mutation, the controller MUST reject the action and surface a clear guest-safe message.
- **FR-007**: When the active vault changes during an open map upload session, the controller MUST cancel the session and clear any pending upload form state.

### Key Entities

- **MapPageController**: A Svelte 5 reactive class managing route-specific interaction state.
- **HUD Components**: `MapHUD`, `MapVTTSidebar`, `MapVTTControlsHUD`, `MapUploadOverlay`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Reduce `+page.svelte` line count from 738 to under 150 lines.
- **SC-002**: 100% pass rate on existing Map and VTT integration tests.
- **SC-003**: `MapPageController` has 80%+ unit test coverage.
- **SC-004**: No "State Referenced Locally" or "State Referenced Outside Closure" warnings in the refactored modules.
