# Feature Specification: Show Entity Image to Guests

**Feature Branch**: `119-show-entity-image`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: User description: "As a host, I need to be able to show the image of a entity to my guests"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Host Shares Entity Image (Priority: P1)

As a host viewing an entity's image in the detail panel or zen view, I can broadcast the entity's image to all connected guests with a single click.

**Why this priority**: Core requirement of the feature. Host needs to initiate sharing.

**Independent Test**: Start hosting a session. Open an entity detail panel that has an image. Click the "Show to Guests" button. Verify the message is sent.

**Acceptance Scenarios**:

1. **Given** the host is actively hosting a P2P session, **When** they view an entity with a valid image, **Then** a "Show to Guests" button is visible under the image in the detail panel and in the Zen lightbox view.
2. **Given** the host clicks "Show to Guests", **When** the action completes, **Then** a success toast "Shared image with guests" is displayed to the host, and the `SHOW_TOKEN_IMAGE` message is sent to all connected guests.

---

### User Story 2 - Guest Receives and Views Shared Image (Priority: P2)

As a guest connected to a host's session, I will see the shared entity image in a lightbox immediately, regardless of which app page I am currently viewing.

**Why this priority**: Required for the shared experience to function, and ensures guests do not miss shared images if they aren't on the map screen.

**Independent Test**: Connect a guest browser to the host's session and navigate to a non-map page (e.g., `/vault`). Trigger image sharing from the host. Verify the lightbox opens automatically for the guest.

**Acceptance Scenarios**:

1. **Given** a guest is connected to a session, **When** the host broadcasts an image, **Then** a full-screen lightbox containing the entity image and title opens on the guest's browser on any page.
2. **Given** the guest has the lightbox open, **When** the guest clicks the close button or backdrop, or presses Escape, **Then** the lightbox closes.

---

### Edge Cases

- **No Active Session**: If the host is not currently hosting a P2P session, the "Show to Guests" option must not be visible.
- **Entity Lacks Image**: If the entity has no image, the "Show to Guests" button must not be rendered.
- **Slow P2P Network**: If the P2P connection is slow to transfer the image file, the guest should see a loading state inside the lightbox while the image resolves.
- **Guest on Map Page**: If the guest is on the `/map` page, they should see the lightbox, and it should not conflict with existing map-specific VTT elements.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST render a "Show to Guests" button/icon in the entity detail panel (`DetailImage.svelte`) only when `p2pHost.isHosting` is true and `entity.image` is set.
- **FR-002**: The system MUST render a "Show to Guests" button/icon in the full-screen Zen lightbox (`ZenImageLightbox.svelte`) only when `p2pHost.isHosting` is true.
- **FR-003**: The host clicking "Show to Guests" MUST invoke a method on `mapSession` (such as `mapSession.showImageToPlayers(title, imagePath)`) to broadcast a `SHOW_TOKEN_IMAGE` message.
- **FR-004**: The system MUST render `VTTSharedImageLightbox` globally inside `apps/web/src/routes/(app)/+layout.svelte` for guests (`sessionModeStore.isGuestMode` is true) so they receive the shared image notification and see the lightbox on any app route, rather than only on the `/map` page.
- **FR-005**: The system MUST show a toast notification "Shared image with guests" to the host when they successfully broadcast an image.

### Key Entities

- **EncounterSession (VTTMessage)**: The existing P2P messaging structure. It uses the `SHOW_TOKEN_IMAGE` message type which includes a `title` and `imagePath`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Host can share an entity image in under 2 clicks from the detail view.
- **SC-002**: Guests receive and display the shared image within 1 second of broadcast (network transport permitting).
- **SC-003**: Lightbox opens automatically on the guest's active page and closes cleanly when dismissed by the guest.
