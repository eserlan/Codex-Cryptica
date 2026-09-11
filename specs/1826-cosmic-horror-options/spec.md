# Feature Specification: Cosmic Horror Generator Options

**Feature Branch**: `1826-cosmic-horror-options`
**Created**: 2026-08-01
**Status**: Complete
**Input**: Cosmic Horror must be its own theme, rather than a variation of the
existing horror themes, and every generator advertised by its hub needs
appropriate selection options.

## User Scenarios & Testing

### User Story 1 - Generate Cosmic Horror material (Priority: P1)

A GM opening a generator from the Cosmic Horror hub receives Cosmic
Horror-specific options and output direction, rather than Fantasy, vampire, or
gothic-noir defaults.

**Why this priority**: The public hub promises genre-specific material. A
nearest-genre fallback breaks that promise and makes the hub misleading.

**Independent Test**: Open each advertised generator from the hub and inspect
the default theme and offered choices.

**Acceptance Scenarios**:

1. **Given** a visitor opens NPC, faction, quest, names, settlement, dungeon,
   or adventure from the Cosmic Horror hub, **When** the form appears, **Then**
   its default and selectable options use the Cosmic Horror genre.
2. **Given** a visitor generates locally with Cosmic Horror selected, **When**
   a result is created, **Then** its data comes from dedicated Cosmic Horror
   tables rather than an unrelated genre fallback.

---

### User Story 2 - Use the intended visual and creative direction (Priority: P2)

A GM on a Cosmic Horror generator page sees the distinct Cosmic Horror visual
theme and receives matching art direction.

**Why this priority**: The theme must be recognizable as a separate setting,
not a restyled version of generic gothic horror.

**Independent Test**: Open a Cosmic Horror hub link in light and dark
appearance modes and resolve its art direction by theme id and alias.

**Acceptance Scenarios**:

1. **Given** a visitor follows a Cosmic Horror hub link, **When** a generator
   page loads, **Then** it selects the `cosmic_horror` visual theme.
2. **Given** image generation resolves `cosmic-horror` or
   `cosmic_horror_light`, **When** it composes art direction, **Then** it uses
   the dedicated field-notes art direction.

---

### User Story 3 - Create future themes safely (Priority: P3)

A contributor can distinguish a visual-only theme from a generator genre or
public hub and can review the complete support contract before publishing it.

**Why this priority**: The same fallback failure should not recur for the next
theme.

**Independent Test**: Use the guide and checklist to review a proposed theme
without referring to the Cosmic Horror implementation.

## Edge Cases

- A generator that cannot supply dedicated data is not advertised by the hub.
- A direct generator URL and a hub-origin link resolve the same available
  Cosmic Horror selection.
- Unknown user-entered genres may retain their existing graceful fallback;
  selectable or advertised themes may not silently use one.
- The Ship Generator is not advertised by the Cosmic Horror hub and is outside
  this support contract.

## Requirements

### Functional Requirements

- **FR-001**: The Cosmic Horror hub's advertised NPC, faction, quest, names,
  settlement, dungeon, adventure, social hub, news sheet, and language
  generators MUST expose Cosmic Horror-specific options or prompt direction.
- **FR-002**: Local generation for Cosmic Horror NPCs, factions, quests,
  names, settlements, dungeons, and adventures MUST use dedicated data rather
  than Fantasy or Vampire/Gothic Noir data.
- **FR-003**: Quest tone, scope, location, threat, twist, and reward selectors
  MUST expose Cosmic Horror choices when that theme is selected.
- **FR-004**: The Cosmic Horror theme MUST resolve to `cosmic_horror` on public
  generator pages and MUST have an independent art-direction catalogue entry.
- **FR-005**: Regression tests MUST reject selectable themes that lack their
  own dungeon table and MUST cover meaningful no-fallback cases for the added
  data.
- **FR-006**: Theme documentation MUST define the visual-theme, generator-
  genre, and public-hub scopes and provide a practical author/reviewer
  checklist.

### Key Entities

- **Visual theme**: A pair of application appearance variants plus art
  direction and aliases.
- **Generator genre**: The canonical label and dedicated option/output tables
  used by one or more generators.
- **Hub support contract**: The exact generator cards a public hub advertises
  and therefore must support.

## Success Criteria

- **SC-001**: Every generator card on the Cosmic Horror hub opens with a
  selectable Cosmic Horror option or dedicated Cosmic Horror prompt direction.
- **SC-002**: The dungeon coverage suite reports no selector theme without its
  own table, including Cosmic Horror.
- **SC-003**: Local Cosmic Horror generation in the affected generators has at
  least one test proving dedicated content and one relevant no-fallback
  assertion.
- **SC-004**: Contributors can use the new guide and checklist to determine a
  theme's required work before adding it to a public hub.
