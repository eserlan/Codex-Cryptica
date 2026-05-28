# Feature Specification: Default Entity Templates

**Feature Branch**: `123-entity-templates`  
**Created**: 2026-05-28  
**Status**: Draft  
**Input**: User description: "Default formats/templates for entity types when creating them in Codex Cryptica (Character, Faction, Location, Item, Event, Creature, Note), with optional local customization in `.cc/templates/` (or `.codex/templates/`)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Entity with System Default Template (Priority: P1)

When a user creates a new entity of a specific type, the newly created entity's document is pre-populated with a clean, standard, non-mandatory markdown template structured for that specific type.

**Why this priority**: Crucial MVP requirement. It immediately removes blank-page friction and establishes a helpful structural guide for worldbuilders.

**Independent Test**: Can be fully tested by creating a new Character, Faction, Location, Item, Event, Creature, or Note entity in a clean vault, and verifying that the resulting markdown file contains the corresponding default headings and structure.

**Acceptance Scenarios**:

1. **Given** a new or existing vault with no custom templates, **When** the user creates a new entity of type `Character`, **Then** the new markdown file is pre-populated with the default Character template (including "Summary", "Appearance", "Personality", "Goals", "Methods", "Relationships", "Secrets", and "Story Hooks").
2. **Given** a new or existing vault with no custom templates, **When** the user creates a new entity of type `Faction`, **Then** the new markdown file is pre-populated with the default Faction template (including "Summary", "Purpose", "Leadership", "Members", "Resources", "Methods", "Allies and Enemies", "Internal Tensions", and "Story Hooks").
3. **Given** a new or existing vault with no custom templates, **When** the user creates a new entity of type `Location`, `Item`, `Event`, `Creature`, or `Note`, **Then** the new markdown file is pre-populated with its respective default template.

---

### User Story 2 - Toggle Template Insertion in the Creation UI (Priority: P2)

When a user is creating a new entity, they should have the option in the UI to decide whether they want to pre-populate the entity with the suggested template structure, or start with a completely empty page.

**Why this priority**: Prevents the templates from feeling like rigid database forms. Ensures that CC remains "Markdown-first, optional structure."

**Independent Test**: Can be tested by opening the new entity creation dialog/dropdown, toggling the "Start from default format" option off, creating the entity, and verifying that the editor is completely empty.

**Acceptance Scenarios**:

1. **Given** the entity creation dialog, **When** the "Start from default format" option is enabled (default state) and a new entity is created, **Then** the template is inserted.
2. **Given** the entity creation dialog, **When** the user disables the "Start from default format" option and creates a new entity, **Then** the new markdown document is completely blank.

---

### User Story 3 - Vault-Level Custom Templates (Priority: P2)

A user can override the built-in system default templates by putting their own markdown template files inside their vault directory.

**Why this priority**: Allows vaults to have distinct tones (e.g., cyberpunk vs. high fantasy) and is a key feature for advanced users.

**Independent Test**: Can be tested by creating a markdown file `.cc/templates/character.md` (or `.codex/templates/character.md`) with custom content, creating a new Character entity, and verifying that the custom content is used instead of the built-in system default.

**Acceptance Scenarios**:

1. **Given** a vault with a custom template at `.cc/templates/character.md` (or `.codex/templates/character.md`), **When** the user creates a new entity of type `Character` with the template option enabled, **Then** the new entity's document is pre-populated with the custom template's markdown content rather than the system default.
2. **Given** a vault with a custom template folder, **When** the user creates an entity type that _does not_ have a custom template file in that folder (e.g. `Creature`), **Then** it gracefully falls back to using the system default template for `Creature`.

---

### User Story 4 - Theme-Based System Default Templates (Priority: P3)

When a vault has a specific theme/genre configured (such as "Fantasy" or "Sci-Fi"), and the user has not provided custom templates, the system defaults should automatically adapt to match that theme's flavor instead of falling back to the standard generic defaults.

**Why this priority**: Enhances immersion and provides highly specific structure tailored to the campaign's setting. Kept as P3 to ensure core mechanics work first.

**Independent Test**: Can be tested by configuring a vault's theme to "Fantasy", creating a new Character entity with the template option enabled, and verifying that the inserted document uses the Fantasy Character template (e.g., includes "Lineage", "Oaths", or "Magical Affinity") instead of the standard generic template.

**Acceptance Scenarios**:

1. **Given** a vault configured with the "Fantasy" theme and no custom templates, **When** the user creates a new Character entity, **Then** the template includes high-fantasy fields like `Lineage`, `Oaths`, and `Magical Affinity`.
2. **Given** a vault configured with the "Sci-Fi" theme and no custom templates, **When** the user creates a new Character entity, **Then** the template includes sci-fi fields like `Augmentations`, `Corporate Ties`, and `Street Reputation`.
3. **Given** a vault configured with an unknown or unsupported theme, **When** any new entity is created, **Then** it gracefully falls back to the generic system default templates.

---

### User Story 5 - Help & Guide Integration (Priority: P2)

To ensure high feature discoverability and clear instructions on setting up custom overrides, the system provides user-facing documentation in the Help System and an accompanying blog announcement post.

**Why this priority**: Required by project Constitution (Principle VII) to support self-serve custom template configuration.

**Independent Test**: Confirm that the "Default Entity Templates" help guide is searchable and viewable in the Help sidebar, and that the announcement article is accessible via the Devlog/Blog.

**Acceptance Scenarios**:

1. **Given** the help center is open, **When** searching for "templates" or "default formats", **Then** the "Default Entity Templates" guide is returned.
2. **Given** the blog/devlog index, **When** viewing articles, **Then** the announcement "No More Blank Pages: Introducing Default Entity Templates" is listed.

---

### Edge Cases

- **Custom template folder structure missing**: If the `.cc/templates/` folder does not exist in the vault, the system MUST gracefully fall back to the system defaults without throwing errors.

- **Empty custom template file**: If a custom template file (e.g., `.cc/templates/character.md`) exists but is completely empty, the system MUST treat it as a valid choice, resulting in a blank entity page rather than falling back to the system default template. This allows users to explicitly disable default formats for a specific type.
- **Case sensitivity of template names**: Match custom templates to entity types case-insensitively by mapping the entity type to its lowercase file name (e.g., `Character` maps to `.cc/templates/character.md`, `Faction` to `.cc/templates/faction.md`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST supply built-in Markdown templates for these entity types: `Character`, `Faction`, `Location`, `Item`, `Event`, `Creature`, and `Note`.
- **FR-002**: The template content MUST follow the suggested markdown structures defined in the feature request.
- **FR-003**: The entity creation UI MUST include a visual checkbox/toggle option ("Start from default format") that is enabled by default.
- **FR-004**: System MUST check for local file overrides at `.cc/templates/{type}.md` or `.codex/templates/{type}.md` (prioritizing `.cc/templates/` over `.codex/templates/` or matching the vault's active config folder).
- **FR-005**: If a local override file exists, the system MUST read and use its contents as the template instead of the built-in defaults.
- **FR-006**: If no local override file exists or if reading fails, the system MUST gracefully fall back to the system default template.
- **FR-007**: System MUST provide theme-specific default fallback templates (e.g., "Fantasy", "Sci-Fi") matching the active vault's theme configuration if no custom local template files exist.

- **FR-008**: System MUST supply a user help article explaining templates and setup at `apps/web/src/lib/content/help/default-templates.md` and a blog announcement post at `apps/web/src/lib/content/blog/default-entity-templates.md`.

### Key Entities _(include if feature involves data)_

- **EntityTemplate**: An in-memory representation of a markdown structure for a given entity type.
  - Type: `string` (e.g. "Character", "Faction")
  - Content: `string` (the markdown structure)
- **VaultTemplateStore/Service**: The resolver responsible for looking up templates (checking local vault files first, then falling back to system defaults).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Creating any of the 7 default entity types takes exactly the same amount of time as creating a blank entity, with no noticeable UI delay or lag (< 100ms).
- **SC-002**: 100% of created entities correctly populate either their system default, their custom template, or a blank page depending on user settings.
- **SC-003**: If a vault-level custom template file is modified, the next created entity of that type immediately reflects the modified template without requiring an app restart.
