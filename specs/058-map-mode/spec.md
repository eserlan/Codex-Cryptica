# Feature Specification: Interactive Campaign Mapping & Spatial Lore

**Feature Branch**: `058-map-mode`  
**Created**: 2026-02-23  
**Status**: Implemented
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

As a Lore Keeper, I want to drop pins on my map and link them directly to my existing notes, so that clicking a geographic location instantly surfaces the relevant lore. I also want to be able to drag existing pins on the map to easily rearrange their coordinates.

**Why this priority**: Connects the new spatial mode with the existing knowledge base, and supports intuitive organization of pin coordinates.

**Independent Test**: Can be tested by dropping a pin, dragging it to a new location, verifying that coordinates update live, and that clicking the pin selects/opens the note.

**Acceptance Scenarios**:

1. **Given** a map is active, **When** I double-click/long-press an area, **Then** a new pin is created at those coordinates.
2. **Given** a map is active, **When** I drag an entity from the Entity Explorer and drop it on the map, **Then** a pin pre-linked to that entity is created at the drop position.
3. **Given** a map with existing pins, **When** I click and drag a pin to a new coordinate, **Then** its position is updated live in-memory and persisted back to the vault on release.
4. **Given** a pin, **When** I click/tap on it (releasing without triggering the dragging threshold), **Then** the linked note opens in the side-panel.

---

### User Story 3 - Fog of War Progression (Priority: P2)

As a Lore Keeper, I want to mask areas of the map that players haven't reached, so that I can manage mystery and reveal the world as the campaign progresses. By default, maps should start with Fog of War off, and the brush controls and guidelines should only be visible when Fog of War is enabled.

**Why this priority**: Critical for "Discovery" play loop and GM control.

**Independent Test**: Verify that maps initialize with fog disabled. Enable fog, verify brush size slider and "Alt+Drag" keyboard guides appear, paint a mask, and verify the state is persisted.

**Acceptance Scenarios**:

1. **Given** a map, **When** I load the map, **Then** Fog of War is OFF by default.
2. **Given** a map, **When** I turn Fog of War ON, **Then** the brush size slider and keyboard guides ("Alt+Drag to Reveal") are shown in the bottom control bar/HUD.
3. **Given** a map, **When** Fog of War is OFF, **Then** the brush size slider and guidelines are hidden.
4. **Given** a masked area, **When** I reveal it, **Then** the mask is removed and the underlying map detail is visible.

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
- **FR-003a**: System MUST support creating a pre-linked pin by dragging an entity from the Entity Explorer onto the map.
- **FR-004**: System MUST adapt UI borders and grids based on the active theme (Sci-Fi vs Fantasy).
- **FR-005**: System MUST provide a toggleable tactical grid (Hex/Square) over the map.
- **FR-006**: System MUST support "Jump to Location" search that pans/zooms to a specific pin.
- **FR-007**: System MUST provide a mechanism to mask/unmask portions of the map (Fog of War) with full persistence.
- **FR-008**: System MUST allow entities to serve as "Containers" for sub-maps, enabling hierarchical navigation.
- **FR-009**: System MUST support deep-linking from map pins to specific entity detail tabs (Overview vs Map) via Zen Mode.
- **FR-010**: System MUST provide a mechanism to permanently delete map assets and their associated metadata.
- **FR-011**: System MUST show a direct "Enter Sub-map" action on pins linked to entities that contain their own map assets.
- **FR-012**: System MUST provide a toggle to show/hide pin labels inside the map controls HUD.
- **FR-013**: System MUST support directly dragging and repositioning existing pins with live coordinate preview and automatic vault saving on drop.

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
