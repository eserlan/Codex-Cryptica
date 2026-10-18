# Feature Specification: Start Solo Session

**Feature Branch**: `feat/172-solo-session-entry`
**Created**: 2026-10-07
**Status**: Draft
**Input**: User description: "Start Solo Session entry point — Phase 1 of Solo Play Mode (#3839). One person who is both GM and player can start, resume and end a dedicated solo session from inside an existing campaign, without an AI GM and without switching between GM/player workflows. Play navigation opens a /play page (Start/Resume Solo Session first, Adventure Mode as an optional secondary choice); a short setup (map, PCs, journal); a compact solo bar on every app route with quick roll, more dice, Ask Oracle, Journal, Map, Add note, scene and End; session state per vault that survives reload; ending never deletes; Cif explains it and stays product help only. Local-first, no tracking, no new dependency."
**Issue**: #3839 (Phase 1). Builds on #3818 / #3838 (solo fog) and #3841 / #3843 (solo map play).

## Context

Codex Cryptica already has most of what someone needs to play a campaign alone: the map with solo fog, dice, tables and decks, the Session Journal, the Oracle and the vault. Today these are separate tools. A solo player, who is both GM and player, has to remember to switch SOLO on, start a journal, open the dice window and find the Oracle, and then keep moving between them.

The only "Play" entry in the app today opens Adventure Mode, where the Oracle runs the game. That is one way to play solo, but #3839 is clear that solo play must work without an AI game master: with ordinary dice, tables, a traditional oracle or pure imagination.

This feature adds the entry point: a way to start, resume and end a solo session, which gathers the tools a solo player needs and keeps them within reach on every screen. It is a thin layer over existing tools, not a new application.

## Clarifications

### Decided with the user, 2026-10-07

- The **Play** navigation item opens a new Play page. Its main action is Start Solo Session, or Resume Solo Session when one is active. Adventure Mode becomes a secondary, clearly optional choice on the same page.
- The **solo bar** is shown on every app screen while a solo session is active, not only on the map.
- **Dice** in the bar are a quick roll: type an expression such as `d20` or `2d6+1` and see the result in the bar itself. Nothing pops up and the view does not change. The existing dice window stays available from the bar for tables, decks and roll history.

### Session 2026-10-07

- Q: Where should the solo bar sit on desktop? → A: A thin strip directly below the app header, in its own row; screens shrink by about one line and nothing is drawn over them (FR-010).
- Q: When the player names a new scene while a journal is running, should the journal start a new section? → A: Yes. A new scene starts a journal section with that name, and renaming the current scene renames its section (FR-024).
- Q: What happens to a solo session if the player starts hosting a shared or multiplayer session or switches to Player View? → A: That cannot happen. While a solo session is active, hosting players, sharing and Player View are unavailable, with a note to end the solo session first. Solo play is solo for a reason (FR-028).
- Q: Should choosing the party's characters be part of this first version? → A: No. It moves to Phase 2; setup is map and journal only (FR-005, FR-025 removed).
- Q: Which map should the setup preselect? → A: The map last open in this vault; if that is unknown, the first map; if the vault has no maps, no map (FR-006).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Start a solo session and play (Priority: P1)

A player opens their campaign, chooses **Play**, and picks **Start Solo Session**. A short setup asks which map to play on (or none) and whether to start a Session Journal (on by default). They confirm and land on the map with SOLO fog on and a journal running. A compact solo bar now sits just below the app header with the tools they will reach for all evening.

**Why this priority**: This is the entry point the issue asks for. Without it, nothing else in solo play has a home, and the player keeps assembling the setup by hand every time.

**Independent Test**: In a vault with one map, choose Play, start a solo session with the map and a journal, and confirm the map opens with SOLO on, a journal is running, and the solo bar is shown.

**Acceptance Scenarios**:

1. **Given** no solo session is active, **When** the player opens Play, **Then** Start Solo Session is the main action, and Adventure Mode is offered below it as an optional choice.
2. **Given** the setup is open, **When** the player confirms without changing anything, **Then** a session starts with sensible defaults: the map last open in this vault (or no map if the vault has none) and a new Session Journal.
3. **Given** the player chose a map, **When** the session starts, **Then** the map opens with SOLO fog on for that map and the solo bar is visible.
4. **Given** the player chose no map, **When** the session starts, **Then** the player lands on the knowledge graph with the solo bar visible.
5. **Given** a Session Journal is already running, **When** the player opens the setup, **Then** the journal option offers to continue that journal instead of starting a new one, and continuing is the default.
6. **Given** the player turned the journal option off, **When** the session starts, **Then** no journal is started and the bar offers to start one later.
7. **Given** AI is turned off, **When** the player opens Play, **Then** Start Solo Session works in full and Adventure Mode is not offered.

---

### User Story 2 - Roll and reach my tools without leaving what I'm doing (Priority: P1)

Mid-session, the player needs a d20. They type `d20` into the bar's quick roll and press Enter. The result appears in the bar, the roll is in their roll history, and the running journal records it. The map does not move and nothing opens. When they need a random table or a card, they open the full dice window from the bar. Ask Oracle, the journal, the map and a quick note are each one action away from any screen.

**Why this priority**: A solo session is mostly small, frequent actions. If each one means opening a window or switching screens, the tool is in the way, which is the problem #3839 sets out to remove. This story is what makes the session usable for an evening.

**Independent Test**: With a session and journal active, roll `d20`, `2d6+1` and an invalid expression from the bar while on the map, and confirm the first two show results in the bar, appear in roll history and the journal, the invalid one shows an inline message and records nothing, and the map view never changes.

**Acceptance Scenarios**:

1. **Given** a solo session is active, **When** the player enters a valid dice expression in quick roll, **Then** the result and its total are shown in the bar, and the current screen, its scroll and any open panels are unchanged.
2. **Given** a quick roll was made, **When** the player opens roll history in the dice window, **Then** the roll is there like any other.
3. **Given** a Session Journal is running with dice capture on, **When** the player quick-rolls, **Then** the roll is captured into the journal exactly as rolls from the dice window are.
4. **Given** the player enters an expression that cannot be read, **When** they submit it, **Then** a short inline message explains it, nothing is rolled and nothing is recorded.
5. **Given** the player has rolled before in this session, **When** they submit an empty quick roll, **Then** the last expression is rolled again.
6. **Given** a solo session is active, **When** the player chooses the bar's more-dice action, **Then** the existing dice window opens, with its tables, decks and history.
7. **Given** AI is on, **When** the player chooses Ask Oracle from the bar, **Then** the Oracle opens beside the current screen. **Given** AI is off, **Then** Ask Oracle is not shown.
8. **Given** a solo session is active, **When** the player chooses Journal, Map or Add note from the bar, **Then** the journal opens, the session's map opens, or a quick note opens, respectively, from any screen.

---

### User Story 3 - Pick up where I left off (Priority: P2)

The player closes the browser mid-session. The next evening they open the campaign and the solo bar is still there, with their scene and the same journal. Play shows **Resume Solo Session**.

**Why this priority**: Solo campaigns run over many evenings. Losing the session on reload would make the feature unreliable, but the session can still be started and used without it, so it follows the core stories.

**Independent Test**: Start a session with a map, a journal and a scene name, reload the page, and confirm the bar, scene, map and journal link are all restored and Play shows Resume.

**Acceptance Scenarios**:

1. **Given** a solo session is active, **When** the player reloads or navigates anywhere in the app, **Then** the session and its bar remain, with the same map, journal and scene.
2. **Given** a solo session is active, **When** the player opens Play, **Then** Resume Solo Session is the main action and takes them to the session's map (or the graph when there is no map).
3. **Given** a solo session is active in one vault, **When** the player switches to another vault, **Then** that vault shows no session (or its own), and switching back restores the first.
4. **Given** the player turned SOLO off on the map during the session, **When** they resume, **Then** SOLO is left as they set it; only starting a session turns it on.

---

### User Story 4 - End the session cleanly (Priority: P2)

At the end of the evening the player chooses **End session** in the bar. They are asked whether to end the journal too. Either way, the bar disappears, and their journal, rolls, map and vault are exactly as they left them.

**Why this priority**: Without an end, the bar stays forever. Ending must be safe, since the session gathers other things the player cares about.

**Independent Test**: End a session with a running journal, once choosing to end the journal and once choosing to keep it, and confirm the bar is gone, nothing is deleted, and the journal is ended or still running as chosen.

**Acceptance Scenarios**:

1. **Given** a solo session with a running journal, **When** the player ends the session, **Then** they are asked whether to end the journal as well, with keeping it running as a choice.
2. **Given** the player confirms ending, **When** the session ends, **Then** the bar is removed, Play shows Start Solo Session, and no journal entry, roll, map, map setting or vault record is deleted or changed by ending.
3. **Given** a solo session with no running journal, **When** the player ends it, **Then** it ends straight away, with no journal question.
4. **Given** the end confirmation is open, **When** the player cancels, **Then** the session continues unchanged.

---

### User Story 5 - Know which scene I'm in (Priority: P3)

The bar shows the current scene name. The player renames the scene as the story moves ("The flooded crypt"). With a journal running, a new scene starts a new journal section so the record reads in scenes.

**Why this priority**: It makes the bar feel like a session rather than a toolbar, and gives the journal shape, but the session is fully usable without it.

**Independent Test**: With a journal running, set the scene to "Arrival", then "The flooded crypt", and confirm the bar shows the current name and the journal has a section for each.

**Acceptance Scenarios**:

1. **Given** a solo session, **When** the player sets a new scene name, **Then** the bar shows it, and it is kept across reloads.
2. **Given** a journal is running, **When** the player starts a new scene, **Then** the journal starts a new section with that name, and later entries go into it.
3. **Given** no journal is running, **When** the player sets a scene, **Then** the name is shown in the bar and nothing is recorded.

---

### User Story 6 - Get help with solo play (Priority: P3)

A player new to solo play asks Cif, "how do I play solo?" Cif explains the Play page and the solo bar and can point at them. When they ask Cif what a monster would do, Cif makes clear that is a question for the Oracle, not for product help.

**Why this priority**: The feature replaces an existing entry ("Play" used to mean Adventure Mode), so people need to find their way. It is help, not core function.

**Independent Test**: Ask Cif "how do I start a solo session?" and "what's the solo bar for?" and confirm both answers come from the help library and can point at the control; ask an in-game question and confirm Cif points to the Oracle instead of answering in character.

**Acceptance Scenarios**:

1. **Given** a solo session is or is not active, **When** the player asks Cif how to play solo, **Then** Cif explains starting a session from Play, and knows whether one is active.
2. **Given** a solo session is active, **When** the player asks Cif about a bar control, **Then** Cif explains it and can point at it.
3. **Given** any state, **When** the player asks Cif an in-game question, **Then** Cif does not act as GM or narrator and directs them to the Oracle or their own procedures.
4. **Given** AI is off, **When** the player opens Help, **Then** a solo session guide is available and complete.

### Edge Cases

- **Session's map deleted**: the session continues without a map; the bar's Map action offers to choose a map instead.
- **Linked journal ended elsewhere** (from the journal panel): the session continues and the bar's Journal action offers to start or continue a journal.
- **Vault has no maps**: the setup's map choice shows only "No map", without an error.
- **Trying to host players or switch to Player View during a solo session**: those controls are unavailable while the solo session is active, with a short note to end the solo session first. Solo play is one person.
- **Shared or multiplayer session already running** when the player opens Play: Start Solo Session is unavailable, with a note to end the shared session first.
- **Guest mode / guest vault**: Play does not offer solo sessions and the bar is never shown.
- **Two browser tabs on the same vault**: both show the same session; starting, changing or ending it in one updates the other straight away.
- **Full-screen map, pop-out windows and Zen view**: the bar is hidden along with the app header and returns when leaving them; the session is unaffected.
- **Very small screens**: the bar collapses into a single control that opens the same actions in a sheet; no action is lost.
- **Dice window already open**: quick roll still works, and the roll appears in the window's history.
- **Old links to Adventure Mode**: the existing Adventure Mode address keeps working.

## Requirements _(mandatory)_

### Functional Requirements

**Play page and entry**

- **FR-001**: The Play navigation item MUST open a Play page instead of going straight to Adventure Mode, on both the desktop rail and the phone menu.
- **FR-002**: The Play page MUST make Start Solo Session its main action when no session is active, and Resume Solo Session when one is active in the current vault.
- **FR-003**: The Play page MUST offer Adventure Mode as a secondary, clearly optional choice, described as letting the Oracle run the game, and MUST NOT offer it when AI is turned off.
- **FR-004**: The existing Adventure Mode address MUST keep working.

**Setup**

- **FR-005**: Starting a session MUST show a short setup with: a map choice (any map in the vault, or no map) and a journal option.
- **FR-006**: The setup MUST be confirmable without changes, using these defaults: the map last open in this vault (the first map if that is unknown, or no map when the vault has none) and the journal option on.
- **FR-007**: When a Session Journal is already running, the journal option MUST offer to continue it, and continuing MUST be the default; otherwise it MUST offer to start a new journal.
- **FR-008**: Confirming the setup MUST turn SOLO fog on for the chosen map, start or continue the journal when that option is on, and take the player to the chosen map, or to the knowledge graph when no map was chosen.
- **FR-009**: Starting a session MUST NOT require AI and MUST NOT change how the Oracle behaves; in particular it MUST NOT turn on Adventure Mode or make the Oracle act as game master.

**Solo bar**

- **FR-010**: While a solo session is active in the current vault, a solo bar MUST be shown on every app screen that shows the app header, as a single-line strip directly below the header, in its own row. Like the header, it is not shown on the full-screen map, pop-out windows or Zen view. The screen below it MUST shrink to make room; the bar MUST NOT be drawn over any screen content or controls.
- **FR-011**: The bar MUST provide: quick roll, open dice window, Ask Oracle (only when AI is on), Journal, Map (only when the session has a map, otherwise choose a map), Add note, the current scene, and End session.
- **FR-012**: The player MUST be able to minimise the bar to a single control and expand it again; this choice MUST be remembered on this device.
- **FR-013**: On phone-sized screens, the bar MUST collapse into a single control that opens all its actions in a sheet.
- **FR-014**: All bar actions MUST be reachable and operable by keyboard and have accessible names.

**Quick roll**

- **FR-015**: Quick roll MUST accept the same dice expressions as the dice window and show the result and total inside the bar, without opening any window, dialog or panel and without changing the current screen.
- **FR-016**: Quick rolls MUST be added to the same roll history as dice window rolls and MUST be captured by a running Session Journal exactly as dice window rolls are.
- **FR-017**: An expression that cannot be read MUST show a short inline message and MUST NOT roll or record anything.
- **FR-018**: Submitting an empty quick roll MUST repeat the last expression rolled in this session; if there is none, it MUST do nothing.

**Session state**

- **FR-019**: A vault MUST have at most one active solo session.
- **FR-020**: The active session MUST survive navigation and reload, and MUST be restored for its vault when the player returns to it.
- **FR-021**: Resuming a session MUST NOT change any map setting; only starting a session turns SOLO on.
- **FR-022**: The session MUST only reference vault content (map, journal); campaign knowledge MUST stay in the vault and journal, not in the session.

**Scenes**

- **FR-023**: The player MUST be able to set and rename the current scene from the bar.
- **FR-024**: When a journal is running, starting a new scene MUST start a new journal section with that name; renaming the current scene MUST rename its section.
- **FR-025**: _(Removed in clarification: choosing a party moves to Phase 2.)_

**Ending**

- **FR-026**: Ending a session MUST ask for confirmation, and when the session's journal is running MUST ask whether to end it too, with keeping it running as a choice.
- **FR-027**: Ending a session MUST remove the bar and clear the session, and MUST NOT delete or change any journal entry, roll, map, map setting or vault record.

**Scope, help and privacy**

- **FR-028**: Solo sessions MUST NOT be available in guest mode. While a solo session is active, hosting players, sharing the session and switching to Player View MUST be unavailable, each with a short note to end the solo session first. While a shared or multiplayer session is running, Start Solo Session MUST be unavailable, with a note to end that session first. Apart from this, multiplayer, Player View and guest behaviour MUST NOT change.
- **FR-029**: The Help library MUST include a solo session guide covering the Play page, setup, the bar, quick roll, scenes, resuming and ending, usable without AI.
- **FR-030**: Cif MUST know whether a solo session is active, MUST be able to explain and point at the Play page actions and the bar, and MUST stay product help only: it MUST NOT act as game master, narrator or NPC.
- **FR-031**: All solo session state MUST stay on this device. Nothing about solo sessions, quick rolls or scenes MUST be sent anywhere, measured or reported.

### Key Entities

- **Solo session**: one per vault, on this device. Which vault it belongs to, when it started, the chosen map (optional), the linked Session Journal (optional), the current scene name, and the last quick-roll expression.
- **Solo bar preference**: per device. Whether the bar is minimised.
- **Scene**: the current scene name in the session; when a journal is running, it corresponds to a journal section.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From an open campaign, a player can go from choosing Play to playing on their map with SOLO on and a journal running in under 30 seconds and no more than three actions, accepting the defaults.
- **SC-002**: A quick roll takes no more than two actions from any screen (focus, then type and submit), and in 100% of checks the current screen, its position and its open panels are unchanged afterwards.
- **SC-003**: In 100% of reload checks, an active session is restored with its map, journal link and scene.
- **SC-004**: Ending a session changes zero journal entries, rolls, maps, map settings or vault records in a before/after comparison.
- **SC-005**: With AI turned off, every user story except Ask Oracle and Adventure Mode passes in full.
- **SC-006**: With no solo session active, all existing multiplayer, Player View and guest checks pass unchanged; with one active, every way to host players or enter Player View is unavailable in 100% of checks.
- **SC-007**: In a usability check, at least four of five solo players start a session and make a roll without help, within two minutes of opening Play for the first time.

## Assumptions

- "Solo session" is a light layer over existing tools, not a separate application mode. The map's SOLO switch, the Session Journal, dice history, the dice window, QuickNote and the Oracle are reused as they are.
- "Add note" opens the existing quick note scratchpad.
- Journal capture of quick rolls follows the journal's existing dice capture setting.
- Scene names are free text with no history in this phase; the journal sections are the record of past scenes.
- Terms: **Player View** is the app's existing Shared Mode (the Player View toggle on the graph and map, and the `P` shortcut). **Hosting** or **sharing a session** means opening Share to let players connect. A **shared or multiplayer session** is either of these. How they are detected is unchanged.
- The Play page is an app screen, not a public discovery page, so discovery intent governance does not apply.

## Out of Scope

- Choosing a party of characters for the session (Phase 2, when the party can drive something such as the map's vision tokens or journal capture).
- Generator and random-table quick actions in the bar (Phase 2).
- Saving discoveries to the vault from the bar (Phase 2).
- Scene history, contextual Oracle shortcuts, thread or mystery tracking (Phase 2 and 3).
- Any change to Adventure Mode itself, to how the Oracle answers, or to the map's solo play features from #3841.
- Multiplayer solo sessions or sharing a solo session.
