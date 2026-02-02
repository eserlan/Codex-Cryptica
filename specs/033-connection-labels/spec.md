# Feature Specification: Connection Labels & Visual Representation

**Feature Branch**: `033-connection-labels`
**Created**: 2026-02-02
**Status**: Draft
**Input**: User description: "the ability to "label" connections friendly, enemy or neutral, and visually represent it"

## User Scenarios & Testing

### User Story 1 - Categorize Connections (Priority: P1)

As a World Builder, I want to assign a "relationship type" (Friendly, Enemy, Neutral) to the connections between entities so that I can immediately understand the political or emotional dynamic between characters and factions at a glance.

**Why this priority**: Core value proposition. Without this, the visual representation has no data to drive it.

**Independent Test**: Create a connection between "Hero" and "Villain"; select "Enemy" type; verify the connection data persists this type.

**Acceptance Scenarios**:

1. **Given** two entities are connected, **When** I edit the connection details, **Then** I can select a relationship type from a dropdown (Friendly, Enemy, Neutral).
2. **Given** a connection type is selected, **When** I save, **Then** the type is persisted in the entity's frontmatter.

### User Story 2 - Visual Representation (Priority: P1)

As a World Builder, I want the connection lines in the graph to change color based on their relationship type (e.g., Green for Friendly, Red for Enemy) so that I can visually scan the graph for conflict or alliances.

**Why this priority**: The primary user goal is "visual representation". Data without visualization fails the prompt.

**Independent Test**: Set a connection to "Enemy"; view the graph; verify the edge is Red. Set to "Friendly"; verify Green.

**Acceptance Scenarios**:

1. **Given** a connection is "Friendly", **When** viewed in the Graph, **Then** the edge color is Green.
2. **Given** a connection is "Enemy", **When** viewed in the Graph, **Then** the edge color is Red.
3. **Given** a connection is "Neutral" (default), **When** viewed in the Graph, **Then** the edge color is the default Grey.

### User Story 3 - Custom Relationship Labels (Priority: P2)

As a World Builder, I want to add custom text labels to connections (e.g., "Father", "Business Partner") alongside the broad category so that I can capture specific nuances while keeping the broad visual coding.

**Why this priority**: Enhances the "label" aspect of the prompt beyond just the 3 categories.

**Independent Test**: Add a label "Rival" to an "Enemy" connection; verify the graph shows a Red line with the text "Rival" on it.

**Acceptance Scenarios**:

1. **Given** a connection, **When** I type a custom label, **Then** that text is saved.
2. **Given** a connection with a custom label, **When** viewed in the Graph, **Then** the text appears as an edge label.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to select a Relationship Category for any connection.
- **FR-002**: Supported categories MUST include: "Friendly", "Enemy", "Neutral" (Default).
- **FR-003**: System MUST allow users to input a custom text label for the connection (optional).
- **FR-004**: Graph Engine MUST render edge colors based on the Relationship Category:
    - Friendly: Green (e.g., `#22c55e`)
    - Enemy: Red (e.g., `#ef4444`)
    - Neutral: Default Grey
- **FR-005**: Graph Engine MUST render the custom text label on the edge if present.
- **FR-006**: Connection data MUST be persisted in the YAML frontmatter of the source entity using a schema that supports these new fields.

### Key Entities

- **Connection**:
    - `target`: Entity ID (existing)
    - `type`: Relationship Category (enum: friendly, enemy, neutral) [New]
    - `label`: Custom text (string) [New]

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of "Enemy" connections render as Red edges in the graph.
- **SC-002**: Users can toggle a connection from Friendly to Enemy and see the update in the graph in < 200ms.
- **SC-003**: Custom labels are readable on the graph edges at standard zoom levels.