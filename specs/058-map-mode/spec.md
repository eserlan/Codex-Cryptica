# Feature Specification: Interactive Campaign Mapping & Spatial Lore

**Feature Branch**: `058-map-mode`  
**Created**: 2026-02-23  
**Status**: Draft  
**Input**: User description: "map mode https://github.com/eserlan/Codex-Cryptica/issues/237"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Geographic Visualization (Priority: P1)

As a Lore Keeper, I want to upload a custom world or tactical image and use it as a canvas for my campaign, so that I can visualize the spatial relationships of my world beyond just a text list.

**Why this priority**: Core value proposition. Transitions the app from a document manager to a spatial tool.

**Independent Test**: Can be fully tested by uploading an image, zooming/panning, and verifying the image remains crisp and responsive.

**Acceptance Scenarios**:

1. **Given** no map exists, **When** I upload a high-resolution JPG/PNG, **Then** the map is rendered as the primary viewport.
2. **Given** a map is active, **When** I use mouse/touch to pan or zoom, **Then** the interaction is fluid and maintains visual context.

---

### User Story 2 - Spatial Lore Pins (Priority: P1)

As a Lore Keeper, I want to drop pins on my map and link them directly to my existing notes, so that clicking a geographic location instantly surfaces the relevant lore.

**Why this priority**: Connects the new spatial mode with the existing knowledge base.

**Independent Test**: Can be tested by dropping a pin, linking it to an NPC note, and verifying that clicking the pin opens the NPC detail panel.

**Acceptance Scenarios**:

1. **Given** a map is active, **When** I double-click/long-press an area, **Then** a new pin is created at those coordinates.
2. **Given** a pin exists, **When** I select an existing chronicle to link, **Then** the pin's metadata is updated and the link is persisted.
3. **Given** a linked pin, **When** I click it, **Then** the linked note opens in the side-panel.

---

### User Story 3 - Fog of War Progression (Priority: P2)

As a Lore Keeper, I want to mask areas of the map that players haven't reached, so that I can manage mystery and reveal the world as the campaign progresses.

**Why this priority**: Critical for "Discovery" play loop and GM control.

**Independent Test**: Can be tested by "painting" a mask over an area and verifying it is opaque until explicitly revealed.

**Acceptance Scenarios**:

1. **Given** a map, **When** I enter "Fog Mode" and select an area to mask, **Then** that area is covered by a themed overlay.
2. **Given** a masked area, **When** I reveal it, **Then** the mask is removed and the underlying map detail is visible.
3. **Given** a revealed map area, **When** the app is reloaded, **Then** the reveal state is persisted to the vault.

---

### User Story 4 - Hierarchical & Entity-Linked Maps (Priority: P2)

As a Lore Keeper, I want to attach maps to specific entities (like a city or a tavern) and navigate between them, so that I can dive from a world-level view down to a specific location's floor plan.

**Why this priority**: Supports the hierarchical nature of world-building.

**Independent Test**: Can be tested by clicking a "City" pin on a World map and verifying it opens the sub-map associated with that City entity.

**Acceptance Scenarios**:

1. **Given** an Entity (e.g., "Baldur's Gate"), **When** I view its profile, **Then** I can upload a map asset specifically for that entity.
2. **Given** a pin linked to an Entity that has its own map, **When** I interact with the pin, **Then** I have the option to "Enter Location" to switch the active map to the sub-map.

---

### User Story 5 - Deferred: Visual Connection Web (Priority: P3)

**Note**: Creating visual edges (lines) between pins is deferred to a later release per user feedback.

---

### Edge Cases

- **Map Image Deletion**: What happens to pins if the underlying map image is deleted or missing from local storage? (Acceptance: User should be warned; pins should ideally remain as "orphans" or be deleted with confirmation).
- **Extreme Zoom**: How does the system handle tiny pins at massive zoom-outs? (Acceptance: Pins should cluster or scale to maintain visibility).
- **Coordinate Drift**: How do we ensure pins stay locked to the exact pixel location if the container size changes? (Acceptance: Pins must be relative to the original image dimensions, not the viewport).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support high-resolution image uploads (JPG, PNG, WebP).
- **FR-002**: System MUST persist pin coordinates relative to map image dimensions.
- **FR-003**: System MUST allow linking pins to exactly one primary Entity ID.
- **FR-004**: System MUST adapt UI borders and grids based on the active theme (Sci-Fi vs Fantasy).
- **FR-005**: System MUST provide a toggleable tactical grid (Hex/Square) over the map.
- **FR-006**: System MUST support "Jump to Location" search that pans/zooms to a specific pin.
- **FR-007**: System MUST provide a mechanism to mask/unmask portions of the map (Fog of War) with full persistence.
- **FR-008**: System MUST allow entities to serve as "Containers" for sub-maps, enabling hierarchical navigation.

### Key Entities _(include if feature involves data)_

- **Map**: Represents a geographic image asset. Attributes: `id`, `name`, `filePath`, `width`, `height`, `parentEntityId` (optional).
- **Pin**: A spatial marker on a Map. Attributes: `id`, `mapId`, `coordinates: {x, y}`, `entityId` (linked lore), `icon`, `color`.
- **MapMask**: Data representing the persistent Fog of War state for a specific Map.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Panning and zooming 1000+ pins on a 4K map image maintains 60 FPS.
- **SC-002**: Pins accurately resolve to their linked notes in under 200ms when clicked.
- **SC-003**: Map state (pins, masks) is fully persisted to the local vault and survives application reloads.
- **SC-004**: Users can transition from "World View" to a specific "City View" in fewer than 3 clicks.
