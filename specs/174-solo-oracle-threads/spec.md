# Feature Specification: Solo Oracle and Threads

**Feature Branch**: `feat/174-solo-oracle-threads`
**Created**: 2026-10-08
**Status**: Draft
**Input**: User description: "Solo Play Mode Phase 3: solo oracle and threads (#3885, part of epic #3839). Builds on Phase 1 (spec 172) and Phase 2 (spec 173). Procedures that stand in for a GM and memory that carries a campaign across sessions: a dice-based yes/no oracle with likelihood, an answer scale and random events driven by a tension value; threads that persist across sessions and link to vault entities; per-journal capture controls; an optional, explicit Adventure Mode entry. Everything except AI interpretation and Adventure Mode works with AI off. Our own wording and tables only. The explored fog tier and party vision are out of scope."
**Issue**: #3885, part of epic #3839. Builds on spec 172 (Start Solo Session) and spec 173 (Solo Play Loop).

## Context

Phase 1 gave the solo player a session: a solo bar with a scene, quick roll, the dice window, the Oracle, the journal, the map and notes. Phase 2 made it a play loop: generators, pinned tables, saving discoveries to the Vault, a party, scene history and Oracle shortcuts while AI is on.

What is still missing is the part a GM normally provides: someone to answer "is the door locked?", and to throw in the unexpected. Players who play solo regularly use oracle procedures for this, asking yes/no questions with a sense of how likely the answer is, and letting dice introduce random events. They also keep a list of open threads (leads, mysteries, goals) so a campaign carries from one session to the next.

This phase adds those procedures and that memory. It must all work with plain dice and tables: AI can help interpret an answer, but only when the player asks, and it is never required.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ask the oracle a yes/no question (Priority: P1)

The player is in a solo session and wonders whether the guard is asleep. They open **Yes or no** (the dice oracle) in the solo bar, type the question (optional), pick how likely a yes is ("Likely"), and roll. The answer comes back on a scale (for example "Yes, but…" or "No, and…"), shown in the bar and recorded in the journal with the question, the likelihood and the roll.

**Why this priority**: Answering questions is the core of playing without a GM. Without it, solo players must use a separate book or app.

**Independent Test**: With AI off and a journal running, ask a question at each likelihood and confirm an answer from the scale appears in the bar and in the journal, and that nothing is sent off the device.

**Acceptance Scenarios**:

1. **Given** a running solo session, **When** the player asks a question at a chosen likelihood, **Then** an answer from the answer scale appears in the bar within one second, together with the roll.
2. **Given** a running journal, **When** the player gets an answer, **Then** the journal records the question (if typed), the likelihood, the roll and the answer.
3. **Given** the player typed no question, **When** they roll, **Then** they still get an answer, and the journal records it without a question.
4. **Given** no journal is running, **When** the player asks, **Then** the answer still appears in the bar, and nothing is recorded.
5. **Given** AI is on, **When** the player chooses to have an answer interpreted, **Then** the Oracle opens with a question about that answer filled in for them to edit; nothing is sent until they send it.
6. **Given** AI is off, **When** the player uses the oracle, **Then** every part except interpretation works, and the interpretation option is not shown.

---

### User Story 2 - Let the dice surprise me (Priority: P1)

The player wants the story to take turns they did not plan. Some oracle answers trigger a random event, and the player can also ask for one directly. A random event says what happens in plain words: a focus (such as "a thread moves forward" or "someone new appears"), an action and a subject. The subject can be one of the player's open threads, a party member, or the current place. How often random events happen depends on a tension level the player raises or lowers as the story heats up or calms down.

**Why this priority**: Surprise is what stops solo play from becoming a story the player just tells themselves. It turns the oracle from a coin flip into a co-author.

**Independent Test**: With AI off, set tension high and ask several questions, confirm random events appear more often than at low tension, that each event names a focus, action and subject, and that each lands in the journal.

**Acceptance Scenarios**:

1. **Given** a running session, **When** the player asks for a random event, **Then** they get an event with a focus, an action and a subject, shown in the bar and recorded in the journal.
2. **Given** an oracle answer, **When** the roll meets the event condition for the current tension, **Then** a random event is attached to that answer.
3. **Given** the player raises tension, **When** they keep asking questions, **Then** random events come up more often than at a lower tension.
4. **Given** the player has open threads, **When** an event's focus points at a thread, **Then** one open thread is named as the subject.
5. **Given** no open threads, **When** an event would point at a thread, **Then** the event uses another subject instead, and never names a closed thread.
6. **Given** the tension level, **When** the player changes it, **Then** it is kept for the session, survives a reload, and the change is noted in the journal.

---

### User Story 3 - Keep track of open threads (Priority: P1)

The player discovers that the lighthouse keeper is lying. They open Threads in the solo bar and add "Why is the keeper lying?" as a mystery, linked to the keeper's entry. In later sessions the thread is still there. When they solve it, they close it with a short note. Opening and closing threads is noted in the journal.

**Why this priority**: Threads are the campaign's memory. They let a solo player pick up where they left off weeks later, which the issue names as an acceptance criterion.

**Independent Test**: Open three threads of different kinds, link one to a vault entity, reload, switch vaults and back, end and start a new session, and confirm all three are still listed; close one and confirm it moves out of the open list and is journaled.

**Acceptance Scenarios**:

1. **Given** a running session, **When** the player adds a thread with a title and a kind (question, lead, objective or mystery), **Then** it appears in the open threads list, and the journal notes it.
2. **Given** an open thread, **When** the player links it to vault entries (up to 20), **Then** the thread shows those entries, and choosing one opens its entry.
3. **Given** open threads, **When** the player reloads, switches vaults and back, or ends the session and starts a new one, **Then** the threads are still there.
4. **Given** an open thread, **When** the player closes it with an optional note, **Then** it leaves the open list, is kept among closed threads, and the journal notes the close and the note.
5. **Given** a closed thread, **When** the player reopens it, **Then** it returns to the open list.
6. **Given** a thread linked to an entry that is later deleted, **When** the list is shown, **Then** the thread stays, and the deleted link is dropped without errors.
7. **Given** another vault, **When** the player looks at Threads, **Then** they see only that vault's threads.

---

### User Story 4 - Choose what the journal records (Priority: P2)

A player who rolls a lot of dice finds the journal noisy. For this journal, they turn off automatic capture of dice rolls but keep oracle answers, scenes and threads. Later rolls still show in the bar, but no longer fill the journal.

**Why this priority**: Phases 1 to 3 add more and more automatic entries. Without control, the journal becomes hard to read, but the defaults already work, so this is second priority.

**Independent Test**: In a journal, turn off dice capture, roll and ask the oracle, and confirm only the oracle answer is recorded; start a new journal and confirm it starts with every type on.

**Acceptance Scenarios**:

1. **Given** a running journal, **When** the player opens its capture choices, **Then** they see each event type with an on/off switch: dice rolls, table results, card draws, map moves, scenes, oracle answers and random events, tension changes, threads, party changes, and generated results.
2. **Given** a type is off, **When** that event happens, **Then** it is not recorded in the journal, but still appears wherever it normally appears in the app.
3. **Given** a new journal, **When** it starts, **Then** every type is on, except where an existing journal setting already says otherwise (the existing map-move switch keeps working).
4. **Given** a journal, **When** the player changes its choices, **Then** the choices are kept for that journal and survive a reload.

---

### User Story 5 - Hand over to the Oracle when I want to (Priority: P3)

Sometimes the player wants the Oracle to run part of the story. From the solo session they can start or continue an Oracle-run adventure. It is an explicit choice in the bar and sheet, never the default, and it is not offered when AI is off.

**Why this priority**: It connects two existing ways to play solo, but most solo players never use it, so it comes last.

**Independent Test**: With AI on, start an adventure from the session and confirm Adventure Mode opens; with an adventure already in the vault, confirm the option offers to continue it; with AI off, confirm the option is absent.

**Acceptance Scenarios**:

1. **Given** AI is on and no adventure exists, **When** the player chooses to hand over to the Oracle, **Then** Adventure Mode opens ready to start an adventure.
2. **Given** an adventure exists in the vault, **When** the player chooses it, **Then** Adventure Mode opens on that adventure.
3. **Given** AI is off, **When** the player looks at the bar and sheet, **Then** no Adventure Mode option is shown.
4. **Given** a running solo session, **When** the player does nothing, **Then** the Oracle never starts running the game by itself.

### Edge Cases

- **Tension at its limits**: the player cannot raise tension above the highest level or lower it below the lowest; the control says so.
- **Oracle without a typed question**: allowed; the answer and journal entry simply have no question.
- **Very long question or thread title**: limited to a set length (200 characters for a question, 120 for a thread title, 500 for a thread note), with the field saying how much is left.
- **Many threads**: the open list stays usable with up to 200 threads per vault; the player can filter by kind and search by title. Adding a 201st is refused with "This vault has 200 threads. Close or delete one to add another."
- **Thread subject for a random event when only closed threads exist**: the event uses another subject (a party member, the place, or "someone new").
- **Party member subject when no party is set**: the event uses another subject.
- **Journal off**: oracle answers, events, tension and threads all still work; only the journal entries are skipped.
- **Capture type turned off mid-session**: events of that type stop being recorded from then on; earlier entries stay.
- **Phase 1 and 2 sessions**: a session saved before this phase still loads, with the default tension and no threads.
- **Guest, Player View and multiplayer**: unaffected. Yes or no and tension appear only in a solo session; threads also appear on the Play page; capture choices appear in the journal. None of them appear in guest, Player View or multiplayer, and a read-only vault cannot edit threads.
- **Shared play**: Phase 1 rules still apply; solo play and shared play cannot run at the same time.

## Requirements _(mandatory)_

### Functional Requirements

**Solo oracle**

- **FR-001**: The solo bar and phone sheet MUST offer a dice oracle, labelled "Yes or no", that answers a yes/no question. The name "Oracle" stays reserved for the AI Oracle, so the two are not confused.
- **FR-002**: The player MUST choose a likelihood for each question from a fixed ladder of at least five steps, from "very unlikely" to "very likely", with "even" in the middle and as the default.
- **FR-003**: Each answer MUST come from an answer scale of at least four outcomes that include qualified answers (for example "yes, and", "yes", "yes, but", "no, but", "no", "no, and"), with higher likelihood making yes answers more likely.
- **FR-004**: The question text MUST be optional and at most 200 characters.
- **FR-005**: Each answer MUST be shown in the bar with the roll that produced it.
- **FR-006**: While a journal runs, each answer MUST be recorded with the question (if any), the likelihood, the roll, the answer and any random event.
- **FR-007**: The oracle MUST work fully with AI off, using only dice and the app's own tables, and MUST NOT send anything off the device.
- **FR-008**: All oracle wording, the answer scale and every table MUST be original to Codex Cryptica and MUST NOT reproduce text or tables from Mythic GME or other published systems.
- **FR-009**: While AI is on, each answer MUST offer "Interpret with the Oracle", which opens the Oracle with an editable question about that answer and sends nothing until the player sends it (as Phase 2 shortcuts do). While AI is off, the option MUST NOT be shown.

**Random events and tension**

- **FR-010**: The session MUST have a tension level on a fixed scale of 1 to 9, starting at 5, that the player can raise or lower one step at a time from the bar or sheet.
- **FR-011**: The tension level MUST be kept with the session, survive a reload, and changes MUST be recorded in the journal while one runs.
- **FR-012**: An oracle answer MUST trigger a random event when its roll meets an event condition whose chance rises with the tension level; at tension 9 events MUST be at least three times as frequent as at tension 1.
- **FR-013**: The player MUST be able to ask for a random event at any time.
- **FR-014**: A random event MUST name a focus, an action and a subject, each drawn from the app's own tables, written as one plain sentence.
- **FR-015**: When a focus points at a thread, the subject MUST be one of the vault's open threads chosen at random; with no open threads, the event MUST fall back to another subject (party member, current place, or someone new). When a focus points at a party member and no party is set, the event MUST fall back likewise.
- **FR-016**: Random events MUST be shown in the bar and, while a journal runs, recorded in it.

**Threads**

- **FR-017**: The solo bar and phone sheet MUST offer a Threads list where the player can add a thread with a title (at most 120 characters), a kind (question, lead, objective or mystery) and an optional note (at most 500 characters).
- **FR-018**: A thread MUST be able to link to up to 20 vault entries, shown on the thread and opening the entry when chosen; links to entries that no longer exist MUST be dropped without errors.
- **FR-019**: The player MUST be able to edit, close (with an optional closing note), reopen and delete a thread. Deleting MUST ask for confirmation.
- **FR-020**: Threads MUST belong to a vault, persist across sessions, reloads and vault switches, and be available whether or not a solo session is running. Threads MUST be stored in the vault itself, so they are included in vault exports (.codex.zip) and in Save to Folder and Load from Folder, and survive clearing the browser's data. Threads MUST be reachable from the Play page as well as from the solo bar, so a vault with no running solo session can still view and edit them.
- **FR-021**: The Threads list MUST show open threads by default, with closed threads one choice away, and MUST allow filtering by kind and searching by title.
- **FR-022**: While a journal runs, opening, closing and reopening a thread MUST be recorded in it.

**Journal capture controls**

- **FR-023**: Each journal MUST have capture choices with an on/off switch per event type: dice rolls, table results, card draws, map moves, scenes, oracle answers and random events, tension changes, threads, party changes, and generated results.
- **FR-024**: Every type MUST be on for a new journal; the existing map-move switch MUST keep its meaning and be one of these choices.
- **FR-025**: A type that is off MUST NOT be recorded in that journal automatically, and MUST still appear wherever it normally appears in the app.
- **FR-026**: Capture choices MUST be kept per journal and survive a reload.

**Adventure Mode entry**

- **FR-027**: While AI is on, the solo bar and sheet MUST offer an explicit "Let the Oracle run a scene" option that opens Adventure Mode, continuing the vault's adventure if one exists and otherwise starting a new one.
- **FR-028**: While AI is off, the option MUST NOT be shown.
- **FR-029**: Nothing in a solo session MUST start Adventure Mode or make the Oracle act as game master unless the player chooses this option.

**Across the feature**

- **FR-030**: Every new action MUST be reachable in the phone sheet, operable by keyboard, and have an accessible name.
- **FR-031**: Sessions saved by Phase 1 and Phase 2 MUST still load, with default tension and no change to their data.
- **FR-032**: Multiplayer, Player View and guest behaviour MUST NOT change, and Phase 1 rules for shared play during a solo session MUST still apply.
- **FR-033**: The Help library MUST describe the oracle, random events and tension, threads, capture choices and the Adventure Mode entry, and Cif MUST be able to explain and point at each while staying product help only.

### Key Entities

- **Oracle question**: an optional question text, a likelihood from the ladder, a roll, an answer from the answer scale, and an optional random event. Recorded in the journal; not kept elsewhere.
- **Likelihood ladder**: the fixed steps a player chooses from, from very unlikely to very likely.
- **Answer scale**: the fixed set of qualified yes/no answers.
- **Tension level**: a value from 1 to 9 kept with the solo session; drives how often random events happen.
- **Random event**: a focus, an action and a subject, each from the app's own tables, plus the resulting sentence. The subject may refer to a thread, a party member, the current place, or someone new.
- **Thread**: a title, a kind (question, lead, objective, mystery), an optional note, a status (open or closed), an optional closing note, links to vault entries, and when it was opened and last changed. Belongs to one vault and is saved with it.
- **Capture choices**: a set of on/off switches per journal, one per event type.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: With AI off, a player can run a full session using only the oracle, random events, threads and the journal, without opening any other tool.
- **SC-002**: A player gets an oracle answer within 10 seconds of deciding to ask, in at most 3 actions from the solo bar.
- **SC-003**: Over 200 questions, random events come up at least three times as often at tension 9 as at tension 1.
- **SC-004**: 100% of open threads are still listed after a reload, a vault switch and back, and ending and starting a session.
- **SC-005**: With dice capture off, a session of 20 rolls and 5 oracle answers produces 5 oracle entries and no dice entries in the journal.
- **SC-006**: No request leaves the device during a session with AI off.
- **SC-007**: The Phase 1 and Phase 2 quickstarts still pass unchanged.

## Assumptions

- The existing dice-based quick oracle can provide the yes/no answer; its odds are extended to the full likelihood ladder.
- The current place for a random event subject is the session's map name, or none.
- Threads are saved with the vault, so anyone the player shares a vault export or folder with can read them, as with any other vault content.
- Threads are per vault, not per session, so they carry a campaign; a vault with no solo session can still view and edit them.
- Capture choices belong to the journal, so the same choices apply whether or not a solo session is running while that journal is active.
- The Adventure Mode entry reuses the existing Adventure Mode screen and its existing "continue" behaviour.
- Tension changes are deliberate; the app does not change tension by itself.
- Table contents (foci, actions, subjects) are written for genre-neutral play and can be expanded later.

## Out of Scope

- Threads in CC Cloud Backup. Cloud backup sends an explicit list (entries, labels, notes, media and journals) under its consent screen; adding threads needs that screen updated, so it is a follow-up.
- The explored-but-not-visible fog tier and party-based vision (separate spec, with #2414).
- Player-editable oracle tables or custom answer scales.
- Thread sharing with other players, or threads in Player View.
- AI that rolls, asks or acts by itself; the Oracle acts only when the player sends a question.
- A full Mythic-style rules engine, scene adjustment or character lists beyond threads.
