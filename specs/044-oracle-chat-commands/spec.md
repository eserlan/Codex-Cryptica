# Feature Specification: Oracle Chat Commands

**Feature Branch**: `044-oracle-chat-commands`  
**Created**: 2026-02-16  
**Status**: Draft  
**Input**: User description: "Implement /connect oracle command for entity connection with entity autocomplete (3+ chars) and AI-powered connection type proposals. Also implement a slash command menu UI to show available commands like /draw, /create, and /connect when '/' is typed in chat."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Slash Command Menu (Priority: P1)

As a lore keeper using the chat, I want to see a list of available commands as soon as I type a forward slash ("/"), so that I don't have to memorize the exact command syntax.

**Why this priority**: High discovery value. Essential for improving the usability of existing and new chat commands.

**Independent Test**: Can be tested by focusing the chat input and typing "/". A menu should appear listing `/draw`, `/create`, `/connect`, and `/merge`.

**Acceptance Scenarios**:

1. **Given** the chat input is focused, **When** the user types "/", **Then** a popover menu appears showing all registered commands.
2. **Given** the slash menu is visible, **When** the user continues typing (e.g., "/c"), **Then** the menu filters the list to matching commands.
3. **Given** the slash menu is visible, **When** the user selects a command via click or Enter, **Then** the command is inserted into the chat input.

---

### User Story 2 - Connecting Entities with Oracle Assistance (Priority: P1)

As a lore keeper, I want to link entities using natural language or a guided wizard, where the system handles the lookup and suggests relationship types.

**Why this priority**: Core feature requested. Simplifies the process of building a knowledge graph by leveraging AI to parse intent and propose relationship types.

**Independent Test**: Can be tested by running `/connect oracle` for a wizard or `/connect Eldrin and the Tower` for direct parsing.

**Acceptance Scenarios**:

1. **Given** the `/connect oracle` command is active, **When** the user starts typing the first entity name, **Then** the system provides autocomplete suggestions (reusing the existing Search Engine) after 3 characters.
2. **Given** a natural language input like `/connect A is the leader of B`, **When** the command is submitted, **Then** the Lore Oracle parses the input into source entity, target entity, and relationship type.
3. **Given** two entities are identified but no type is provided, **When** the user proceeds, **Then** the Lore Oracle analyzes both entities and presents a proposed connection type and a brief explanation.
4. **Given** a valid connection is identified, **When** the user confirms, **Then** a new connection is created between the entities.

---

### User Story 3 - Customizing Oracle Proposals (Priority: P2)

As a lore keeper, I want to be able to override the Oracle's suggestion or provide my own input, so that I maintain full control over my world's data.

**Why this priority**: Necessary for flexibility and handling AI inaccuracies.

**Independent Test**: Can be tested by running an oracle proposal flow and editing the suggested values before clicking "Confirm".

**Acceptance Scenarios**:

1. **Given** an AI-proposed value, **When** the user selects the field, **Then** they can edit the text to a custom value.
2. **Given** an AI proposal, **When** the user rejects it, **Then** they can return to selection or cancel the command.

---

### User Story 4 - Merging Entities with Oracle Assistance (Priority: P1)

As a lore keeper, I want to merge two entities using natural language or a guided wizard, where the system handles the content synthesis and relationship re-mapping.

**Why this priority**: High utility for world cleanup. Simplifies the process of combining duplicate or overlapping entries by leveraging AI to synthesize content.

**Independent Test**: Can be tested by running `/merge oracle` for a wizard or `/merge A into B` for direct parsing.

**Acceptance Scenarios**:

1. **Given** the `/merge oracle` command is active, **When** the user selects a source and target, **Then** the system provides a preview of the merged content.
2. **Given** a merge request, **When** the user confirms, **Then** the source entity is absorbed into the target, connections are re-mapped, and the source is deleted.
3. **Given** a natural language input like `/merge the village notes into the kingdom entry`, **When** the command is submitted, **Then** the Lore Oracle identifies the source and target entities.

---

### Edge Cases

- **Missing Descriptions**: What happens if one or both entities have no content for the AI to analyze? (Fallback: Propose a generic "related" connection or ask for manual merge preview).
- **Existing Connections**: How does the system handle attempts to connect entities that are already linked? (System should notify user and show the existing link type).
- **Keyboard Navigation**: Can the slash menu and oracle flows be completed entirely via keyboard? (Accessibility requirement).

## Assumptions

- **Lore Oracle Integration**: The Lore Oracle (AI) has access to the semantic content of vault entities (stored in OPFS) to generate meaningful proposals.
- **Interactive Chat Context**: The existing chat interface supports rendering interactive, multi-step components for command execution.
- **Vault Access**: The system can perform entity lookups and write changes to local persistent storage (OPFS for files, IndexedDB for graph metadata).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST show a command discovery menu when the user types "/" as the first character in the chat input.
- **FR-002**: Slash menu MUST support keyboard navigation (Up/Down arrows) and selection (Enter/Tab).
- **FR-003**: System MUST implement the `/connect oracle` and `/merge oracle` commands as interactive multi-step flows.
- **FR-004**: System MUST provide entity name autocomplete that triggers after at least 3 characters are typed in selection fields.
- **FR-005**: System MUST fetch the full content (Lore and Chronicle) of both selected entities and provide them as context to the Lore Oracle (AI) to generate proposals (connection type or merged content).
- **FR-006**: System MUST allow the user to accept, edit, or reject AI-generated proposals.
- **FR-007**: System MUST persist changes to the vault immediately upon user confirmation.
- **FR-008**: System MUST prevent selecting the same entity as both source and target.
- **FR-009**: System MUST support natural language parsing for `/connect` and `/merge` commands.

### Key Entities _(include if feature involves data)_

- **ChatCommand**: Represents a registered command available in the chat (e.g., name, description, parameters).
- **EntityConnection**: The resulting link created between two entities.
- **MergeProposal**: The synthesized content proposed when combining entities.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The slash command menu appears in under 200ms after the "/" character is typed.
- **SC-002**: Entity autocomplete results are returned in under 300ms.
- **SC-003**: AI proposals are generated and displayed in under 5 seconds after entity selection.
- **SC-004**: Users successfully complete a wizard flow in under 30 seconds on average.
- **SC-005**: 100% of interactive steps are navigable via keyboard.
