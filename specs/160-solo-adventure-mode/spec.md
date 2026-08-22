# Feature Specification: Solo Adventure Mode Foundation

**Feature Branch**: `160-solo-adventure-mode`
**Created**: 2026-08-15
**Status**: Draft
**Input**: User description: "Specify Phase 1 of Oracle Adventure Mode from issue #2278 and the product roadmap: a persistent, system-light solo adventure in which Oracle acts as GM using the owner's existing campaign."

## Clarifications

### Session 2026-08-15

- Q: How many player-controlled characters may an adventure have in Phase 1? → A: Exactly one player-controlled character.
- Q: How is the Phase 1 player character established? → A: Select an existing Character record or provide a provisional character description.
- Q: How can users access archived adventures in Phase 1? → A: Through a simple read-only list with transcript access.
- Q: How are basic Codex Cryptica dice results interpreted? → A: Oracle defines the dice expression and outcome bands before the roll; player-reported outcomes remain authoritative.
- Q: How does an active adventure behave when opened in multiple tabs? → A: The first active tab controls play; other tabs are read-only until control is released.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Start and Play a Grounded Adventure (Priority: P1)

As a vault owner, I want to start a solo adventure in which I control one player character and Oracle acts as the GM, so that I can immediately play with the campaign material I have created.

**Why this priority**: A campaign-aware exchange in which Oracle presents situations and responds to player choices is the core value of Adventure Mode. The feature is not useful without a playable turn loop that preserves player agency.

**Independent Test**: Start an adventure in a populated vault, provide a premise and optional source records, take several actions, and verify that Oracle uses relevant campaign facts, plays non-player characters, describes consequences, and leaves player-character decisions to the user.

**Acceptance Scenarios**:

1. **Given** a vault with campaign records and no active adventure, **When** the user starts an adventure with a premise, **Then** Oracle presents an opening situation grounded in relevant vault material and asks what the player does.
2. **Given** an active adventure, **When** the player describes an action, **Then** Oracle resolves only the world and non-player-character response, preserves established campaign facts, and presents a new situation or decision point without choosing the player character's next action.
3. **Given** the user selected source records when starting the adventure, **When** Oracle narrates a turn, **Then** those records remain available as continuing anchors even when the player's latest message does not repeat their names.
4. **Given** the vault has little or no relevant campaign material, **When** the user starts an adventure, **Then** Oracle may create provisional session material needed to play and does not present that material as an existing vault record.
5. **Given** the user opens normal Oracle chat during an adventure, **When** they ask an unrelated worldbuilding question, **Then** the normal conversation does not inherit the adventure transcript, current scene, or hidden GM state.
6. **Given** the user has no suitable Character record, **When** they start an adventure with a provisional character description, **Then** that character can be used for the adventure without creating a canonical vault record.

---

### User Story 2 - Maintain Coherent Visible and Hidden State (Priority: P1)

As a solo player, I want Oracle to remember the current situation while keeping unrevealed motives, answers, and developments out of the play surface, so that choices have continuity and mysteries remain meaningful.

**Why this priority**: A different tone or system instruction is insufficient for sustained play. Adventure Mode needs durable state that distinguishes what the player knows from what Oracle may use as the GM.

**Independent Test**: Play a scripted 30-turn adventure containing a hidden motive, a clue, a changing objective, and an NPC attitude change; verify that visible facts remain consistent, state advances only after completed turns, and the hidden motive is absent from all player-facing output until the fictional reveal.

**Acceptance Scenarios**:

1. **Given** an active adventure with a current location, objective, active NPC, and known clue, **When** several turns pass without restating them, **Then** Oracle continues to treat those facts as the current player-visible situation until play changes them.
2. **Given** an adventure contains owner-hidden GM information, **When** Oracle narrates before that information is fictionally discovered, **Then** the hidden information is not displayed in narration, visible state, recaps, roll requests, or the player-facing transcript.
3. **Given** play fictionally reveals hidden information, **When** the turn completes, **Then** the revealed fact may move into player-visible state while unrelated hidden information remains hidden.
4. **Given** a model response is interrupted, cancelled, incomplete, or contains an invalid state update, **When** the turn ends unsuccessfully, **Then** the last committed visible and hidden state remains unchanged and the user can retry or submit a different action.
5. **Given** Oracle invents a person, place, clue, item, or event during play, **When** the turn completes, **Then** the invention remains part of the adventure session and is not automatically added to or used to overwrite the canonical vault.
6. **Given** session material conflicts with an established vault fact, **When** the conflict is detected before committing the turn, **Then** the vault fact takes priority and the conflicting state change is not treated as canon.

---

### User Story 3 - Leave, Resume, and Archive Safely (Priority: P2)

As a player, I want to leave an adventure and resume it later from the same situation, so that the experience can support play across multiple sittings rather than a single chat window.

**Why this priority**: Persistence is required for campaign play and is a defining difference between Adventure Mode and an ordinary prompted conversation.

**Independent Test**: Complete several turns, leave Adventure Mode, reload the application, restore the vault from a backup in a clean environment, and verify that the adventure resumes from the latest fully committed turn with the same visible state, hidden state, transcript, and source references.

**Acceptance Scenarios**:

1. **Given** an active adventure with completed turns, **When** the user leaves Adventure Mode and later selects Continue Adventure, **Then** the latest committed scene, objectives, known facts, active characters, and transcript are restored.
2. **Given** an adventure is waiting for a roll, **When** the application is reloaded, **Then** the same unresolved roll request is restored without resolving it or duplicating the preceding turn.
3. **Given** an active adventure is included in a vault backup, **When** that backup is restored, **Then** the adventure can be continued with its committed state and source references intact.
4. **Given** an active adventure already exists, **When** the user attempts to start another, **Then** the system offers to continue or end the active adventure rather than silently replacing it.
5. **Given** the user ends an adventure, **When** they confirm that decision, **Then** the adventure is archived as a read-only record and no longer blocks starting a new adventure.
6. **Given** a save fails after a completed response, **When** the user is notified, **Then** the system does not claim the turn is safely committed and offers a clear retry path without discarding the previously committed session.
7. **Given** the vault contains archived adventures, **When** the user opens the adventure archive, **Then** they can choose an archived adventure and read its player-facing transcript without changing or resuming it.
8. **Given** an active adventure is controlled from one tab, **When** the same adventure is opened in another tab, **Then** the second tab displays the latest committed state in read-only mode and cannot submit an action or roll result.
9. **Given** another tab has the adventure open in read-only mode, **When** the controlling tab releases control or is no longer active, **Then** the other tab can take control from the latest committed state without duplicating a turn.
10. **Given** the application is offline, **When** the user opens an active or archived adventure, **Then** its latest committed state and player-facing transcript remain readable, actions that need Oracle are not submitted, and any typed action is preserved for retry after reconnection.

---

### User Story 4 - Resolve Meaningful Uncertainty (Priority: P3)

As a player, I want Oracle to request a roll only when an uncertain outcome matters and wait for my result, so that dice add tension without turning Adventure Mode into a mandatory rules engine.

**Why this priority**: Rolls support recognizable roleplaying play, but the narrative loop must work without system-specific automation.

**Independent Test**: Attempt one action whose outcome is certain and one risky action; verify that Oracle resolves the certain action directly, pauses on the risky action with clear stakes, accepts either a player-reported outcome or a basic Codex Cryptica roll, and continues from that result.

**Acceptance Scenarios**:

1. **Given** a player action has no meaningful uncertainty, **When** Oracle resolves it, **Then** Oracle continues the fiction without requesting a roll.
2. **Given** a player action has meaningful uncertainty and consequences, **When** Oracle requests a roll, **Then** it states what is uncertain and what is at stake without deciding the result in advance; if the player uses the basic Codex Cryptica dice option, Oracle also defines the dice expression and outcome bands before the roll.
3. **Given** the adventure is waiting for a roll, **When** the player reports an outcome, **Then** Oracle uses that outcome and does not replace it with an invented result.
4. **Given** the adventure is waiting for a basic Codex Cryptica roll with previously stated outcome bands, **When** the player rolls, **Then** the recorded result is supplied to the pending adventure turn, interpreted against those bands, and used once.
5. **Given** the adventure is waiting for a roll, **When** the player withdraws the attempted action or chooses a different approach, **Then** the pending roll can be dismissed without changing committed adventure state.
6. **Given** a reported or Codex dice outcome has been recorded, **When** the application goes offline or resolution fails before Oracle completes the turn, **Then** the same recorded outcome remains available for retry and the player is not asked to roll again.

### Edge Cases

- The user switches vaults while an adventure response is still being generated.
- The user submits the same action twice or retries rapidly in the controlling tab while another tab is observing the adventure in read-only mode.
- A pinned source record is renamed, changed, hidden, or deleted between adventure turns.
- The relevant campaign context is larger than can be considered in a single turn.
- The adventure record is missing fields, partially corrupted, or was created by a newer incompatible version.
- The application is offline when the user starts, continues, retries, or resolves a roll.
- A response accidentally repeats a hidden-state marker or secret verbatim in player-facing text.
- Normal Oracle history is cleared while an adventure is active, or adventure history is ended while normal Oracle chat remains open.
- The player reports a roll result that does not match the requested expression or reports only a narrative degree of success.
- The model proposes a state change that contradicts its own narration or attempts to remove unrelated established state.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to start Adventure Mode from an open vault when no adventure is active.
- **FR-002**: Starting an adventure MUST allow the user to provide a premise, establish one player character by selecting an existing Character record or providing a provisional description, and optionally choose other existing vault records as starting anchors.
- **FR-003**: Oracle MUST act as the GM in Adventure Mode by presenting situations, portraying non-player characters and factions, applying consequences, and responding to player choices.
- **FR-004**: Each Phase 1 adventure MUST have exactly one player-controlled character, and Oracle MUST NOT choose that character's voluntary actions, decisions, dialogue, thoughts, or feelings.
- **FR-005**: Oracle MUST end most resolved turns with a clear current situation, consequence, question, or decision point.
- **FR-006**: Adventure Mode MUST treat established vault material as canonical and MUST prefer it over conflicting session invention.
- **FR-007**: Adventure Mode MUST retain explicitly selected source records as continuing context anchors until the user ends the adventure or those references become unavailable.
- **FR-008**: Adventure Mode MUST supplement anchored records with campaign material relevant to the current player action and scene.
- **FR-009**: Normal Oracle conversations and individual adventure sessions MUST maintain separate transcripts, retained conversational context, and state.
- **FR-010**: The system MUST prevent adventure hidden state and adventure-only inventions from being supplied to normal Oracle conversations.
- **FR-011**: The system MUST maintain a compact player-visible state containing the current location, current scene or immediate situation, active objectives, active non-player characters, known clues or discovered facts, and relevant relationship changes when those values exist.
- **FR-012**: The system MUST maintain owner-hidden GM state separately from the player-visible state and transcript.
- **FR-013**: Owner-hidden GM state MUST NOT be rendered in narration, visible state, recaps, roll requests, or the player-facing transcript unless the relevant information has been fictionally revealed.
- **FR-014**: A fictional reveal MUST expose only the information revealed by that turn and MUST NOT expose unrelated hidden state.
- **FR-015**: Every completed adventure turn MUST identify the player-facing narration and the complete set of proposed visible-state and hidden-state changes attributable to that turn.
- **FR-016**: The system MUST commit a turn's state changes only when the response and all required state information are complete and valid.
- **FR-017**: Interrupted, cancelled, failed, incomplete, or invalid turns MUST leave the last committed adventure state unchanged.
- **FR-018**: The user MUST receive a clear retry or recovery option after a turn fails without losing the previously committed session.
- **FR-019**: Content invented during play MUST remain provisional session material and MUST NOT automatically create, revise, connect, or delete vault records.
- **FR-020**: Adventure Mode MUST NOT run normal Oracle automatic discovery or automatic archival against adventure narration.
- **FR-021**: The system MUST expose at most one effective active adventure per vault during Phase 1; externally restored duplicate active-marked records MUST remain preserved as non-playable recovery conflicts rather than becoming additional effective active adventures.
- **FR-022**: When an active adventure exists, attempts to start another MUST offer continuation or explicit ending of the active adventure rather than replacing it.
- **FR-023**: Users MUST be able to leave Adventure Mode and later continue the active adventure from its latest fully committed turn.
- **FR-024**: The active adventure MUST preserve its transcript, visible state, owner-hidden GM state, source references, pending roll if any, status, title, and last-played time.
- **FR-025**: Adventure session data MUST remain with the vault through refresh, application restart, supported vault backup, and supported vault restoration.
- **FR-026**: Users MUST be able to end and archive an active adventure without deleting its completed transcript or committed state.
- **FR-027**: An archived adventure MUST be retained as a read-only record, appear in a simple adventure archive list, provide access to its player-facing transcript, and MUST NOT block starting a new adventure.
- **FR-028**: Oracle MUST request a roll only when the outcome is uncertain and both success and failure would meaningfully affect the fiction.
- **FR-029**: A roll request MUST communicate the uncertainty and stakes and MUST pause resolution until the player supplies an outcome, uses the basic Codex Cryptica dice option, withdraws the action, or chooses another approach. Before a basic Codex Cryptica roll, Oracle MUST also state the dice expression and outcome bands.
- **FR-030**: Oracle MUST treat a player-reported outcome as authoritative. For a basic Codex Cryptica roll, Oracle MUST interpret the recorded result using the outcome bands stated before the roll. Oracle MUST NOT invent, replace, or reuse a roll result.
- **FR-031**: A pending roll MUST survive leaving or reloading the adventure without being duplicated or resolved automatically.
- **FR-032**: The first active tab controlling an adventure MUST be the only tab allowed to submit player actions or roll results. Other tabs MUST show the latest committed state in read-only mode until control is released or the controlling tab is no longer active. Transferring control MUST NOT duplicate or discard a committed turn.
- **FR-033**: If a referenced vault record becomes unavailable, the adventure MUST remain resumable, identify the unavailable reference without exposing hidden content, and avoid presenting stale record content as current canon.
- **FR-034**: If an adventure cannot be safely loaded, the system MUST preserve the original record, explain that it could not be opened, and avoid silently resetting or overwriting it.
- **FR-035**: Adventure Mode MUST clearly communicate that owner-hidden GM state is hidden from the play surface but is not encrypted from the vault owner.
- **FR-036**: When generation is unavailable offline, users MUST still be able to read the latest committed active or archived adventure, MUST retain any typed action or recorded roll outcome, and MUST receive a clear option to retry the unresolved action after reconnection without rerolling or changing committed state.
- **FR-037**: During an active adventure, users MUST be able to enter and exit an optional, session-local Focus Mode that keeps the current play surface available while allowing supporting adventure tools to be shown or hidden.
- **FR-038**: Focus Mode MAY offer browser fullscreen only through an explicit user action. If fullscreen is unavailable or denied, Focus Mode MUST remain usable; leaving browser fullscreen with Escape MUST NOT exit Focus Mode.
- **FR-039**: Focus Mode MUST NOT alter, persist into, or expose additional adventure, vault, or owner-hidden GM data.

### Key Entities

- **Adventure Session**: A vault-owned playable adventure with an identity, title, active or archived status, timestamps, source record references, committed transcript, visible state, hidden GM state, and an optional pending roll. At most one valid session is selected as the effective active adventure in a vault during Phase 1; duplicate active-marked records from external restore remain preserved, read-only recovery conflicts.
- **Adventure Turn Attempt**: One submitted player action and its attempted Oracle resolution, including referenced campaign material and proposed state changes. Failed, cancelled, interrupted, or rejected attempts remain uncommitted and do not advance the adventure.
- **Committed Adventure Turn**: A successfully validated and saved player action and Oracle response containing the player-facing narration and the complete visible-state and hidden-state changes attributable to that turn.
- **Visible Adventure State**: The compact set of facts the player has discovered or can currently observe, such as location, immediate situation, objectives, active non-player characters, clues, and relationship changes.
- **Owner-Hidden GM State**: Unrevealed motives, answers, agendas, future developments, secrets, and other GM information available to Adventure Mode but excluded from all player-facing surfaces until fictionally revealed.
- **Source Record Reference**: A link from the adventure to an existing canonical vault record selected as a starting anchor or used during play.
- **Pending Roll**: An unresolved moment of uncertainty containing the requested check, the stakes, and optionally a recorded player-supplied or Codex dice outcome awaiting Oracle resolution. When the basic Codex Cryptica dice option is used, it also contains the dice expression, outcome bands, and recorded result. It does not advance committed state until a completed turn is safely committed.
- **Player Character**: The single character whose voluntary choices are controlled by the user for the duration of the adventure. It is either linked to an existing canonical Character record or represented by a provisional session-only description.

### Assumptions

- Phase 1 is solo play: the vault owner controls exactly one player character, and Oracle acts as GM.
- Owner-hidden state is a presentation and context boundary, not a security boundary against the vault owner. A true GM/player secrecy model requires later permissions work.
- The user may inspect or edit their own vault outside the player-facing adventure surface.
- The player may start from a short premise without selecting source records; when source records are selected, they are stronger continuity anchors than ungrounded invention.
- A provisional player character remains session-only and is governed by the same canon boundary as other provisional adventure material.
- A player-reported narrative outcome such as success, failure, or partial success is valid even when no numerical rules system is configured.
- The outcome bands for a basic Codex Cryptica roll are declared before rolling and apply only to that pending roll; they do not establish a campaign-wide rules system.
- Phase 1 supports one effective active adventure per vault. Archived adventures can be listed and read, but renaming, deleting, searching, resuming, or otherwise managing multiple saved adventures is reserved for Phase 2.
- If an imported or restored vault contains multiple records marked active, only the most recently updated valid record is treated as the effective active adventure. Other active-marked records are preserved unchanged and exposed as read-only recovery conflicts until the effective adventure is ended; they cannot be played and do not count as additional active adventures.
- Performance criteria are measured with the standard release acceptance profile: a current stable supported browser on a device or CI worker with at least four logical CPU cores and 8 GB of memory, using a warmed production build and the representative data named by each criterion.

### Out of Scope

- Multiplayer, guest players, human GM/co-GM mode, or secrecy guarantees between different people.
- Automated combat, initiative, action economy, spell slots, character-sheet calculations, or rules-lawyer validation for a specific game system.
- Generator-specific **Play with Oracle** launch points or automatic plot-twist handoffs.
- Saving discoveries or campaign consequences into canonical vault records.
- A general hidden-state editor, session correction console, advanced recap tools, or archive management beyond listing and reading player-facing transcripts.
- Maps, token movement, VTT encounter control, voice participation, or party networking.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On the standard release acceptance profile, a scripted user can start a new adventure from an open vault and reach the first actionable GM situation with less than two minutes of non-model time; model response latency is measured separately and excluded.
- **SC-002**: In a scripted 30-turn acceptance adventure, 100% of committed location, objective, clue, active-character, and relationship changes remain consistent until changed by a later committed turn.
- **SC-003**: In scripted secret-bearing adventures, no hidden-state canary appears in narration, visible state, recaps, roll requests, normal Oracle chat, or the player-facing transcript before its designated fictional reveal.
- **SC-004**: Reloading or leaving and continuing an adventure restores 100% of the latest committed visible state, hidden state, transcript, source references, and pending-roll status.
- **SC-005**: Restoring a supported vault backup restores the active adventure at the same latest committed turn with no lost or duplicated turns.
- **SC-006**: 100% of interrupted, cancelled, incomplete, invalid, and failed test turns leave the previously committed visible and hidden state unchanged.
- **SC-007**: Across normal-chat and sequential-adventure isolation tests, no transcript, retained context, hidden state, or provisional invention crosses into a different conversation or session.
- **SC-008**: In an agency evaluation set covering exploration, social interaction, danger, and failure, at least 95% of Oracle turns avoid assigning voluntary actions, dialogue, decisions, thoughts, or feelings to the player character.
- **SC-009**: In a roll evaluation set, Oracle resolves certain actions without a roll, pauses every requested roll until input is supplied, and uses each supplied outcome exactly once.
- **SC-010**: On the standard release acceptance profile with a representative 100-turn session, continuing an already loaded adventure displays the restored situation within two seconds without requiring a new model response.
- **SC-011**: No provisional person, place, faction, item, quest, clue, or event created during acceptance play appears as a new or modified canonical vault record without an explicit user action outside this Phase 1 feature.
- **SC-012**: In concurrent-tab acceptance tests, exactly one tab can submit actions or roll results at a time, every observing tab remains read-only, and transferring control produces no lost or duplicated committed turns.
