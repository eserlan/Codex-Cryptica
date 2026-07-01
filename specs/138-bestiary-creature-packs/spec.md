# Feature Specification: Bestiary & Creature Catalogue Packs

**Feature Branch**: `138-bestiary-creature-packs`
**Created**: 2026-06-28
**Status**: Draft
**Source Issue**: [#1545 — Pre-made bestiary and creature catalogue packs for vault population](https://github.com/eserlan/Codex-Cryptica/issues/1545)
**Input**: User description: "Add pre-made bestiary / creature catalogue packs that users can easily import into a vault to populate it with common and useful creatures."

## Overview

New and empty vaults feel sparse. Many settings need familiar creatures quickly — wolves, bandits,
skeletons, goblins, dragons, undead, and so on. This feature lets a user bootstrap a vault with a
curated, genre-appropriate set of creatures in a few clicks, instead of generating each one by hand.

Curated **creature packs** are previewed, selected, and imported as ordinary, editable creature
entities. The first release ships a single fantasy pack and reuses the existing import preview/select
flow; later phases add more genres, optional theme-adaptation, and user-authored packs.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Populate a vault from a starter pack (Priority: P1)

A user with a sparse or empty vault opens the importer, chooses a creature pack, previews the
creatures it contains, deselects any they don't want, and imports the rest. The imported creatures
appear as normal vault entities they can open and edit like anything else.

**Why this priority**: This is the core value of the feature — fast vault bootstrapping. It is a
complete, shippable slice on its own and directly satisfies the issue's primary acceptance criteria.

**Independent Test**: With AI disabled, open the importer, select the fantasy pack, confirm the
preview lists every creature, import a subset, and verify the chosen creatures exist in the vault as
editable `creature` entities and the deselected ones do not.

**Acceptance Scenarios**:

1. **Given** a vault and the importer open, **When** the user selects a creature pack, **Then** a
   preview lists every creature in the pack with each item selected by default.
2. **Given** the pack preview, **When** the user deselects some creatures and confirms, **Then** only
   the selected creatures are added to the vault and the rest are discarded.
3. **Given** an imported creature, **When** the user opens it, **Then** it is a normal editable
   creature entity with campaign-ready sections (summary, habitat, behaviour, threat level, variants,
   story hooks).
4. **Given** AI is unavailable or disabled, **When** the user imports a pack, **Then** the import
   still completes using the pack's bundled content.

---

### User Story 2 - Discover packs from an empty vault (Priority: P2)

A user lands in a brand-new, empty vault and is offered a clear call-to-action to populate it with a
starter pack, taking them directly into the pack picker.

**Why this priority**: Discovery at the moment of need. Without it, new users may never find the
feature. Depends on P1 being in place but is a small additive surface.

**Independent Test**: With an empty vault, confirm the populate call-to-action appears and that
activating it issues navigation to the importer's pack section; with a non-empty vault, confirm the
call-to-action is absent. Verifiable independently of US1 by asserting the navigation intent fires —
the destination pack section itself is exercised by US1.

**Acceptance Scenarios**:

1. **Given** an empty vault, **When** the user views it, **Then** a "populate with a pack" call-to-
   action is shown.
2. **Given** the call-to-action, **When** the user activates it, **Then** they arrive at the pack
   picker ready to preview and import.
3. **Given** a vault that already has entities, **When** the user views it, **Then** the empty-state
   call-to-action is not shown.

---

### User Story 3 - Avoid duplicate creatures on re-import (Priority: P3)

A user who imports a pack into a vault that already contains some of those creatures is not given
silent duplicates; existing matches are flagged in the preview and left deselected by default.

**Why this priority**: Protects against vault clutter (an explicit design concern in the issue) but
the core flow is usable without it.

**Acceptance Scenarios**:

1. **Given** a vault already containing "Goblin", **When** the user previews a pack containing
   "Goblin", **Then** that entry is marked as already existing and is not selected by default.

---

### Edge Cases

- **Empty selection**: If the user deselects everything and confirms, nothing is imported and the
  vault is unchanged.
- **Large pack**: Pack sizes are kept sensible (roughly 12–20 entries) so the preview stays scannable
  and the vault is not flooded.
- **Re-import**: Importing the same pack twice does not create silent duplicates (see User Story 3).
- **Imported origin**: Imported creatures are marked so users can tell they came from a pack.
- **No AI / Lite mode**: The base flow never requires AI; packs ship with complete content.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST make curated creature packs available for the user to browse and choose
  from. _(Which packs ship is covered by FR-011.)_
- **FR-002**: System MUST let users preview every creature in a pack before any import occurs.
- **FR-003**: Users MUST be able to import all creatures in a pack, or a selected subset.
- **FR-004**: Imported creatures MUST become normal, editable vault entities of category `creature`.
- **FR-005**: Each imported creature MUST include campaign-ready content: name, type/category, short
  description, habitat/environment, behaviour, threat level, common variants, and story hooks; with an
  optional system-neutral combat-notes placeholder.
- **FR-006**: The base import flow MUST function without AI (works in Lite/no-AI mode).
- **FR-007**: System MUST surface a call-to-action to populate a vault when that vault is empty, and
  MUST NOT surface it once the vault has content.
- **FR-008**: System MUST flag creatures that already exist in the target vault during preview and
  leave them deselected by default, to avoid silent duplicates.
- **FR-009**: Imported creatures MUST be identifiable as pack-sourced via a Label (not a tag, per the
  project's Labels-over-Tags principle).
- **FR-010**: Packs MUST keep content system-neutral (no edition-specific stat blocks).
- **FR-011**: The first release MUST ship a fantasy pack; the design MUST allow additional genre packs
  to be added without reworking the import flow.

### Design Decisions _(resolved from the issue's open questions)_

These record decisions made during design review of issue #1545:

- **Sourcing — static-first hybrid**: Packs ship as curated static content (works offline / Lite
  mode). Optional AI theme-adaptation is a later enhancement, not a dependency of the base flow.
  _(Rationale: pure AI generation is slow, costs tokens, and breaks no-AI mode; pure static cannot
  satisfy theme adaptation. Static base + optional AI pass gets both.)_
- **Home — reuse the import rail**: This is a bulk import/populate flow, not a one-at-a-time
  generator. It reuses the existing importer preview/select/write surface rather than introducing a
  new catalogue UI in the first release.
- **Stat blocks — system-neutral by default**, with an optional combat-notes section, consistent with
  the project's system-agnostic stance.
- **User-published packs — deferred** but designed for: a future file-based pack format enables user-
  authored/shared packs without reworking the data model.

### Key Entities _(include if feature involves data)_

- **Creature Pack**: A named, curated collection of creatures, tagged by genre/theme (e.g. "Classic
  Fantasy Bestiary"). Has an id, display name, genre/theme, and a list of entries.
- **Creature Pack Entry**: One creature within a pack. Attributes: name, type/category, short
  description, habitat, behaviour, threat level, common variants, story hooks, optional combat notes.
- **Imported Creature Entity**: The normal vault `creature` entity produced from an entry — fully
  editable after import and marked as pack-sourced.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From an empty vault, a user can populate it with creatures in under 1 minute without
  generating any entity by hand.
- **SC-002**: At least one curated pack of 12–20 creatures is available at launch.
- **SC-003**: 100% of imported creatures appear as editable creature entities with the full set of
  campaign-ready sections.
- **SC-004**: The full preview-and-import flow completes with AI disabled.
- **SC-005**: Re-importing a pack into a vault that already contains some of its creatures produces no
  silent duplicates.
- **SC-006**: A new genre pack can be added with no changes to the import flow itself (content-only
  change).

## Assumptions

- `creature` is already a recognised entity category across the app (import drafts, templates, art
  direction), so no new entity type is introduced — only content and an import entry point.
- "Sensible pack size" is interpreted as ~12–20 entries for the first pack.
- The first genre is fantasy, per the issue ("works for fantasy first").

## Out of Scope (this release)

- AI-driven theme/lore adaptation of pack content (later phase).
- Additional genre packs beyond fantasy (later phase).
- User-authored or shared packs and any file-based pack format (later phase).
- Edition-specific stat blocks.

## Phasing

- **P1** — Fantasy creature pack importable via the existing preview/select flow + empty-vault
  call-to-action. _(This spec's MVP; User Stories 1–2.)_
- **P2** — Additional genre packs (e.g. sci-fi fauna, undead, dark-fantasy horrors).
- **P3** — Optional AI theme-adaptation pass that tailors pack content to the vault's lore/tone.
- **P4** — File-based pack format enabling user-authored and shared packs.
