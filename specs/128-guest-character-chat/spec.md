# Feature Specification: Guest Character Chat for Invited World Participants

**Feature Branch**: `128-guest-character-chat`  
**Created**: 2026-06-02  
**Status**: Draft  
**Input**: User description: "https://github.com/eserlan/Codex-Cryptica/issues/1081"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Host Configures Character Availability (Priority: P1)

As a World Host, I want to enable guest chat on specific characters and configure their visibility and knowledge settings, so that invited players/guests can interact with them.

**Why this priority**: Bounding the lore and character accessibility is necessary for GMs/hosts to preserve the mystery of the world and control the onboarding experience.

**Independent Test**: A host can navigate to a character's edit view, toggle "Guest Chat Enabled", set constraints, and verify the settings are persisted in the entity's metadata/frontmatter.

**Acceptance Scenarios**:

1. **Given** a host is editing a Character entity, **When** they toggle "Guest Chat Enabled" to true, **Then** the chat settings panel is revealed.
2. **Given** a host has toggled guest chat on, **When** they select "Public Lore Only" and save, **Then** the character is updated in the vault with the corresponding settings.
3. **Given** a character has guest chat disabled, **When** the entity is viewed, **Then** no guest chat options or configurations are exposed to external participants.

---

### User Story 2 - Guest Interacts with Enabled Character (Priority: P1)

As an Invited Guest, I want to view a list of available characters and engage in an in-character text conversation, so I can learn about the world organically.

**Why this priority**: This is the core player-facing value of the feature (playable lore).

**Independent Test**: A guest logs in or accesses the shared vault, sees a list of characters enabled for chat, opens a conversation, and receives in-character responses.

**Acceptance Scenarios**:

1. **Given** a guest is viewing the shared vault/campaign, **When** they navigate to the Chat panel, **Then** they see a curated list of characters that the host has enabled for guest chat.
2. **Given** a guest opens a chat with an enabled character, **When** they click one of the starter prompts, **Then** the prompt is sent, and the character responds in-character based on their public lore.
3. **Given** a guest asks a question, **When** the character responds, **Then** the UI clearly marks the interaction as an in-world/in-character lore conversation rather than a general assistant.

---

### User Story 3 - Host Reviews Transcripts and Promotes Content (Priority: P2)

As a World Host, I want to review the conversations my guests have had with characters and promote interesting details to official rumors or notes, so that player interactions enrich the campaign's canon.

**Why this priority**: Bridges the gap between player exploration and permanent worldbuilding (canon definition).

**Independent Test**: The host opens a transcript log for a character, views guest messages, selects a paragraph, and uses a button to copy/promote it to a new Rumor entity.

**Acceptance Scenarios**:

1. **Given** guests have chatted with a character, **When** the host opens the Character's management panel, **Then** they can see a history of guest chat transcripts.
2. **Given** a transcript is displayed, **When** the host clicks "Promote to Rumor" on a response/idea, **Then** the system opens the Entity Creation flow pre-filled with the selected text as a draft.

---

### Edge Cases

- **Access Revocation**: What happens if a host disables guest chat for a character while a guest is in the middle of a chat session?
  - _Mitigation_: The guest's next message should fail with a clean error message: "This character is no longer available for guest chat."
- **Lore Leakage**: What happens if the guest asks leading questions trying to bypass the AI's instruction constraints?
  - _Mitigation_: The AI prompt templates must strictly instruct the model to refuse to reveal GM-private information, secrets, or unrevealed entities, defaulting to in-character deflection.
- **Offline / Sync Failures**: What happens if a guest is chatting but the P2P connection or server-side API is temporarily unreachable?
  - _Mitigation_: The UI should display a transient connection error and allow the guest to retry sending the message.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Hosts MUST be able to toggle "Guest Chat Enabled" for any Character entity.
- **FR-002**: Hosts MUST be able to configure "Context Scope" for character chat:
  - "Public Lore Only" (only entity text and public metadata).
  - "Public + Private Context" (can use private notes for reasoning, but must not reveal details marked as secret).
- **FR-003**: Guests MUST only be able to view and initiate chats with Characters that have "Guest Chat Enabled" set to true.
- **FR-004**: The guest chat UI MUST display suggested starter prompts:
  - "What do you know about this place?"
  - "What should I be careful of?"
  - "Who do you trust?"
  - "What rumours have you heard?"
  - "What do you want from me?"
  - "Tell me about the last major event."
- **FR-005**: The character chat engine MUST run queries in-character, using the character's entity description, public/private notes (based on configuration), and relationship context.
- **FR-006**: The character chat engine MUST reject questions that violate the context constraints or attempt to prompt-inject GM secrets.
- **FR-007**: Guest chat transcripts MUST be persisted and synced back to the host's vault using a P2P connection when the host is online, or via the Sync Engine when available, to allow host-side review.
- **FR-008**: Hosts MUST have a dashboard/interface to review guest chat transcripts.
- **FR-009**: Hosts MUST be able to select snippets or summaries from guest chat transcripts and promote them (e.g., as new entities, rumors, or notes).
- **FR-010**: Guest character chat logs MUST be private to each guest, so each guest has an individual conversation history with the character.
- **FR-011**: Guests MUST have their chat session memory persisted locally so that refreshing the page does not wipe the current conversation history. Wiping or resetting a guest's NPC memory is performed client-side by the guest; hosts cannot trigger remote wipes.

### Key Entities

- **GuestChatConfig**: Represents the configuration for a character's guest chat accessibility.
  - Attributes: `characterId` (UUID), `isEnabled` (boolean), `contextScope` ('public' | 'hybrid'), `extraInstructions` (string), `isHostReviewable` (boolean), `keepMemory` (boolean).
- **GuestChatTranscript**: Represents a conversation log between a guest and a character.
  - Attributes: `id` (UUID), `guestId` (string), `characterId` (UUID), `timestamp` (DateTime), `messages` (Array of message objects: sender, text, timestamp).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Setting toggles and configurations for Guest Chat persist reliably in the entity's frontmatter.
- **SC-002**: A guest can load the available character list and initialize a chat session in under 1 second.
- **SC-003**: In-character responses from the generative model are delivered within an average of 2 seconds per response.
- **SC-004**: Prompt validation tests confirm that secrets or private notes are never leaked directly in character responses across 50 simulated adversarial guest prompts.
