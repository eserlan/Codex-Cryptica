# Feature Specification: Context-Aware Entity Generator

**Feature Branch**: `127-context-aware-entity-generator`  
**Created**: 2026-05-30  
**Status**: Draft  
**Input**: User description: "Add a Generate Related action to entity views. The feature should let users quickly AI-generate a new entity based on the current entity and its nearby context. It should be guided, context-aware world expansion: surprising enough to inspire, but grounded enough to fit the existing vault."

## Clarifications

### Session 2026-05-30

- Q: How should the system define and gather the nearby context (directly related entities) to pass to the AI? → A: Only first-degree connected entities in the graph (direct neighbors).
- Q: What should happen in the UI if the AI generation fails (e.g., due to an API error, rate limit, or timeout)? → A: Show a toast error message and keep the modal open at the configuration step.
- Q: How should the graph connection back to the source entity be created in the vault upon saving the newly generated entity? → A: Directed connection from the source entity to the new entity (Source → New Entity) with the chosen relationship label.
- Q: When the user selects the Surprise Me option, how should the AI model decide which target entity type to generate? → A: The AI must choose from the active list of allowed categories/types in the vault.
- Q: How should the directly connected entities (nearby context) be represented in the prompt context compiled for the AI model? → A: Include Title, Type, Relationship label, and the content (Chronicle) of each connected entity.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate Related Action and Modal (Priority: P1)

As a worldbuilder viewing an entity, I want to click a **Generate Related** action to open a modal where I can select the target entity type and a relationship or custom instructions, so that I can configure my generation.

**Why this priority**: It is the primary entry point and configuration step for the user journey.

**Independent Test**: Open any entity in detail view, verify the "Generate Related" button is visible, click it, and verify that the lightweight configuration modal opens with choices for entity type, relationship, and custom instructions.

**Acceptance Scenarios**:

1. **Given** I am on an entity detail view, **When** I click the "Generate Related" button, **Then** a modal opens showing options for Target Entity Type, Relationship/Purpose, and Custom Instructions.
2. **Given** the modal is open, **When** I select a Target Entity Type, **Then** the Relationship/Purpose dropdown adapts to show relevant relationship suggestions for the source-target combination (e.g., character to item suggests "signature item", etc.), plus a "custom" option.

---

### User Story 2 - Context-Aware Generation (Priority: P1)

As a user, I want the system to generate a draft entity using the AI model, utilizing the current entity, its direct neighbors (directly related entities), and the overall vault context, so that the new entity fits seamlessly into the existing lore.

**Why this priority**: The key differentiator of this feature is that the generation is context-aware and grounded in the vault's lore.

**Independent Test**: Trigger a generation and verify that the AI request includes details of the source entity, adjacent connection summaries, and allowed categories, and returns a structured draft.

**Acceptance Scenarios**:

1. **Given** I have configured my target type and relationship in the modal, **When** I click "Generate", **Then** the system sends the source entity, its direct connections, and allowed categories to the AI model, and displays a loading state.
2. **Given** a successful AI generation, **When** it completes, **Then** the modal displays the draft entity's fields (name, type, summary, description, labels, suggested relationship, and optional plot hook).

---

### User Story 3 - Review, Edit, and Save Draft (Priority: P1)

As a user, I want to review the generated draft, edit its name, summary, and description fields, and choose to save, regenerate, or cancel, so that I maintain complete control over what enters the vault.

**Why this priority**: Grounded worldbuilding requires that AI output does not automatically become canon; the user must deliberately approve and be able to adjust the draft.

**Independent Test**: Review a generated draft, change its title and description, click "Create Entity", and confirm that the new entity is persisted in the vault with the edited values.

**Acceptance Scenarios**:

1. **Given** a generated draft is displayed, **When** I click "Create Entity", **Then** the new entity is saved to the vault and I remain on the current page with the modal closed.
2. **Given** a generated draft is displayed, **When** I click "Regenerate", **Then** a new generation is triggered using the same configurations, updating the preview.
3. **Given** the wizard is open at any stage, **When** I click "Cancel", **Then** the modal closes and no entities are created or modified.

---

### User Story 4 - Link back to Source Entity (Priority: P2)

As a user saving a newly generated entity, I want it to be automatically connected back to the source entity with the selected relationship type, so that I don't have to manually create the connection later.

**Why this priority**: Enhances the workflow efficiency by automating the relationship linkage.

**Independent Test**: Generate a related entity with the relationship "rival", save it, and verify that a bi-directional or directed connection is created between the source entity and the new entity.

**Acceptance Scenarios**:

1. **Given** I am saving a generated entity, **When** a relationship was specified (e.g., "rival"), **Then** a vault connection is created between the source entity and the new entity matching the type/label.

---

### User Story 5 - "Surprise Me" Option (Priority: P2)

As a user, I want a **Surprise Me** option for target type and relationship so that the AI can dynamically choose a creative and fitting new entity type and role based on the current context.

**Why this priority**: Inspires creativity when the user doesn't know what they want to add next.

**Independent Test**: Select "Surprise Me" for target type, trigger generation, and verify that the AI chooses a fitting type and relationship dynamically.

**Acceptance Scenarios**:

1. **Given** I open the generator modal, **When** I select "Surprise Me" as the target entity type, **Then** the AI selects a fitting target type and relationship automatically during generation, displaying them in the review stage.

## Edge Cases

- **No API Key**: If the AI settings/API key are missing, the "Generate Related" action should either be disabled, or the modal should show a clear state instructing the user to configure their API key.
- **AI Failure/Timeout**: If the model fails to generate, a standard error toast notification must be shown, and the modal must return to the configuration/idle state.
- **Large Vault Context**: If the source entity has many connections, the context compiler should truncate or summarize related entities to prevent hitting token limit boundaries.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST show a **Generate Related** action button in standard entity detail view (e.g., `DetailHeader.svelte` or `DetailStatusTab.svelte`) and Zen Mode detail view.
- **FR-002**: The system MUST render a lightweight wizard/modal upon clicking the action.
- **FR-003**: The modal MUST allow selecting target Entity Type (Character, Faction, Location, Item, Event, Creature, Note, or "Surprise Me" where the target type is dynamically selected by the AI from allowed categories).
- **FR-004**: The system MUST dynamically update suggested relationships based on the source entity type and selected target type.
- **FR-005**: The modal MUST provide a text input for custom instructions or custom relationships.
- **FR-006**: The system MUST compile context consisting of the source entity, its direct connections (including their title, type, relationship label, and chronicle/content field), and allowed categories, and send them to the AI model.
- **FR-007**: The system MUST display a loading indicator during the AI generation process.
- **FR-008**: The draft entity returned by the AI MUST be displayed in a review form within the modal.
- **FR-009**: The review form MUST allow the user to edit the generated fields (name, summary/chronicle, description/lore, labels, relationship label) before saving.
- **FR-010**: The system MUST NOT save the new entity or modify any existing entities until the user explicitly clicks the "Create Entity" button.
- **FR-011**: Upon saving, the system MUST create the new entity in the vault, apply the appropriate category template, and establish a directed connection from the source entity to the new entity (Source → New Entity) using the selected relationship type.
- **FR-012**: The user MUST be able to trigger regeneration of the draft or cancel the wizard at any point.

### Key Entities

- **Source Entity**: The existing entity from which the generation is initiated.
- **Related Context**: The set of directly connected entities and metadata passed to ground the generation.
- **Draft Entity**: The transient, preview-only data structure returned by the AI containing name, type, summary, description, and suggested labels/relationships.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The "Generate Related" action opens the configuration modal in under 100ms.
- **SC-002**: AI-generated drafts are returned as clean structured data conforming to the entity schema.
- **SC-003**: Saving a draft successfully creates the new entity in the IndexedDB/OPFS vault and sets up the correct graph connection with 0% data integrity violations.
- **SC-004**: Cancelling the wizard at any stage leaves the vault state completely unmodified.
