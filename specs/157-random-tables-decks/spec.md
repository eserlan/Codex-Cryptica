# Feature Specification: Random Roll Tables and Custom Card Decks

**Feature Branch**: `157-random-tables-decks`
**Created**: 2026-08-14
**Status**: Draft
**Input**: Community request (GitHub issue #2247, originating from Discord): "Even if you're not a solo player, sometimes a GM needs to randomly roll on a table to find out what terrifying creature the witless adventurers encounter next. A table system would be good with the option for also rolling on sub tables or cross-tables… In addition to tables, there are also random card drawing. Many RPG systems use the random choice of cards for various options and the option to import custom cards and randomly draw them would be a welcome addition for the solo player."

## Overview

Game masters and solo players keep collections of random content — encounter tables, loot tables, name lists, complication decks, oracle decks, Tarot-style decks — and consult them mid-session to answer "what happens next?". Today they keep these outside Codex Cryptica, in PDFs, spreadsheets, or third-party sites, which breaks the flow between the world they have built here and the improvisation happening at the table.

This feature makes random tables and card decks first-class, user-authored content inside the vault: authored and edited in the app, rolled or drawn in one action, resolvable into composed results through nested references, and importable in bulk so nobody has to hand-type a hundred rows.

## Clarifications

### Session 2026-08-14

- Q: How should a brace reference like `{creature}` bind to its target Random Source? → A: Random Source names are unique per vault; references resolve by name at roll time.
- Q: Can references target decks, and can card text contain references? → A: Both. A deck reached through a reference is always sampled with replacement and is never depleted; only explicit draws deplete a deck.
- Q: How should deck draw state behave across two synced devices? → A: The question was based on a false premise and is withdrawn. There is no live cross-device sync — Google Drive is an explicit whole-vault push on one device and pull on another, so two devices never hold the same deck concurrently. Deck state is ordinary vault content and needs no merge rule.
- Q: Can one table mix weighted entries and explicit-range entries? → A: No. A table is in exactly one selection mode — weighted or ranged — chosen per table and convertible either way.
- Q: Is SC-010 (90% of table authors roll in the same session) measurable? → A: No. In-app analytics do not exist by design, so SC-010 is replaced with a design-verifiable discoverability criterion.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Author and roll a simple table (Priority: P1)

A GM creates a table called "Forest Encounters" with twenty entries, some weighted more heavily than others. Mid-session, they open the table and roll it. A single result appears, along with the die roll that produced it, and the roll is recorded in their roll history so they can refer back to it later in the session.

**Why this priority**: This is the minimum viable product. A flat table that can be authored and rolled delivers the core value on its own — everything else in this spec makes it faster or richer, but a GM with one working table already has something they would use at the table tonight.

**Independent Test**: Create a table with several entries, roll it repeatedly, and confirm results are drawn across the full range of entries with weighting respected, that the rolled die value is shown, and that each roll appears in roll history.

**Acceptance Scenarios**:

1. **Given** an empty vault, **When** the user creates a table, names it, and adds entries, **Then** the table is saved and appears in their list of tables.
2. **Given** a saved table with equal-weight entries, **When** the user rolls it, **Then** exactly one entry is returned and the underlying die value is shown alongside the result.
3. **Given** a table whose entries carry ranges or weights, **When** the user rolls it many times, **Then** results appear in proportion to the configured weights.
4. **Given** a completed roll, **When** the user opens their roll history, **Then** the roll appears there with the table name, the die value, and the result text.
5. **Given** the user is offline, **When** they roll a table, **Then** the roll completes normally with no degradation and no network request.
6. **Given** an existing table, **When** the user edits, reorders, or deletes entries, **Then** subsequent rolls reflect the change immediately.

---

### User Story 2 - Nested tables and composed results (Priority: P1)

The GM's "Forest Encounters" table contains the entry `A {creature} guarding {treasure}`. Rolling it resolves the `creature` and `treasure` references against their own tables and returns one composed sentence: "A moss-backed troll guarding a waterlogged coin hoard." The GM can see which sub-tables contributed which fragments.

**Why this priority**: This is what separates a usable table system from a list of strings, and it is the single capability the original request called out by name. A flat-table-only release would be shipped as an MVP, but this is the first thing users would ask for next.

**Independent Test**: Create three tables where one references the other two, roll the parent, and confirm a single composed result is produced with every reference resolved and the contributing sub-rolls visible.

**Acceptance Scenarios**:

1. **Given** a table entry that references another table, **When** the parent table is rolled, **Then** the reference is replaced by a result rolled from the referenced table.
2. **Given** a table entry with multiple references in one sentence, **When** it is rolled, **Then** every reference resolves and the result reads as one continuous piece of text.
3. **Given** a nested roll of any depth, **When** the user views the result, **Then** they can see the full resolution chain — which table produced which fragment — and not only the final string.
4. **Given** a table that references itself directly or through a cycle, **When** it is rolled, **Then** the roll terminates safely, produces a usable result, and the user is told that a reference loop was cut short rather than being shown an error page or a frozen screen.
5. **Given** a table entry referencing a table that does not exist or has been deleted, **When** it is rolled, **Then** the result is still produced with the unresolved reference clearly marked, and the user is told which reference is broken.
6. **Given** a resolution chain that exceeds the supported nesting depth, **When** the roll runs, **Then** resolution stops at the limit and the user is informed rather than the roll failing silently.

---

### User Story 3 - Import tables in bulk (Priority: P2)

The GM already has a d100 encounter table written in a spreadsheet and another pasted from a PDF. They paste both into an import view, see a preview of how the rows were interpreted, correct the range column mapping on one of them, and save both as tables.

**Why this priority**: Hand-entering a hundred rows is the adoption killer for this feature. Most users arrive with tables they already own. Without import, the authoring cost means many users never get to the payoff — but import is only valuable once authoring and rolling exist, so it follows the first two stories.

**Independent Test**: Paste tabular content in each supported format, confirm the preview shows the rows and ranges correctly, adjust the mapping, save, and roll the resulting table.

**Acceptance Scenarios**:

1. **Given** pasted plain text with one entry per line, **When** the user imports it, **Then** each line becomes an equal-weight entry.
2. **Given** pasted comma- or tab-separated content with a range column and a result column, **When** the user imports it, **Then** ranges are recognised and applied as weights.
3. **Given** pasted Markdown table syntax, **When** the user imports it, **Then** the header row is recognised and the data rows become entries.
4. **Given** any import, **When** the user reaches the preview step, **Then** they can see how every row was interpreted and correct the column mapping before saving.
5. **Given** an import containing rows that cannot be interpreted, **When** the preview is shown, **Then** those rows are flagged individually and the user can fix, skip, or accept them without abandoning the whole import.
6. **Given** an import that would produce a table with the same name as an existing one, **When** the user saves, **Then** they are asked whether to replace, merge, or save under a new name.

---

### User Story 4 - Card decks with a persistent discard pile (Priority: P2)

A solo player sets up a deck of fifty-two "complication" cards. During a session they draw three cards. Those three cards do not come back until the deck is reset, and when they close the app and return the next evening, the deck still knows which cards are gone.

**Why this priority**: Card draws are a distinct play pattern — depletion changes the odds as a session progresses, which is the whole point of drawing rather than rolling — and the request names it explicitly. It sits below tables because tables serve the larger audience, but this delivers standalone value to solo players.

**Independent Test**: Create a deck, draw without replacement until several cards are gone, reload the application, and confirm the discard pile survived; then reset and confirm the full deck returns.

**Acceptance Scenarios**:

1. **Given** an empty vault, **When** the user creates a deck and adds cards with a title and body text, **Then** the deck is saved and appears in their list of decks.
2. **Given** a deck, **When** the user draws one or more cards at once, **Then** the drawn cards are shown together as a single draw.
3. **Given** drawing without replacement, **When** cards are drawn, **Then** they move to the discard pile and cannot be drawn again until the deck is reset.
4. **Given** a partially depleted deck, **When** the user closes and reopens the application, **Then** the remaining deck and the discard pile are exactly as they were left.
5. **Given** an exhausted deck, **When** the user attempts to draw, **Then** they are told the deck is empty and offered a reshuffle rather than receiving a blank result.
6. **Given** a depleted deck, **When** the user shuffles or resets it, **Then** all discarded cards return and the deck is randomised.
7. **Given** drawing with replacement is selected, **When** cards are drawn repeatedly, **Then** the same card may be drawn again and the discard pile is not used.

---

### User Story 5 - Rich card decks: images, reversals, and spreads (Priority: P3)

The solo player imports a custom oracle deck: seventy-eight cards with artwork, each with an upright and a reversed meaning. They draw a three-card spread into named positions — Situation, Complication, Outcome — and read the result as a layout rather than a list.

**Why this priority**: These capabilities serve a smaller but highly engaged audience (Tarot-driven and oracle-driven solo play). They are meaningful polish on top of a working deck system rather than a prerequisite for it.

**Independent Test**: Bulk-import a deck with card images and dual meanings, draw a named spread, and confirm each position shows the correct card, orientation, and corresponding meaning.

**Acceptance Scenarios**:

1. **Given** a batch of card data and card images, **When** the user imports them, **Then** cards are created with their images attached and matched to the right card.
2. **Given** a deck configured for reversals, **When** cards are drawn, **Then** each card has an orientation and the meaning shown corresponds to that orientation.
3. **Given** a deck not configured for reversals, **When** cards are drawn, **Then** no orientation is shown and only the single meaning appears.
4. **Given** a defined spread with named positions, **When** the user draws that spread, **Then** exactly one card fills each position and each position label is shown with its card.
5. **Given** a spread requesting more cards than remain in the deck, **When** the user draws it, **Then** they are warned before the draw and offered a reshuffle.

---

### User Story 6 - Roll from anywhere mid-session (Priority: P3)

Mid-session, without leaving the conversation they are having with the Oracle, the GM types a command to roll a table by name and gets the result inline in the chat.

**Why this priority**: A convenience multiplier on capabilities delivered by earlier stories. It matters for real table use — a GM will not navigate a UI mid-sentence — but it is not required for the feature to deliver value.

**Independent Test**: From the Oracle chat, invoke a table by name and confirm the result appears inline in the conversation and in roll history, identical to rolling from the table's own view.

**Acceptance Scenarios**:

1. **Given** an existing table, **When** the user rolls it by name from the Oracle chat, **Then** the result appears as a message in the conversation.
2. **Given** an existing deck, **When** the user draws from it by name from the Oracle chat, **Then** the drawn card appears as a message and the deck's discard pile updates.
3. **Given** a name that matches no table or deck, **When** the user invokes it, **Then** they receive a clear message naming close matches rather than a silent failure.
4. **Given** a roll or draw made from chat, **When** the user checks roll history, **Then** it appears there alongside rolls made from the table's own view.

---

### Edge Cases

- **Empty table or deck**: rolling a table with no entries, or drawing from a deck with no cards, tells the user the source is empty and offers to add entries rather than returning a blank result.
- **Single-entry table**: rolls successfully and always returns that entry.
- **Reference cycles**: a table that references itself, or A→B→A, terminates safely at the depth limit with a result and a visible notice.
- **Very large tables**: a table with thousands of entries remains usable for authoring, editing, and rolling.
- **Ranges that do not cover the die**: gaps or overlaps in a range column are detected when the table is saved and the user is told which values are unreachable or ambiguous.
- **Malformed reference syntax**: an unclosed or empty reference is treated as literal text and flagged in the editor rather than silently swallowed.
- **Renaming a referenced table**: existing references to the old name are reported so the user can update or accept them.
- **Deleting a referenced table**: the user is warned which tables reference it before deletion proceeds.
- **Concurrent draws**: two rapid draws from the same deck never return the same card twice when drawing without replacement.
- **Repeatedly re-rolling a fragment backed by a deck**: because referenced deck draws are non-depleting (FR-012a), re-rolling the same fragment many times may repeat a card and never exhausts the deck or alters its discard pile.
- **Storage exhaustion during card image import**: the import fails cleanly with a message, leaving the deck in a consistent state rather than half-imported.
- **Offline**: all authoring, rolling, drawing, importing, and resetting work with no network connection.

## Requirements _(mandatory)_

### Functional Requirements

#### Content model and authoring

- **FR-001**: Users MUST be able to create, rename, edit, duplicate, and delete random tables and card decks within a vault.
- **FR-002**: The system MUST store tables and decks as vault content, so they are saved, exported, backed up, and synced by the same mechanisms as the user's other vault content.
- **FR-003**: Tables and decks MUST be browsable and searchable by name and by their content.
- **FR-003a**: Random Source names MUST be unique within a vault. The system MUST prevent a user from saving a table or deck under a name already in use and offer a non-colliding alternative.
- **FR-004**: A table MUST be in exactly one selection mode: **weighted**, where each entry carries a weight defaulting to 1 and the die is derived from the total; or **ranged**, where the table carries an explicit die specification and each entry carries a numeric range over it. A single table MUST NOT mix weighted and ranged entries.
- **FR-004a**: Users MUST be able to convert a table between selection modes. Converting weighted → ranged assigns contiguous ranges proportional to the weights; converting ranged → weighted assigns each entry a weight equal to the width of its range.
- **FR-005**: In weighted mode the die specification MUST be derived automatically from the entries; in ranged mode the user MUST set it explicitly.
- **FR-006**: For tables in ranged mode, the system MUST validate range coverage when the table is saved and report gaps, overlaps, and unreachable entries to the user without blocking the save. Weighted-mode tables cannot have coverage gaps and are exempt.
- **FR-007**: A deck MUST support cards consisting of a title, body text, an optional image, and an optional second meaning used when the card is drawn reversed.
- **FR-008**: Users MUST be able to reorder, edit, and remove individual entries and cards after creation.
- **FR-009**: Tables and decks MUST be organisable — at minimum groupable or taggable — so users with many of them can find the one they need mid-session.

#### Rolling and resolution

- **FR-010**: Users MUST be able to roll a table from the table's own view and receive exactly one result per roll.
- **FR-011**: The system MUST show the die value that produced each result alongside the result itself.
- **FR-012**: Table entries and card body text MUST be able to reference other Random Sources, and the system MUST resolve those references by rolling or sampling the referenced source.
- **FR-012a**: A reference MAY name a deck. A deck reached through a reference MUST be sampled with replacement regardless of the deck's own draw mode, so resolving a reference never moves a card to the discard pile and never mutates deck state. Only an explicit draw (FR-021) depletes a deck.
- **FR-013**: The system MUST support multiple references within a single entry, resolving each and composing them into one continuous result.
- **FR-014**: Reference resolution MUST be cycle-safe: a self-reference or a reference loop MUST terminate, produce a usable result, and inform the user that resolution was cut short.
- **FR-015**: Reference resolution MUST be depth-limited, with the limit reported to the user when reached.
- **FR-016**: Unresolvable references (missing or deleted targets) MUST be preserved visibly in the result and reported, never silently dropped or replaced with empty text.
- **FR-017**: Users MUST be able to roll two or more tables together as one action and see the combined result presented as a single outcome.
- **FR-018**: Every roll MUST be recorded in roll history with the source name, the die value, the final result, and the full resolution chain of any nested rolls.
- **FR-019**: Users MUST be able to re-roll a result without re-entering the table, and to re-roll an individual fragment of a composed result without discarding the rest.
- **FR-020**: Rolling MUST require no network connection and no AI request.

#### Drawing

- **FR-021**: Users MUST be able to draw one or more cards from a deck in a single action.
- **FR-022**: Decks MUST support drawing with replacement and drawing without replacement, selectable by the user.
- **FR-023**: When drawing without replacement, drawn cards MUST move to a discard pile and be unavailable until the deck is shuffled or reset.
- **FR-024**: The discard pile and remaining deck state MUST persist across application restarts until explicitly reset.
- **FR-024a**: Deck state MUST travel with the vault, so pushing a vault to Google Drive and pulling it on another device carries the discard pile with it. No merge rule is required: transfer is an explicit whole-vault push and pull, never concurrent, so the pulled vault's deck state simply replaces the local one along with the rest of the vault.
- **FR-025**: Users MUST be able to shuffle or reset a deck, returning all discarded cards.
- **FR-026**: Drawing from an exhausted deck MUST inform the user and offer a reshuffle rather than returning an empty result.
- **FR-027**: Decks MUST optionally support reversed draws, with the orientation shown and the corresponding meaning displayed.
- **FR-028**: Users MUST be able to define named-position spreads and draw into them, with each position showing its label and its card.
- **FR-029**: Draws MUST be recorded in the same history as rolls, including which cards were drawn and in what orientation.
- **FR-030**: Drawing MUST require no network connection and no AI request.

#### Import

- **FR-031**: Users MUST be able to create a table by pasting plain text with one entry per line, producing a weighted-mode table with equal weights.
- **FR-032**: Users MUST be able to create a table by pasting delimited content (comma- or tab-separated) with a recognised range or weight column. A recognised range column MUST produce a ranged-mode table; a weight column MUST produce a weighted-mode table.
- **FR-033**: Users MUST be able to create a table by pasting Markdown table syntax.
- **FR-034**: The import flow MUST show a preview of the interpreted rows and allow the user to correct column mapping before saving.
- **FR-035**: Rows that cannot be interpreted MUST be flagged individually, and the user MUST be able to fix, skip, or accept them without abandoning the import.
- **FR-036**: Users MUST be able to bulk-import cards into a deck, including attaching card images.
- **FR-037**: When an import collides with an existing table or deck name, the user MUST be offered replace, merge, or save-as-new.
- **FR-038**: Import MUST require no network connection and no AI request.

#### Integration

- **FR-039**: Users MUST be able to roll a table or draw from a deck by name from the Oracle chat, with the result appearing inline in the conversation.
- **FR-040**: Invoking a name that matches no table or deck MUST return a clear message including close matches.
- **FR-041**: Users MUST be able to send a roll or draw result into entity creation or a generator as context, so an interesting result can become permanent world content.
- **FR-042**: Deleting or renaming a table that other tables reference MUST warn the user and identify the referencing tables before proceeding.

### Key Entities

- **Random Source**: The shared concept behind both features — a named, user-authored collection of possible results that lives in the vault and can produce one or more results on demand. It has a name, an optional description, organisational metadata, and a set of entries. Tables and decks are the two modes of a Random Source rather than two unrelated things; they differ in how results are selected and presented, not in how they are stored, imported, searched, or exported.
- **Table Entry**: One possible outcome in a table. Carries result text, an optional weight or numeric range, and zero or more references to other Random Sources embedded in its text.
- **Card**: One possible outcome in a deck. Carries a title, body text, an optional image, an optional reversed meaning, and zero or more references embedded in its text, resolved when the card is drawn.
- **Reference**: A pointer embedded in an entry's text naming another Random Source, resolved **by name** at roll time by rolling that source and substituting its result. References store the target's name rather than an internal identifier, so entry text stays readable in exports and portable through paste-import.
- **Deck State**: The per-deck record of what has been drawn and what remains, persisting between sessions until reset. Belongs to the deck within the vault rather than to a transient session, so it travels with the vault on export and on a Google Drive push/pull (FR-024a).
- **Spread**: A named set of positions a draw fills, each with a label describing that position's meaning.
- **Roll Record**: The record of one completed roll or draw, capturing the source, the die value or drawn cards, the final result, and the resolution chain of any nested rolls.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can create a working table from scratch and roll it for the first time in under two minutes.
- **SC-002**: A user can turn an existing table they already own — a spreadsheet, a pasted PDF excerpt, or a Markdown table of up to 100 rows — into a rollable table in under one minute, without editing more than three rows by hand.
- **SC-003**: Rolling a table, including one with nested references, returns a result fast enough to feel instantaneous mid-conversation at the table.
- **SC-004**: A table of 1,000 entries can be authored, edited, and rolled without the interface becoming sluggish.
- **SC-005**: 100% of rolls and draws complete successfully with the network disconnected.
- **SC-006**: No roll can hang or crash the application, including tables with self-references and reference cycles — verified by rolling deliberately cyclic tables.
- **SC-007**: After closing and reopening the application, a partially drawn deck reports exactly the same remaining cards and discard pile as before, in 100% of cases.
- **SC-008**: Over 1,000 rolls of a weighted table, observed result distribution matches the configured weights within normal statistical variance.
- **SC-009**: A user viewing a composed result can identify which sub-table produced each fragment without leaving the result view.
- **SC-010**: The path from authoring to payoff is discoverable without navigation: rolling a table is possible from within the table's own authoring view, so a user who has just added entries can roll them without leaving the screen they are on. (Replaces an earlier behavioural target of "90% of table authors roll in the same session", which the product cannot measure — analytics are wired only on marketing pages and deliberately never fire inside the app.)

## Assumptions

These decisions were made in the absence of explicit direction and should be confirmed during planning.

- **Decks and tables share one content model.** Issue #2247 raised this as an open question. This spec resolves it in favour of a shared "Random Source" model with two modes, because authoring, organising, searching, importing, exporting, and history are identical across both; only selection semantics (weighted roll vs. draw with depletion) and presentation (text vs. card with optional image) differ. Duplicating the model would duplicate the import and editor surfaces for no user-visible gain.
- **Tables and decks are vault content, but not lore entities.** They are stored and exported alongside the user's other vault content so they are portable and sync automatically, but they are excluded by default from the relationship graph and other views intended for world lore, because an encounter table is a tool the GM uses rather than a thing that exists in the world. They remain searchable and linkable.
- **Reference syntax is brace-delimited** (for example `{creature}`), matching common convention in existing table tools and remaining readable in exported files. Unmatched or empty braces are treated as literal text. References bind by name, which is why names are unique per vault (FR-003a); renaming a referenced source is handled by the warning in FR-042 rather than by silent rebinding.
- **The nesting depth limit is a fixed, generous constant** rather than a user setting — deep enough that no realistic table hits it, shallow enough to guarantee termination.
- **Deck state is per-deck and per-vault**, not per-campaign or per-session. A user wanting a fresh deck resets it explicitly. Per-session deck state is deferred until there is evidence users want the same deck depleted differently in parallel campaigns.
- **Cross-table rolling is a rolling mode over existing tables**, not a new stored artefact. Users select multiple tables to roll together at roll time; if saved multi-table rolls prove desirable, they can be added later as a table whose entry is purely references.
- **Card images are stored using the vault's existing asset handling**, inheriting its size limits and export behaviour.
- **Rolls and draws extend the existing roll history** rather than introducing a parallel history surface, so a GM has one chronological record of everything randomised during a session.
- **No AI involvement is required anywhere in this feature.** AI assistance in authoring table content (for example, generating entry ideas) is a plausible follow-up but is deliberately excluded here so the feature works fully offline.

## Out of Scope

- Scripting or expression languages of the kind Chartopia supports (arithmetic, variables, macros).
- Conditional logic — entries that appear only when a condition holds, or rolls branching on prior results.
- Shared or public table repositories, community table browsing, and table publishing.
- Importing directly from third-party table services via their APIs or URLs.
- AI generation of table or card content. Tracked as a later expansion in issue #2250, where generated rows would arrive as ordinary entries through the import preview rather than as a new content kind.
- Probability analysis tooling beyond validating range coverage.
- Per-campaign or per-session deck state isolation.
- **Guest access in a host/guest VTT session.** Tables and decks are host-only in this feature: they are not published into the guest vault snapshot, and guests cannot roll or draw. This is a deliberate deferral, not an oversight — guest support needs P2P protocol additions and a host-authoritative draw path (see R11 and issue #2249), and decks should prove themselves single-player first.

## Dependencies

- Existing dice rolling and roll history capabilities, which this feature extends rather than replaces.
- Existing vault storage, export, and sync, which carry tables and decks as content.
- Existing asset handling for card images.
- Existing Oracle chat command handling, for the roll-by-name integration in User Story 6.

## Related Work

- GitHub issue #2247 — the originating feature request.
- GitHub issue #2033 — VTT random room tile decks. Overlaps conceptually with card decks; planning should determine whether the room tile decks can be expressed as a Random Source or should remain separate. Resolved in R9: they stay separate, with a named revisit trigger.
- GitHub issue #2249 — guest access to tables and decks in a host/guest VTT session. Deferred out of this feature; the mechanism is settled in R11.
- GitHub issue #2250 — AI-generated world-aware tables. A later expansion that populates tables from the user's own entities. Deliberately excluded here so this feature works fully offline; generated rows would arrive as ordinary entries through the existing import preview.
