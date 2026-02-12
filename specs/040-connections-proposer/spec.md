# Feature Specification: Connections Proposer

**Feature Branch**: `040-connections-proposer`  
**Created**: 2026-02-12  
**Status**: Draft  
**Input**: User description: "Implement a feature that can identify and suggest potential connections between entities in the vault."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Viewing Background Connection Suggestions (Priority: P1)

As a lore keeper, I want the system to silently analyze my entries in the background and surface potential connections, so that I can discover hidden relationships without stopping my creative flow.

**Why this priority**: Core value of the feature. Automates the discovery of relationships using AI.

**Independent Test**: Can be tested by opening an entity and seeing a badge or section for "AI Proposals" that appears after a background scan completes.

**Acceptance Scenarios**:

1. **Given** an entity "Eldrin the Wise" and another "The Broken Tower", **When** the background scanner identifies a semantic link between them (e.g., Eldrin's backstory mentions studying there), **Then** a proposed connection is displayed in Eldrin's panel.
2. **Given** a new entry is added, **When** the system completes its periodic scan, **Then** relevant suggestions appear automatically without manual triggering.

---

### User Story 2 - Managing Proposals (Priority: P2)

As a lore keeper, I want to accept or dismiss suggestions, and have the system remember my choices, so that the proposer remains helpful rather than repetitive.

**Why this priority**: Essential for data integrity and UX comfort.

**Independent Test**: Can be tested by clicking "Dismiss" on a suggestion and verifying it disappears and does not reappear after a page reload.

**Acceptance Scenarios**:

1. **Given** a list of suggestions, **When** I click "Apply", **Then** a real connection is created and the suggestion is removed from the proposal list.
2. **Given** a suggestion I reject, **When** I click "Dismiss", **Then** the suggestion is moved to a "Rejected History" list.

---

### User Story 3 - Reviewing Dismissed Proposals (Priority: P3)

As a lore keeper, I want to see a history of connections I previously dismissed, so that I can re-evaluate and apply them if my campaign's direction changes.

**Why this priority**: Prevents permanent loss of potentially useful AI insights.

**Independent Test**: Can be tested by opening the "Dismissed Proposals" history and re-applying a previously rejected link.

**Acceptance Scenarios**:

1. **Given** several dismissed suggestions, **When** I view the "Rejected History", **Then** I see the last 20 items.
2. **Given** a rejected item, **When** I click "Re-evaluate", **Then** it is moved back to the active proposals or applied as a connection.

---

### Edge Cases

- **AI Hallucinations**: How does the system handle suggestions that are semantically weak or incorrect? (Solved via confidence thresholds).
- **Redundant Links**: If A is already connected to B, the system must not suggest B to A.
- **Worker Collisions**: Ensuring background scans don't fight with active user edits or saves.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST identify potential connections using semantic analysis via the Lore Oracle (AI).
- **FR-002**: System MUST trigger connection scans automatically in the background (debounced after edits or periodically).
- **FR-003**: System MUST persist the state of all proposals (Pending, Accepted, Rejected) to IndexedDB.
- **FR-004**: System MUST allow users to create a connection from a proposal with a single click.
- **FR-005**: System MUST hide rejected proposals from the main view to prevent UI clutter.
- **FR-006**: System MUST maintain a "Rejected History" log of the last 20 dismissed proposals per entity.
- **FR-007**: System MUST prevent suggesting a connection that already exists in the vault.

### Key Entities _(include if feature involves data)_

- **ProposedConnection**: Represents a potential relationship found by the AI.
  - `sourceId`: The entity where the context was found.
  - `targetId`: The entity suggested as a link.
  - `type`: The suggested connection type (e.g., "ally", "rival").
  - `context`: The specific text snippet or semantic reason for the suggestion.
  - `status`: One of `pending`, `accepted`, or `rejected`.
  - `timestamp`: When the suggestion was generated.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Background scans must not cause perceptible lag (frame drops) during user typing.
- **SC-002**: Users can review and process (Apply/Dismiss) a connection in under 3 seconds of interaction.
- **SC-003**: The "Rejected History" must strictly cap at 20 items per entity to prevent database bloat.
- **SC-004**: 70% of AI-suggested connections are accepted by users (qualitative target for AI tuning).
