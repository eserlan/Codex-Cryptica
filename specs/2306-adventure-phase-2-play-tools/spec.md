# Feature Specification: Oracle Adventure Mode — Phase 2: Play Tools & Session Control

**Feature Branch**: `2306-adventure-phase-2-play-tools`
**Created**: 2026-08-17
**Status**: Draft
**Input**: User description: "Oracle Adventure Mode — Phase 2: Play Tools & Session Control, per the roadmap's Phase 2 bullets (specs/roadmap.md), building on the Phase 1 Solo Adventure Foundation (specs/160-solo-adventure-mode, shipped via PR #2311)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Manage the Adventure Archive (Priority: P1)

As a returning player with several completed adventures, I want to rename, duplicate, search, and delete archived adventures, so that my archive stays organized and I can find or reuse a specific past session without it becoming clutter.

**Why this priority**: Phase 1 explicitly deferred archive management beyond a simple read-only list ("Out of Scope: ... archive management beyond listing and reading player-facing transcripts"). This is the most concrete, most requested gap once players accumulate more than a couple of sessions, and it does not depend on any other Phase 2 capability.

**Independent Test**: With three or more archived adventures in a vault, rename one, duplicate another, search the archive by title/premise text, and delete the least useful one — verify the archive list reflects each change immediately and no other archived or active adventure is affected.

**Acceptance Scenarios**:

1. **Given** an archived adventure, **When** the user renames it, **Then** the new title is saved and displayed everywhere the adventure is listed, without altering its transcript or state.
2. **Given** an archived adventure, **When** the user duplicates it, **Then** a new, independent archived adventure is created with the same transcript, visible state, hidden GM state, and source references, and editing or deleting the duplicate never affects the original.
3. **Given** an archive with multiple adventures, **When** the user searches by title or premise text, **Then** the list filters to matching adventures without deleting or reordering the underlying archive.
4. **Given** an archived adventure the user no longer wants, **When** they delete it, **Then** it is permanently removed from the archive and the action requires an explicit confirmation step.
5. **Given** a user wants to keep playing a duplicated or archived adventure, **When** they explicitly resume it, **Then** it becomes the vault's one effective active adventure, following the same single-active-adventure rule established in Phase 1 (offering to continue or end the current active adventure first, if one exists).

---

### User Story 2 - Recap, Inspect, and Correct Session State (Priority: P1)

As a player returning to an adventure after a break, I want a quick recap and a way to view and correct the current visible state, so that I can reorient myself and fix a mistaken fact without abandoning the session.

**Why this priority**: The Phase 2 progression gate calls out "friction observed in Phase 1 play" and "state-correction needs" as the driver for this phase. Without a correction path, a single bad model turn (a misremembered detail, a name typo) permanently pollutes an otherwise good session with no recourse besides ending it.

**Independent Test**: Resume an adventure with an established location, objective, and known NPC; request a recap and verify it reflects the current committed visible state; then correct one visible fact (e.g., an NPC's name) and verify subsequent turns use the corrected fact and the correction is itself an auditable, committed change.

**Acceptance Scenarios**:

1. **Given** an active adventure with committed turns, **When** the user requests a recap, **Then** the system presents a concise, accurate summary built only from committed player-visible state and transcript, never from owner-hidden GM state.
2. **Given** an active adventure, **When** the user opens visible-state inspection, **Then** they see the current location, objectives, active characters, known facts, and relationships as currently committed, in a read-first view distinct from the narration transcript.
3. **Given** a visible-state fact is wrong or stale, **When** the user issues an explicit correction, **Then** the correction is committed as an auditable change, subsequent Oracle turns treat the corrected fact as current, and the pre-correction turns in the transcript are left intact rather than rewritten.
4. **Given** the user attempts to correct owner-hidden GM state, **When** they do so through the play surface, **Then** the correction is scoped to the player-visible state only in Phase 2 — the play surface does not expose a general hidden-state editor.
5. **Given** a correction is submitted while a model turn is still generating, **When** the generation completes, **Then** the correction and the in-flight turn do not silently overwrite each other; the user is able to tell which change won and retry if needed.

---

### User Story 3 - Track Rolls and Lightweight Resources (Priority: P2)

As a player who wants a bit more structure without a full rules engine, I want optional dice presets, a roll history, and simple named resource counters, so that I can track things like ammo, favor, or a countdown clock across turns.

**Why this priority**: This adds convenience and light structure on top of the Phase 1 roll handoff, but the adventure is fully playable without it — it is additive polish rather than a blocking capability, matching the roadmap's framing ("without turning the mode into a mandatory rules engine").

**Independent Test**: Configure two dice presets and roll each at least once; verify both appear in a roll-history view with their outcome; separately, create a named resource counter, adjust its value during play, and verify the adjusted value persists across a reload.

**Acceptance Scenarios**:

1. **Given** an active adventure, **When** the user saves a dice preset (e.g., a labeled expression), **Then** it is available for reuse on a later pending roll without redefining it each time.
2. **Given** one or more resolved rolls in the session, **When** the user opens roll history, **Then** they see each roll's expression, outcome bands (when used), and result in chronological order.
3. **Given** an active adventure, **When** the user creates a named resource counter and adjusts its value, **Then** the current value is persisted with the adventure and restored after a reload, independent of any specific game system's rules.
4. **Given** no resource counters have been created, **When** the user plays normally, **Then** nothing about resource tracking is required or shown, preserving the system-light default.

---

### User Story 4 - Keep Long Sessions Grounded and Leak-Free (Priority: P3)

As a player running a long-running adventure, I want context pinning and hidden-information handling to keep working correctly as the transcript grows, so that long sessions stay coherent and secrets don't leak once summarisation kicks in.

**Why this priority**: This hardens Phase 1 guarantees under a load condition Phase 1's 30-turn acceptance profile did not stress (long sessions with bounded context). It is important for session longevity but does not unlock new player-facing capability on its own, so it is lower priority than the tools players directly ask for.

**Independent Test**: Play a scripted session long enough to trigger transcript summarisation while a hidden secret is planted early; verify the pinned source anchors and un-revealed secret both remain correctly excluded from player-facing surfaces after summarisation, and the summary itself never contains hidden content.

**Acceptance Scenarios**:

1. **Given** an adventure transcript long enough to exceed the bounded context window, **When** the system summarises older turns for context, **Then** the summary omits owner-hidden GM state entirely and does not degrade the accuracy of currently committed visible state.
2. **Given** explicitly pinned source records from adventure start, **When** many turns pass and summarisation occurs, **Then** those pinned anchors remain available to Oracle as continuing context rather than being dropped by summarisation.
3. **Given** a hidden secret was planted many turns ago and never fictionally revealed, **When** summarisation and later turns occur, **Then** the secret still never appears in narration, recap, visible state, or roll requests.

### Edge Cases

- The user renames an archived adventure to an empty or whitespace-only title.
- The user duplicates an adventure that is itself a read-only recovery conflict from Phase 1's external-restore handling.
- The user searches the archive with a query matching zero adventures.
- The user attempts to resume an archived adventure while a different adventure is already active.
- The user submits a visible-state correction and a new player action in rapid succession.
- A resource counter is adjusted to a negative or extreme value with no game-system rule to validate it.
- Roll history grows very large over a long-running adventure.
- Transcript summarisation is triggered while a roll is still pending.
- The application is offline when the user requests a recap, correction, duplicate, or delete.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to rename an archived adventure without altering its transcript, visible state, hidden state, or source references.
- **FR-002**: Users MUST be able to duplicate an archived (or active) adventure into a new, independent adventure record that copies transcript, visible state, hidden GM state, and source references; changes to either copy afterward MUST NOT affect the other.
- **FR-003**: Users MUST be able to search or filter the adventure archive by title and premise text without mutating the archive.
- **FR-004**: Users MUST be able to permanently delete an archived adventure after an explicit confirmation step.
- **FR-005**: Users MUST be able to explicitly resume an archived (or duplicated) adventure as the vault's active adventure, subject to the same single-effective-active-adventure rule and continue/end offer established in Phase 1.
- **FR-006**: The system MUST provide an on-demand recap of the active adventure built only from committed player-visible state and transcript, and MUST NOT draw on owner-hidden GM state.
- **FR-007**: The system MUST provide a visible-state inspection view showing the current committed location, objectives, active characters, known facts, and relationships, separate from the narration transcript.
- **FR-008**: Users MUST be able to submit an explicit correction to one or more player-visible state fields; the correction MUST be committed as an auditable change and MUST NOT rewrite prior transcript entries.
- **FR-009**: The play surface MUST NOT expose an editor for owner-hidden GM state in Phase 2; corrections are scoped to player-visible state only.
- **FR-010**: The system MUST prevent a correction and a concurrently in-flight model turn from silently overwriting one another, and MUST make it clear to the user which change was committed.
- **FR-011**: Users MUST be able to save and reuse named dice presets across pending rolls within an adventure.
- **FR-012**: The system MUST maintain a chronological roll history for an adventure, including each roll's expression, stated outcome bands when used, and recorded result.
- **FR-013**: Users MUST be able to create, adjust, rename, and remove named, system-agnostic resource counters scoped to an adventure; the system MUST NOT apply any specific game system's rules to these values.
- **FR-014**: Resource counters and roll history MUST be entirely optional; an adventure with none configured MUST behave exactly as in Phase 1.
- **FR-015**: When transcript length requires bounded summarisation for context, the summary MUST exclude owner-hidden GM state and MUST NOT reduce the accuracy of the currently committed player-visible state supplied to Oracle.
- **FR-016**: Explicitly pinned source record anchors from adventure start MUST remain available as continuing context through summarisation, consistent with the Phase 1 anchor guarantee.
- **FR-017**: Owner-hidden GM state that has not been fictionally revealed MUST remain excluded from narration, recap, visible-state inspection, and roll requests regardless of transcript length or summarisation.
- **FR-018**: All Phase 2 archive-management, recap, inspection, correction, dice-preset, roll-history, and resource-tracking actions MUST be available offline against the last committed adventure state, deferring only model-dependent operations (such as a recap that requires new generation, if any) until reconnection.

### Key Entities

- **Adventure Recap**: A generated, player-visible summary of an adventure's current situation, built only from committed visible state and transcript. Not persisted as canon; regenerated on request.
- **State Correction**: An explicit, user-initiated, committed change to one or more player-visible state fields, auditable separately from ordinary Oracle-proposed turn changes and never applied to owner-hidden GM state through the play surface.
- **Dice Preset**: A user-named, reusable dice expression a player can attach to a pending roll instead of re-specifying it each time.
- **Roll History Entry**: A record of one resolved roll's expression, outcome bands (if used), and result, retained in chronological order with the adventure.
- **Resource Counter**: A user-named, numeric, system-agnostic value scoped to an adventure (e.g., ammo, favor, a countdown), adjustable during play and persisted with the session.
- **Archive Search Query**: An ephemeral, client-side filter over archived adventures' titles and premises; does not mutate the archive.

### Assumptions

- Duplicating an adventure produces a full deep copy (transcript, visible state, hidden state, source references) rather than a fresh session seeded only from the premise, since the primary use case is "replay/branch from here," not "start a similar new adventure" (the latter is already served by starting a fresh adventure).
- State correction in Phase 2 is scoped to player-visible state only; a hidden-state editor remains out of scope, consistent with Phase 1's explicit deferral and the constitution's requirement to keep GM-only state out of the play surface.
- Resource counters are simple named numeric values with no unit, formula, or validation semantics attached — any meaning (ammo, HP, favor) is the player's own bookkeeping, not a rules feature.
- Dice presets and roll history are additive to Phase 1's roll handoff (Oracle still states uncertainty/stakes/expression before a roll); presets do not change when Oracle decides a roll is warranted.
- Recap and visible-state inspection are read views; they do not themselves advance or commit adventure state.
- "Search" is a simple client-side text filter over already-loaded archive metadata, not a new indexing or full-text search subsystem.
- Performance criteria use the same standard release acceptance profile as Phase 1: a current stable supported browser on a device or CI worker with at least four logical CPU cores and 8 GB of memory, using a warmed production build and representative data.

### Out of Scope

- A general owner-hidden GM state editor or secrecy-boundary changes (still deferred, pending later permissions work per the roadmap's Phase 5 gate).
- A full rules engine, automated combat/initiative, or character-sheet calculations tied to a specific game system.
- Generator-specific **Play with Oracle** entry points (Phase 3) and saving discoveries into canonical vault records (Phase 4).
- Multiplayer, guest players, or human GM/co-GM workflows (Phase 5).
- Server-side or cross-device full-text search; archive search remains local to the open vault.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In an archive of at least 10 adventures, a user can locate a specific adventure by search, rename it, and duplicate it, each in under 10 seconds of non-model time.
- **SC-002**: 100% of tested rename, duplicate, and delete operations on one archived adventure leave every other archived and active adventure byte-for-byte unchanged.
- **SC-003**: In a scripted resume-after-break test, the recap accurately reflects 100% of the currently committed visible-state facts and contains zero owner-hidden GM state canaries across a representative secret-bearing test set.
- **SC-004**: In a scripted correction test, 100% of submitted visible-state corrections are reflected in the very next Oracle turn, and 0% of prior transcript entries are altered by the correction.
- **SC-005**: In a concurrent correction/in-flight-turn test, 100% of runs leave the session in a state where the user can identify which change was committed, with no silently dropped correction or turn.
- **SC-006**: In a long-session summarisation test exceeding the bounded context window, 0% of test runs show a hidden-state canary or a pinned-anchor drop after summarisation.
- **SC-007**: An adventure with zero configured dice presets or resource counters behaves identically (turn-for-turn) to the same scripted session run against the Phase 1 build.
- **SC-008**: 100% of archive-management, recap, inspection, correction, preset, roll-history, and resource actions in a scripted offline test complete against locally committed state without requiring network access.
