# Feature Specification: Lightweight Reusable Stat Sheets

**Feature Branch**: `149-reusable-stat-sheets`  
**Created**: 2026-07-31  
**Status**: Draft  
**Input**: Issue #1945 (Add lightweight reusable Stat Sheets to entities)

## Executive Summary

Add a lightweight, system-agnostic **Stat Sheet** capability that can be attached to entities (especially Characters/NPCs, Ships, Settlements) and used alongside VTT maps and entity navigation. The goal is to keep essential game state inside Codex Cryptica without introducing complex rules engines or automated character sheet formulas.

---

## Clarifications

### Session 2026-07-31

- Q: Where in the entity data structure should Stat Sheet data be stored and persisted? → A: Embedded in the entity note's YAML frontmatter header as `statSheet`.
- Q: How and where should user-saved Stat Sheet layout templates be stored? → A: Vault-Scoped (Saved inside the local campaign vault registry).
- Q: Where should the Stat Sheet be positioned in the entity inspector / viewer UI? → A: Dedicated Tab (Displayed in a dedicated "Stats" tab in the entity inspector/drawer navigation).

---

## User Scenarios & Testing

### User Story 1 - Live Table View & Edit of Entity Stat Sheets (Priority: P1)

As a Game Master or player, I want to quickly view and adjust manual entity stats (like HP, AC, conditions, or resources) while referencing an entity, so that I can track game state in real time without context switching to external tools.

**Why this priority**: Core value of the feature. Table utility requires fast, low-friction state tracking.

**Independent Test**: Create or view an entity, add a Stat Sheet with counters, text, and numbers, and verify one-click counter increment/decrement and text editing persist locally on the entity.

**Acceptance Scenarios**:

1. **Given** an active entity (e.g. NPC or Character), **When** opening the Stats tab/section, **Then** I see the fields formatted as counters, numbers, short text, long text, or section headings.
2. **Given** a counter field (e.g., HP = 24), **When** I click the `+` or `-` button, **Then** the value updates instantly without opening a separate editing modal.
3. **Given** any stat field value edit, **When** the change is made, **Then** it immediately saves to the local vault entity state.

---

### User Story 2 - Reusable Stat Sheet Templates (Priority: P2)

As a GM or worldbuilder, I want to save a Stat Sheet layout as a reusable template (e.g., "Generic D&D NPC", "Ship Systems", "Settlement Stats") and apply it to other entities, so that I don't have to recreate common stat layouts manually every time.

**Why this priority**: Drastically reduces repetition when managing multiple NPCs, monsters, ships, or locations.

**Independent Test**: Define a layout with multiple fields/sections, save it as a template, create a new entity, apply the template, and verify the structural fields populate cleanly ready for values.

**Acceptance Scenarios**:

1. **Given** an entity with a customized stat layout, **When** I choose "Save as Template" and name it (e.g. "Cairn Character"), **Then** the layout structure is saved to the vault template library.
2. **Given** an entity without a Stat Sheet, **When** I select "Apply Template" and pick a saved layout template, **Then** all structural fields are added to the entity with blank/default initial values.
3. **Given** a template update, **When** applying it to new entities, **Then** it applies the layout structure without overwriting existing data on unrelated entities.

---

### User Story 3 - Section Grouping & Collapsibility (Priority: P3)

As a user running an active session, I want to group stat fields into collapsible sections (e.g., "Combat", "Abilities", "Equipment", "Notes"), so that I can keep high-frequency stats visible while hiding background details.

**Why this priority**: Enhances screen real estate management during active play and VTT sessions.

**Independent Test**: Add section headers to a stat sheet, toggle collapse state, and verify collapsed sections hide child fields while remaining persisted across sessions.

**Acceptance Scenarios**:

1. **Given** a Stat Sheet with section headers, **When** clicking a section header, **Then** all fields under that section collapse or expand smoothly.
2. **Given** a collapsed section, **When** navigating away and returning to the entity, **Then** the collapsed state is remembered.

---

## Edge Cases

- **Missing/Malformed Stat Sheet Data**: If an entity contains corrupted or unexpected field data, the sheet gracefully renders valid fields and highlights invalid fields without breaking the entity renderer.
- **Deleting Fields with Existing Values**: Prompt confirmation before deleting a field that contains non-default user data.
- **Applying Template to Entity with Existing Stats**: Provide option to either append template fields to current stats or replace the layout (with confirmation).
- **Guest / Read-Only Mode**: In guest mode, counter adjustments and edits are disabled or restricted to transient session memory without mutating the underlying vault file.

---

## Requirements

### Functional Requirements

- **FR-001**: Entities MUST support an attached `StatSheet` structure consisting of an ordered list of fields.
- **FR-002**: Supported field types MUST include:
  - `Counter`: Integer value with instant `-` and `+` tap/click controls.
  - `Number`: Plain numeric input.
  - `Text`: Short single-line text input (for skills, attacks, movement, conditions).
  - `LongText`: Multiline text input (for traits, abilities, notes).
  - `Heading`: Collapsible section header for visual grouping.
- **FR-003**: Counter fields MAY optionally support `min`, `max`, and `step` constraints.
- **FR-004**: Users MUST be able to create, edit, reorder, and remove fields on an entity's Stat Sheet.
- **FR-005**: Users MUST be able to save a Stat Sheet field layout as a named `StatSheetTemplate`.
- **FR-006**: Users MUST be able to apply a saved `StatSheetTemplate` to any entity.
- **FR-007**: Stat Sheet templates MUST be stored in the campaign vault registry (e.g., `.codex/templates/statsheets/` or vault store settings) to travel cleanly with campaign data.
- **FR-008**: Section headings MUST be collapsible to optimize vertical space.
- **FR-009**: Stat Sheet data MUST be persisted directly inside the entity note's YAML frontmatter header under the `statSheet` property.
- **FR-010**: The Stat Sheet MUST be rendered inside a dedicated "Stats" tab within the entity inspector / view panel navigation.

---

### Non-Functional Requirements

- **NFR-001 (Performance)**: Counter adjustments (`+` / `-`) MUST update the local UI reactively within < 50ms without full component remounting.
- **NFR-002 (System Agnostic)**: Stat Sheets MUST NOT enforce system-specific rules, auto-calculations, or formula validations.

---

### Explicitly Out of Scope

- Rules engines or formula evaluations (e.g., auto-calculating modifier from Strength score).
- Automated damage/healing calculations or automatic status effect triggers.
- Fillable PDF character sheet parsing.
- Character leveling / XP calculation workflows.

---

## Key Data Entities

- **`StatSheetField`**:
  - `id`: Unique identifier string.
  - `label`: Display label string (e.g. "Hit Points", "Armor Class").
  - `type`: `'counter' | 'number' | 'text' | 'longtext' | 'heading'`.
  - `value`: Current value (`number` for counter/number, `string` for text/longtext, `boolean` for heading collapse state).
  - `min` / `max` / `step`: Optional numbers for counter bounds.
- **`StatSheet`**:
  - `templateId`: Optional string referencing the layout template applied.
  - `fields`: Array of `StatSheetField`.
- **`StatSheetTemplate`**:
  - `id`: Unique template ID.
  - `name`: Human-readable template name (e.g. "Generic D&D 5e Character").
  - `description`: Optional text summary.
  - `category`: Optional entity type recommendation (e.g. `character`, `ship`, `settlement`).
  - `fields`: Array of blueprint `StatSheetField` definitions (without instance values).

---

## Success Criteria

- **SC-001**: Counter increments/decrements complete with 1 click in under 50ms UI response time.
- **SC-002**: Applying a saved template to a new entity takes under 3 clicks.
- **SC-003**: 100% offline persistence with zero data loss across browser sessions.
