# Feature Specification: Session Journal (data model, persistence & lifecycle)

**Feature Branch**: `163-session-journal`
**Created**: 2026-09-25
**Status**: Draft
**Slices**: Slice 1 (#3406, PR #3422) = User Stories 1–4 / FR-001–FR-017. Slice 2 (#3407) = User Story 5 / FR-018–FR-023, built on the same branch. Slice 3 (#3408, automatic capture) = User Story 6 / FR-024–FR-035, built on branch `163-session-journal-slice-3`. Slice 4 (#3409, promote-to-entity) = User Story 7 / FR-036–FR-049, built on branch `163-session-journal-slice-4`. Slices 1–3 are merged.
**Input**: User description: "Session Journal (slice 1 of #3402, tracked as issue #3406): a persistent play log for TTRPG sessions, built on top of the existing Quicknote/Scratchpad experience but serving a different purpose — an ongoing chronological record of what happens during play, rather than transient notes. Scope for this spec (data model, persistence, and lifecycle only — later slices cover the global UI indicator, automatic capture, and promote-to-entity, tracked separately as #3407, #3408, #3409): SessionJournal (id, vault/campaign context, title, startedAt, endedAt, status, sections[], entries[]); JournalEntry (id, timestamp, type, content, optional source metadata/reference, optional linked entity/tool/result); lifecycle (start, resume, end — ended journals preserved and browsable); manual entries only; optional sections/chapters; minimal UI surface reachable only from Quicknote/Scratchpad with a three-state control (Start/Open/Resume); persistence via IndexedDB following the Oracle-store decomposition pattern; Quicknote/Scratchpad stays transient, Session Journal is the chronological record — the two must not be conflated in the UI."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Start a session journal and add notes as play happens (Priority: P1)

A GM or solo player is running a session and wants a running record of what happens, separate from their transient scratch notes. From Quicknote/Scratchpad they start a Session Journal and add timestamped notes as the session unfolds, without losing their place in whatever else they were doing.

**Why this priority**: This is the entire value proposition of the feature. Without the ability to start a journal and add notes to it, nothing else in this slice (or the later slices) has anything to build on.

**Independent Test**: Can be fully tested by opening Quicknote/Scratchpad, starting a Session Journal, adding two or three manual notes, and confirming they appear in chronological order with timestamps — delivers a working play log on its own.

**Acceptance Scenarios**:

1. **Given** no journal is active for the current vault, **When** the user opens Quicknote/Scratchpad, **Then** they see a "Start Session Journal" control.
2. **Given** the user selects "Start Session Journal", **When** the journal is created, **Then** the control changes to "Open Session Journal" and the journal is empty and active.
3. **Given** an active journal, **When** the user adds a note, **Then** the note appears in the journal with a timestamp, in the order it was added, without navigating away from Quicknote/Scratchpad.
4. **Given** an active journal with existing entries, **When** the user adds another note, **Then** the new note appears after the existing ones (chronological order is preserved).

---

### User Story 2 - Organize a long session into sections (Priority: P2)

During a longer session, a GM wants to break the journal into chapters or scenes (e.g. "Arrival in Port Vane", "The Ambush") so the record has structure, without being forced to use sections if they'd rather keep one continuous log.

**Why this priority**: Sectioning is explicitly optional in the source request and is a refinement of the core journaling flow (User Story 1), not a dependency for it. It matters for longer or more structured sessions but a working journal doesn't need it on day one.

**Independent Test**: Can be fully tested by starting a journal, adding a section, renaming it, adding entries under it, and confirming the journal still works with zero sections for a user who never touches this feature.

**Acceptance Scenarios**:

1. **Given** an active journal with no sections, **When** the user starts a new section, **Then** subsequent entries are associated with that section and prior entries remain in place (ungrouped or in whatever section preceded it).
2. **Given** a section exists, **When** the user renames it, **Then** the new name is reflected immediately and entries already in that section keep their association.
3. **Given** an active journal, **When** the user never creates a section, **Then** the journal behaves as one continuous log with no forced structure.

---

### User Story 3 - End a session and come back to it later (Priority: P1)

At the end of a session, the GM ends the journal. Later — before or during the next session — they want to either resume an unfinished journal exactly where they left off, or look back at a past, ended journal to remember what happened.

**Why this priority**: A journal that can't be closed out or revisited is not meaningfully different from a note that vanishes when the tab closes. Preserving the record across sessions is core to the "persistent play log" premise, equal in priority to being able to write into it in the first place.

**Independent Test**: Can be fully tested by starting a journal, adding entries, ending it, reloading the app, and confirming the journal is still there and readable; separately, by starting a journal, adding entries, leaving without ending it, reloading, and confirming "Resume Session Journal" picks up the same entries and sections.

**Acceptance Scenarios**:

1. **Given** an active journal with entries and sections, **When** the user ends the session, **Then** the journal's status becomes "ended", its end time is recorded, and no further entries can be added to it.
2. **Given** an ended journal, **When** the user reloads or reopens the app, **Then** the journal and all its entries/sections are still present and viewable.
3. **Given** an active journal that was never explicitly ended (e.g. the user closed the tab mid-session), **When** the user returns to Quicknote/Scratchpad, **Then** they see "Resume Session Journal" and reopening it shows every entry and section exactly as left.
4. **Given** an ended journal, **When** the user starts a new session journal, **Then** a new, separate journal is created and the ended journal's content is untouched.

---

### User Story 4 - Keep the journal when moving to a new device or restoring a cloud backup (Priority: P2)

A GM who uses cloud backup (an existing, opt-in feature of this app) switches devices, or restores their vault from a cloud backup, and expects their session journals to come back along with their entities, maps, and canvases — not to have silently vanished.

**Why this priority**: Journals are a session record a GM may reasonably want to keep as long as any other vault content. Losing them silently on a restore would contradict FR-008's promise that ending a journal "MUST NOT delete or hide" it — an omission from backup has the same user-visible effect as deletion. This is P2, not P1, because it depends on the user already having cloud backup enabled (itself opt-in and not universal), and the core journaling flow (Stories 1-3) delivers full value with purely local persistence.

**Independent Test**: Can be fully tested by enabling cloud backup on a vault with a journal that has entries and sections, triggering a backup, restoring that backup into a new vault, and confirming the journal (with its entries and sections intact) is present in the restored vault.

**Acceptance Scenarios**:

1. **Given** cloud backup is enabled for a vault with an active or ended journal, **When** a backup is taken, **Then** the journal's full content (sections and entries) is included in what gets backed up.
2. **Given** a cloud backup that includes a journal, **When** the user restores that backup into a new vault, **Then** the journal appears in the restored vault with every entry and section intact, in the same order.
3. **Given** the cloud backup consent screen, **When** the user reads what gets stored, **Then** session journals are named alongside entities, maps, and canvases — the user is never backing up more than they were told.

---

### User Story 5 - Reach the journal from anywhere in the app during play (Priority: P1) — Slice 2, #3407

A GM or solo player is mid-session, working in the graph, the map, the timeline or the Oracle, and wants to jot down what just happened without first remembering that the journal lives behind the Quicknote/Scratchpad tab. They see a Session Journal control in the app's always-visible tool chrome that shows whether a journal is running, and one selection takes them straight to it.

**Why this priority**: Slice 1 made the journal exist; this slice makes it usable during real play. A journal that needs three steps to reach (open Notes, switch tab, find the control) gets skipped in the middle of a session, which defeats a "record of what happened".

**Independent Test**: Can be fully tested by starting a journal, navigating to several different app views, and from each one selecting the global Session Journal control and confirming the live, editable journal opens on its Journal tab with the same entries and sections.

**Acceptance Scenarios**:

1. **Given** the user is on any in-app view where Quicknote/Scratchpad is available, **When** they look at the global tool chrome, **Then** a Session Journal control is visible and its label names the current state ("Start Session Journal", "Open Session Journal" or "Resume Session Journal", per FR-010).
2. **Given** no journal is active, **When** the user selects the control, **Then** the Quicknote/Scratchpad panel opens on the Journal tab showing its Start screen, and no journal is created until the user chooses to start one there.
3. **Given** an active journal that was already opened this browser session, **When** the user selects the control from a different view than the one they started on, **Then** the panel opens on the Journal tab with the live journal, its entries and sections, ready to add a note.
4. **Given** an active journal left over after an app reload, **When** the user selects the "Resume Session Journal" control, **Then** the journal opens with every entry and section exactly as left, and the control changes to "Open Session Journal".
5. **Given** the user last left the panel on its Journal tab and closed it, **When** they reopen it with the Notes tool or Ctrl/Cmd+I, **Then** it reopens on the Journal tab (the selected tab is remembered, same as before this slice). _(The panel's modal backdrop covers the tool chrome while it is open, so a pointer user cannot select the global control from the Notes tab; the open-journal action's behaviour in that case is guaranteed by FR-020 instead.)_
6. **Given** an active journal, **When** the user navigates between tools and views, **Then** the journal, its control state, and which tab the panel was last on are unchanged.
7. **Given** the user is in a guest/player-facing session where Quicknote/Scratchpad is unavailable, **When** they look at the tool chrome, **Then** no Session Journal control is shown.
8. **Given** the user switches to a different vault, **When** the control re-renders, **Then** it reflects that vault's journal state, never the previous vault's (FR-012).

---

### User Story 6 - Dice rolls, card draws and table results land in the journal by themselves (Priority: P1) — Slice 3, #3408

A GM or solo player is mid-session with a journal running. They roll dice, draw cards from a deck and roll on random tables as they play. Without doing anything extra, each result is added to the journal as its own timestamped entry, so the journal reads as a true record of what happened, and they never have to copy a result across by hand.

**Why this priority**: A journal made only of typed notes is a diary. Automatic capture is what makes it a record of play, and it is the main reason the feature exists in the parent request (#3402). It depends on slices 1 and 2, which are done.

**Independent Test**: Can be fully tested by starting a journal, rolling in the dice roller, drawing from a deck, rolling on a table and typing `/roll` in the Oracle chat, then opening the journal and confirming each result appears once, in order, marked as automatic, with the panel never opened in between.

**Acceptance Scenarios**:

1. **Given** an active journal, **When** the user rolls dice (for example 2d6+3 in the dice roller), **Then** a "Dice roll" entry appears with the formula and total, timestamped and in order among any typed notes.
2. **Given** an active journal, **When** the user draws cards from a deck, **Then** a "Card draw" entry appears naming each card drawn, and marking any that came up reversed.
3. **Given** an active journal, **When** the user rolls on a random table, **Then** a "Table result" entry appears naming the table and giving the result text. Re-rolling one part of a result adds its own entry.
4. **Given** an active journal, **When** a roll, draw or table result is made from the Oracle chat (`/roll`, table or deck commands) or from a stat sheet field, **Then** it is captured the same way as one made from the dice roller.
5. **Given** an active journal and the Quicknote/Scratchpad panel closed, **When** the user makes several rolls in quick succession, **Then** every one appears in the journal in the order it was made, with none lost or overwritten.
6. **Given** no journal is active (none started, or the last one ended), **When** the user rolls, draws or rolls on a table, **Then** the tool works exactly as it does today, and no entry is created, no journal is started, and no message or error is shown.
7. **Given** the journal has a current section, **When** a result is captured, **Then** it goes into that same section, as a typed note would.
8. **Given** a future feature publishes a journal capture event through the shared interface with an entry type the journal has never seen, **When** the event arrives, **Then** it is added and shown with a generic automatic-entry style, with no change to the journal itself.
9. **Given** an automatic entry and a typed note side by side, **When** the user reads the journal, **Then** they can tell at a glance which is which without reading the text.

---

### User Story 7 - Turn journal content into vault entities (Priority: P1) — Slice 4, #3409

After (or during) a session, a GM wants the good parts of the journal to become lasting material in their world: a scene as a Note or Event, a tavern brawl's aftermath as a Location, a whole session as a session-report Note. They pick an entry, a section, several parts, or the whole journal, choose what kind of entity it should be, and get a draft entity with the text already filled in, ready to tidy up and approve. The journal itself is never touched.

**Why this priority**: The journal is a record; the world is the payoff. Without this, useful lore stays trapped in a log. It is the last part of the parent request (#3402) and depends on slices 1–3, which are done.

**Independent Test**: Can be fully tested by finishing a journal that has typed notes, a section and a few automatic entries, then turning one entry, one section and the whole journal into entities, and confirming that each becomes a draft entity with the right text and type, that the journal is unchanged, and that ending the session offers these choices without forcing any.

**Acceptance Scenarios**:

1. **Given** a journal entry, **When** the user chooses "Make entity" on it, picks a type (Note by default) and confirms the name, **Then** a draft entity of that type is created with the entry's text as its body, and the user is taken to it to edit.
2. **Given** a section with entries, **When** the user chooses "Make entity" on the section, **Then** the draft's body holds that section's entries in order, each with its time, with automatic entries marked as such.
3. **Given** a journal with entries, **When** the user chooses "Turn journal into a Note", **Then** a draft Note is created holding the whole journal in order, with its sections as headings and the journal's title as the name.
4. **Given** the user chooses "Choose parts" and ticks several entries and/or sections, **When** they confirm, **Then** one draft entity is created holding the chosen parts together in journal order, with nothing repeated.
5. **Given** a draft entity created from the journal, **When** the user reviews it, **Then** they can edit, approve or discard it through the same draft review used elsewhere in the app, and discarding it changes nothing in the journal.
6. **Given** any promotion, **When** it finishes, **Then** the journal's entries, sections and status are exactly as before, and the same content can be turned into another entity again.
7. **Given** the user ends a session, **When** it ends, **Then** the journal is ended as before (one action, always allowed) and the view then offers "Turn into a Note", "Choose parts", or simply leaving it as it is, none required.
8. **Given** an ended journal opened from the past-journals list, **When** the user looks at it, **Then** the same promote choices are available.
9. **Given** an empty journal, an empty section, or "Choose parts" with nothing ticked, **When** the user looks at the promote control, **Then** it is disabled and says why in plain language.
10. **Given** the entity cannot be created (for example the vault is not ready), **When** the user confirms, **Then** they see a plain-language message, the form and their choices stay as they were, and the journal is untouched.

### Edge Cases

- What happens when the user tries to add a note but no journal has ever been started for the vault? The control must offer "Start Session Journal" rather than exposing a note field with nothing to attach it to.
- What happens when the user renames a section to an empty or whitespace-only name? The rename is rejected and the section keeps its previous name.
- What happens when the vault has more than one past (ended) journal? All of them remain individually accessible; none are overwritten or merged.
- What happens when the user tries to end a journal that has zero entries? Ending is still allowed — an empty session is a valid (if unusual) outcome and must not be blocked.
- What happens when two browser tabs have the same vault open and both try to add to the same active journal? The later write must not silently discard the earlier one (see FR-011).
- What happens to a journal when the GM shares a player-facing/guest view of the vault? Nothing — a journal is the GM's own record and MUST NOT appear in a guest or player-facing export, only in the GM's own cloud backup (see FR-016).
- What happens when the user selects the global control while a journal note is half-typed and the panel is closed? Saved entries are never lost; an unsent draft in the note field is not guaranteed to survive closing the panel (same as slice 1) — see Assumptions.
- What happens if the open-journal action is invoked while the panel is already open (for example by keyboard, since the panel's backdrop blocks the pointer from reaching the control)? The panel stays open and switches to the Journal tab; it never toggles closed and never starts a second journal (FR-013, FR-020).
- What happens in a popup window, VTT fullscreen or Zen pop-out, where the tool chrome is not shown? No Session Journal control is shown there, exactly as for the other tool items; nothing else changes.
- What happens when a journal is started or ended in another browser tab? This tab's control is not guaranteed to update live; it is correct again on the next load or vault switch (see Assumptions).
- What happens when a roll happens in a second browser tab of the same vault? Only the tab where the roll was made captures it. Journal capture events are local to the tab that publishes them and are never relayed to other tabs, so nothing is captured twice. As a safeguard, a capture event that does arrive marked as relayed from another tab is ignored.
- What happens when a table result is very long? The entry summary is cut at 500 characters with an ellipsis and the reference is kept within its size limit (FR-027); the journal never stores an unbounded blob per roll.
- What happens when the journal is ended between the roll and the moment it would be saved? The entry is dropped quietly (an ended journal takes no entries, FR-007), and the roll itself is unaffected.
- What happens when saving a captured entry fails (for example storage is full)? The failure is logged for debugging only; the roll, draw or table result the user asked for still completes and shows as normal, and no error is shown to the user.
- What happens to rolls made in the solo Adventure mode's own roll prompt, or in the map (VTT) view? They are not part of this slice unless they already go through the shared roll history (see Assumptions).
- What happens in a guest or player-facing session? Nothing is captured; the journal is the GM's private record and has no control there.
- What happens when the same entry is turned into an entity twice? Two separate drafts are created; the journal does not track or block repeats.
- What happens when a name is left blank in the promote form? Creating is blocked with a plain message; nothing is created.
- What happens when a section that has no entries is chosen? It is treated as having nothing to make (the control is disabled with a reason).
- What happens when both a section and one of its entries are ticked in "Choose parts"? The entry appears once in the result, in journal order. The two checkboxes stay independent; ticking the section does not tick, disable or restyle its entries.
- What happens when the journal is long? The body is as long as the journal; there is no limit or truncation, and the user trims it in the draft.
- What happens to the panel when the draft is created? It closes, so the new draft can be seen and edited right away, as when a Quicknote is turned into an entity.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST let a user start a new Session Journal for the current vault when no journal is currently active for that vault.
- **FR-002**: System MUST let a user add a manual, timestamped entry to the active journal without leaving Quicknote/Scratchpad.
- **FR-003**: System MUST display a journal's entries in chronological order (by timestamp).
- **FR-004**: System MUST let a user create a named section within an active journal at any point during the session.
- **FR-005**: System MUST let a user rename an existing section; renaming MUST reject an empty or whitespace-only name and leave the prior name in place.
- **FR-006**: System MUST NOT require a journal to have any sections — a journal with zero sections is a fully valid, continuous log.
- **FR-007**: System MUST let a user end an active journal, recording an end time and marking its status as ended; the system MUST reject further entries added to an ended journal.
- **FR-008**: System MUST preserve an ended journal, along with all of its entries and sections, and keep it accessible to the user after ending — ending MUST NOT delete or hide the journal.
- **FR-009**: System MUST let a user resume a journal that was left active (not explicitly ended) and see every entry and section exactly as it was, including after an app reload.
- **FR-010**: System MUST present exactly one of three control states per vault at any time — "Start Session Journal" (no journal exists yet, or the most recent one was ended), "Open Session Journal" (a journal is active and was already opened this session), or "Resume Session Journal" (a journal is active but was left without being explicitly closed) — never more than one control at once.
- **FR-011**: System MUST persist journal data (journals, sections, entries) locally so that it survives an app reload. When the same vault is open in more than one browser tab, every write (adding an entry, creating or renaming a section, ending a journal) MUST be based on the latest persisted state rather than a stale in-memory copy, so that an entry or section successfully added in one tab is never silently overwritten by a save from another tab that started before it existed. Two tabs editing the exact same entry or section at the same moment may still resolve last-one-wins on that one item — that narrow case is acceptable — but no entry or section a user successfully added is ever silently dropped as a side effect of another tab's unrelated save.
- **FR-012**: System MUST scope each journal to a single vault — a journal started in one vault MUST NOT appear as active, resumable, or in the history of a different vault.
- **FR-013**: System MUST allow at most one active (non-ended) journal per vault at a time; starting a session while one is already active MUST open/resume that existing journal rather than creating a second, concurrent one.
- **FR-014**: System MUST record, for each entry, at minimum a unique identifier, a timestamp, an entry type, and its content, so that later slices (automatic capture, promote-to-entity) can add new entry types and source references without a data migration.
- **FR-015**: System MUST visually and conceptually distinguish the Session Journal from Quicknote/Scratchpad's existing transient notes — a user must never mistake one for the other, and using the journal must not alter or remove the existing Quicknote/Scratchpad note-taking behavior.
- **FR-016**: When cloud backup is enabled for a vault (an existing, separately opt-in feature), the system MUST include that vault's session journals — full content, not a summary — in what gets backed up and in what a restore brings back, and MUST update the cloud backup consent screen to name session journals among what is stored, per this app's existing privacy-consent requirements. Session journals MUST NOT be included in a player-facing or guest vault export/share, which is a separate, filtered surface than the GM's own cloud backup.
- **FR-017**: System MUST NOT require cloud backup to be enabled for any of FR-001–FR-015 to work — a journal is fully usable, and durable across reloads, with cloud backup off (FR-016 only adds cross-device/cloud durability on top).
- **FR-018**: System MUST show a Session Journal control in the app's global tool chrome (the desktop Activity Bar and the mobile menu drawer, via the shared navigation item list) wherever that chrome is shown and Quicknote/Scratchpad is available, and MUST NOT show it where Quicknote/Scratchpad is unavailable (guest/player-facing sessions). The control needs no extra gating for popup, VTT-fullscreen or Zen pop-out windows: the chrome that hosts it is already hidden there.
- **FR-019**: The global control MUST show exactly the FR-010 state for the active vault ("Start", "Open" or "Resume Session Journal"), derived from the same state the Journal tab uses rather than a second copy, and MUST give an active (non-ended) journal a visible indicator so a running session is noticeable while the panel is closed.
- **FR-020**: Selecting the global control MUST open the Quicknote/Scratchpad panel on the Journal tab — opening it if closed, switching to the Journal tab if it is open on Notes — and MUST show the same journal view slice 1 built, not a second implementation. The underlying open-journal action MUST be safe to invoke when the panel is already open: it switches to the Journal tab, never closes the panel, and is idempotent. It MUST open the panel without creating or selecting a Quicknote note as a side effect (the panel's normal open path auto-selects or creates a Notes draft, which a journal-only open must not do).
- **FR-021**: Selecting the global control when the state is "Resume" MUST mark the journal as opened for this browser session (the FR-010 Resume → Open transition). Selecting it when the state is "Start" MUST NOT create a journal; starting stays an explicit action inside the Journal view.
- **FR-022**: The journal's saved content, its control state, and the panel's selected tab MUST survive in-app navigation between tools and views. The control state MUST follow the active vault (FR-012).
- **FR-023**: This slice MUST NOT change Quicknote/Scratchpad's Notes tab behaviour (including which note is selected or created when the panel opens from the Notes tool or Ctrl/Cmd+I), its existing open/close shortcut and toolbar behaviour, or the journal's data model, persistence or cloud backup behaviour (FR-001–FR-017).
- **FR-024**: System MUST provide one shared way for any feature to publish a "journal capture" event, carrying an entry type, a short human-readable summary and an optional structured reference to its source, over the app's existing shared event bus. A feature that publishes through it MUST NOT need to import, know about, or write into the journal.
- **FR-025**: System MUST add each such event to the active journal as an entry, without opening Quicknote/Scratchpad, changing the current view, or asking the user anything.
- **FR-026**: System MUST publish a journal capture event for every dice roll, card draw and random table or oracle result the app records, whichever tool it came from: the dice roller, the Oracle chat commands, table rolls and per-part re-rolls, deck draws, and stat sheet field rolls. Exactly one journal capture event MUST be published per recorded result, so nothing is captured twice and nothing that is recorded is missed.
- **FR-027**: Each captured entry MUST carry both a one-line, plain-language summary (for example "Rolled 2d6+3: 11", "Encounters: 2 goblins arguing", "Drew The Tower (reversed)") and a small structured reference to what produced it (formula, total and parts for dice; source id, name and kind for a table or deck; card titles and reversed flags for a draw), so that later slices do not have to parse prose. The reference MUST be plain data, MUST NOT include a table's full resolution chain, and MUST be bounded in size. Limits: the summary is capped at 500 characters, ending in an ellipsis when cut; a table or deck result text kept in the reference is capped at 1,000 characters; a draw records at most 30 cards; and the whole reference must serialise to no more than 4 KB, with the largest parts dropped first when it would not.
- **FR-028**: Automatic entries MUST use distinct entry types (`dice-roll`, `card-draw`, `table-result`) and MUST look different from typed notes in the journal, with a plain-language label and an icon per type, without relying on colour alone. An entry of a type the journal does not recognise MUST still be shown, in a generic automatic-entry style.
- **FR-029**: When no journal is active for the current vault (none started, the latest ended, or the journal not yet loaded), a journal capture event MUST be ignored: no journal is created, no entry is stored, and no error or message is shown to the user.
- **FR-030**: A failure while capturing (validation, storage, or otherwise) MUST NOT affect the feature that published the event. The roll, draw or table result still completes and is shown as normal, and the failure is logged only.
- **FR-031**: Each result MUST be captured once. Journal capture events MUST be local to the tab that publishes them: a publisher MUST NOT mark them for relay to other tabs (`metadata.sync`), and as a safeguard the listener MUST ignore any capture event marked as relayed (`metadata.remote`). Several events in quick succession MUST all be stored, in the order they were made, with none overwriting another (FR-011 applies to captured entries).
- **FR-032**: Captured entries MUST go into the same current section as a typed note would. The current section MUST therefore be held by the journal's store, not by the journal view, so it is known while the panel is closed, which is when most captures happen. A section that no longer exists MUST fall back to no section. The current section is not saved: after an app reload it starts as no section, exactly as for typed notes today, until the user picks or creates one.
- **FR-033**: System MUST NOT capture anything in a guest or player-facing session.
- **FR-034**: Captured entries MUST behave like any other entry: they persist across reloads (FR-011), keep chronological order (FR-003), appear read-only in ended journals (FR-007, FR-008), and are included in cloud backup and restore (FR-016) with no extra work.
- **FR-035**: This slice MUST NOT change what the dice roller, tables, decks, Oracle commands or stat sheets do or show: no new prompts, buttons, toggles or settings on those tools, and their roll history and chat output stay exactly as they are (FR-023 applies).
- **FR-036**: System MUST let a user turn into a vault entity any one of: a single journal entry, a single section, the whole journal, or a chosen set of entries and sections. A chosen set MUST become one entity holding the chosen parts together in journal order, with an entry that is covered twice (chosen on its own and through its section) appearing once. Ticking a section and ticking its entries are independent choices: ticking one never changes how the other looks or behaves.
- **FR-037**: The user MUST be able to choose the entity's type from the categories available in the current vault (Note by default) and to edit its name, which is pre-filled (the entry's opening words, the section's name, or the journal's title). A blank name MUST be refused with a plain-language message and nothing created.
- **FR-038**: The entity's body MUST be readable plain text built from the journal: entries in journal order, each with its local time; automatic entries marked with their label (for example "Dice roll"); section names as headings where the section changes; and, for the whole journal, its title as a heading. The same input MUST always give the same body.
- **FR-039**: The entity MUST be created as a draft, with a back-reference to where it came from (the journal and the entry, section or selection), and with nothing added beyond the type, name and body: no connections, no AI processing, no field mapping. The user reviews, edits, approves or discards it through the app's existing draft review.
- **FR-040**: When the draft is created, the Quicknote/Scratchpad panel MUST close, the new draft MUST be opened for the user (as when a Quicknote is turned into an entity), and a short message MUST say that a draft was created and what it is called, because on a page with no entity panel nothing else would show that it worked.
- **FR-041**: Promotion MUST NOT change, move, hide or delete anything in the journal: its entries, sections, status and end time stay exactly as they were. Turning the same content into an entity again MUST work and create another entity.
- **FR-042**: The promote choices MUST be available for an active journal and for an ended one, including a past journal opened from the history list.
- **FR-043**: Ending a session MUST remain a single action that is always allowed, as in slice 1. After it ends, the journal view MUST offer "Turn into a Note", "Choose parts", and leaving the journal as it is, and MUST NOT require any of them. The same actions MUST stay available on the ended journal afterwards.
- **FR-044**: A promote control that has nothing to make (empty journal, empty section, no parts chosen) MUST be disabled and MUST say why in plain language.
- **FR-045**: If the entity cannot be created, the user MUST see a plain-language message, the form and their choices MUST stay as they were, and the journal MUST be unchanged. The failure is also logged for debugging.
- **FR-046**: The promote controls MUST be usable with a keyboard and a screen reader: each has a text label, the form's fields are labelled, the form takes focus when it opens and returns it to the control that opened it when it closes, and no meaning depends on colour alone. Pressing Escape in the form MUST cancel only the form and leave the scratchpad open.
- **FR-047**: This slice MUST NOT change the journal's data model, its storage, its cloud backup behaviour, or how typed notes and captured entries are added (FR-001–FR-035 apply unchanged).
- **FR-048**: This slice MUST NOT be available in a guest or player-facing session, where the journal itself is not available. No separate control is added for this: the journal is only reachable through the toolbar control and the Quicknote panel, neither of which exists in a guest session (slice 2, FR-018).
- **FR-049**: Every promote action MUST work the same for typed notes and for automatic entries (dice rolls, card draws, table results), using the entry's summary text. An entry's structured reference is not used.

### Key Entities

- **SessionJournal**: A single vault's ongoing or completed play-session record. Holds an identifier, the vault it belongs to, a title, when it was started and (if applicable) ended, its status (active or ended), an ordered list of optional sections, and an ordered list of entries.
- **JournalSection**: An optional, user-named grouping within a journal (e.g. a chapter or scene) that entries can be associated with. A journal may have zero, one, or many sections.
- **JournalEntry**: One timestamped item within a journal. A manually-written note (slice 1) or an automatically captured roll, draw or table result (slice 3). Carries an identifier, a timestamp, a type (allowing future automatically-captured types to coexist without changing the shape), its content, and room for an optional reference to where it came from (used only by later slices).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can go from "no journal" to having their first note recorded in the journal in three actions or fewer (e.g. start journal → focus note field → submit).
- **SC-002**: 100% of entries and sections added to a journal are still present, in the same order, after an app reload or after resuming an unfinished journal.
- **SC-003**: A user can distinguish, without hesitation, which control (Quicknote/Scratchpad vs. Session Journal) they are looking at and what each is for, in an unmoderated first-use check.
- **SC-004**: Ending a session and starting a new one never mixes content between the two — 0% cross-contamination of entries between a closed journal and its successor in testing.
- **SC-005**: A GM running a multi-hour session can add entries throughout without the journal's presence measurably slowing down any other part of the app they are using at the same time.
- **SC-006**: For a vault with cloud backup enabled, 100% of a journal's entries and sections are present and in the same order after a restore into a new vault, matching SC-002's local-reload guarantee.
- **SC-007**: From any in-app view where the control is shown, a user with an active journal can reach it, live and editable, in one action (selecting the control), and never needs to open Quicknote/Scratchpad's Notes tab first. A user with no journal reaches the Start screen in one action and has a started journal in two, within SC-001's limit.
- **SC-008**: In testing, the global control shows the correct state 100% of the time across start, reload, end, and vault-switch sequences, and never differs from the Journal tab's own state.
- **SC-009**: While a journal is active, 100% of dice rolls, card draws and table results made through any of the paths in FR-026 appear in the journal exactly once, in the order they were made, in testing.
- **SC-010**: With no active journal, rolling, drawing and table rolls create 0 journal entries, start 0 journals, and show 0 new messages or errors, and behave identically to before this slice.
- **SC-011**: A new kind of capture source can be added by publishing one event through the shared interface, with 0 changes to the journal's store or view code, shown by a test that publishes an entry type the journal has never seen.
- **SC-012**: A capture failure never changes the outcome of the roll, draw or table result that caused it (0 cases in testing where a failed capture changes what the user sees from the tool).
- **SC-013**: A user can turn a single entry into a draft entity in three actions or fewer (choose "Make entity", optionally change the type, confirm).
- **SC-014**: After any promotion, the journal is identical to before it, in 100% of cases in testing, including when the entity could not be created.
- **SC-015**: Ending a session takes the same single action as before and none of the follow-up choices is required: in testing, a user who ignores them ends up with the ended journal and nothing else changed.
- **SC-016**: For every scope (entry, section, whole journal, chosen parts) the body produced is the expected text, in journal order, with no entry repeated, in 100% of test cases.

## Assumptions

- One active (non-ended) journal per vault at a time (FR-013): this matches the three-state control described in the source request (Start/Open/Resume implies a single current journal per vault, not a picker among several concurrent ones).
- "Browsable afterward" (an ended journal remains accessible) is satisfied by a simple list of past journals for the vault, reachable from the same Quicknote/Scratchpad entry point; a dedicated journal-history screen is not required for this slice and may be added later without changing the data model.
- No delete capability is included in this slice — the source request describes preserving journals, not removing them; deletion (if ever wanted) is a candidate for a future slice.
- "Vault/campaign context" scopes a journal to a vault, matching how Quicknote/Scratchpad and other vault-local data already work in this app; nothing in the source request suggests a journal should span multiple vaults or be campaign-scoped independent of the vault.
- Concurrent-tab writes are expected to be rare and low-stakes for a single-user local app; last-write-wins at the individual entry level (FR-011) is an acceptable, simple guarantee rather than building conflict resolution for this slice.
- Cloud backup inclusion (FR-016) covers the GM's own personal cloud backup/restore only, whole-journal (not per-entry incremental sync) — matching how maps and canvases are already backed up. Per-entry incremental backup uploads, if ever wanted, are a candidate for a future slice, not required here.
- Session journals are explicitly excluded from any player-facing or guest/shared vault export — the source request frames the journal as the GM's private record ("This is very much like how the Scratchpad works now"), and the app's existing guest-export path already filters vault content by player visibility, which a private GM journal has no meaningful value for.
- **Slice 2 assumptions (#3407)**:
  - "Global" means the app's shared tool chrome (the Activity Bar on desktop, the menu drawer on phones, both fed by `nav-items.ts`), which is present on every in-app route. It does not mean a floating widget or a new screen. The Quicknote/Scratchpad panel is already mounted once in the shared app layout, so reaching it from anywhere needs a control that opens it on the Journal tab, not a second panel.
  - Selecting the control in the "Start" state opens the Start screen instead of creating a journal directly. There is no delete in this journal (see the first assumption block), so an accidental one-click start would leave a permanent empty journal in history.
  - The panel stays a modal overlay as in slice 1, so it covers the current view while open. A non-modal, docked journal that lets the user keep working underneath is a candidate follow-up, not part of this slice.
  - Unsent draft text in the note field is not guaranteed to survive closing the panel. Saved entries are always persisted (FR-011); preserving drafts across close is a follow-up if real use shows it matters.
  - This slice adds no new keyboard shortcut. Ctrl/Cmd+I still toggles the panel as before.
  - This tab's control does not live-update when another browser tab starts or ends a journal; it is correct on reload or vault switch. Cross-tab live sync of the control is not required.
- **Slice 3 assumptions (#3408)**:
  - The app already funnels dice rolls, table rolls, deck draws, Oracle chat rolls and stat sheet field rolls through one place, the shared roll history (`DiceHistoryStore.addResult`), so capture is triggered once from there, not separately in each tool. Anything that records a result there is captured; anything that does not is out of scope until it does.
  - Rolls in the solo Adventure mode's own roll prompt, and in the map (VTT) view, do not go through the shared roll history today and are therefore not captured in this slice. Capturing them is a follow-up (they would publish through the same interface).
  - Capture is always on while a journal is active. There is no per-source switch or setting in this slice; if real use shows too much noise, a filter is a follow-up.
  - Each re-rolled part of a table result is a real result the user got, so it is captured as its own entry.
  - Captured entries are read-only like all entries (no editing or deleting individual entries exists in this journal).
  - The entry summary text is written in English like the rest of the interface; it is built from the result and does not depend on the tool's own display text.
  - An event published for one vault could in theory arrive just after the user switches vaults. That window is very small, and such an event is added to whichever journal is active for the vault now open. Stamping events with a vault id is a follow-up if it ever matters.
  - Captured data stays in the browser, in the same journal record as typed notes. Nothing new leaves the device; cloud backup behaves as in slice 1 (FR-016).
  - Live check finding (slice 2, T054): the Map (VTT) view has its own layout with no shared tool chrome, so the Session Journal control is not reachable from there. This follows FR-018 (the control lives in the shared chrome) but is a real gap for play at the table; a way to open the journal from the VTT is a candidate follow-up. Rolls made in that view are not captured either way (see the slice 3 assumptions).
- Live check (slice 3, T076): the dice roller, a table roll and the Oracle `/roll` command were captured with the panel closed; a typed note kept its place among them; ending the journal stopped capture with no error or message; and everything persisted across a reload. The deck-draw path could not be tried live because the test vault has no deck, so it is covered by unit and end-to-end tests only. The roller ignores rapid repeat clicks while it animates, so a live burst was not possible; burst ordering is covered by tests.
- **Slice 4 assumptions (#3409)**:
  - "Prefill the entity-creation form, then edit before saving" is met by the app's existing draft flow, the same one Quicknote uses to turn a note into an entity: the entity is created as a draft with the text filled in, opened for the user to edit, and only becomes part of the finished vault when they approve it. No separate creation form is built. The small form in this slice only picks the type and name.
  - A chosen set of entries and sections becomes one combined entity, not one entity per part. To get several entities the user repeats the action. This reads the issue's "promote selected sections/entries" as one action over the selection.
  - The entity types offered are the categories the vault already has (Note, Character, Creature, Location, Item, Event, Faction, plus any the user added). This slice creates no new categories.
  - The default name is the entry's first line cut at a word boundary (about 60 characters), the section's name, or the journal's title; the user can change it.
  - The body is plain text with simple headings. Times are shown in the user's local time when the entity is made. Nothing is extracted or summarised by AI (a follow-up in the parent issue).
  - The journal does not remember that something was turned into an entity: no badge, link or duplicate warning on the entry. That is a possible follow-up.
  - The draft's back-reference records only where it came from; nothing in the app reacts to it in this slice.
  - Cloud backup treats the new draft like any other entity; no journal or backup changes are needed.
  - Layout: the scratchpad is a fixed-height panel, so the whole-journal, choose-parts and per-section controls sit behind a small "Make entity" toggle beside the journal title; the per-entry "Make entity" buttons are always visible. Opening the form hides the past-journals list to give it room.
  - Wording: "promote" is the internal and spec term. In the interface the buttons read "Make entity", "Turn journal into a Note" and "Choose parts", and the post-end offer reads "Turn into a Note".
  - Live check (slice 4, T097): an entry became an Event draft, a section a Location draft, the whole journal a Note draft, and chosen parts one combined draft, each with the expected text, status and back-reference and each then discarded; the journal was unchanged afterwards and after a reload; ending a session showed the offer with Start still available and no dialog; a past journal offered the same choices; a keyboard-only pass (Enter to open, Escape to cancel) worked and returned focus. The live check found and fixed: Escape also closing the scratchpad; focus not returning after the controls were replaced; a cramped entry list; and the journal view not using the panel's full width. Blank names and the empty-journal, empty-section and empty-selection cases are covered by tests only.
