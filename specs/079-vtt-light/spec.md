# Feature Specification: Lightweight VTT Functionality

**Feature Branch**: `079-vtt-light`
**Created**: 2026-04-05
**Status**: Draft
**Input**: User description: "light weight vtt functionality"

## Assumptions

- The application already has a map view with support for images, fog-of-war, grid overlays, and pins
- Maps in the vault may or may not have grid metadata defined; both cases must be supported
- A host/guest P2P connection model already exists for shared experiences
- The VTT feature is additive and does not alter existing map data when toggled on or off
- Session state is ephemeral by default; persistence is opt-in through explicit save actions
- Token images can use entity images when linked, or a default marker shape when freeform
- Distance measurement uses the map's existing scale definition (if any); maps without a scale default to pixel-based measurement
- The GM role is equivalent to the session host; no separate GM assignment mechanism is needed in the lightweight version

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Place and Move Tokens on a Map (Priority: P1)

A Game Master (GM) opens an existing map from their vault and enters VTT mode. They can place token markers on the map, drag them to new positions, and snap them to the grid if one is defined. Tokens can be linked to existing vault entities (characters, locations) or created as freeform markers with custom names. The GM sees all tokens and can move any of them.

**Why this priority**: This is the foundational VTT capability — without tokens and movement, there is no VTT. It delivers immediate value for solo prep and single-user map navigation.

**Independent Test**: Can be fully tested by opening a map, placing tokens, dragging them, and verifying positions persist within the session. Delivers a usable tactical map for solo GM use.

**Acceptance Scenarios**:

1. **Given** a map is open in the application, **When** the GM enters VTT mode and adds a token, **Then** the token appears on the map at the chosen position
2. **Given** tokens are placed on the map, **When** the GM drags a token to a new position, **Then** the token moves smoothly and snaps to grid cells if a grid is active
3. **Given** a token is linked to a vault entity, **When** the token is displayed, **Then** it shows the entity's name and optionally its associated image
4. **Given** a freeform token is created, **When** the GM provides a name, **Then** the token displays that name as a label

---

### User Story 2 - Select Tokens and View Details (Priority: P2)

The GM clicks a token to select it. A side panel or tooltip shows the token's name, linked entity (if any), and basic details. The GM can deselect by clicking empty space. Only one token is selected at a time in this lightweight version.

**Why this priority**: Selection enables future actions (editing, targeting, status effects) and provides necessary context for who is acting during combat. It is a supporting feature that becomes critical once multiple tokens exist.

**Independent Test**: Can be tested by selecting and deselecting tokens and verifying the correct token details are shown. Delivers clarity in multi-token scenes.

**Acceptance Scenarios**:

1. **Given** multiple tokens on the map, **When** the GM clicks a token, **Then** that token is visually highlighted and its details are shown in a side panel
2. **Given** a token is selected, **When** the GM clicks empty map space, **Then** the selection is cleared

---

### User Story 3 - Manage Turn Order and Initiative (Priority: P2)

The GM opens a turn order panel beside the map. They can add tokens to the initiative list, roll or manually assign initiative values, and advance through turns round by round. The currently active token is highlighted on the map. The GM can reorder the list by dragging entries.

**Why this priority**: Turn order is the core differentiator between a tactical VTT and a static map. It enables structured combat encounters and gives players a clear sense of whose turn it is.

**Independent Test**: Can be tested by adding tokens to initiative, advancing turns, and verifying the active token highlights on the map. Delivers a functional combat round system.

**Acceptance Scenarios**:

1. **Given** tokens exist on the map, **When** the GM adds them to the initiative list, **Then** they appear in the turn order panel with editable initiative values
2. **Given** an initiative list exists, **When** the GM advances to the next turn, **Then** the next token in order is highlighted on the map and the round counter increments when the list cycles
3. **Given** a token is the active turn, **When** the GM reorders the initiative list, **Then** the turn order updates and the next advance follows the new order

---

### User Story 4 - Measure Distance on the Map (Priority: P3)

The GM activates a measurement tool and clicks two points on the map. The application displays the distance between them in map units (feet, meters, or squares). The measurement line is visible as an overlay and disappears when the tool is deactivated.

**Why this priority**: Distance measurement is essential for tactical play (movement ranges, spell ranges, line of sight). It is lower priority than tokens and turn order because it does not block core combat flow.

**Independent Test**: Can be tested by activating the tool, clicking two points, and verifying the displayed distance matches the map scale. Delivers tactical decision support.

**Acceptance Scenarios**:

1. **Given** the measurement tool is active, **When** the GM clicks a start point and an end point, **Then** a line is drawn between them and the distance is displayed
2. **Given** a measurement is displayed, **When** the GM deactivates the tool, **Then** the measurement line and distance label disappear

---

### User Story 5 - Shared Session: Guests See Token Positions (Priority: P3)

The GM hosts a shared map session. Connected guests (players) see the same token positions, turn order, and fog reveal state as the GM in near real-time. Guests cannot move tokens unless assigned ownership of a specific token by the GM.

**Why this priority**: Multiplayer VTT is the ultimate goal, but it depends on a working single-player foundation. This story adds the P2P synchronization layer on top of the established token and turn order system.

**Independent Test**: Can be tested by hosting a session from one browser tab and joining from another, then verifying token moves by the host appear in the guest view. Delivers shared tactical play.

**Acceptance Scenarios**:

1. **Given** the GM starts a shared session, **When** a guest joins, **Then** the guest sees all tokens in the same positions as the GM
2. **Given** tokens are visible to a guest, **When** the GM moves a token, **Then** the token's new position appears for the guest within one second
3. **Given** a guest views the map, **When** the guest attempts to move a token they do not own, **Then** the token does not move and the guest is notified they lack permission

---

### Edge Cases

- What happens when a token is moved off the visible map area? (Clamp to map bounds)
- How does the system handle a token linked to a deleted vault entity? (Display as freeform with cached name)
- What happens when the host disconnects during a shared session? (Session ends for all guests; state is not preserved unless explicitly saved)
- How does the system handle two guests trying to move the same token simultaneously? (Host is authoritative; only the host's state wins)
- What happens when a map has no grid defined but grid snapping is requested? (Snapping is disabled; free placement only)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to place token markers on an existing map
- **FR-002**: System MUST allow users to drag tokens to new positions on the map
- **FR-003**: Tokens MUST snap to grid cells when a grid is defined on the map
- **FR-004**: Tokens MUST support free placement when no grid is defined
- **FR-005**: Tokens MUST be linkable to existing vault entities (displaying entity name and image)
- **FR-006**: Tokens MUST support freeform creation with a custom name (no entity link required)
- **FR-007**: System MUST allow selecting a single token at a time and display its details
- **FR-008**: System MUST provide a turn order panel listing tokens with editable initiative values
- **FR-009**: System MUST allow advancing through turns sequentially, cycling back to the first token after the last
- **FR-010**: System MUST highlight the currently active token on the map
- **FR-011**: System MUST display a round counter that increments each time the turn order cycles
- **FR-012**: System MUST allow reordering the initiative list by drag-and-drop
- **FR-013**: System MUST provide a distance measurement tool that displays the distance between two map points
- **FR-014**: System MUST support a host/guest model where the host is the authoritative source of session state
- **FR-015**: Guests MUST receive token position and turn order updates from the host in near real-time
- **FR-016**: Guests MUST NOT be able to move tokens unless explicitly assigned ownership by the host
- **FR-017**: Session state MUST be ephemeral by default and NOT persist to the vault unless explicitly saved
- **FR-018**: System MUST allow saving the current session state as an encounter snapshot to the vault
- **FR-019**: System MUST allow loading a previously saved encounter snapshot to restore session state
- **FR-020**: Fog of war reveal state MUST be separable into static map fog and session-specific reveal state
- **FR-021**: Session-specific fog reveal MUST be controlled by the host and synchronized to guests
- **FR-022**: System MUST distinguish between exploration mode (free movement) and combat mode (turn-locked movement) in its session state
- **FR-023**: System MUST handle host disconnection by ending the shared session for all participants

### Key Entities

- **Token**: A visual marker placed on a map during a VTT session. Has position (x, y), size, rotation, an optional link to a vault entity, a name, and an optional owner (peer ID for shared sessions). Exists only within a session unless saved as part of an encounter snapshot.
- **Encounter Session**: An ephemeral or saved state associated with a map during a VTT session. Contains token positions, initiative order, current turn, round number, session mode (exploration/combat), and fog reveal state. Can be saved to or loaded from the vault as an encounter snapshot.
- **Initiative Entry**: A reference to a token within an ordered list. Has an initiative value (numeric), a reference to the token, and optional metadata (e.g., whether the token has acted this round).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A GM can place and move at least 10 tokens on a map with smooth interaction (no visible lag under 16 frames per second for local use)
- **SC-002**: Token position updates propagate to connected guests within 1 second of the host's action in a shared session
- **SC-003**: A user can complete a full combat round (add tokens to initiative, advance through all turns) in under 30 seconds for a 5-token encounter
- **SC-004**: Distance measurements between any two points on a map display accurate results within 1 unit of the map's defined scale
- **SC-005**: 95% of users can successfully place a token, move it, and advance one turn without assistance or referring to documentation
- **SC-006**: A saved encounter snapshot can be loaded and restored to its previous state within 3 seconds
- **SC-007**: The VTT session layer operates independently of the underlying map data — toggling VTT mode on or off does not alter the saved map state (pins, fog, grid)
