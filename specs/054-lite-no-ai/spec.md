# Feature Specification: Lite Version (No AI Support)

**Feature Branch**: `054-lite-no-ai`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "lite version with no ai support https://github.com/eserlan/Codex-Cryptica/issues/215"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enable Lite Mode (Priority: P1)

As a user who prefers not to use AI services or has limited hardware resources, I want to disable all AI-powered features so that the application is simpler and more private, while still being able to use functional utility commands.

**Why this priority**: Core requirement of the feature request. It allows users to opt-out of AI completely.

**Independent Test**: Can be fully tested by enabling "Lite Mode" in settings and verifying that AI UI elements (like "Draw" buttons) disappear, network calls to AI endpoints cease, but the Oracle window remains for utility commands.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** the user toggles "Lite Mode" to ON in settings, **Then** AI-specific UI components (AI tag suggestions, Image generation buttons) are hidden.
2. **Given** "Lite Mode" is ON, **When** the user interacts with the app, **Then** no network requests are sent to AI providers (e.g., Google Gemini API).
3. **Given** "Lite Mode" is ON, **When** the user opens the Oracle, **Then** the interface is presented as a **Restricted Oracle** limited to specific functional commands.

---

### User Story 2 - Restricted Oracle Utility Commands (Priority: P1)

As a user in Lite Mode, I want to use the Oracle window to execute structural commands like `/connect` and `/merge` so that I don't lose powerful organization tools that don't strictly require an LLM.

**Why this priority**: Utility commands are essential for vault organization and can be implemented deterministically without AI.

**Independent Test**: In Lite Mode, type `/connect` or `/merge` in the Oracle chat and verify they execute correctly without any AI API interaction.

**Acceptance Scenarios**:

1. **Given** Lite Mode is active, **When** the user enters a valid `/connect` command in the Oracle, **Then** the connection is established correctly.
2. **Given** Lite Mode is active, **When** the user enters a valid `/merge` command in the Oracle, **Then** the merge operation is performed.
3. **Given** Lite Mode is active, **When** the user enters natural language (non-command) text in the Oracle, **Then** the Oracle informs the user that natural language processing is disabled in Lite Mode.

---

### User Story 3 - Privacy and Resource Savings (Priority: P2)

As a security-conscious user, I want to ensure that "Lite Mode" prevents any data from being sent to external AI servers, ensuring my lore remains strictly local or within my controlled sync provider.

**Why this priority**: Privacy is a primary driver for a "No AI" version.

**Independent Test**: Monitor browser network traffic when Lite Mode is active to ensure zero contact with AI endpoints.

**Acceptance Scenarios**:

1. **Given** Lite Mode is active, **When** creating or editing an entity, **Then** the application does not attempt to automatically categorize or tag the entity using AI.

---

### User Story 4 - Persistence of Lite Mode (Priority: P3)

As a returning user, I want my preference for Lite Mode to be remembered so that I don't have to disable AI features every time I open the application.

**Why this priority**: Standard UX expectation for application settings.

**Independent Test**: Enable Lite Mode, reload the application, and verify it remains enabled.

**Acceptance Scenarios**:

1. **Given** the user has enabled Lite Mode, **When** the application is restarted, **Then** Lite Mode remains enabled and AI features remain hidden/restricted.

---

### Edge Cases

- **Mixed Mode**: What happens if a user enabled AI features (like image generation) before turning on Lite Mode? (Assumption: Existing AI-generated content remains visible, but no new AI actions can be performed).
- **Syncing**: How does Lite Mode affect vault syncing? (Assumption: Syncing works as normal, as it's not an AI feature).
- **Help/Docs**: Does Lite Mode hide help content about AI? (Assumption: No, but it may mark those features as "Unavailable in Lite Mode").

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a global setting to enable/disable "Lite Mode".
- **FR-002**: System MUST restrict the Oracle chat to **Restricted Mode** when Lite Mode is ON.
- **FR-003**: System MUST disable AI-powered image generation (e.g., "Draw" buttons) when Lite Mode is ON.
- **FR-004**: System MUST disable automatic tagging and categorization suggestions when Lite Mode is ON.
- **FR-005**: System MUST prevent initialization of AI SDKs and outgoing requests to AI endpoints when Lite Mode is ON.
- **FR-006**: System MUST persist the Lite Mode setting across sessions.
- **FR-007**: **Restricted Oracle** MUST support utility slash commands: `/connect`, `/merge`, `/help`, and `/clear`.
- **FR-008**: **Restricted Oracle** MUST NOT attempt to process any input that is not a valid slash command through an AI model.

### Key Entities _(include if feature involves data)_

- **Application Settings**: Represents global user preferences, including the new `liteMode` boolean.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of AI-related network requests are blocked when Lite Mode is active.
- **SC-002**: All AI-only UI entry points (e.g., "Draw" buttons) are removed within 500ms of enabling Lite Mode.
- **SC-003**: Utility commands (`/connect`, `/merge`) remain fully functional in Lite Mode without triggering AI backend logic.
- **SC-004**: Memory usage is reduced by not initializing the AI provider layer when Lite Mode is active from start.
