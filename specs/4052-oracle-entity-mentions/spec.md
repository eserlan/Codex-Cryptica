# Feature Specification: Oracle Entity @Mentions

**Feature Branch**: `4052-oracle-entity-mentions`
**Created**: 2026-10-13
**Status**: Draft
**Input**: GitHub issue #4052 — "@mention Vault entities with autocomplete and grounded ID resolution"

## Clarifications

### Session 2026-10-13

- Q: Which entities does "hidden" cover? → A: Whatever the Vault already hides from the current user (GM-only, spoiler-hidden, guest-restricted). The picker, resolver and context supply all apply the same filter; no new permission rules and no GM override.
- Q: How much related content goes to Oracle beyond the mentioned entities? → A: Mentioned entities in full, plus a short summary of directly linked entities only, trimmed to the context limit with mentions kept first.
- Q: Should an edited mention keep its original entity? → A: Only while its token is untouched. Editing any of its text turns it into plain text, which is re-checked like a typed `@name` on send.
- Q: Should a unique typed `@name` match be confirmed before sending? → A: No. It is used straight away and shown as a link in the sent message so the user can see and correct it.
- Q: Which entity names in Oracle replies become links? → A: Only entities that were mentioned in the question or supplied as context, when their exact name appears in the reply.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Mention an entity and get a grounded answer (Priority: P1)

A player types `@` in the Oracle message box, sees a list of matching Vault entities, picks one, and asks a question about it. Oracle answers from that exact entity, not from a guess based on the typed name.

**Why this priority**: This is the reported failure. "Who is @elara" returned "I cannot find that in your records" while "Elara Voss" worked. A reliable way to point Oracle at an entity is the core of the feature.

**Independent Test**: With a Vault containing "Elara Voss", type `@ela`, select her, send "Who is @Elara Voss?", and confirm the answer is grounded in her entry.

**Acceptance Scenarios**:

1. **Given** the active Vault has an entity named Elara Voss, **When** the user types `@ela`, **Then** a suggestion list shows Elara Voss with her type and a short descriptor.
2. **Given** the list is open, **When** the user selects Elara Voss, **Then** a visibly distinct mention is inserted that stays tied to that entity.
3. **Given** a message holds a selected mention, **When** it is sent, **Then** Oracle's answer draws on that entity's content.
4. **Given** two entities share a similar name, **When** the user picks one, **Then** only the picked entity is used.

---

### User Story 2 - Mention several entities in one message (Priority: P1)

A user asks "How is @Elara Voss connected to @Royal Academy of Pagen?" and both entities ground the answer.

**Why this priority**: Relationship questions are a main use of a lore assistant.

**Independent Test**: Send a message with two selected mentions and confirm both entities' content is available to the answer.

**Acceptance Scenarios**:

1. **Given** a message with two or more selected mentions, **When** it is sent, **Then** every mentioned entity grounds the answer.
2. **Given** many mentions or very large entities, **When** the message is sent, **Then** explicit mentions are kept first and extra related content is trimmed to fit the limit.

---

### User Story 3 - Typed `@name` without picking still works safely (Priority: P2)

A user types `@elara` and sends without choosing a suggestion, for example on a phone.

**Why this priority**: Without this, the original bug stays a dead end for anyone who skips the picker.

**Independent Test**: Send `@elara` with exactly one matching name or alias; then with two matches; then with none.

**Acceptance Scenarios**:

1. **Given** exactly one entity matches by name or alias, **When** the user sends, **Then** that entity is used straight away, with no confirm step, and the message shows which one as a link.
2. **Given** several entities match, **When** the user sends, **Then** the user is asked to choose, and no entity is attached until they do.
3. **Given** no entity matches, **When** the user sends, **Then** the user is told nothing matched and can still send the text as written or search again.

---

### User Story 4 - Read and open mentions in the conversation (Priority: P2)

Sent messages show resolved mentions as recognisable links that open the entity. Entities named in Oracle's replies can be opened too where possible.

**Why this priority**: It lets users check what Oracle used and move to the entry.

**Independent Test**: Send a message with a mention, activate it by pointer and keyboard, and confirm the entity opens.

**Acceptance Scenarios**:

1. **Given** a sent message with a resolved mention, **When** the user activates it, **Then** the entity opens.
2. **Given** the entity was renamed after sending, **When** the user views history, **Then** the mention still points to the same entity.
3. **Given** the entity was deleted, **When** the user views history, **Then** the mention shows as unavailable and does not break the message.

---

### User Story 5 - Phone and keyboard use (Priority: P2)

The picker works with a touch screen and soft keyboard, and fully by keyboard on desktop, including for screen readers.

**Why this priority**: The bug was found on mobile, and the issue sets mobile-first as a requirement.

**Independent Test**: On a narrow screen with the on-screen keyboard open, the list and Send button are both visible and tappable. On desktop, complete a mention using only the keyboard.

**Acceptance Scenarios**:

1. **Given** a narrow screen with the on-screen keyboard open, **When** the list opens, **Then** it stays visible near the input, is scrollable, has large touch targets and does not cover Send.
2. **Given** the list is open, **When** the user presses Up/Down, Enter or Tab, or Escape, **Then** they move, select or dismiss, respectively.
3. **Given** a screen reader, **When** the list opens and the selection changes, **Then** the result count and the highlighted entity are announced.

---

### User Story 6 - Hidden entities stay hidden (Priority: P1)

Mentions never expose entities the user may not see, and never cross Vault boundaries.

**Why this priority**: A leak of GM-only or other-Vault content is a trust failure.

**Independent Test**: Create a hidden entity and an entity in another Vault; confirm neither is suggested, resolved or used as context, even if the text is pasted or typed by hand.

**Acceptance Scenarios**:

1. **Given** an entity the current user may not see, **When** they type `@` and its name, **Then** it is not suggested.
2. **Given** a pasted mention for a hidden or other-Vault entity, **When** the message is sent, **Then** it is treated as plain text and no content from it reaches Oracle.

---

### Edge Cases

- Pasted mention text from another message, Vault or app.
- Editing or deleting part of a mention token (it becomes plain text, never a mismatched entity).
- Entity deleted or renamed between selection and send.
- Typing `@` in an email address or mid-word (no picker).
- Slash commands (e.g. `/draw`) and `@` used together; commands keep working.
- Same name across different types, or an alias that equals another entity's name.
- Very large Vaults: suggestions stay responsive.
- Offline or AI disabled: picker and links still work; no assistant answer is expected.
- Replay of old history that has no mention data.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Typing `@` at the start of a word in the Oracle message box MUST open a suggestion list of entities from the active Vault.
- **FR-002**: Continued typing MUST filter suggestions by name and alias, with minimal delay between keystrokes and lookups.
- **FR-003**: Each suggestion MUST show the entity's name, type and a short descriptor, with extra context where names are alike.
- **FR-004**: Selecting a suggestion MUST insert a visibly distinct mention bound to the entity's stable identity, not only its displayed name.
- **FR-005**: Mentions MUST keep resolving after the entity is renamed.
- **FR-006**: On send, mentions MUST be resolved to entities by identity, never by the assistant inferring the entity from text.
- **FR-007**: Content of every resolved mentioned entity MUST be supplied to Oracle as grounding, and explicit mentions MUST take priority over entities found only by name in the text.
- **FR-008**: Mentioned entities MUST be supplied in full. Related content MUST be limited to short summaries of directly linked entities, trimmed so total context stays within limits, with explicit mentions always kept first.
- **FR-009**: A message MUST support multiple mentions.
- **FR-010**: An unselected `@name` MUST be matched only when exactly one entity matches by name or alias; otherwise the user MUST be asked to choose or told nothing matched. The system MUST NOT silently attach a wrong entity.
- **FR-011**: Sent messages MUST show resolved mentions as accessible, activatable links that open the entity. In Oracle replies, only entities that were mentioned or supplied as context MUST be linked, and only where their exact name appears.
- **FR-012**: Plain text messages, slash commands, history and Send MUST behave as before when no mention is present.
- **FR-013**: Pasted, edited, deleted, missing or unmatched mentions MUST degrade to plain text or an "unavailable" label without errors or data loss.
- **FR-013a**: A mention MUST keep its entity only while its token is intact. If any of its text is edited, it MUST become plain text and be re-checked like a typed `@name` on send.
- **FR-014**: Suggestion, resolution and context supply MUST each apply the same filter the Vault already uses to hide entities from the current user (GM-only, spoiler-hidden, guest-restricted), with no GM override, and MUST NOT expose entities from any other Vault.
- **FR-015**: The picker MUST be usable on narrow screens with a soft keyboard: visible near the input, scrollable, with large touch targets, not covering Send.
- **FR-016**: The picker MUST support Up/Down, Enter/Tab to select, and Escape to dismiss, manage focus sensibly, and expose labels and announcements for screen readers.
- **FR-017**: The picker MUST show clear loading, empty and "choose one" states.
- **FR-018**: Mentions MUST be stored with each message as structured references (entity identity, display name, entity type) alongside readable text, and survive history reload and replay.
- **FR-019**: The picker and resolver MUST reuse the Vault's existing search and entity-link behaviour rather than a separate Oracle-only index.
- **FR-020**: The picker and mention model MUST be separable from Oracle's own retrieval rules so Cif and VTT Chat can adopt them later. Cif and VTT Chat integration is out of scope here, and Cif's product-help scope stays separate from Oracle's Vault-knowledge scope.
- **FR-021**: The shared boundaries and reuse guidance for Cif and VTT Chat MUST be documented.

### Key Entities

- **Mention**: A reference inside a message with an entity identity, the name shown when selected, and the entity type.
- **Mention suggestion**: A candidate entity shown in the picker, with name, matched alias, type and descriptor.
- **Resolved reference**: The outcome of checking a mention at send: resolved, ambiguous, unavailable (missing or hidden) or unmatched.
- **Grounding set**: The bounded group of entities supplied to Oracle, with explicit mentions ranked first.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can mention an entity from typing `@` to sending in under 10 seconds on a phone.
- **SC-002**: Suggestions update within 200 ms of a keystroke in a Vault of 5,000 entities.
- **SC-003**: In test questions with selected mentions, 100% of mentioned entities are supplied to Oracle, including with 3 or more mentions in one message.
- **SC-004**: Zero hidden or other-Vault entities appear in suggestions, resolution or Oracle context across all permission test cases.
- **SC-005**: No unselected `@name` is attached to an entity unless it is the only match; all ambiguous cases ask the user.
- **SC-006**: Mentions still open the right entity after rename, and show a clear unavailable state after deletion, in 100% of tested cases.
- **SC-007**: Every picker action can be done by keyboard alone, and the list never covers Send on screens 360 px wide with the soft keyboard open.
- **SC-008**: Existing plain-text, slash-command and history behaviour shows no regression in the existing tests.

## Assumptions

- "Authorised" and "GM/spoiler visibility" follow the Vault's existing rules; this feature adds none.
- Aliases come from existing entity data; no new alias editing is introduced.
- Existing related-entity-by-name behaviour (#1401) stays as the fallback for text without explicit mentions.
- Cif and VTT Chat adoption is a follow-up; only the reusable boundaries are in scope now.
