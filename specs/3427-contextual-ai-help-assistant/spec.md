# Feature Specification: Contextual AI Help Assistant (Spike)

**Feature Branch**: `3427-contextual-ai-help-assistant`  
**Created**: 2026-09-30  
**Status**: Implemented (spike); findings in [findings.md](./findings.md)  
**Input**: GitHub issue #3427 and `docs/ARCH_CONTEXTUAL_AI_HELP_ASSISTANT.md`: a thin vertical spike of an embedded product guide that knows how Codex Cryptica works and where the user currently is. In Settlement → Connections, the user asks "How do I connect the faction I just created?" and receives a grounded answer, plus an optional safe on-screen pointer to the relevant control.

## Scope

This is an architecture and product **spike**, not production polish. It proves one end-to-end workflow and produces the contracts and findings needed to decide on a full build.

**In scope**: a minimal description of where the user is, a small proof-of-concept product knowledge set, grounded answers, a short list of safe on-screen guidance actions, graceful fallback when help cannot be found or the assistant is unreachable, and privacy-safe operational metrics recorded by the help service itself (no in-app instrumentation).

**Out of scope (deferred)**: proactive or unprompted suggestions, automated publishing of product knowledge as features change, any action that changes vault content, and production-wide coverage of every feature.

## Clarifications

### Session 2026-09-30

- Q: Who can reach the spike, and on what AI access? → A: Off by default behind a feature flag; only users who already have AI enabled can use it, through the existing AI access path. Everyone else sees static help only.
- Q: Where does the assistant live and how is it opened? → A: A dedicated Help panel, separate from the Oracle, opened from a persistent help button; a contextual "Ask about this" shortcut on the Connections tab opens the same panel with the screen already known.
- Q: What help-service measurement is acceptable? → A: Service-side operational metrics only (outcome, response time, feature area, request count); no client-side events, no user/session/vault identifiers, no content. "Action accepted" is not measured.
- Plan-phase correction (2026-09-30): the Add connection control lives on the Status tab; the Connections tab is read-only. The scenario, FR-020, and SC-004 (first-feedback target replaced by a 0.3 s pending state) were updated accordingly. See `research.md` F1 and D10. The plan also defines "AI enabled" as the existing AI Disabled setting being off (research F5), and FR-027's outcome list was aligned with the service contract.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ask how to do something where I am (Priority: P1)

As a user editing a Settlement on its Connections tab, I can ask "How do I connect the faction I just created?" and receive a short, accurate answer that refers to what I am looking at (the Connections tab is a read-only picture; new connections are added from the Status tab), with a pointer to where the answer came from.

**Why this priority**: This is the whole point of the spike. If the assistant cannot answer a real question about the user's current screen using real Codex Cryptica documentation, nothing else matters.

**Independent Test**: Open a Settlement, go to Connections, ask the question, and check that the answer describes the actual Add Connection workflow, mentions the current screen rather than a generic one, and names the help source it relied on.

**Acceptance Scenarios**:

1. **Given** the user is on a Settlement's Connections tab, **When** they ask how to connect a faction they just created, **Then** the answer explains the actual steps (open the Status tab and use Add) rather than describing Add as available on the Connections tab, and cites the help topic it is based on.
2. **Given** the same question asked from a different screen (for example, the Graph), **When** the answer is produced, **Then** it is tailored to that screen and does not describe the Connections tab as if the user were on it.
3. **Given** the user asks a question that refers to "this page" or "here", **When** the answer is produced, **Then** the assistant resolves it using where the user currently is, without asking them which page they mean.
4. **Given** the question is answered, **When** the user reads it, **Then** every factual claim about Codex Cryptica is traceable to a cited help source rather than the assistant's general knowledge.

---

### User Story 2 - Be shown where the control is (Priority: P2)

As a user who has been told to use a control, I can ask the assistant to show me, and the relevant control on screen is visibly highlighted without anything being changed on my behalf.

**Why this priority**: Turning an explanation into a visible pointer is what makes contextual help better than static documentation, and it proves the safe-action boundary.

**Independent Test**: From Settlement → Connections, ask how to connect the faction and accept the offered guidance. The Status tab opens and the Add connection control is highlighted, and no entity, connection, or other vault data is created or altered.

**Acceptance Scenarios**:

1. **Given** an answer that recommends a control visible on the current screen, **When** the assistant offers to show it, **Then** the user can accept and the control is clearly highlighted.
2. **Given** the assistant proposes guidance, **When** it is offered, **Then** it is one of a short fixed list of safe guidance actions: go to a place, open help, open a panel, highlight a control, or open a generator.
3. **Given** the assistant proposes something outside that list, or a control that is not available on the current screen, **When** the proposal is checked, **Then** it is discarded and only the written answer is shown.
4. **Given** any guidance action, **When** it runs, **Then** it never creates, edits, deletes, imports, or exports vault content.

---

### User Story 3 - Get sensible help when no authoritative answer exists (Priority: P3)

As a user asking something the product documentation does not cover, I am told honestly that there is no authoritative answer, and I am pointed to the closest relevant help instead of receiving an invented one.

**Why this priority**: Trust in a product guide depends on it never confidently inventing features. This story defines how the assistant fails.

**Independent Test**: Ask about a capability that does not exist in Codex Cryptica. The assistant says it could not find documented guidance and offers related help topics, without describing a feature that does not exist.

**Acceptance Scenarios**:

1. **Given** a question with no matching product knowledge, **When** the assistant responds, **Then** it states that it cannot find authoritative help and suggests the closest topics or the help library.
2. **Given** a question only weakly related to the knowledge set, **When** the assistant responds, **Then** it does not present weak matches as a confident answer.
3. **Given** a question unrelated to using Codex Cryptica, **When** the assistant responds, **Then** it explains that it only helps with using the product.

---

### User Story 4 - Help still works when the assistant is unreachable (Priority: P4)

As a user who is offline, has no AI available, or hits a service problem, I can still reach the relevant static help for where I am, and I am told plainly what happened.

**Why this priority**: Codex Cryptica is local-first. Help must not disappear when the network or AI service does.

**Independent Test**: Go offline (or make the assistant service fail), open the help assistant on Settlement → Connections, and ask a question. The user sees a clear message and a direct link to the Connections help topic.

**Acceptance Scenarios**:

1. **Given** the user is offline or the assistant service fails or times out, **When** they ask a question, **Then** they see a plain-language explanation and the static help topic for their current screen.
2. **Given** the assistant is unavailable, **When** the user opens it, **Then** nothing else in the vault, editor, or navigation is blocked or slowed.
3. **Given** a slow response, **When** the wait passes the target time, **Then** the user sees progress feedback and can cancel or fall back to static help.

---

### User Story 5 - Keep my vault private (Priority: P5)

As a privacy-conscious user, I can be confident that asking for help shares only a minimal description of the screen I am on, never my vault content or identifiers.

**Why this priority**: The vault is private by design. This story is a hard constraint on every other story rather than a separate feature, but it must be independently verifiable.

**Independent Test**: Inspect exactly what is sent when asking the Settlement → Connections question. It contains the question, recent help conversation, and a small screen description, and contains no entity names, entity text, entity or vault identifiers, or other vault data.

**Acceptance Scenarios**:

1. **Given** the user asks a question, **When** the screen description is prepared, **Then** it contains only the general screen, feature, entity kind, tab, mode, and available guidance actions, and it does not contain identifiers taken from the user's address.
2. **Given** the faction the user just created, **When** the question mentions it, **Then** the assistant answers generically about connecting a faction and does not need or receive the faction's name or contents.
3. **Given** the help service records operational metrics, **When** a record is made, **Then** it describes only the service's own behaviour (outcome, response time, feature area, request count) and never the question text, answer text, vault data, or any user, session, or vault identifier.
4. **Given** the user is inside the authenticated vault, **When** they use help, **Then** no client-side analytics or event tracking is added to the application; measurement is recorded only by the help service.

---

### Edge Cases

- The user asks before any screen description is available (for example, while the page is still loading): the assistant answers as a general product guide and says it does not know where the user is.
- The user is outside the authenticated app (for example, on a public marketing page): the spike does not show the Help panel there. The screen description still records whether the user is in the vault or on a public page so later expansion is additive, but the spike only produces the in-vault value.
- A feature the assistant would mention is behind a feature flag the user does not have: the assistant does not describe or highlight it.
- The product knowledge refers to a control that has since been renamed or removed: the highlight action fails quietly and the written answer still shows.
- The user changes screens while an answer is loading: the answer is labelled or dropped so it is not presented against the wrong screen.
- The user asks a follow-up ("and how do I remove it?"): recent conversation is used, with a limit on how much history is considered.
- The user asks the assistant to perform a change ("connect them for me"): the assistant explains the steps and offers to highlight the control, and states it cannot make the change.
- Questions or answers contain attempts to instruct the assistant to ignore its rules or reveal its instructions: the assistant stays within its product-guide role.
- Very long or empty questions: empty input is rejected without a request; very long input is limited with a clear message.
- The same question is asked repeatedly or at high volume: requests are limited so the service cannot be abused or run up cost.

## Requirements _(mandatory)_

### Functional Requirements

**Asking and answering**

- **FR-001**: Users MUST be able to open the help assistant from within the application and ask a free-text question about using Codex Cryptica. It MUST be a dedicated Help panel, distinct from the Oracle, opened from a persistent help button, and the Connections tab MUST also offer an "Ask about this" shortcut that opens the same panel with the current screen already known.
- **FR-001a**: The Help panel MUST be operable by keyboard and assistive technology, and MUST be dismissible without losing the user's place or unsaved work in the screen beneath it.
- **FR-002**: The assistant MUST answer using documented product knowledge and MUST cite the help source(s) each answer is based on.
- **FR-003**: The assistant MUST tailor its answer to the user's current screen and MUST be able to resolve references such as "this page", "here", and "this tab".
- **FR-004**: The assistant MUST NOT describe features, screens, or controls that are absent from the product knowledge set or unavailable to the user.
- **FR-005**: The assistant MUST keep answers short (no more than about 120 words) and in plain, user-friendly language, consistent with the product's existing help tone.
- **FR-006**: The assistant MUST take recent help conversation into account for follow-ups, limited to a small fixed amount of history.

**Screen description**

- **FR-007**: The system MUST produce a minimal screen description for each question containing only: a generic route pattern, the feature area, entity kind, selected tab or panel, mode, whether the user is in the vault or on a public page, material feature flags, and the currently available guidance actions.
- **FR-008**: The screen description MUST NOT include vault content, entity names or text, entity/vault/campaign identifiers, credentials, or other user-specific data, and route patterns MUST NOT contain identifiers.
- **FR-009**: The screen description's contents MUST be defined by an explicit, versioned schema so that additions are deliberate and reviewable.
- **FR-010**: The system MUST reject or strip any screen description that does not conform to the schema.

**Product knowledge**

- **FR-011**: The system MUST include a structured product knowledge registry for the proof-of-concept areas: Entity Connections, Graph, Session Hub, Tables, and one generator workflow.
- **FR-012**: Each registry entry MUST state, at minimum, what the feature is for, where it lives, the screens and entity kinds it applies to, key workflows, the guidance actions safe to offer for it, and the help topic(s) it draws on.
- **FR-013**: The registry MUST reference existing help content where it already covers a topic, and MUST NOT duplicate that content.
- **FR-014**: Product knowledge MUST be version-controlled with the product so that it changes alongside the features it describes.
- **FR-015**: The registry MUST be validated automatically so that entries with missing required fields, unknown help references, or unknown guidance actions are caught before release.

**Safe guidance actions**

- **FR-016**: The assistant MUST only be able to propose guidance actions from a fixed allow-list: navigate, open help, open a panel, highlight a control, and open a generator.
- **FR-017**: Every proposed action MUST be validated against the allow-list and the user's current screen before being offered, and invalid proposals MUST be discarded.
- **FR-018**: Guidance actions MUST NOT create, modify, delete, import, or export vault content, and the assistant MUST NOT be given any way to do so in this spike.
- **FR-019**: Users MUST explicitly accept any action before it runs, and MUST be able to dismiss it. A guide may include one follow-on step (for example, open a tab, then highlight a control); accepting the guide runs both steps, and no guide has more than two steps.
- **FR-020**: Highlighting MUST be demonstrated for the Add connection control, reached by opening the Status tab from a Settlement's Connections tab as a single accepted guide, and MUST be removable by the user.
- **FR-021**: Highlighting MUST be accessible: it MUST NOT rely on colour alone, MUST be announced to assistive technology, and MUST respect the user's reduced-motion preference.

**Fallback and resilience**

- **FR-022**: When no authoritative knowledge matches, the assistant MUST say so and point to the closest help topics or the help library rather than guessing.
- **FR-023**: When the assistant cannot be reached (offline, AI unavailable, service error, or timeout), the system MUST show a clear plain-language message and link to the static help topic for the user's current screen.
- **FR-024**: Failure or slowness of the assistant MUST NOT block or degrade any other part of the application.
- **FR-025**: The user MUST see progress feedback while an answer is pending and MUST be able to cancel.
- **FR-026**: The assistant MUST stay within its role as a product guide and MUST decline to act on instructions in user input that attempt to change that role or expose its instructions.

**Privacy, usage measurement, and limits**

- **FR-027**: The help service MUST record operational metrics only, limited to: outcome (answered, no-match, out-of-scope, error, rate-limited), response time, feature area, and request count. It MUST NOT record question text, answer text, vault content, or any user, session, or vault identifier, and metrics MUST NOT be linkable to an individual. Whether a guidance action was accepted is NOT measured in the spike.
- **FR-028**: The application MUST NOT add client-side tracking, analytics, or event instrumentation for help or any other activity inside the authenticated vault.
- **FR-029**: The system MUST limit request rate and input size to protect the service from abuse and runaway cost, and MUST tell the user plainly when a limit is reached.
- **FR-030**: The help assistant MUST be off by default behind a feature flag, and MUST be usable only by users who already have AI enabled, meaning they have not turned on the existing "AI Disabled" setting, through the existing AI access path. Users without AI enabled, and users when the flag is off, MUST see existing static help only and MUST NOT be shown a broken or empty assistant. Disabling the flag MUST leave the application fully functional.
- **FR-030a**: The spike MUST NOT introduce a new shared or project-funded AI quota, billing path, or separate AI credentials for end users.

**Spike outputs**

- **FR-031**: The spike MUST deliver written findings that settle the issue's deliverables: the screen-description schema, the registry schema, the request/response contract between the app and the help service, the guidance action contract, an estimate of cost and latency for a typical help interaction, and a recommended approach for keeping product knowledge current.
- **FR-032**: The spike MUST produce a prioritised list of follow-up implementation items once the approach is validated.

### Key Entities

- **Help Question**: A free-text question from the user, with the recent help conversation and a screen description. Transient; not stored as vault content.
- **Screen Description**: The minimal, schema-defined description of where the user is and what they can do there. Contains no vault content or identifiers.
- **Feature Entry**: One structured item in the product knowledge registry describing a feature, where it lives, who it applies to, its workflows, safe actions, and the help topics it draws on.
- **Help Source**: An existing help topic or registry entry that an answer can cite. Has a stable reference so citations can be shown as links.
- **Help Answer**: The grounded response shown to the user, with its cited Help Sources, an indicator of confidence (answered, weak/no match, fallback), and zero or one proposed Guidance Action.
- **Guidance Action**: A proposed, non-mutating on-screen aid drawn from the fixed allow-list, tied to a control or destination available on the current screen, and requiring user acceptance. One guide may chain a single follow-on step.
- **Help Service Metric**: A service-side operational measurement of one help request's outcome, timing, and feature area, with no content or identifiers and no link to an individual.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For the target scenario (Settlement → Connections, "How do I connect the faction I just created?"), a reviewer agrees the answer is correct and screen-specific in at least 9 of 10 repeated runs.
- **SC-002**: On a test set of at least 20 questions covering the five proof-of-concept areas, at least 90% of answers cite a correct help source, and 0% describe a feature that does not exist.
- **SC-003**: On a set of at least 10 out-of-scope or undocumented questions, 100% receive an honest "no authoritative help" or "product help only" response rather than an invented answer.
- **SC-004**: For a typical question, users see that their question is being worked on within 0.3 seconds and the complete answer within 8 seconds for at least 90% of requests.
- **SC-005**: When the assistant is unavailable, 100% of attempts show a plain-language message and a working link to the relevant static help within 2 seconds.
- **SC-006**: In inspection of every request the feature can send, 0 contain vault content, entity names or text, or entity, vault, or campaign identifiers.
- **SC-007**: 100% of proposed guidance actions that are not on the allow-list or not valid for the current screen are discarded, and 0 actions modify vault content in any test.
- **SC-008**: Opening, using, or failing the help assistant causes no measurable slowdown to editing, navigation, or other core tasks.
- **SC-009**: The spike delivers all written findings listed in FR-031 and a follow-up work list, and a reviewer can decide whether to proceed to a full build using them alone.
- **SC-010** _(not evaluated in the spike; deferred to a follow-up)_: In a simple usability check with at least 5 people unfamiliar with the feature, at least 4 complete "connect a faction to this settlement" with the assistant's help on their first attempt.

## Assumptions

- This is a spike behind a feature flag, off by default and limited to users with AI already enabled (see Clarifications); it is not announced in the changelog.
- The assistant's name is provisional for the spike. Final naming, contextual quick prompts, and the proactive-help setting are design questions the spike reports on rather than settles.
- Existing help content in the application is the authoritative starting source; the registry points to it rather than replacing it.
- The assistant uses the application's existing AI service boundary and follows the existing rules about AI availability, including that AI features fall back gracefully when AI is unavailable or unconfigured.
- Answers are in English for the spike.
- Help conversation history is held only for the current session and is not saved into the vault.
- The five proof-of-concept areas are Entity Connections, Graph, Session Hub, Tables, and one generator workflow chosen during planning.
- Storage, retrieval, embedding, ranking, service contract, cost, and deployment design questions raised in the issue are resolved in the planning phase and recorded in the spike findings.
- Deferred to later specs: proactive suggestions, automated knowledge publishing on each release, broad feature coverage, and any vault-mutating assistant action.

## Dependencies

- Existing in-app help content and help library.
- Existing AI service and its availability and configuration handling.
- The architecture proposal in `docs/ARCH_CONTEXTUAL_AI_HELP_ASSISTANT.md`.
- The project constitution's privacy, local-first, and AI-fallback principles.
