# Feature Specification: Autotag entities with end date

**Feature Branch**: `112-autotag-entities-end-date`  
**Created**: 2026-05-23  
**Status**: Approved  
**Input**: User description: "https://github.com/eserlan/Codex-Cryptica/issues/872"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Automatic "past" Tag on Create and Edit (Priority: P1)

As a Codex Cryptica user, when I set an end date on an entity (such as a character who has died, a faction that was dissolved, or an event that concluded), I want the system to automatically tag it with "past" so that it can be easily filtered, grouped, and searched without requiring me to manually manage tags.

**Why this priority**: Crucial for usability. It automates organization and keeps the timeline and status of entities in sync.

**Independent Test**:

- Create an entity and set an `end_date`. Verify the `"past"` tag is automatically added to the tags list.
- Edit an existing entity to add an `end_date`. Verify the `"past"` tag is automatically added.

**Acceptance Scenarios**:

1. **Given** a new entity creation form, **When** I provide an end date and save, **Then** the saved entity contains `"past"` in its tags.
2. **Given** an existing entity with no end date and no `"past"` tag, **When** I edit the entity to add an end date, **Then** `"past"` is automatically added to its tags.

---

### User Story 2 - Automated Removal of "past" Tag (Priority: P2)

As a Codex Cryptica user, if I correct or remove the end date of an entity, I want the system to automatically remove the "past" tag from its tags list so that the entity is no longer classified as historical or concluded.

**Why this priority**: Prevents stale data. If an end date is removed, the entity should no longer have the automatic "past" tag.

**Independent Test**:

- Edit an entity that has an `end_date` and the `"past"` tag, and remove its `end_date`. Verify `"past"` is removed from its tags.

**Acceptance Scenarios**:

1. **Given** an entity with an end date and the `"past"` tag, **When** I remove the end date, **Then** `"past"` is automatically removed from its tags.

---

### User Story 3 - In-Memory Autotagging on Markdown Load (Priority: P3)

As a Codex Cryptica user, when I open my vault, any existing markdown file containing an `end_date` but lacking the `"past"` tag in its frontmatter should be loaded in-memory with the `"past"` tag applied, ensuring consistent filtering and UI representation.

**Why this priority**: Ensures backward compatibility for vaults created before this feature was introduced.

**Independent Test**:

- Import/load a markdown file containing `end_date` but no `"past"` tag in frontmatter. Verify that the loaded entity object in-memory has `"past"` in its tags list.

**Acceptance Scenarios**:

1. **Given** a markdown file with `end_date` but no `"past"` tag, **When** the vault loads, **Then** the entity is parsed with `"past"` in its tags array.

---

### Edge Cases

- **Manual "past" Tag / Synchronization**: To ensure consistency across editing and loading, the presence of the `"past"` label is strictly synchronized with the presence of a valid `end_date`. Therefore, a manual `"past"` label on an entity with no `end_date` is not preserved across entity saves or loads.
- **Invalid or Empty End Date**: An `end_date` object without a valid `year` (e.g., empty or undefined) should not trigger the `"past"` tag, and if a `"past"` tag was present, it should be removed.
- **Duplicate Prevention**: If `"past"` is already in the tags list when an `end_date` is added, we must not duplicate it.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST automatically append `"past"` to the `tags`/`labels` array of an entity if `end_date` has a valid `year` defined.
- **FR-002**: System MUST automatically remove `"past"` from the `tags`/`labels` array of an entity if `end_date` is cleared, is undefined, or is invalid.
- **FR-003**: The autotagging behavior MUST apply during both entity creation (`createEntity`) and entity update (`updateEntity`) operations.
- **FR-004**: The autotagging behavior MUST apply when parsing existing markdown files from disk (`parseMarkdown`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of entities with `end_date` have the `"past"` tag in their loaded in-memory and saved representations.
- **SC-002**: Unit tests cover all success, negative, and edge cases for creation, updating, and parsing of entities with and without `end_date`.
