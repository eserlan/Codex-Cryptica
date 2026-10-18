# Feature Specification: Import a Tales of the Valiant Stat Block from Pasted Text

**Feature Branch**: `4192-tov-statblock-import`  
**Created**: 2026-10-18  
**Status**: Draft  
**Input**: User description: "AI stat block import for Tales of the Valiant creatures and quick NPCs. The GM pastes a stat block from any source (PDF, web page, Foundry export, own notes) and AI transcribes it into the existing ToV mechanics shape, validated and mapped into a ToV Monster/NPC stat sheet. Faithful transcription (not the generator's invent-and-BFRD-ify behaviour): no silent gap-filling, uncertain/missing fields flagged. Review step before save highlighting guessed/missing fields. Entry points: Stat Sheet editor 'Import stat block' and entity menu. Separate, clearly labelled 'Convert from 5e' mode that converts 5e stat blocks to ToV (adding Doom etc.) and marks AI-changed values. Offline/AI-disabled fallback: the existing rule-based stat block importer. Amend the BFRD AI usage guardrail so user-pasted text may be processed for personal use, never stored beyond the user's own vault nor redistributed; the restriction still applies to our own prompt grounding and bundled content. Full characters out of scope for this slice."

## Context

Codex Cryptica already generates Tales of the Valiant (ToV) creatures and NPCs with filled stat sheets (spec 3948). What it cannot do is take a creature the GM **already has** — in a rulebook PDF, on a website, in a Foundry VTT export, or in their own notes — and turn it into a stat sheet. Today the GM must type every field by hand. This feature closes that gap.

## Clarifications

### Session 2026-10-18

- Q: When importing into an entity that already has a ToV stat sheet with values, should the import replace the whole sheet or only write the fields it found? → A: Merge. Found and corrected fields overwrite existing values; not-found fields keep their current value; custom fields the GM added are never touched.
- Q: If AC, HP or CR are not found, can the GM still save? → A: Save is blocked until AC, HP and CR have a value (entered by hand on the review screen, or kept from the existing sheet when merging); every other field may stay empty.
- Q: Should Import stat block be offered only in ToV vaults or in every vault? → A: Only in vaults whose game system is ToV, plus any entity that already has a ToV stat sheet, matching how the ToV generators are gated.
- Q: Should the original pasted text be kept on the entity after saving? → A: Not by default. An opt-in "Keep the original text in notes" checkbox saves it to the entity's notes and warns that notes are included when the vault is shared or published. The same opt-in covers any other source text copied into notes (descriptive text, leftover content with no sheet field).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Paste a ToV creature and get a filled stat sheet (Priority: P1)

A GM running a ToV campaign wants the stats of a monster from a book they own, ready for the table. They open the creature's entity, choose **Import** in the stat sheet area, paste the text they copied from the PDF, and press **Read stat block**. A few seconds later they see a review screen showing the parsed creature: size and type, AC, HP with hit dice, speed, ability scores, saves, skills, senses, languages, CR, Doom, traits and actions with roll formulas. Two fields the source didn't include are marked **Not found**; one value the reader wasn't sure about is marked **Check this**. The GM fixes the uncertain value, presses **Save**, and the entity now has a working ToV Monster stat sheet with click-to-roll attacks.

**Why this priority**: This is the core job. Most GMs run published monsters, and hand-typing a stat block is the slowest part of prep. It delivers value on its own without any other story.

**Independent Test**: Paste a known ToV creature stat block into an entity with no stat sheet, confirm the review screen matches the source field by field, save, and confirm the stat sheet rolls its attacks correctly.

**Acceptance Scenarios**:

1. **Given** a ToV vault and an entity with no stat sheet, **When** the GM pastes a complete ToV creature stat block and reads it, **Then** the review screen shows every field present in the source with the same values, and nothing that isn't in the source.
2. **Given** a pasted stat block that omits languages and skills, **When** it is read, **Then** those fields are shown as **Not found** and left empty — never filled with a plausible guess.
3. **Given** a pasted stat block with a garbled value (e.g. a broken damage formula from PDF copy), **When** it is read, **Then** that value is shown as **Check this** with the original source text beside it, and the GM can correct it before saving.
4. **Given** the review screen, **When** the GM presses **Cancel**, **Then** nothing in the vault changes.
5. **Given** the review screen, **When** the GM presses **Save**, **Then** the entity gets a ToV Monster stat sheet whose attack and damage entries are rollable.
6. **Given** a pasted stat block with no Hit Points, **When** the GM reviews it for an entity with no stat sheet, **Then** Save stays disabled and the screen asks for Hit Points; once the GM types a value, Save is enabled.

---

### User Story 2 - Import a quick NPC (Priority: P1)

A GM wants a named NPC from an adventure (a bandit captain, a cult priest) with its compact stat block. They paste it the same way. The reader recognises it as an NPC-style stat block and fills a ToV NPC stat sheet (CR, AC, HP, speed, key attack, Luck, key saves and skills, notes) instead of a full monster sheet.

**Why this priority**: NPCs are as common as monsters in prep and use the same flow, so they ship together.

**Independent Test**: Paste a short NPC stat block, confirm the review screen offers the NPC sheet, save, and confirm the NPC sheet's values and rolls.

**Acceptance Scenarios**:

1. **Given** a pasted NPC stat block, **When** it is read, **Then** the review screen proposes the NPC sheet and shows its fields.
2. **Given** the review screen, **When** the GM switches the sheet type between Monster and NPC, **Then** the parsed values move to the chosen sheet and fields that sheet has no room for are listed rather than dropped silently.

---

### User Story 3 - Create a new creature straight from a stat block (Priority: P2)

A GM has a stat block but no entity yet. From the new-entity form (desktop or mobile) they choose **From stat block**, paste, review, and save. The vault gets a new entity named after the creature, in the creature category, with the stat sheet attached. If the GM ticks **Keep the original text in notes**, the stat block's text is saved in the entity's notes too.

**Why this priority**: Saves a step, but Story 1 already covers the job if the GM creates the entity first.

**Independent Test**: Use **From stat block** in the new-entity form with a pasted stat block, save, and confirm a new entity exists with the right name, category and sheet.

**Acceptance Scenarios**:

1. **Given** the new-entity form, **When** the GM chooses **From stat block**, imports a stat block and saves, **Then** a new entity is created with the creature's name, the vault's creature category (or NPC/character category for an NPC), and the filled stat sheet.
2. **Given** a vault that already has an entity with the same name, **When** the GM saves, **Then** they are told about the existing entity and can open it, import into it, or create a separate entity.

---

### User Story 4 - Convert a 5e stat block to ToV (Priority: P2)

A GM wants to use a 5e monster in their ToV game. On the import screen they choose **Convert from 5e** instead of the default **Copy as written**. The reader converts the creature to ToV — for example adding Doom, and renaming 5e-only terms to their ToV equivalents. On the review screen, every value the conversion added or changed is marked **Converted**, with the original 5e value shown beside it, so the GM can see exactly what is theirs and what the AI decided.

**Why this priority**: Very useful (most monsters in the wild are 5e), but it is a judgement call rather than a copy, so it sits behind the faithful import.

**Independent Test**: Paste a known 5e creature in Convert mode, confirm every changed or added value is marked with its original, and confirm unchanged values are not marked.

**Acceptance Scenarios**:

1. **Given** Convert from 5e mode, **When** a 5e stat block is read, **Then** each added or changed value is marked **Converted** and shows the original (or "added" when there was none).
2. **Given** Copy as written mode and a pasted 5e stat block, **When** it is read, **Then** nothing is converted, and the GM is told the block looks like 5e and offered Convert from 5e.
3. **Given** a saved converted creature, **When** the GM views the entity, **Then** it records that the stats were converted from 5e.

---

### User Story 5 - Import without AI (Priority: P3)

A GM has AI turned off for their vault, or is offline. They can still use **Import**. The import uses the built-in rule-based reader instead. The review screen says plainly that the quick reader was used and some fields may need filling in by hand. Convert from 5e is not offered.

**Why this priority**: Keeps the feature usable for GMs who have opted out of AI, at lower quality.

**Independent Test**: With AI disabled, paste a clean stat block, confirm the review screen opens with the quick-reader notice and the fields it could read, and confirm no request leaves the device.

**Acceptance Scenarios**:

1. **Given** AI is disabled, **When** the GM reads a stat block, **Then** no text is sent anywhere, the quick reader result is shown with a notice, and Convert from 5e is hidden.
2. **Given** AI is enabled but the request fails or times out, **When** the GM reads a stat block, **Then** they see a clear message and are offered the quick reader or a retry; their pasted text is kept.

---

### Edge Cases

- **Not a stat block** (a paragraph of lore, an empty paste): the GM is told no stat block was found; nothing is saved.
- **Several creatures in one paste**: the GM is told several were found and can pick one to import. Importing several at once is out of scope.
- **A full player character sheet**: the GM is told character sheets aren't supported yet; nothing is saved.
- **Very long paste** (whole PDF page): text beyond a sensible length is refused before sending, with a message asking for just the stat block.
- **Foundry VTT JSON export pasted or dropped**: accepted as input like any other text.
- **The entity already has a stat sheet**: the import merges into it (FR-017). Values the import didn't find stay as they were; before saving, the GM sees which existing values will be overwritten and must confirm.
- **The AI returns values that don't fit the sheet** (e.g. not a valid dice formula): those values are marked **Check this**; they are never saved as broken rolls without the GM seeing them.
- **The AI adds a value not in the source** in Copy as written mode: it is treated as a reader error, marked **Check this**, and the GM is told it wasn't in the pasted text.
- **Non-English or homebrew stat blocks**: read as best as possible; homebrew traits are kept as written.
- **Vault not set to ToV**: the import is still available on entities that already have a ToV sheet; elsewhere it is offered only when the vault's game system is ToV.

## Requirements _(mandatory)_

### Functional Requirements

**Entry and input**

- **FR-001**: The stat sheet area of an entity MUST offer an **Import** button (accessible name "Import stat block") when the vault's game system is ToV or the entity already has a ToV stat sheet.
- **FR-002**: The new-entity form, on desktop and mobile, MUST offer **From stat block** only when the vault's game system is ToV.
- **FR-002a**: Both entry points MUST stay hidden in vaults set to another game system or to System Neutral, except FR-001's import on an entity that already has a ToV stat sheet.
- **FR-003**: The import screen MUST accept pasted plain text and pasted or dropped Foundry VTT ToV/Black Flag JSON.
- **FR-004**: The import screen MUST offer two modes: **Copy as written** (default) and **Convert from 5e**, each with a one-line plain explanation.
- **FR-005**: Input longer than the agreed limit MUST be refused before any processing, with a message asking for just the stat block.

**Reading**

- **FR-006**: In Copy as written mode, the reader MUST only report values present in the pasted text. It MUST NOT invent, estimate or default any value. The one exception is proficiency bonus: when the stat block states a CR but no proficiency bonus, it is worked out from that CR by the standard table and shown as **worked out from CR**.
- **FR-007**: Each read value MUST be shown with one state: **found**, **check this** (present but uncertain, malformed, or not in the source), **not found**, **converted** (Convert from 5e only, FR-009) or **worked out from CR** (FR-006). A value the GM edits counts as found. Not-found values MUST be left empty, not filled with defaults.
- **FR-008**: The reader MUST decide whether the stat block is a monster or a quick NPC, and the GM MUST be able to change it on the review screen.
- **FR-009**: In Convert from 5e mode, every value added or changed by the conversion MUST be marked **converted** and keep the original 5e value (or "added") for display.
- **FR-010**: In Copy as written mode, if the text looks like a 5e stat block, the GM MUST be told and offered Convert from 5e.
- **FR-011**: All read results MUST pass the import's own structural checks (value types, allowed ranges, valid dice formulas) before they reach the review screen. Values that fail MUST be marked **check this**, not discarded silently. These checks MUST NOT fill in default values.
- **FR-012**: When AI is disabled, the rule-based reader MUST be used, nothing MUST be sent off the device, and Convert from 5e MUST be hidden.
- **FR-013**: When the AI request fails, the GM MUST see a plain error, keep their pasted text, and be offered a retry or the rule-based reader.

**Review and save**

- **FR-014**: The review screen MUST show every sheet field with its state, show the source snippet for **check this** values, and let the GM edit any value before saving.
- **FR-015**: The review screen MUST list any parsed content the chosen sheet has no field for, so nothing is lost silently; the GM can keep it in the entity's notes through the FR-021 opt-in.
- **FR-015a**: **Save** MUST stay disabled until Armour Class, Hit Points and Challenge Rating each have a value, either entered on the review screen or kept from the existing sheet when merging. The review screen MUST say which of these is missing. No other field is required.
- **FR-016**: **Cancel** MUST leave the vault unchanged.
- **FR-017**: Saving into an entity with an existing stat sheet MUST merge: only **found** and GM-corrected values are written; **not found** fields keep their current value; custom fields the GM added are never changed or removed. Before saving, the GM MUST see which existing values will be overwritten and confirm.
- **FR-018**: Saving from **From stat block** MUST create an entity named after the creature, in the vault's category for creatures (for a monster) or for NPCs (for a quick NPC), resolved the same way the generators resolve it, falling back to the vault's first character-like category, and MUST warn when an entity with that name already exists (open it, import into it, or create a separate one).
- **FR-019**: Saved attack and damage entries MUST be rollable on the stat sheet.
- **FR-020**: A converted creature MUST record that its stats were converted from 5e, visible on the entity.

**Privacy and licensing**

- **FR-021**: The pasted text MUST be used only to read the stat block for that request, and MUST NOT be reused to ground other AI requests. By default it MUST NOT be stored anywhere. The review screen MUST offer an unticked **Keep the original text in notes** checkbox. When ticked, the source text (and any leftover content from FR-015) is saved into the entity's notes, and the checkbox MUST say that notes are included when the vault is shared or published.
- **FR-022**: The import screen MUST state plainly, before the first AI read, that the pasted text is sent to the AI service to be read and is not kept.
- **FR-023**: The project's ToV AI usage rule MUST be updated to allow AI to read text the user pastes for their own use, while still forbidding Codex Cryptica's own prompts, bundled content and public pages from using non-open book text.
- **FR-024**: Nothing in this feature MUST add proprietary book text to Codex Cryptica's bundled content, public pages or examples.

**Help**

- **FR-025**: The Help system MUST explain how to import a stat block, the two modes, what each field state means, the AI-off behaviour and the privacy note.

### Key Entities

- **Pasted source**: the text or JSON the GM supplied. Lives only for the import session unless the GM ticks **Keep the original text in notes**.
- **Import mode**: Copy as written, or Convert from 5e.
- **Read result**: the parsed creature or NPC — sheet type, field values, each with a state (found, check this, not found, converted, worked out from CR), the source snippet behind each value, and any leftover content with no matching field.
- **ToV stat sheet**: the existing Monster or NPC stat sheet the read result is saved into.
- **Conversion note**: a marker on a saved entity that its stats were converted from 5e.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A GM can go from copied stat block to saved, rollable stat sheet in under 2 minutes, compared with roughly 10 minutes typing by hand.
- **SC-002**: On a reference set of at least 10 ToV stat blocks covering clean text, PDF copy and Foundry export, at least 95% of fields present in the source are read with the correct value.
- **SC-003**: In Copy as written mode, across the same reference set, zero values appear on the review screen marked **found** that are not in the source.
- **SC-004**: In Convert from 5e mode, 100% of values that differ from the source are marked **converted**.
- **SC-005**: With AI disabled, zero network requests carry the pasted text.
- **SC-006**: 9 out of 10 test GMs correctly explain what **check this** and **not found** mean after one import, without reading Help.

## Assumptions

- The existing ToV Monster and NPC stat sheets are reused unchanged in shape. The generators' ToV data checks are **not** reused for reading, because they fill missing values with defaults. If a field the reader needs is missing from them, adding it is in scope.
- The existing rule-based stat block reader in the stat sheet library is the AI-off fallback. Its quality on messy PDF text is unproven; the reference set in SC-002 will measure it separately, and it has no accuracy target in this slice.
- The AI request goes through the app's existing AI service and respects the existing AI Disabled setting. No new AI provider.
- The SC-002 reference set uses open BFRD creatures or stat blocks written for testing. If GMs' own copies of commercial stat blocks are used to measure accuracy, they stay outside the repository (FR-024).
- The input length limit is set during planning from the size of the longest real stat blocks in the reference set.
- "Converted from 5e" covers 5e 2014 and 2024 stat blocks; other systems are out of scope.
- Public generator pages (no vault) are out of scope.

## Out of Scope

- Full player character import (Lineage, Heritage, Class levels, Talents).
- Importing several creatures from one paste in a single step.
- A built-in searchable list of BFRD monsters.
- Systems other than ToV and 5e-to-ToV conversion.
- Reading images or scanned PDFs (text only).
