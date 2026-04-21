# Feature Specification: Auto-generate Content from Oracle Chat

**Feature Branch**: `087-gen-oracle-content`  
**Created**: 2026-04-19  
**Status**: In Progress
**Input**: User description: "auto gen content based on oracle chat https://github.com/eserlan/Codex-Cryptica/issues/642. Shift focus: Automagical background generation during chat instead of explicit /create command."

## Clarifications

### Session 2026-04-19

- Q: How aggressive should the identity matching be for proposed updates? → A: Near-exact match with fuzzy fallback.
- Q: How should the user be notified when an entity is auto-archived during a chat? → A: Combine transient UI feedback (toasts/badges) with a persistent session activity log.
- Q: How should the system handle proposed updates if the user has manually edited the same entity in the same session? → A: Non-destructive Append.
- Q: Which messages should trigger the entity discovery and drafting process? → A: Both (Contextual Synthesis).
- Q: How should users find and verify auto-archived drafts later? → A: Provide a dedicated "Review" tab for unreviewed entries and show draft nodes with a distinct "Ghost" style on the graph canvas.

### Session 2026-04-21

- Q: Should Oracle-created nodes and connections appear automatically? → A: Make automation user-configurable. Entity discovery and connection discovery should be separate settings so users can choose between no automation, suggestions, automatic entity creation, and automatic connection application.
- Q: How should discovery suggestions be shown when suggestion mode finds many entities? → A: Collapse suggestions under a compact "Found lore" pill/menu by default, and suppress structured output labels such as Name, Type, Chronicle, and Lore from discovery proposals.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Proactive Entity Discovery (Priority: P1)

As a lore keeper, I want the Oracle to silently identify new entities I describe during a normal conversation and prepare a draft record for them, so that I can capture ideas without interrupting my creative flow with commands.

**Why this priority**: Core shift in focus. Moves from "manual trigger" to "intelligent assistance," making the vault feel alive and responsive to the conversation.

**Independent Test**: Start a normal chat (no slash commands): "There is a reclusive alchemist named Valerius who works out of a crystal tower in the Azure Wastes." The Oracle should respond normally, but also display a subtle "New Entity Detected: Valerius" notification or button in the message actions.

**Acceptance Scenarios**:

1. **Given** a normal chat conversation, **When** the Oracle identifies a name and description that doesn't exist in the vault, **Then** it prepares a background draft (Lore/Chronicle/Type).
2. **Given** a background draft is ready, **When** the Oracle displays its response, **Then** it includes an unobtrusive "Found lore" control that can expand to show "Add to Vault" actions for detected entities.

---

### User Story 2 - Under-the-Hood Contextual Updates (Priority: P1)

As a lore keeper, I want the Oracle to automatically prepare updates for existing entities based on our conversation, so that my vault stays synchronized with the latest developments in my story.

**Why this priority**: Ensures existing data evolves naturally alongside the narrative without manual maintenance.

**Independent Test**: Chat about an existing character: "Actually, Valerius has lost his left eye in an experiment." The Oracle should identify "Valerius" as an existing entity and propose adding this new detail to his record.

**Acceptance Scenarios**:

1. **Given** a chat about an existing entity, **When** new facts are established, **Then** the system automatically drafts a "Smart Update" for that entity.
2. **Given** a drafted update, **When** the user clicks "Apply," **Then** the new information is integrated into the entity's Lore or Chronicle.

---

### User Story 3 - Hands-free "Auto-Archive" Persistence (Priority: P2)

As a lore keeper, I want the option to let the Oracle automatically commit detected entities to the vault as "Drafts" without any clicks, so that I can look back at a session and find everything already recorded.

**Why this priority**: Maximal automation for users who want zero-friction world-building.

**Independent Test**: Enable "Auto-Archive" in settings. Have a long conversation describing multiple people and places. Open the vault and find new entries marked as "Auto-generated" or "Unreviewed" corresponding to the conversation.

**Acceptance Scenarios**:

1. **Given** Auto-Archive is enabled, **When** an entity is identified, **Then** it is saved to the vault immediately as a "Draft" status entity.
2. **Given** auto-created entities, **When** the user reviews them, **Then** they can "Verify" to remove the draft status or "Discard" to delete.

---

### User Story 4 - Background Connection Seeding for Oracle Discoveries (Priority: P2)

As a lore keeper, I want entities created or updated from Oracle chat to immediately feed the connection proposer, so that relationship suggestions appear without making me run a separate scan.

**Why this priority**: Oracle-driven discovery captures the richest fresh context. Reusing that moment to seed connection analysis keeps the graph coherent without adding manual steps.

**Independent Test**: Create or update an entity through normal Oracle chat discovery, then inspect that entity's proposal panel and see new pending connection suggestions generated through the existing proposer flow.

**Acceptance Scenarios**:

1. **Given** the Oracle creates a new entity from chat, **When** the record is committed manually or via Auto-Archive, **Then** the system triggers the existing connection proposer for that entity in the background.
2. **Given** the Oracle updates an existing entity from chat, **When** the update is applied manually or via Auto-Archive, **Then** the system triggers the existing connection proposer for that entity in the background.
3. **Given** connection analysis finds likely relationships, **When** proposals are ready, **Then** they are surfaced through the existing proposal UI from Feature 040 rather than silently creating graph edges.

---

### User Story 5 - User-Controlled Oracle Automation (Priority: P1)

As a lore keeper, I want to choose how much the Oracle changes my vault and graph automatically, so that the assistant can be helpful without feeling intrusive.

**Why this priority**: The same automation that helps power users can surprise users who expect review before persisted changes. The feature must preserve trust by making persistence and graph mutation explicit preferences.

**Independent Test**: Open Oracle settings and set Entity Discovery to "Suggest" and Connection Discovery to "Suggest". Chat about a new faction and commit its discovery chip. The entity is created only after the user clicks, and connection suggestions appear for review without graph edges being created automatically. Change Connection Discovery to "Auto-apply", repeat the flow, and verify accepted connections are created automatically.

**Acceptance Scenarios**:

1. **Given** Entity Discovery is "Off", **When** the Oracle chat mentions new or existing entities, **Then** no discovery chips or auto-archive records are produced.
2. **Given** Entity Discovery is "Suggest", **When** the Oracle detects an entity, **Then** it shows a discovery chip but does not create or update a vault record until the user commits it.
3. **Given** Entity Discovery is "Auto-create", **When** the Oracle detects a new entity or update, **Then** it saves the draft/update according to the Auto-Archive rules.
4. **Given** Connection Discovery is "Off", **When** an Oracle-created or Oracle-updated entity is committed, **Then** no connection analysis runs.
5. **Given** Connection Discovery is "Suggest", **When** an Oracle-created or Oracle-updated entity is committed, **Then** connection proposals are generated for review but no graph edges are created.
6. **Given** Connection Discovery is "Auto-apply", **When** an Oracle-created or Oracle-updated entity is committed, **Then** high-confidence connection proposals may be applied automatically and the user is notified of the created edge count.

---

### Edge Cases

- **False Positives**: What if the AI thinks a common noun or a passing mention is an entity? (Mitigation: Only propose drafts for entities with a "significant description"—defined as at least 100 characters of lore/chronicle content; allow easy dismissal of the "Add to Vault" suggestion).
- **Overlapping Entities**: What if one message describes three different entities? (System should handle multiple "Add to Vault" actions for a single message).
- **Chat History vs. Instant Fact**: Should the AI use the whole session context to build the draft? (Yes, if Valerius was named in message 1 and described in message 4, the draft should synthesize both).
- **Ambiguous Updates**: If fuzzy matching detects an existing entity but it's not a certain match (e.g., "The Alchemist" vs. "Valerius"), the system MUST propose "Update Valerius?" with an explicit confirmation rather than auto-updating.
- **Update Conflicts**: If an entity is updated both manually and via a proposed Oracle update in the same session, the system MUST append the Oracle's new content to the end of the existing field (Lore or Chronicle) to prevent data loss.
- **Proposal Flooding**: If the Oracle mentions many entities in one turn, background connection analysis should reuse the proposer safeguards from Feature 040 to avoid duplicate or already-existing links.
- **Automation Surprise**: If a user has not explicitly enabled automatic graph mutation, the system MUST NOT create connection edges from Oracle discovery without user review.
- **Mode Changes Mid-Session**: If the user changes automation settings during a chat, new Oracle actions MUST use the latest settings while already-created records and proposals remain unchanged.
- **Structured Output Artifacts**: If an Oracle response includes labels such as `Name`, `Type`, `Chronicle`, `Lore`, `Content`, or `Summary`, the Drafting Engine MUST NOT treat those labels as entities or show them as discovery chips.
- **Suggestion Clutter**: If multiple discoveries are found in Suggest mode, the chat message MUST keep them collapsed by default behind a compact control with a count.

## Assumptions

- **Streamlined Extraction**: The system can perform entity extraction and drafting in parallel with generating the assistant's conversational response.
- **Incremental Synthesis**: The AI can distinguish between "new information" and "summarizing existing vault data" to avoid redundant updates.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST perform proactive entity extraction on both user input and assistant response to ensure full contextual synthesis.
- **FR-002**: System MUST identify both new entities (Creation) and existing entities (Update) from chat context.
  - **FR-002.1**: Identification MUST use near-exact matching first, falling back to fuzzy search for likely candidates.
- **FR-003**: System MUST provide a "Drafting Engine" that silently prepares Lore, Chronicle, and Type based on conversation history.
- **FR-004**: System MUST display discovery actions in the chat UI without requiring a slash command trigger.
  - **FR-004.1**: In Suggest mode, discovery actions MUST be collapsed by default under a compact "Found lore" control with a count.
  - **FR-004.2**: Expanding the "Found lore" control MUST reveal individual entity create/update actions.
- **FR-005**: System MUST support "One-Click Commit" to turn a background draft into a permanent vault record.
- **FR-006**: System MUST allow users to toggle "Auto-Archive" to bypass manual confirmation for new drafts.
  - **FR-006.1**: Auto-archived actions MUST be notified via transient UI feedback (toasts/badges) AND recorded in a persistent session activity log.
  - **FR-006.2**: Users MUST be able to find and verify drafts via a dedicated "Review" tab AND see them on the graph canvas as "Ghost" nodes.
- **FR-007**: System MUST handle multiple entity discoveries within a single chat message.
  - **FR-007.1**: System MUST suppress structured field-name artifacts such as `Name`, `Type`, `Chronicle`, and `Lore` from discovery proposals.
- **FR-008**: System MUST trigger background connection proposal analysis for entities created or updated through Oracle discovery once they are committed to the vault.
  - **FR-008.1**: This analysis MUST reuse the existing proposal persistence and review flow from Feature 040.
  - **FR-008.2**: By default, the system MUST surface suggested connections as proposals for user review rather than silently creating graph edges.
- **FR-009**: System MUST provide separate automation preferences for entity discovery and connection discovery.
  - **FR-009.1**: Entity Discovery MUST support `Off`, `Suggest`, and `Auto-create` modes.
  - **FR-009.2**: Connection Discovery MUST support `Off`, `Suggest`, and `Auto-apply` modes.
  - **FR-009.3**: The default mode MUST avoid automatic graph mutation; connection edges MUST NOT be created automatically unless the user has selected `Auto-apply`.
  - **FR-009.4**: Manual entity commits MUST still respect the Connection Discovery mode for follow-up analysis.
  - **FR-009.5**: Deterministic slash-command creation MUST respect the Connection Discovery mode unless the command explicitly requests connection creation.

### Key Entities _(include if feature involves data)_

- **PendingDraft**: A non-persistent draft stored in the current session memory until committed or discarded.
- **DraftStatus**: A metadata field for entities (`unreviewed`, `verified`) to track auto-generated content.
- **OracleAutomationPolicy**: User preference controlling whether entity discoveries are disabled, suggested, or auto-created, and whether connection discoveries are disabled, suggested, or auto-applied.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Entities described in chat are identified with 85% accuracy without user prompting.
- **SC-002**: Proactive draft generation adds less than 500ms of latency to the total response time (via parallel processing).
- **SC-003**: Users successfully capture 3x more entities during a session compared to manual creation methods.
- **SC-004**: "Smart Updates" correctly identify the target entity with 95% precision based on conversation context.
- **SC-005**: 95% of users can correctly predict whether an Oracle action will create records, create connections, or only show suggestions based on the visible automation setting labels.
