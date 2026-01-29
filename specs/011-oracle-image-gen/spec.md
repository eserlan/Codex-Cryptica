# Feature Specification: Oracle Image Generation

**Feature Branch**: `011-oracle-image-gen`  
**Created**: 2026-01-28  
**Status**: Draft  
**Input**: User description: "image generation in oracle chat"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Instant Visualizing (Priority: P1)

As a world-builder, I want to ask the Lore Oracle to generate a visual representation of a character or place I've described, so that I can see my ideas come to life instantly.

**Why this priority**: Core value proposition. Provides immediate visual inspiration during the creative process.

**Independent Test**: Can be fully tested by asking "Draw a picture of a [description]" and seeing an image appear in the chat stream.

**Acceptance Scenarios**:

1. **Given** the Oracle is active, **When** I type "Generate an image of a dark iron tavern", **Then** the system displays a placeholder/loading state and eventually renders a generated image within the message bubble.
2. **Given** an image has been generated, **When** I click the image, **Then** it opens in a full-screen lightbox for closer inspection.

---

### User Story 2 - Archiving Visuals (Priority: P2)

As a GM, I want to save a generated image to a specific vault entity, so that it becomes part of my permanent campaign records.

**Why this priority**: High utility. Connects the ephemeral chat interaction to the permanent vault storage.

**Independent Test**: Can be tested by clicking an "Attach to Entity" button on a generated image and verifying it appears in the target entity's detail panel.

**Acceptance Scenarios**:

1. **Given** a generated image in the chat, **When** I click "SAVE TO [ACTIVE ENTITY]", **Then** the image URL is persisted to the entity's metadata and displayed in the Detail Panel.

---

### User Story 3 - Contextual Generation (Priority: P3)

As a creator, I want the Oracle to use my existing notes as context for the image generation, so that the visual style remains consistent with my established world lore.

**Why this priority**: Enhances immersion and consistency.

**Independent Test**: Can be tested by asking "Generate a portrait of Eldrin" (an existing NPC) and verifying the prompt sent to the AI includes Eldrin's descriptive notes from the vault.

**Acceptance Scenarios**:

1. **Given** I am viewing the "Eldrin the Wise" entity, **When** I ask "Show me what he looks like", **Then** the system automatically appends Eldrin's descriptive text to the image generation prompt.

---

### User Story 4 - Visual Drag-and-Drop (Priority: P2)

As a power user, I want to drag a generated image from the chat window directly onto the entity detail panel, so that I can quickly assign visuals to my records with a single fluid motion.

**Why this priority**: High UX value. Provides a modern, intuitive alternative to button-based archiving.

**Independent Test**: Can be tested by dragging an image from an Oracle message and dropping it onto the "Image" area of the Detail Panel, then verifying the change persists.

**Acceptance Scenarios**:

1. **Given** a generated image in the chat and the Detail Panel open for an entity, **When** I drag the image and drop it onto the Detail Panel, **Then** the entity's image is updated and the change is saved to the vault.

---

### Edge Cases

- **Invalid Prompt**: What happens when the AI refuses to generate an image (e.g., safety filter)? The system MUST show a clear, non-technical error message ("The Oracle cannot visualize that right now").
- **Connectivity Loss**: How does the system handle a network failure during generation? It SHOULD show a "Retry" button.
- **Quota/Cost**: What happens if the API key reaches its limit? Show a notification explaining the quota limit.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an interface for triggering image generation via natural language (e.g., "/draw", "show me", "visualize").
- **FR-002**: System MUST display generation progress (loading state) to the user.
- **FR-003**: System MUST render generated images directly within the Oracle chat stream.
- **FR-004**: System MUST allow users to expand generated images into a lightbox view.
- **FR-005**: System MUST allow users to archive generated images to the currently selected entity.
- **FR-006**: System MUST use 'Nano Banana' (Google Gemini 2.5 Flash Image) for image generation.
- **FR-007**: System MUST support local persistence of images within the vault (OPFS) ONLY when explicitly attached to an entity. Ephemeral chat images SHOULD use temporary blob URLs.
- **FR-008**: System MUST support dragging generated images from the chat and dropping them onto the Entity Detail Panel to trigger local persistence and update the entity's image.
- **FR-009**: System MUST automatically generate a low-resolution thumbnail (128px) for every archived image to optimize Knowledge Graph performance.
- **FR-010**: System MUST automatically retrieve and apply "Art Style" or "Aesthetic" guidelines from the vault to ensure visual consistency across generated images.
- **FR-011**: System MUST provide a "Note" default category for miscellaneous information that does not fit into characters or locations.

## Clarifications

### Session 2026-01-28
- **Q**: which image generation provider/API should be used? → **A**: Nano Banana (Gemini 2.5 Flash Image).
- **Q**: should images be stored locally in the vault or just linked via URL? → **A**: Local Persistence (OPFS).

## Key Entities _(include if feature involves data)_

- **ChatMessage**: Updated to support a new content type: `image_url`.
- **Entity**: Metadata updated to support an `image` field (if not already present).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can trigger an image generation within 2 seconds of sending a query.
- **SC-002**: Images are rendered in the chat bubble with a maximum dimension of 512px (preview) and original size (lightbox).
- **SC-003**: 95% of successful generations results in a visible image within 15 seconds.
- **SC-004**: Users can successfully save an image to an entity in fewer than 3 clicks.