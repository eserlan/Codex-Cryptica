# Feature Specification: Entity Auto-Link in Content & Lore

**Feature Branch**: `125-entity-auto-link`  
**Spec Directory**: `specs/125-entity-auto-link`  
**Created**: 2026-05-29  
**Status**: Draft  
**GitHub Issue**: [#1037](https://github.com/eserlan/Codex-Cryptica/issues/1037)

## Overview

When a user views an entity's content or lore, the application automatically detects names of other entities in the vault and surfaces them as interactive links. Clicking a detected mention navigates to that entity. No AI is required — detection is purely name-matching against the vault's entity index.

This mirrors the entity-detection logic already used in Oracle chat, bringing the same discoverability to the entity detail panel.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Detected Mentions Appear as Links (Priority: P1)

A writer opens a character entity whose content contains the sentence _"She trained under **Aldric the Sage**, who later founded the **Crimson Enclave**."_ Both **Aldric the Sage** and **Crimson Enclave** are entities in the vault. The application highlights those names in the rendered content view and the user can click either one to navigate directly to that entity.

**Why this priority**: Core value of the feature. Without this, the spec delivers nothing. Every other story layers on top of it.

**Independent Test**: Open any entity whose content contains the name of at least one other vault entity. The mentioned entity name must appear visually distinct (linked) in read mode. Clicking it must navigate to the correct entity. Delivers immediate discovery value without any other story.

**Acceptance Scenarios**:

1. **Given** an entity's content includes the exact title of another vault entity, **When** the user opens that entity in read mode, **Then** the matching name is rendered as a clickable link.
2. **Given** a matched name is clicked in sidebar mode, **When** the navigation occurs, **Then** the target entity opens in the sidebar panel. **Given** a matched name is clicked in zen mode, **When** the navigation occurs, **Then** the target entity opens within zen mode.
3. **Given** a name appears multiple times in the content, **When** the view renders, **Then** all occurrences are linked, not just the first.
4. **Given** the content contains a string that is a substring of an entity name (e.g. "sage" when "Aldric the Sage" exists), **When** the view renders, **Then** the substring alone is NOT linked — only the full title matches.

---

### User Story 2 — Lore Section Also Links Entities (Priority: P2)

A user reads the Lore section of a location entity. Several faction and character names from the vault appear in the lore text. They are surfaced as links in the same way as content.

**Why this priority**: Lore is the second text field on every entity and often contains the densest cross-references. Parity with the content field is straightforward once P1 is working.

**Independent Test**: Open an entity that has lore text containing other entity names. Verify links appear and navigate correctly in the lore panel. Does not depend on Story 3 or beyond.

**Acceptance Scenarios**:

1. **Given** an entity's lore field contains names of other vault entities, **When** the lore section is rendered in read mode, **Then** those names are linked.
2. **Given** the same name appears in both content and lore, **When** both sections are visible, **Then** both occurrences are independently linked.

---

### User Story 3 — Alias Matching (Priority: P3)

An entity "Aldric the Sage" has a registered alias "Aldric". The content of another entity reads _"Aldric trained her in the ways of fire."_ The alias "Aldric" is detected and links to "Aldric the Sage".

**Why this priority**: Aliases are already a first-class vault feature. Not matching them would be a notable gap for users who rely on short-form names in their writing.

**Independent Test**: Create an entity with an alias. Write content on another entity that uses only the alias. Verify the alias resolves to the correct entity link.

**Acceptance Scenarios**:

1. **Given** entity B has alias "Aldric" and content on entity A contains "Aldric", **When** entity A is opened in read mode, **Then** "Aldric" is linked to entity B.
2. **Given** a full title and an alias both exist as different entities, **When** a match is found, **Then** the longest matching name wins (full title takes priority over alias if both would match the same span).

---

### User Story 4 — No Links in Edit Mode (Priority: P2)

A user switches to edit mode on an entity. The auto-link rendering is not active while editing — the raw markdown text is shown as-is in the editor. Switching back to read mode restores the links.

**Why this priority**: Edit mode must show raw text so users can modify content without link overlays interfering with cursor placement and selection.

**Independent Test**: Toggle an entity into edit mode. Confirm entity names in the text are plain text, not linked. Toggle back to read mode and confirm links reappear.

**Acceptance Scenarios**:

1. **Given** an entity with detected mentions is in read mode, **When** the user enters edit mode, **Then** all auto-links disappear and text is shown as plain markdown.
2. **Given** the user is in edit mode and returns to read mode, **When** the view re-renders, **Then** detected mentions are linked again.

---

### Edge Cases

- What happens when an entity is renamed? Detected links refresh live while the entity detail view is open — a Svelte `$effect` in `MarkdownEditor.svelte` dispatches a no-op ProseMirror transaction when the `entityIndex` prop reference changes, triggering the decoration plugin to rescan with the updated names. Stale matches do not persist while the view is open.
- What happens when two entities have the same name or one entity's name is a prefix of another? The longest match should win; ties should link to the entity with the earliest creation order.
- What happens with very large content (thousands of words, hundreds of potential matches)? Detection must not block the UI thread or noticeably delay rendering.
- What happens if the vault has zero other entities? No link rendering occurs; the content appears as plain text.
- What happens if an entity mentions itself by name? Self-links are suppressed — a name that matches the currently viewed entity is not linked.
- What happens with case-sensitive names? Matching is case-insensitive but the original text casing is preserved in display.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST detect occurrences of vault entity titles (and registered aliases) within the rendered content and lore text of any entity detail view.
- **FR-002**: Detected names MUST be rendered as interactive inline links in read mode only, styled using the active theme's standard link appearance (colour + underline); edit mode MUST display unmodified plain text.
- **FR-003**: Clicking a detected entity link MUST navigate to that entity's detail view in a context-preserving way: in sidebar mode it opens the entity in the sidebar panel; in zen mode it navigates to the entity within zen mode. Hovering a link changes the cursor only; no preview or tooltip is shown.
- **FR-004**: Matching MUST be case-insensitive and MUST match the full name/alias only — no partial substring matches for shorter strings contained within longer entity names.
- **FR-005**: When multiple entity names could match overlapping spans of text, the longest match MUST win.
- **FR-006**: An entity MUST NOT link to itself — self-referencing matches are suppressed.
- **FR-007**: Detection MUST cover both the content field and the lore field independently (each field is rendered in its own editor instance; links in one field do not affect the other). Clarifies the "content and lore" scope stated in FR-001.
- **FR-008**: Alias matching MUST be supported; a registered alias resolves to the entity that owns it.
- **FR-009**: Detection MUST run on the client using the in-memory entity index; no network call or AI model invocation is required.
- **FR-010**: The feature MUST degrade gracefully: if detection is unavailable (vault not loaded, entity index empty), content and lore render as plain text without error.
- **FR-011**: Auto-links MUST be shown to P2P guests when the entity index is available in the guest session; guest and host views are identical for detected links.

### Key Entities

- **Entity**: The vault record being viewed. Has `title`, `content`, `lore`, and `aliases[]` fields.
- **EntityIndex**: The in-memory map of all entity titles and aliases in the active vault, used for name lookup without re-scanning.
- **DetectedLink**: A resolved match — a text span within content/lore paired with the target entity ID.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user reading an entity whose content references three other entities can navigate to any of them with a single click, without leaving the entity view or using the search bar.
- **SC-002**: Detection and rendering of links adds no perceptible delay (under 100 ms) when opening an entity with up to 5 000 words of content, measured on a mid-range desktop device (baseline: M1 MacBook Pro or equivalent mid-range x86 desktop CPU).
- **SC-003**: All vault entity names that appear verbatim (or as registered aliases) in content or lore are detected — 100% recall on exact matches.
- **SC-004**: Zero false-positive links: substrings, partial words, and self-references do not produce links.
- **SC-005**: The feature is invisible in edit mode — no markup, no decorations, no interference with the editor cursor or selection.

---

## Clarifications

### Session 2026-05-30

- Q: Should hovering a detected entity link show a brief inline preview, or is it a plain navigation link? → A: Plain navigation link only — cursor changes on hover, click navigates, no preview shown.
- Q: Should detected entity links appear when a P2P guest is viewing a shared entity? → A: Yes — if the entity index is available to the guest, links render identically to the host view.
- Q: How should a detected entity link be styled visually? → A: Use the existing themed link style — same colour and underline as a markdown hyperlink in the active world theme.
- Q: Should clicking a link behave differently in zen mode vs. sidebar mode? → A: Context-preserving — clicking in sidebar opens the entity in the sidebar; clicking in zen mode navigates to the entity within zen mode.

---

## Assumptions

- The entity index is already in memory when an entity detail view opens (the vault is loaded). No lazy-load of entity names is required.
- The current markdown renderer used for content/lore supports post-processing or token-replacement to inject link nodes; if it does not, a thin wrapper renders detected spans as interactive elements.
- Alias data is already available per entity at render time through the existing `aliases` field.
- The connection proposer (existing feature) is unaffected — auto-link is a read-only display feature and does not create connections or trigger any persistence.
