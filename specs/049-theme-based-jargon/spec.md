# Feature Specification: Theme-Based UI Jargon

**Feature Branch**: `049-theme-based-jargon`  
**Created**: 2026-02-19  
**Status**: Draft  
**Input**: User description: "theme based jargon https://github.com/eserlan/Codex-Cryptica/issues/178"

## User Scenarios & Testing

### User Story 1 - Immersion through Terminology (Priority: P1)

As a lore keeper, I want the application's interface labels to reflect the aesthetic of my chosen theme (e.g., "Chronicles" instead of "Notes" in Fantasy, "Data Logs" in Sci-Fi) so that I feel more immersed in my world-building.

**Why this priority**: Core atmospheric value. This feature transforms the UI from a generic tool into a specialized world-building environment.

**Independent Test**: Can be tested by switching themes and observing specific common UI labels changing their text content while maintaining functionality.

**Acceptance Scenarios**:

1. **Given** I am using the "Ancient Parchment" (Fantasy) theme, **When** I look at the main navigation or headers, **Then** I should see terms like "Chronicles", "Archives", or "Tomes".
2. **Given** I am using the "Sci-Fi Terminal" (Sci-Fi) theme, **When** I look at the same UI elements, **Then** I should see terms like "Data Nodes", "Logs", or "Entries".

---

### User Story 2 - Contextual Action Labels (Priority: P2)

As a user, I want action buttons and status messages to use theme-appropriate language (e.g., "Inscribe" instead of "Save" in Fantasy, "Upload" or "Sync" in Sci-Fi) to enhance the roleplaying feel of the tool.

**Why this priority**: High polish and consistency. It ensures the "flavor" of the theme extends beyond just colors and fonts into the actual interaction language.

**Independent Test**: Can be tested by performing actions (Save, Delete, Search) in different themes and verifying the button/status text matches the expected jargon.

**Acceptance Scenarios**:

1. **Given** the "Blood & Noir" (Horror) theme is active, **When** I click a button to delete an entity, **Then** the confirmation might say "Exterminate" or "Banish".

---

### User Story 3 - Horror Theme Specialized Terminology (Priority: P3)

As a fan of the "Blood & Noir" theme, I want my interactions to feel darker and more visceral (e.g., "Banish" or "Exterminate" instead of "Delete") to reinforce the specific horror atmosphere.

**Why this priority**: Targeted aesthetic specialization for a high-impact theme.

**Independent Test**: Switch to the Horror theme and verify that the deletion confirmation and other specific actions use more intense, thematic language.

**Acceptance Scenarios**:

1. **Given** the "Blood & Noir" theme is active, **When** I attempt to delete an entity, **Then** I should see an atmospheric term like "Banish" or "Exterminate" in the action button.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST define a set of "Jargon Keys" for common UI terms (e.g., `entities`, `save`, `search`, `delete`).
- **FR-002**: System MUST allow each theme to provide a mapping of "Jargon Keys" to specific display strings.
- **FR-003**: System MUST provide a "Default Jargon" set to use if a theme does not specify a value for a key.
- **FR-004**: UI components MUST use a centralized lookup mechanism to resolve display strings based on the currently active theme.
- **FR-005**: System MUST support pluralization for jargon terms (e.g., "1 Archive" vs "5 Archives").
- **FR-006**: System MUST allow themes to override terminology for:
  - Primary entity collections (e.g., "Vault", "System", "Archive")
  - Individual entities (e.g., "Note", "Record", "Entry")
  - Common actions (e.g., "New", "Save", "Delete")
  - Loading/Status states (e.g., "Syncing", "Inscribing", "Scanning")
- **FR-007**: System MUST include user-facing documentation in the help system explaining that UI terminology adapts to the selected theme.

### Key Entities

- **Jargon Map**: A collection of key-value pairs where the key is a functional identifier and the value is the theme-specific display string.
- **Theme Definition**: Updated to include an optional `jargon` property containing a Jargon Map.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of defined core UI labels (Vault title, New button, Save/Delete actions) are theme-aware.
- **SC-002**: Switching themes updates all visible jargon labels in under 100ms.
- **SC-003**: No "hardcoded" generic strings remain for the identified jargon keys in the codebase.
- **SC-004**: Users can correctly identify the "Save" and "Delete" actions across all themes during usability testing (meaning jargon remains intuitive).
