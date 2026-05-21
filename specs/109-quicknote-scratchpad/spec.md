# Feature Specification: QuickNote Fast Scratchpad & AI Entity Elevation

**Feature Branch**: `109-quicknote-scratchpad`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "QuickNote Fast Scratchpad & AI Entity Elevation"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Instant Idea Dump (Priority: P1)

As a Game Master, I want to instantly capture a fleeting idea (like a sudden NPC name or plot hook) without leaving my current view or breaking my flow, so that I don't lose creative sparks during a session.

**Why this priority**: Speed of capture is essential for Game Masters who are multi-tasking during live play.

**Independent Test**: Can be tested by pressing a hotkey and typing a note; verifying it saves instantly without UI lag.

**Acceptance Scenarios**:

1. **Given** any view in the app, **When** I press `Ctrl+I` or `Cmd+I`, **Then** a floating scratchpad appears instantly.
2. **Given** the scratchpad is open, **When** I type "Captain Zog is a friendly pirate" and close it, **Then** the note is persisted to local storage.

---

### User Story 2 - AI Entity Elevation (Priority: P1)

As a Game Master, I want to take a raw, unformatted note and have the Oracle automatically structure it into a proper wiki entity (NPC, Location, etc.), so that my quick dumps become part of the world lore with minimal effort.

**Why this priority**: Manual data entry is the biggest barrier to maintaining a detailed world wiki.

**Independent Test**: Can be tested by clicking "Elevate" on a note and verifying the Oracle produces a valid entity draft.

**Acceptance Scenarios**:

1. **Given** a saved note about a "Dark Forest", **When** I click the "Elevate" button, **Then** the Oracle proposes a new "Location" entity with generated Lore and Chronicles.
2. **Given** an elevated entity proposal, **When** I approve it, **Then** it is saved to the vault and the original note is archived.

---

### User Story 3 - Visual Brainstorming (Priority: P2)

As a Game Master, I want to see my quick notes as temporary "dotted" nodes on the relationship graph, so that I can visually organize concepts and their potential connections before they are finalized as wiki entries.

**Why this priority**: Spatial organization helps in understanding complex relationships between new ideas.

**Independent Test**: Can be tested by opening the graph and verifying that un-elevated notes appear with a distinct "draft" style.

**Acceptance Scenarios**:

1. **Given** several quick notes, **When** I open the Graph View, **Then** the notes appear as nodes with dotted borders and a unique tint.
2. **Given** a draft node on the graph, **When** I finalize/elevate it, **Then** its visual style changes to a standard "wiki" node style.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a floating, non-modal scratchpad accessible via global hotkey (`Ctrl+I` / `Cmd+I`) and UI toggle.
- **FR-002**: System MUST persist notes to a lightweight IndexedDB store (`quick_notes`) immediately upon typing (auto-save).
- **FR-003**: System MUST provide a "One-Click Elevate" action for each note that sends the content to the Oracle engine.
- **FR-004**: The Oracle engine MUST extract name, category (NPC, Location, Faction, etc.), and draft content from raw notes.
- **FR-005**: System MUST render "Note" entities on the Cytoscape graph using a distinct "Dotted Draft" visual style (dotted border, yellow/amber tint).
- **FR-006**: System MUST allow users to discard or archive notes once they have been elevated or are no longer needed.

### Key Entities _(include if feature involves data)_

- **QuickNote**: A lightweight, raw-text entity representing an unformatted idea. Attributes: `id`, `content`, `createdAt`, `status` (active/archived).
- **Draft Node**: A visual representation of a QuickNote on the relationship graph.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Scratchpad activation time (from hotkey to ready-to-type) is under 150ms.
- **SC-002**: Users can elevate a raw note to a structured entity in fewer than 3 clicks (Elevate -> Review -> Approve).
- **SC-003**: Zero data loss for notes entered during high-load scenarios (e.g. while background indexing is active).
