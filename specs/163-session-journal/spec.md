# Feature Specification: Session Journal (data model, persistence & lifecycle)

**Feature Branch**: `163-session-journal`
**Created**: 2026-09-25
**Status**: Draft
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

### Edge Cases

- What happens when the user tries to add a note but no journal has ever been started for the vault? The control must offer "Start Session Journal" rather than exposing a note field with nothing to attach it to.
- What happens when the user renames a section to an empty or whitespace-only name? The rename is rejected and the section keeps its previous name.
- What happens when the vault has more than one past (ended) journal? All of them remain individually accessible; none are overwritten or merged.
- What happens when the user tries to end a journal that has zero entries? Ending is still allowed — an empty session is a valid (if unusual) outcome and must not be blocked.
- What happens when two browser tabs have the same vault open and both try to add to the same active journal? The later write must not silently discard the earlier one (see FR-011).
- What happens to a journal when the GM shares a player-facing/guest view of the vault? Nothing — a journal is the GM's own record and MUST NOT appear in a guest or player-facing export, only in the GM's own cloud backup (see FR-016).

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

### Key Entities

- **SessionJournal**: A single vault's ongoing or completed play-session record. Holds an identifier, the vault it belongs to, a title, when it was started and (if applicable) ended, its status (active or ended), an ordered list of optional sections, and an ordered list of entries.
- **JournalSection**: An optional, user-named grouping within a journal (e.g. a chapter or scene) that entries can be associated with. A journal may have zero, one, or many sections.
- **JournalEntry**: One timestamped item within a journal — in this slice, always a manually-written note. Carries an identifier, a timestamp, a type (allowing future automatically-captured types to coexist without changing the shape), its content, and room for an optional reference to where it came from (used only by later slices).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can go from "no journal" to having their first note recorded in the journal in three actions or fewer (e.g. start journal → focus note field → submit).
- **SC-002**: 100% of entries and sections added to a journal are still present, in the same order, after an app reload or after resuming an unfinished journal.
- **SC-003**: A user can distinguish, without hesitation, which control (Quicknote/Scratchpad vs. Session Journal) they are looking at and what each is for, in an unmoderated first-use check.
- **SC-004**: Ending a session and starting a new one never mixes content between the two — 0% cross-contamination of entries between a closed journal and its successor in testing.
- **SC-005**: A GM running a multi-hour session can add entries throughout without the journal's presence measurably slowing down any other part of the app they are using at the same time.
- **SC-006**: For a vault with cloud backup enabled, 100% of a journal's entries and sections are present and in the same order after a restore into a new vault, matching SC-002's local-reload guarantee.

## Assumptions

- One active (non-ended) journal per vault at a time (FR-013): this matches the three-state control described in the source request (Start/Open/Resume implies a single current journal per vault, not a picker among several concurrent ones).
- "Browsable afterward" (an ended journal remains accessible) is satisfied by a simple list of past journals for the vault, reachable from the same Quicknote/Scratchpad entry point; a dedicated journal-history screen is not required for this slice and may be added later without changing the data model.
- No delete capability is included in this slice — the source request describes preserving journals, not removing them; deletion (if ever wanted) is a candidate for a future slice.
- "Vault/campaign context" scopes a journal to a vault, matching how Quicknote/Scratchpad and other vault-local data already work in this app; nothing in the source request suggests a journal should span multiple vaults or be campaign-scoped independent of the vault.
- Concurrent-tab writes are expected to be rare and low-stakes for a single-user local app; last-write-wins at the individual entry level (FR-011) is an acceptable, simple guarantee rather than building conflict resolution for this slice.
- Cloud backup inclusion (FR-016) covers the GM's own personal cloud backup/restore only, whole-journal (not per-entry incremental sync) — matching how maps and canvases are already backed up. Per-entry incremental backup uploads, if ever wanted, are a candidate for a future slice, not required here.
- Session journals are explicitly excluded from any player-facing or guest/shared vault export — the source request frames the journal as the GM's private record ("This is very much like how the Scratchpad works now"), and the app's existing guest-export path already filters vault content by player visibility, which a private GM journal has no meaningful value for.
