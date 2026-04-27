# Feature Specification: Entity Alias Support

**Feature Branch**: `090-entity-aliases`  
**Created**: 2026-04-23  
**Status**: Implemented  
**Input**: User description: "alias support https://github.com/eserlan/Codex-Cryptica/issues/676"

## Clarifications

### Session 2026-04-23

- Q: Should the system permit identical aliases to be assigned to different entities? → A: Permit Duplicates (Multiple entities can share the same alias; search returns all of them).
- Q: Is alias-based link resolution ([[Alias]]) within the scope of this feature? → A: Out of Scope (Markdown links are not currently supported/used in the project).
- Q: How should aliases be weighted in search results relative to other fields? → A: High Weight (Alias matches score higher than general content but lower than primary titles).
- Q: How should aliases be visually prioritized in the Entity Explorer sidebar? → A: Limited List (Show up to 2 aliases, then an indicator if more exist, e.g., "aka: Bob, Joe +2 more").

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Manage Entity Aliases (Priority: P1)

As a vault maintainer, I want to add multiple alternative names (aliases) to an entity while editing it, so that I can capture different ways the entity is referred to in my world records.

**Why this priority**: Core requirement for data integrity and capturing world-building nuance. It is the foundation for all other alias-based features.

**Independent Test**: Create or edit an entity, add three aliases (e.g., "The Shadow", "Ghost", "The Unseen"), save, and verify they persist when reopening the entity.

**Acceptance Scenarios**:

1. **Given** I am in Zen Edit Mode for an entity, **When** I enter text into the Alias input field and press enter or comma, **Then** a new alias pill should be added.
2. **Given** an entity with existing aliases, **When** I click the 'X' on an alias pill, **Then** the alias should be removed from the entity's data upon save.
3. **Given** I have added aliases to an entity, **When** I click 'Save', **Then** the aliases must be persisted to the vault.

---

### User Story 2 - View Aliases At-a-Glance (Priority: P2)

As a vault maintainer, I want to see an entity's aliases without opening its full record, so I can quickly identify entities that have multiple names.

**Why this priority**: Satisfies the "at-a-glance" requirement from the user request and improves navigation speed.

**Independent Test**: Navigate to the Entity Explorer and verify that entities with aliases show them subtly below or beside their main title.

**Acceptance Scenarios**:

1. **Given** an entity has aliases, **When** I view it in the Entity Explorer list, **Then** its primary aliases should be visible in a smaller, secondary text format (e.g., "aka: Alias 1, Alias 2").
2. **Given** I am viewing an entity in Zen Mode (read-only), **When** I look at the header, **Then** all aliases should be displayed beneath the main title.

---

### User Story 3 - Discover Entities by Alias (Priority: P3)

As a vault maintainer, I want to search for an entity using any of its aliases, so I can find the correct record even if I don't remember its primary title.

**Why this priority**: Improves discovery and usability for complex worlds where primary names might change or be forgotten.

**Independent Test**: Type an entity's alias into the global search bar or the Entity Explorer search bar and verify that the entity appears in the results.

**Acceptance Scenarios**:

1. **Given** an entity titled "King Arthur" has an alias "Wart", **When** I search for "Wart", **Then** "King Arthur" should appear in the results.

---

### Out of Scope

- **Markdown Link Resolution**: Linking entities via `[[Alias]]` syntax is not supported in this feature.
- **Automatic Alias Generation**: System will not automatically suggest aliases based on content.

### Edge Cases

- **Duplicate Aliases**: System should prevent or gracefully handle adding the same alias multiple times to the same entity.
- **Cross-Entity Collisions**: Multiple entities can share the same alias. Search results MUST surface all entities matching the alias.
- **Empty/Whitespace Aliases**: System must ignore or strip empty strings or pure whitespace aliases.
- **Title as Alias**: Handling cases where the user adds the primary title as an alias (it should be redundant but not crash).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST allow entities to have zero or more aliases.
- **FR-002**: The system MUST persist aliases as an ordered list of strings in the vault data (YAML frontmatter).
- **FR-003**: The Entity Explorer MUST display up to the first two aliases for any entity that has them, using a secondary visual style. If more than two aliases exist, an indicator MUST be shown (e.g., "+N more").
- **FR-004**: Zen Mode MUST display all entity aliases prominently in the header area and sidebar.
- **FR-005**: The search system MUST index aliases and return matching entities when an alias matches the search query. Alias matches MUST be weighted higher than matches in the general content/lore but lower than matches in the primary title.
- **FR-006**: The system MUST provide a user interface in Zen Edit Mode (header and sidebar) to add and remove aliases.

### Key Entities

- **Entity**: Now includes an `aliases` field (collection of strings).
- **Search Result**: Now matches against `aliases` in addition to `title`, `content`, and `labels`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can add a new alias to an entity in under 10 seconds while in Edit Mode.
- **SC-002**: Searching for a unique alias returns the target entity in the top 3 results 100% of the time.
- **SC-003**: Aliases are rendered in the Entity Explorer list items without causing a measurable increase in list scroll latency (>16ms per frame).
- **SC-004**: 100% of aliases saved in one session are correctly restored in the next session after a full browser reload.
