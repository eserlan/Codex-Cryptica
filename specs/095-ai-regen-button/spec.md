# Feature Specification: AI Regenerate Entity Description

**Feature Branch**: `095-ai-regen-button`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: User description: "It would be nifty if we have a button on an entity (both in detail view in sidepanel, and in zenmode) that would regen the desc of the entity, using known info about it, and produce a brief (player focused/facing) chronicle/content entry and a longer gm / host lore entry"

## Clarifications

### Session 2026-04-28

- Q: How should the generated "Chronicle" and "Lore" content be presented for user review before it is saved? → A: Inline Preview (Proposed text appears in fields with 'Save'/'Discard' buttons).
- Q: Should the AI follow a specific tone for the "Chronicle" and "Lore" entries? → A: Theme-Aware (Adapts vocabulary/tone based on project theme setting).
- Q: Should the AI regenerate both fields together or independently? → A: Always Both (Regenerates both as a linked set, retaining and expanding upon existing core info).
- Q: Should the "AI Regenerate" button be available to all users? → A: Host/GM Only (Hidden or disabled for non-hosts/players).
- Q: Should the "AI Regenerate" feature respect project localization settings? → A: Current Language (Uses the project's primary language setting).
- Q: Should the Inline Preview be editable? → A: No (Read-only preview; users can edit using standard tools after saving).
- Q: What are the target lengths for Chronicle and Lore? → A: Adaptive guide (Chronicle: 1-2 atmospheric sentences; Lore: 2-3 detailed paragraphs; flexible based on context).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Quick Description Regeneration (Priority: P1)

As a GM, I want to quickly generate a description for a new or empty entity based on its existing tags and connections so that I don't have to write everything from scratch.

**Why this priority**: Core functionality that delivers the primary value of the request.

**Independent Test**: Can be tested by clicking the "Regenerate" button on an entity with existing labels/connections and verifying that a description is produced.

**Acceptance Scenarios**:

1. **Given** an entity with labels "Merchant" and "Shady" and a connection to "The Black Market", **When** I click the "AI Regenerate" button in the sidepanel, **Then** I should see a new description that incorporates these details.
2. **Given** the regeneration is triggered, **When** the process completes, **Then** I should be presented with both a "Chronicle" (player-facing) and a "Lore" (GM-facing) version of the text.

---

### User Story 2 - Refining Existing Content (Priority: P1)

As a world-builder, I want the AI to use my existing partial notes or draft descriptions as context so that the regenerated content remains consistent with my original vision while adding more detail and polish.

**Why this priority**: Crucial for iterative world-building where users have some starting notes.

**Independent Test**: Can be tested by adding a short sentence to an entity's description and verifying that the regenerated content expands on that specific idea.

**Acceptance Scenarios**:

1. **Given** an entity with the partial description "A retired knight who lost his sword in the woods", **When** I click "AI Regenerate", **Then** the generated "Chronicle" and "Lore" should preserve and expand upon the lost sword narrative.

---

### User Story 3 - Regeneration in Zen Mode (Priority: P1)

As a world-builder working in Zen Mode, I want to regenerate descriptions without leaving my focused workspace.

**Why this priority**: Essential for workflow continuity as requested by the user.

**Independent Test**: Can be tested by opening an entity in Zen Mode and locating/using the regeneration button.

**Acceptance Scenarios**:

1. **Given** I am in Zen Mode with an entity open, **When** I click the "AI Regenerate" icon in the entity header, **Then** the AI should generate the description variants.

---

### User Story 4 - Selection and Persistence (Priority: P2)

As a user, I want to choose whether to keep the generated descriptions or discard them.

**Why this priority**: Important for data integrity and user control.

**Independent Test**: Can be tested by generating a description and checking if it saves only after confirmation (or if it's automatically saved but supports undo).

**Acceptance Scenarios**:

1. **Given** a generated description presented inline, **When** I click "Save", **Then** the entity's "Description" and "Lore" fields should be updated.
2. **Given** a generated description presented inline, **When** I click "Discard", **Then** the fields should revert to their previous state.

---

### Edge Cases

- **No context available**: How does the system handle an entity with no labels, connections, or existing text? (Default to a generic but atmospheric prompt).
- **Conflicting Info**: If existing text contradicts labels, the system should prioritize labels as structured data but attempt to synthesize a cohesive narrative.
- **Network/API Failure**: How does the system handle AI service timeouts or errors? (Show a friendly error message and allow retry).
- **Insufficient Permissions**: If a non-host attempts to access the feature via deep link or console, the system MUST deny the request.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a visible "AI Regenerate" button in the Entity Detail view (Sidepanel) for users with **Host/GM permissions**.
- **FR-002**: System MUST provide an "AI Regenerate" action in the Zen Mode entity interface for users with **Host/GM permissions**.
- **FR-003**: The regeneration process MUST use the following as context for the AI prompt:
  - Entity name and type.
  - Assigned labels.
  - Related entity connections.
  - **Existing Description text** (if any).
  - **Existing Lore/Host-only text** (if any).
  - **Active Project Theme** (e.g., "Dark Fantasy", "Hard Sci-Fi").
  - **Active Project Language** (e.g., "en", "es", "fr").
- **FR-004**: The system MUST produce two distinct outputs as a single combined update:
  - **Chronicle**: A brief, atmospheric summary (target: 1-2 sentences) suitable for sharing with players.
  - **Lore**: A more detailed, internal "GM-only" entry (target: 2-3 paragraphs) containing deeper world-building facts.
  - Both outputs MUST use vocabulary and tone appropriate to the **Active Project Theme**.
  - Both outputs MUST be generated in the **Active Project Language**.
  - The AI MUST treat existing text as **core information** to be retained and expanded upon, not replaced.
- **FR-005**: System MUST display a loading state while the AI is generating content.
- **FR-006**: System MUST present the generated content using a **Read-Only Inline Preview**:
  - Proposed text is temporarily injected into the Description and Lore fields.
  - Fields are highlighted (e.g., subtle background tint) to indicate "pending" state.
  - Text in fields MUST NOT be editable while in the preview state.
  - Action buttons "Save" and "Discard" MUST be visible while in the preview state.
- **FR-007**: System MUST NOT expose the regeneration capability to users without **Host/GM permissions**.

### Key Entities

- **Entity**: The core world-building object (Character, Location, Item, etc.) whose description is being managed.
- **Lore Entry**: A specific data field on the Entity for "Host-only" information (distinct from the public description).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can trigger the regeneration flow with a maximum of 2 clicks from any entity view.
- **SC-002**: AI-generated content is returned and displayed within 15 seconds under normal network conditions.
- **SC-003**: 100% of generated content contains both a "Chronicle" and a "Lore" section as requested.
- **SC-004**: In tests where 25%+ of a description already exists, 90% of generated outputs must retain the core themes of the existing text.
