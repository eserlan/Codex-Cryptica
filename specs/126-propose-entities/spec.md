# Feature Specification: Propose Entities

**Feature Branch**: `126-propose-entities`  
**Created**: 2026-05-30  
**Status**: Restored — manual creation only
**Input**: User description: "propose new entities in the entities detail views (sidebar + zen mode). similar to how we propose connections, we should also propose entities. use the same simle rule, if its in bold, it can be a entity."

## Clarifications

### Session 2026-05-30

- Q: When a user accepts a proposal and the new entity is successfully created via AI, what should happen next in the UI? → A: Stay on the current page. The proposal disappears from the list, allowing the user to continue reading and creating other proposed entities without losing context.
- Q: What should happen if the AI fails to guess a category or times out during the intelligent creation process? → A: Create the entity with a generic/fallback template and show a subtle warning toast, so the user's flow isn't completely blocked.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Entity Proposals in Sidebar (Priority: P1)

As a user viewing an entity's details in the sidebar, I want to see a list of proposed entities based on bolded text in the content that are not yet created, so that I can easily expand my vault.

**Why this priority**: Discoverability of new entities directly from the text is a core feature for expanding the world building seamlessly.

**Independent Test**: Can be fully tested by opening an entity in the sidebar that contains bolded text for non-existent entities, and verifying that the proposal UI appears and correctly lists those bolded terms.

**Acceptance Scenarios**:

1. **Given** I am viewing an entity in the sidebar, **When** the entity's content has bolded text that doesn't match an existing entity, **Then** a "Propose Entities" section appears listing those bold terms as suggestions.
2. **Given** I am viewing an entity with bold text, **When** all bold terms already exist as entities, **Then** no new entities are proposed.

---

### User Story 2 - View Entity Proposals in Zen Mode (Priority: P1)

As a user viewing an entity in Zen mode, I want to see proposed entities based on bolded text, so that I have the same vault expansion capabilities as in the sidebar.

**Why this priority**: Zen mode is an alternative viewing mode that must maintain parity with the sidebar for core workflows like adding proposed entities.

**Independent Test**: Can be fully tested by opening an entity in Zen mode containing unlinked bolded text and observing the proposal UI.

**Acceptance Scenarios**:

1. **Given** I am viewing an entity in Zen mode, **When** the entity's content has bolded text that doesn't match an existing entity, **Then** a "Propose Entities" section appears.

---

### User Story 3 - Accept Entity Proposals (Priority: P2)

As a user seeing a list of proposed entities, I want to open the normal creation form with a proposed title prefilled, so I can choose the category and explicitly decide whether to create it.

**Why this priority**: Merely seeing proposals isn't enough; the user needs an actionable, intelligent way to create them that minimizes manual data entry.

**Independent Test**: Can be tested by clicking on a proposed entity and confirming a new entity is created with that title, assigned to a logically guessed category, populated using that category's template, and utilizing the originating entity's content as contextual input.

**Acceptance Scenarios**:

1. **Given** I see a proposed entity, **When** I click to accept/create it, **Then** a new entity is created with that name, the system makes a best guess for its category, applies the category template, uses the current page's content as input, and the proposal is removed from the list while I stay on the current page to maintain my reading context.

---

### Edge Cases

- What happens when a bolded term has different casing than an existing entity? (Assumption: Case-insensitive match should prevent duplicate proposals).
- What happens if the text has multiple bolded instances of the exact same term? (Assumption: Propose it only once).
- How does the system handle bold text that contains special characters or formatting?
- What happens if the bold text is already formatted as a Markdown link? (Resolution: If the text is already a link, the entity is assumed to exist or be explicitly handled, and it MUST NOT be proposed).
- What happens if the AI fails or times out during category guessing? (Resolution: Create the entity with a generic/fallback template and show a subtle warning toast, avoiding blocking the user's workflow).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST parse the content of the currently viewed entity to find all bolded text (e.g., `**text**` or `__text__`).
- **FR-002**: The system MUST filter the found bolded terms against existing entities to identify which ones do not yet exist.
- **FR-003**: The system MUST display these non-existent bolded terms as "Proposed Entities" in both the Sidebar and Zen Mode detail views.
- **FR-004**: The system MUST provide an interaction (e.g., a button) to create a new entity from a proposal.
- **FR-005**: The system MUST ensure the proposed entity rule mirrors the simplicity of the proposed connections rule (if it is bold, it is a candidate).
- **FR-006**: The system MUST NOT propose bold text as a new entity if that text is already formatted as a Markdown link (e.g., `[**text**](...)` or `**[text](...)**`).
- **FR-007**: Selecting a proposal MUST open the normal entity creation form with its title prefilled.
- **FR-008**: The system MUST NOT create an entity, call AI, or infer a category until the user explicitly submits the creation form.
- **FR-009**: The normal creation form remains responsible for the selected category and template behavior.

### Key Entities

- **Entity**: The core data structure. The proposal system reads an Entity's content and can generate new Entities.
- **Entity Proposal**: A transient data structure representing a candidate entity (title derived from bold text).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view proposed entities in both the sidebar and Zen mode without noticeable performance degradation (e.g., regex extraction should not block the main thread for more than 50ms).
- **SC-002**: 100% of bolded terms that do not correspond to existing entities are proposed.
- **SC-003**: 0% of bolded terms that already correspond to existing entities are proposed.
- **SC-004**: Users can create a new entity from a proposal with a single click.
