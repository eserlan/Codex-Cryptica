# Feature Specification: ZenModeModal Refactor

**Feature Branch**: `071-zenmode-refactor`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "zenmode refactor, look at docs/refactoring/ZEN_MODE_REFACTOR.md"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Maintain Reliable Entity Management (Priority: P1)

As a user, I want to be able to view and edit entity metadata (title, content, lore, dates, images) exactly as I did before the refactor, so that my workflow remains uninterrupted.

**Why this priority**: Core functionality must remain stable during internal architectural changes.

**Independent Test**: Can be fully tested by verifying that all fields in the "Overview" and "Edit" modes populate correctly and persist upon saving.

**Acceptance Scenarios**:

1. **Given** a selected entity, **When** I open Zen Mode, **Then** I should see the correct title, category, and content rendered.
2. **Given** I am in Edit mode, **When** I change the title and click "Save", **Then** the vault should update and the new title should be displayed in View mode.

---

### User Story 2 - Seamless Content Sharing (Priority: P2)

As a user, I want to copy the entity's chronicle and lore to my clipboard with all formatting and images preserved, so that I can easily share or document my world outside the application.

**Why this priority**: The "Copy to Clipboard" feature is a high-value utility that involves complex multi-format processing.

**Independent Test**: Can be tested by clicking the "Copy" button and pasting into an HTML-aware editor (like Google Docs) and a plain text editor to verify formatting and image inclusion.

**Acceptance Scenarios**:

1. **Given** an entity with an image and rich content, **When** I click the "Copy" action, **Then** the clipboard should contain HTML, Plain Text, and PNG data.

---

### User Story 3 - Immersive Media Interaction (Priority: P2)

As a user, I want to view entity images in a full-screen lightbox with proper focus management and accessibility, so that I can focus on the visual details of my world.

**Why this priority**: Enhances the "Zen" experience and ensures accessibility standards are met.

**Independent Test**: Can be tested by opening the lightbox, verifying focus is trapped within the modal, and ensuring the "Escape" key closes it.

**Acceptance Scenarios**:

1. **Given** an entity with an image, **When** I click the image, **Then** a full-screen lightbox should open.
2. **Given** the lightbox is open, **When** I press "Escape", **Then** the lightbox should close and return focus to the trigger button.

---

### Edge Cases

- **Rapid Tab Switching**: Switching between Overview and Map while a save operation is in progress.
- **Malformed Images**: Handling entities where the image URL is broken or the blob cannot be resolved during copy.
- **Unsaved Changes Navigation**: Navigating to a connected entity while in Edit mode must trigger a confirmation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST extract the header (title, category icon, action buttons) into a modular `ZenHeader` component.
- **FR-002**: System MUST extract the sidebar (labels, image, connections) into a modular `ZenSidebar` component.
- **FR-003**: System MUST extract the main content area (temporal data, markdown editors) into a modular `ZenContent` component.
- **FR-004**: System MUST extract the image viewer logic into a standalone `ZenImageLightbox` component.
- **FR-005**: System MUST isolate the complex clipboard construction logic (HTML/Canvas/Blobs) into a dedicated `ClipboardService`.
- **FR-006**: System MUST decouple the edit buffer state (`$state` variables for editing) into a specialized `useEditState` hook.
- **FR-007**: System MUST decouple CRUD actions and modal lifecycle logic into a `useZenModeActions` hook.
- **FR-008**: The refactored `ZenModeModal.svelte` MUST be reduced to under 250 lines, serving primarily as a structural orchestrator.

### Key Entities

- **ZenModeModal**: The top-level container component.
- **EditBuffer**: A transient state object representing unsaved changes to an entity.
- **ClipboardItem**: A multi-format representation of entity data for external sharing.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Physical lines of code in `ZenModeModal.svelte` reduced by at least 70% (Target: < 250 lines).
- **SC-002**: Zero functional regressions in viewing, editing, deleting, or copying entities (verified by E2E suite).
- **SC-003**: 100% of clipboard operations successfully include HTML and Plain Text formats.
- **SC-004**: All new UI components (`ZenHeader`, etc.) are independently testable with standard component tests.
