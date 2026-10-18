# Feature Specification: Solo Play Loop

**Feature Branch**: `feat/173-solo-play-loop`
**Created**: 2026-10-08
**Status**: Draft
**Input**: User description: "Solo Play Mode Phase 2: workflow integration (#3884, part of epic #3839). Builds on Phase 1 Start Solo Session (#3879, spec 172). Turn the session into a full play loop so that things that come up in play are one action away and anything worth keeping lands in the Vault without leaving the session: quick generator actions, pinned random-table rolls, saving discoveries to the Vault, scene history, contextual Oracle shortcuts (AI only), and party selection. Solo play never requires AI; no new app shell; local-first; Phase 3 items out of scope."
**Issue**: #3884, part of epic #3839. Builds on spec 172 (Start Solo Session, #3879).

## Context

Phase 1 gave the solo player a session. They can start it from Play, and a solo bar under the header holds a scene name, quick roll, the dice window, the Oracle, the journal, the map, a quick note and End. Scenes become Session Journal sections, and dice, table, deck and map results are captured into the running journal.

What Phase 1 does not do is close the loop. A solo player constantly invents things during play, such as a stranger at the gate, a rumour in the tavern or a twist in the plot. Today, making one of those means leaving the session to find a generator, and keeping one means leaving the session to create a vault entry by hand. Their own random tables are two screens away, the people in their party are not part of the session at all, and past scenes can only be found by scrolling the journal.

This feature makes the common play actions one step from the bar, and makes "keep this" a single action. It adds no new screen. It extends the solo bar, its phone sheet, and the generator, journal and Oracle panels that already exist.

## Clarifications

### Session 2026-10-08

- Q: Should an Oracle shortcut send its question straight away, or prefill the Oracle input for the player to edit and send? → A: Prefill only. The question and session context go into the Oracle input; the player edits and presses Send. Nothing is sent by the shortcut itself (FR-019).
- Q: Should every generated result be journaled when generated, or only the ones saved to the Vault? → A: Every generated result is recorded when generated, and a short follow-up entry is added when one is saved (FR-008).
- Q: Should Recent show only results since this solo session started, or the latest results in the running journal? → A: The latest 10 results in the running journal, whenever they were captured (FR-001).
- Q: When the player returns to an earlier scene, should new entries go into its existing section or a new one? → A: A new section with the same name, numbered for the visit (for example "Arrival (2)"), added to the scene list, so the journal stays in time order (FR-023).
- Q: Should the Generate menu offer a fixed set of generators or a player-chosen one? → A: The fixed four (NPC, Encounter, Rumour, Complication), plus "All generators…", which opens the full generator picker (FR-006).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Keep what I discover (Priority: P1)

Mid-session, the player rolls on their "Tavern patrons" table and gets "a one-eyed smuggler". They decide she matters. From the bar's recent results, they choose **Save to Vault** on that result, pick Character, confirm the name "Mara One-Eye", and keep playing. A draft Character now exists in the Vault, linked back to the journal entry it came from.

**Why this priority**: Solo play creates campaign facts constantly. If keeping them means leaving the session, they are lost, and the Vault never grows from play. This is the core promise of Phase 2.

**Independent Test**: With a session and journal running, roll a table and quick-roll a die. Save the table result as a Character and the die result as a Note from the bar. Confirm both drafts exist with the right category and name, link to their journal entries, and that the current screen never changed.

**Acceptance Scenarios**:

1. **Given** a session with a running journal, **When** the player opens the bar's recent results, **Then** they see the running journal's 10 most recent captured results (rolls, table results, card draws, generated results and notes), newest first, even ones from before this session started.
2. **Given** a recent result, **When** the player chooses Save to Vault, picks a category and confirms a name, **Then** a draft entity of that category is created with the result as its content, linked to its journal entry. The player stays on the current screen, and a short confirmation shows.
3. **Given** the player leaves the name empty, **When** they confirm, **Then** nothing is created and a message asks for a name.
4. **Given** no journal is running, **When** the player opens recent results, **Then** the bar explains that results are kept only while a journal runs, and offers to start or continue one.
5. **Given** the entity cannot be created, **When** the player confirms, **Then** they see a plain error, nothing partial is created, and the result is still available to try again.

---

### User Story 2 - Generate what the story needs (Priority: P1)

The party reaches a village gate. The player taps **Generate → NPC** in the bar. The existing NPC generator opens, already set up for NPCs and aware of the current campaign. The player generates a guard, likes the result, and saves it to the Vault the way the generator always has. The generated guard also appears in the journal, so the session remembers the moment even if the player had not saved it.

**Why this priority**: Making things up on the spot is most of solo GMing. The generators already exist; reaching them from the session without losing the thread is what is missing.

**Independent Test**: In a session with a journal running, use Generate → NPC, Encounter, Rumour and Complication from the bar. Confirm each opens the matching existing generator, a generated result is recorded in the journal, and saving one creates the vault entry as it does today. The session and current screen are unchanged when the generator closes.

**Acceptance Scenarios**:

1. **Given** a session, **When** the player opens Generate in the bar, **Then** they can choose NPC, Encounter, Rumour or Complication, or "All generators…", which opens the full generator picker.
2. **Given** they choose one, **When** the generator opens, **Then** it is the existing generator for that kind, ready to generate, with no extra setup screen.
3. **Given** a journal is running, **When** a result is generated, **Then** a journal entry records what was generated (its kind and title, with a short summary), whether or not it is saved.
4. **Given** the player saves the result from the generator, **When** the save finishes, **Then** the vault entry is created exactly as the generator does today, and the journal notes that it was saved.
5. **Given** the player closes the generator without generating, **When** it closes, **Then** nothing is recorded and the session continues where it was.
6. **Given** the vault is not ready for generators (for example, still loading), **When** the player opens Generate, **Then** the actions are disabled with a short reason.

---

### User Story 3 - Roll my own tables without leaving play (Priority: P2)

The player has built tables for their campaign: "Tavern patrons", "Road encounters", "Weather". They pin the three they use most to the solo bar. During play, one tap on "Road encounters" rolls it, shows the result in the bar like a quick roll, and records it in the journal.

**Why this priority**: The player's own tables are the heart of many solo systems. Pinning a few turns a two-screen trip into one tap. Other tables are still reachable from the dice window (Phase 1).

**Independent Test**: Pin two of the vault's tables to the bar, roll each from the bar on the map, and confirm the results show inline, the map does not move, and both appear in the journal. Unpin one and confirm it leaves the bar.

**Acceptance Scenarios**:

1. **Given** the vault has random tables, **When** the player chooses Pin a table in the bar, **Then** they can pick from the vault's tables, up to the pin limit.
2. **Given** a pinned table, **When** the player taps it, **Then** it rolls, the result shows in the bar, and nothing pops up or changes screen.
3. **Given** a journal is running, **When** a pinned table is rolled, **Then** the result is captured exactly as a roll from the tables screen is.
4. **Given** a pinned table is deleted from the vault, **When** the bar is shown, **Then** that pin disappears without error.
5. **Given** the vault has no random tables, **When** the player opens Pin a table, **Then** they see a short note that explains how to create one, and no empty list.

---

### User Story 4 - Know who is in my party (Priority: P2)

At setup, or later from the bar, the player chooses the characters in their party: Kael and Brother Ivo. Their names appear in the bar. One tap opens a character's entry. When the player asks the Oracle anything from the session, it knows who the party is, and the journal notes when the party changes.

**Why this priority**: The party is the point of view of every solo session. It was deferred from Phase 1 until it drives something, and in Phase 2 it drives the Oracle context and the journal.

**Independent Test**: Choose two characters as the party in setup, add a third from the bar, then remove one. Confirm the bar shows the current party, a name opens its entry, the journal records each change, and the party survives a reload.

**Acceptance Scenarios**:

1. **Given** the setup or the bar, **When** the player chooses the party, **Then** they pick from the vault's Character entities, and may choose none.
2. **Given** a party, **When** the bar is shown, **Then** each member's name is visible (or summarised on narrow screens), and selecting one opens their entry.
3. **Given** a journal is running, **When** the party changes, **Then** the journal records who joined or left.
4. **Given** a party member's entry is deleted or renamed, **When** the bar is shown, **Then** deleted members drop out and renamed ones show their new name.
5. **Given** the vault has no characters, **When** the player opens party selection, **Then** a short note explains that party members are Character entries.

---

### User Story 5 - Ask the Oracle about what is happening now (Priority: P3)

AI is on. The party meets the village guard. The player taps **Ask Oracle → How does this NPC react?** in the bar. The Oracle opens beside the screen with the question already written, including the current scene, the place, the party and the last few things that happened. The player adds "the guard is nervous about the smugglers", sends it, and reads the answer.

**Why this priority**: It saves typing the same context into the Oracle again and again. It is the only AI part of Phase 2, so it comes after the parts that work without AI.

**Independent Test**: With AI on, a session, a scene, a party and a few journal entries, use each Oracle shortcut and confirm the Oracle opens with an editable prefilled question that includes the scene, place, party and recent results, and that nothing is sent until the player sends it. With AI off, confirm no shortcut is shown.

**Acceptance Scenarios**:

1. **Given** AI is on, **When** the player opens Ask Oracle in the bar, **Then** they see a short list of shortcuts: "How does this NPC react?", "Add a complication", "What is known about this place?" and "What happens next?".
2. **Given** they choose a shortcut, **When** the Oracle opens, **Then** its input holds the question plus the session context (scene name, map name, party names and the most recent journal results), ready to edit, and nothing has been sent.
3. **Given** the prefilled question, **When** the player sends it, **Then** it is asked like any other Oracle question, and the answer can be saved to the journal or the Vault the usual ways.
4. **Given** AI is off, **When** the bar is shown, **Then** no Oracle shortcut is visible anywhere in the bar or sheet.
5. **Given** any shortcut, **When** it is used, **Then** the Oracle is never asked to act as the game master, and nothing is sent without the player's action.

---

### User Story 6 - Go back to an earlier scene (Priority: P3)

The player wants to check what happened in "The flooded crypt" two scenes ago. They open the scene list in the bar, see every scene in this session in order, and pick that one. The journal opens at that scene's section. If the story returns there, they can return to that scene: a new visit starts, numbered so the journal stays in time order.

**Why this priority**: It makes long sessions readable. The journal already holds the sections; this only makes them reachable from the session.

**Independent Test**: Create three scenes in a session with a journal running. Open the scene list, confirm all three appear in order with the current one marked, open the first (the journal shows its section), then return to it and confirm a new numbered section starts and new entries go into it.

**Acceptance Scenarios**:

1. **Given** a session with scenes, **When** the player opens the scene list, **Then** every scene in this session is listed in order, with the current scene marked.
2. **Given** a past scene, **When** the player opens it, **Then** the journal opens at that scene's section.
3. **Given** a past scene, **When** the player returns to it, **Then** a new visit starts with the same name numbered for the visit (for example "Arrival (2)"), the bar shows it, it is added to the end of the scene list, and new journal entries go into its new section. The earlier section is unchanged.
4. **Given** a scene's journal section was deleted, **When** the list is shown, **Then** the scene still shows its name and opening it explains the section is gone.

### Edge Cases

- **No journal running**: generated results, table results and recent results are not kept. The bar says so and offers to start or continue a journal. Generation and table rolls still work.
- **Journal ended mid-session**: recent results show what was captured before it ended; new results are not kept until a journal runs again.
- **Generator closed mid-generation**: nothing is recorded and nothing is created.
- **Generated result saved twice**: the second save follows the generator's existing rules. This feature adds no duplicate checks.
- **Very long results**: the bar shows a short version; the full result is in the journal and in the saved entity.
- **Pinned table emptied or renamed**: a renamed table keeps its pin with the new name. An empty table shows a short message when rolled and records nothing.
- **Party member also on the map as a token**: no change in this phase; tokens are not linked to the party here (Phase 3).
- **AI turned off mid-session**: Oracle shortcuts disappear; nothing else changes.
- **Phone width**: every new action (Generate, pinned tables, recent results, party and scene list) is reachable in the phone sheet.
- **Shared play, guest mode and Player View**: unchanged. Solo sessions remain unavailable in guest mode and while shared play is on, as in Phase 1.

## Requirements _(mandatory)_

### Functional Requirements

**Recent results and saving to the Vault**

- **FR-001**: While a journal runs, the solo bar MUST offer a list of the running journal's 10 most recent captured results (rolls, table results, card draws, generated results and notes), newest first, including results captured before this solo session started.
- **FR-002**: The player MUST be able to save any recent result as a draft vault entity, choosing its category and name, without leaving the current screen.
- **FR-003**: A saved entity MUST contain the result's content and MUST link back to the journal entry it came from.
- **FR-004**: Saving MUST refuse an empty name, MUST create nothing on failure, and MUST show a plain message in both cases.
- **FR-005**: Without a running journal, the list MUST explain that results are kept only while a journal runs and MUST offer to start or continue one.

**Generate**

- **FR-006**: The solo bar MUST offer Generate with NPC, Encounter, Rumour and Complication, plus "All generators…", which opens the full generator picker. Generated results from any generator are journaled the same way (FR-008).
- **FR-007**: Each Generate action MUST open the existing generator of that kind, ready to generate, with no duplicate generator interface.
- **FR-008**: While a journal runs, each generated result MUST be recorded in the journal (kind, title and a short summary), whether or not it is saved, and a save from the generator MUST be noted in the journal with a short follow-up entry.
- **FR-009**: Generate MUST be disabled, with a short reason, whenever the generators are unavailable for the vault.

**Pinned tables**

- **FR-010**: The player MUST be able to pin up to 3 of the vault's random tables to the solo bar, and unpin them.
- **FR-011**: Tapping a pinned table MUST roll it and show the result in the bar, without opening any window or changing screen.
- **FR-012**: Pinned-table rolls MUST be captured by a running journal exactly as rolls from the tables screen are.
- **FR-013**: Pins MUST be kept per vault on this device, and pins for deleted tables MUST disappear without error.

**Party**

- **FR-014**: The player MUST be able to choose the session's party from the vault's Character entities, in setup and later from the bar, including choosing none.
- **FR-015**: The bar MUST show the party, and selecting a member MUST open their entry.
- **FR-016**: While a journal runs, changes to the party MUST be recorded in the journal.
- **FR-017**: The party MUST be kept with the session (surviving reload and vault switches as in Phase 1), and deleted members MUST drop out.

**Oracle shortcuts**

- **FR-018**: While AI is on, the bar MUST offer Oracle shortcuts: "How does this NPC react?", "Add a complication", "What is known about this place?" and "What happens next?".
- **FR-019**: A shortcut MUST open the Oracle beside the current screen with an editable question that includes the scene name, map name, party names and the most recent journal results (at most 10), and MUST NOT send anything until the player sends it.
- **FR-020**: While AI is off, no Oracle shortcut MUST appear in the bar or sheet.
- **FR-021**: No shortcut MUST ask the Oracle to act as the game master or to run the game.

**Scene history**

- **FR-022**: The bar MUST offer a list of this session's scenes in order, with the current scene marked.
- **FR-023**: Opening a scene MUST open the journal at that scene's section. Returning to a past scene MUST start a new scene with the same name, numbered for the visit, append it to the scene list, and route new journal entries into its new section, leaving earlier sections unchanged.
- **FR-024**: A scene whose section no longer exists MUST still be listed by name and MUST explain that its section is gone when opened.

**Shared rules**

- **FR-025**: Every action in this feature except the Oracle shortcuts MUST work with AI off.
- **FR-026**: Every new action MUST be reachable in the phone sheet, operable by keyboard, and have an accessible name.
- **FR-027**: Nothing about the session MUST leave the device, except an Oracle question the player explicitly sends.
- **FR-028**: Multiplayer, Player View and guest behaviour MUST NOT change, and the Phase 1 rules for shared play during a solo session MUST still apply.
- **FR-029**: The Help library MUST describe each new action, and Cif MUST be able to explain and point at them while staying product help only.

### Key Entities

- **Solo session** (from Phase 1): gains the party (a list of Character entity references) and the list of the session's scenes in order (each a name and its journal section).
- **Pinned table**: per vault, on this device. A reference to one of the vault's random tables. At most 3.
- **Recent result**: one of the 10 newest captured entries in the running journal (roll, table result, card draw, generated result or note), whenever it was captured. It is not stored separately; it is read from the journal.
- **Generated result entry**: a new kind of journal entry recording a generator result: its kind, title and short summary. A save is recorded as a short follow-up entry.
- **Draft entity** (existing): a vault entry in draft status, created from a result, linked to its journal entry.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From any screen during a session, a player can turn a captured result into a draft vault entity in no more than 4 actions and under 20 seconds, without the current screen changing.
- **SC-002**: A player can open a generator for an NPC, Encounter, Rumour or Complication from the bar in 2 actions from any screen.
- **SC-003**: Rolling a pinned table takes 1 action, and in 100% of checks the current screen, its position and open panels are unchanged.
- **SC-004**: With AI turned off, every user story except 5 passes in full, and no Oracle shortcut is visible.
- **SC-005**: In 100% of checks, nothing is sent to the AI service unless the player sends an Oracle question.
- **SC-006**: All existing multiplayer, Player View, guest and Phase 1 solo checks pass unchanged.
- **SC-007**: In a usability check, at least four of five solo players save an improvised NPC to the Vault during play without help, within their first session using this feature.

## Assumptions

- "Complication" maps to the existing plot twist generator; "Encounter", "NPC" and "Rumour" map to the existing generators of those names.
- The existing generator save is reused as-is; this feature only records the result in the journal and notes when it was saved.
- Saving a recent result reuses the existing journal promotion into draft entities. The default category is suggested from the result (for example, a generated NPC suggests Character), and the player can change it.
- The recent-results list reads from the running journal. Nothing extra is stored.
- Oracle context sends only what the player could see in the bar and journal: scene name, map name, party names and the text of the most recent results. It does not send hidden map content or other vault data beyond what the Oracle already uses.
- Pins and the party are device-local, as the Phase 1 session is.
- A party has at most 12 members, and a session keeps at most 100 scenes. Both are well beyond normal play and keep the stored session small.
- "Notes" in recent results means entries written directly in the Session Journal. Phase 1's Add note opens the separate quick note scratchpad, whose notes are not journal entries.
- Recent results leave out bookkeeping entries (party changes and "Saved … to the Vault" follow-ups), which are not things to save.
- The pin limit of 3 keeps the bar to one line on desktop; more tables stay reachable from the dice window.

## Out of Scope

- Solo oracle yes/no procedures and random events (Phase 3, #3885).
- Thread and mystery tracking (Phase 3).
- Per-session journal capture controls (Phase 3).
- An explored fog tier, and linking party members to map tokens or vision (Phase 3).
- Adventure Mode integration (Phase 3).
- Any change to the generators, tables, journal or Oracle themselves beyond what is needed to start them from the session and record their results.
