# Feature Specification: Entity Template Management

**Feature Branch**: `167-entity-template-management`  
**Created**: 2026-09-29  
**Status**: Draft  
**Input**: User description: "Make entity templates a first-class vault setting with simple template management (GitHub issue #3445)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse templates and pick a default per entity type (Priority: P1)

A world-builder opens Settings → Templates and sees an Entity Templates section listing every template available to the vault, grouped by entity type. Each row shows the template name, whether it is built-in or created by the user, and which one is the default for its type. They choose a different default for Locations, and from then on every new Location starts with that template's structure.

**Why this priority**: This is the core discoverability win. Even with no editor, users can see and choose between templates without touching files.

**Independent Test**: Open the section, see built-in templates for each entity type, set a non-default template as the default for one type, create a new entity of that type, and confirm the body starts with the chosen template's sections.

**Acceptance Scenarios**:

1. **Given** a vault with no custom templates, **When** the user opens Entity Templates, **Then** every built-in template is listed with its entity type, a "Built-in" source label, and exactly one template marked as default per type.
2. **Given** two templates exist for Character, **When** the user sets the second as default, **Then** the first loses the Default marker and the second gains it.
3. **Given** the default for Location is changed, **When** the user views entities that were already created, **Then** their content is unchanged.
4. **Given** the default for Location is changed, **When** the user creates a new Location, **Then** it starts with the new default's text.

---

### User Story 2 - Duplicate a built-in template and edit it as markdown (Priority: P1)

A user wants a variation of the built-in Faction template. They duplicate it, give it a new name, and open the editor. The template is plain markdown in a text box, so they add a "Rituals" heading, move "Secrets" above "Allies" by cutting and pasting, delete a section they do not need, and save. They then mark it as the default for Faction.

**Why this priority**: Editing without raw files is the point of the feature. Built-ins must stay read-only, so duplicate-then-edit is the primary path.

**Independent Test**: Duplicate a built-in template, edit its markdown, save, and confirm a new entity of that type starts with exactly that text.

**Acceptance Scenarios**:

1. **Given** a built-in template, **When** the user tries to edit or delete it, **Then** those actions are not offered; only Preview and Duplicate are.
2. **Given** a duplicated template, **When** the user edits the markdown and saves, **Then** the saved template contains exactly the text they wrote, and a new entity of that type starts with it.
3. **Given** the user has unsaved changes, **When** they close the editor, **Then** they are asked whether to discard them.
4. **Given** a template with an empty name or a body that is too long, **When** the user tries to save, **Then** saving is blocked with a plain-language message saying what to fix. An empty body is allowed and means a blank note.
5. **Given** an existing entity was created from a template, **When** that template is edited and saved, **Then** the entity's content is unchanged.

---

### User Story 3 - Create a template from scratch (Priority: P2)

A user starts a new template, picks the entity type it is for, names it, and writes its markdown in the same editor.

**Why this priority**: Useful, but duplicating a built-in already covers most needs.

**Independent Test**: Create a template for a custom category, write some markdown, save, set as default, and create an entity from it.

**Acceptance Scenarios**:

1. **Given** the Entity Templates section, **When** the user chooses "New template", **Then** an empty editor opens asking for a name and entity type.
2. **Given** a saved user template, **When** the user renames or deletes it, **Then** the list updates; deleting the current default makes the type fall back to the standard order (a legacy file if one exists, otherwise the built-in default).
3. **Given** a custom entity category exists, **When** the user creates a template for it, **Then** the template appears under that category.

---

### User Story 4 - Import and export templates (Priority: P2)

A user exports a template to share with a friend or reuse in another vault, and imports a template someone sent them.

**Why this priority**: Enables sharing and backup, and is a stated MVP requirement, but is not required for day-to-day use.

**Independent Test**: Export a user template, import it into another vault, and confirm it appears with identical text. Import an invalid file and confirm nothing changes.

**Acceptance Scenarios**:

1. **Given** a template, **When** the user exports it, **Then** they receive a file that can be imported back without loss.
2. **Given** a valid template file, **When** the user imports it, **Then** it is added as a user template and never overwrites an existing one silently.
3. **Given** a corrupt or unsupported file, **When** the user imports it, **Then** they see a clear error and the vault is unchanged.
4. **Given** an imported template has the same name as an existing one, **When** import completes, **Then** both remain and the imported one is distinguishable.

---

### User Story 5 - Existing custom template files keep working (Priority: P2)

A user who already placed `character.md` in their vault's `.cc/templates/` or `.codex/templates/` folder upgrades. Their new characters still start from that file, and it appears in the Entity Templates list as one of their own (file) templates.

**Why this priority**: Protects existing power users from regressions.

**Independent Test**: With a legacy `character.md` in place, create a Character and confirm the body matches the file; confirm the list shows it.

**Acceptance Scenarios**:

1. **Given** a legacy `{type}.md` file, **When** a new entity of that type is created and no other default is chosen, **Then** its content is used exactly as before, including an empty file meaning a blank note.
2. **Given** a legacy file is listed, **When** the user duplicates it, **Then** the copy is editable in the editor.

---

### User Story 6 - Templates apply everywhere entities are created (Priority: P2)

Whether a user creates an entity from the New Entity dialog, the mobile sheet, a related-entity prompt, a generator, or the AI, the vault's chosen default template is used.

**Why this priority**: A default that only works in some entry points would feel broken.

**Independent Test**: Set a custom default for Character, then create a Character from each entry point and confirm the same structure each time.

**Acceptance Scenarios**:

1. **Given** a custom default for a type, **When** an entity of that type is created via the related-entity dialog, **Then** it uses that default.
2. **Given** a custom default for a type, **When** the AI drafts a new entity of that type, **Then** it follows that template's headings.

---

### Edge Cases

- A template file on disk is malformed or from a newer version: it is skipped with a visible warning, and the rest still load.
- The default template for a type is deleted or its file goes missing: creation falls back to the built-in default for that type and theme, never to an error.
- Two templates for the same type share a name: both are shown and distinguishable.
- A template body is very long: the editor stays usable, and anything over the size limit is refused with a clear message.
- The vault is a guest or read-only vault: templates are visible and previewable, but creating, editing, deleting, importing and changing defaults are unavailable with an explanation.
- The vault folder is not writable: saving fails with a clear message and no partial template appears.
- A category is renamed or removed while it has templates: its templates stay reachable and are not lost.
- The user opts out of templates when creating an entity ("Start from default format" unchecked): the note is blank regardless of defaults.
- Two browser tabs edit templates at once: the last save wins without corrupting the list.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Templates area of Settings MUST include an Entity Templates section listing all templates available to the vault: built-in, user-created and legacy.
- **FR-002**: Each listed template MUST show its name, entity type, source (Built-in or User) and whether it is the default for its type.
- **FR-003**: Users MUST be able to preview any template as the note it would produce.
- **FR-004**: Users MUST be able to set exactly one default template per entity type.
- **FR-005**: Built-in templates MUST be read-only: they can be previewed, duplicated and exported, but not edited or deleted.
- **FR-006**: Users MUST be able to duplicate any template into a new user template.
- **FR-007**: Users MUST be able to create a new template by naming it and choosing an entity type.
- **FR-008**: An editor MUST let users change the template name and entity type, and edit the template body as plain markdown.
- **FR-009**: The template body MUST be stored and used exactly as written; nothing is added, removed or reformatted when it is saved or when a note is created from it.
- **FR-010**: The editor MUST make it clear that the body is the text a new note starts with, and that an empty body gives a blank note.
- **FR-011**: The editor MUST validate before saving (non-empty single-line name, an entity type, a body within the size limit) and explain problems in plain language.
- **FR-012**: Users MUST be able to edit and delete their own templates; deleting the current default MUST revert that type to the built-in default.
- **FR-013**: Users MUST be able to export a template to a file and import a template file, with validation, a clear error for invalid files, and no silent overwrite of existing templates.
- **FR-014**: Exported files MUST carry a format version so future versions can read them.
- **FR-015**: User templates MUST be stored in the vault so they travel with it, and MUST be readable by people or tools outside the app.
- **FR-016**: Existing `{type}.md` files in `.cc/templates/` or `.codex/templates/` MUST continue to work exactly as before, including empty files producing a blank note, and MUST be listed as user-authored templates that are read-only (they can be duplicated but not edited or deleted in place).
- **FR-017**: A new entity MUST receive the template's content as a one-time copy. Editing, deleting or re-defaulting a template MUST NOT change any existing entity.
- **FR-018**: Template resolution MUST follow one order everywhere: the vault's chosen default for the type, then a legacy file for the type, then the theme's built-in template, then the generic built-in, then blank.
- **FR-019**: Every entity creation path (new entity dialog, mobile sheet, related-entity prompt, generators, AI drafting) MUST use the same resolution, including vault templates.
- **FR-020**: Entities MUST still be creatable blank by opting out of templates.
- **FR-021**: In guest and other read-only contexts, templates MUST be viewable and previewable, and all changes MUST be unavailable with an explanation.
- **FR-022**: Malformed template files MUST NOT break template loading or entity creation; they are skipped with a visible warning.
- **FR-023**: Template management MUST work fully offline and send no template content to any external service.
- **FR-024**: The typed-field model (numbers, dice, selects and so on), explicit migration of existing entities, and template packs and sharing are out of scope but the stored format MUST leave room to add them without breaking existing templates.
- **FR-025**: The exported Template Package MUST be self-contained and valid on its own (name, entity type, markdown body, format version), so a future marketplace listing can wrap it without changing the format.

### Key Entities

- **Entity Template**: A named starting note for new entities of one type. Has an identity, a name, an entity type, a markdown body, a source (built-in, user, legacy), and a format version.
- **Template Default**: The choice of which template a vault uses for each entity type; one per type.
- **Template Package**: A versioned, portable file holding one template for import and export.

## Assumptions

- The MVP keeps a template as a plain markdown body. Typed fields from the issue (text, number, select, counter, dice, relation) are a follow-up, and the stored format is versioned and tolerant of extra fields so they can be added later.
- Built-in templates are the existing per-theme and generic defaults. The theme-aware choice remains the fallback when the user has not chosen a default.
- User templates are stored as files in the vault's `.codex/templates/` folder, one file per template plus a small record of per-type defaults, following how the vault already stores other metadata. Legacy `.cc/templates/*.md` and `.codex/templates/*.md` are read but not rewritten until the user edits them.
- Entity types are the open-ended set of vault categories, including custom ones.
- The New Entity dialog uses the type's default template. Choosing a non-default template at creation time is a follow-up.
- Users manage templates from the existing Templates tab in Settings alongside stat sheet templates.
- Guest and published read-only vaults cannot be written to, so management is read-only there.
- Sharing entity templates through the template marketplace is a separate follow-up (issue #3548). This spec only keeps the package format compatible with it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can find Entity Templates and set a default for an entity type in under 30 seconds without reading documentation.
- **SC-002**: A user can duplicate a built-in template, change its markdown and save in under 2 minutes.
- **SC-003**: 100% of existing entities are byte-for-byte unchanged after editing, deleting or re-defaulting any template.
- **SC-004**: 100% of vaults with existing `.cc/templates` or `.codex/templates` files produce the same new-entity content as before the upgrade.
- **SC-005**: All entity creation paths produce the same structure for a given type and vault, in 100% of tested paths.
- **SC-006**: An exported template imports into a different vault with identical text in 100% of tested cases, and invalid files are rejected with no changes to the vault in 100% of tested cases.
- **SC-007**: Saving a template, and creating an entity from it, takes under one second for a template of 50,000 characters.
- **SC-008**: A malformed template file never prevents a new entity from being created.
