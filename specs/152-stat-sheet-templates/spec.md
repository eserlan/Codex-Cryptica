# Feature Specification: Markdown-Based Presentation Templates for Stat Sheets

**Feature Branch**: `152-stat-sheet-templates`
**Created**: 2026-08-02
**Status**: Draft
**Input**: User description: "Markdown-based presentation templates for Stat Sheets (GitHub issue #1992). Allow users to create reusable presentation templates for Stat Sheets, so the same underlying stat data can be arranged and styled differently for different RPG systems, entity types, or play styles, using extended Markdown as the authoring/storage/exchange format with a small allowlisted set of directives for field binding, layout, and display modes. No arbitrary HTML/CSS/JS/scripts. Templates are parsed into a validated presentation model, fall back safely when invalid or incompatible, and remain value-free/portable for future publishing."

## Clarifications

### Session 2026-08-02

- Q: Should V1 support reusing one presentation template across multiple different Stat Sheet schemas (via explicit field mapping), or should V1 restrict each template to a single declared schema and defer cross-schema reuse to later? → A: V1 restricts each template to a single declared schema; cross-schema reuse via explicit field mapping is deferred to a later version.
- Q: Should presentation-template selection be set per individual entity, or per schema/entity-type as a default that entities inherit unless overridden? → A: Schema-level default with optional per-entity override.
- Q: When browsing/offering templates for a schema, what counts as "compatible"? → A: Exact match — a template is offered only for the single schema it declares.
- Q: When an imported template file contains some disallowed content (raw HTML/script) alongside otherwise-valid Markdown, should the import proceed with disallowed parts stripped, or should the whole file be rejected? → A: Strip disallowed content and import the rest, informing the user what was removed.
- Q: Should presentation template names be unique per-schema, or unique vault-wide (across all schemas)? → A: Unique per-schema — two templates for different schemas can share a name.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Switch how a Stat Sheet looks without touching its data (Priority: P1)

A user with an existing Stat Sheet (e.g. a fantasy character) wants to view and use it as a compact monster stat block for a NPC, or as a mobile quick-reference layout during play, without re-entering or duplicating any stat values.

**Why this priority**: This is the core value proposition of the feature — decoupling presentation from data. Without this, there is no reason for the feature to exist. It is also the smallest slice that is independently demonstrable using only built-in templates, before any authoring UI exists.

**Independent Test**: Create an entity with a Stat Sheet using an existing schema, apply a built-in presentation template, confirm the rendered layout matches the template, then switch to a different built-in template compatible with the same schema and confirm the same stat values render in the new layout with no data changes, edits, or duplication.

**Acceptance Scenarios**:

1. **Given** an entity with a populated Stat Sheet, **When** the user selects a different built-in presentation template compatible with that schema, **Then** the sheet re-renders in the new layout showing the same field values, and the underlying stat data is unchanged.
2. **Given** an entity using a presentation template, **When** the user edits a stat value through the rendered sheet's existing interactive controls, **Then** the change is saved to the underlying Stat Sheet data (not to the template) and is visible under any other compatible presentation.
3. **Given** a Stat Sheet schema, **When** the user browses available presentations for it, **Then** only templates declaring that schema as their target are offered.

---

### User Story 2 - Author a custom presentation template in Markdown (Priority: P1)

A user wants to design their own layout for a Stat Sheet — for example a sci-fi ship dashboard with hull, shields, crew, and systems — by writing extended Markdown that references fields from a chosen schema and arranges them using CC layout directives.

**Why this priority**: Custom authoring is the feature's headline capability from the issue and is needed for the "reusable, community-portable template" goal. It's P1 alongside Story 1 because a template system with only built-ins delivers little beyond a handful of fixed layouts.

**Independent Test**: Open the presentation-template editor, select a schema, write Markdown with headings, a table, and at least one CC directive (e.g. a `stat-group` block referencing two fields), preview it against sample values, save it, and confirm it appears as a selectable presentation for entities using that schema.

**Acceptance Scenarios**:

1. **Given** the presentation-template editor is open with a schema selected, **When** the user types `{{stat.<fieldname>}}` for a field that exists on the schema, **Then** the editor offers autocomplete/insert assistance for valid field names and the preview renders the field's sample value.
2. **Given** a template being authored, **When** the user adds a CC layout directive (e.g. a responsive group with a column count), **Then** the preview reflects the requested grouping and remains usable at both a desktop-width and mobile-width preview size.
3. **Given** a template being authored, **When** the user references a field name that does not exist on the selected schema, **Then** the editor flags it as an unresolved/incompatible reference before save, without crashing the preview.
4. **Given** a saved custom template, **When** the user duplicates a built-in template as a starting point instead of starting from scratch, **Then** the duplicate is editable and saving it does not alter the original built-in.

---

### User Story 3 - Template stays safe and predictable when things go wrong (Priority: P2)

A user opens an entity whose selected presentation template references a field that was since renamed or removed from the schema, or was authored with unsupported/malformed syntax, or was imported from an untrusted source containing disallowed content.

**Why this priority**: This is essential for trust and data safety once authoring and sharing exist, but it only matters after Stories 1 and 2 give users something to break or import. It directly protects the "never execute arbitrary code" and "never silently corrupt data" guarantees called out as core constraints in the issue.

**Independent Test**: Take a valid template, rename/remove a referenced schema field, and confirm the sheet still renders (via clear in-place messaging for the missing field, not a crash); separately, attempt to import a template file containing raw HTML/script content and confirm the disallowed content is stripped rather than rendered as-is; separately, select an invalid/corrupted template on an entity and confirm the entity falls back to the standard renderer.

**Acceptance Scenarios**:

1. **Given** an entity using a presentation template, **When** the schema field it references is renamed or removed, **Then** the sheet still renders with the missing field clearly marked, and the entity's stored stat data is untouched.
2. **Given** a template file containing disallowed content (raw HTML tags, script blocks, executable expressions), **When** the user imports it, **Then** the disallowed content is stripped, the remaining valid template content is imported, and the user is informed which parts were not imported.
3. **Given** an entity whose selected presentation template is missing, invalid, or fails validation, **When** the entity's Stat Sheet is opened, **Then** the system falls back to the standard default Stat Sheet renderer and does not block viewing or editing the underlying data.
4. **Given** a template containing an unrecognized CC directive (e.g. from a newer template syntax version), **When** it is rendered, **Then** the unrecognized directive is skipped visibly (e.g. a placeholder or notice) rather than executed or silently dropped without indication.

---

### User Story 4 - Export and share a presentation template (Priority: P3)

A user who authored a useful layout wants to export it as a portable file (e.g. to share with another vault or, later, publish) without leaking any of their entity's private data.

**Why this priority**: Portability is explicitly scoped as groundwork for future publishing (#1981/#1984), not a full marketplace flow in this issue. It's valuable but can follow once authoring and safety are solid.

**Independent Test**: Export a custom template to a file, inspect its contents to confirm it contains only Markdown source, layout directives, and field-reference metadata (no entity values, vault IDs, or private assets), then import it into a different vault/schema context and confirm it works or is clearly flagged as incompatible.

**Acceptance Scenarios**:

1. **Given** a saved custom presentation template, **When** the user exports it, **Then** the resulting file contains only template source and field-reference metadata, with no entity stat values, vault identifiers, or private assets.
2. **Given** an exported template file, **When** the user imports it into a vault containing a compatible schema, **Then** it becomes available as a selectable presentation without requiring re-authoring.
3. **Given** an exported template file, **When** the user imports it into a vault with no compatible schema, **Then** the system clearly indicates the incompatibility rather than silently failing or attaching it to an unrelated schema.

---

### Edge Cases

- What happens when a template author references a field with a display mode that doesn't match the field's type (e.g. `display="progress-bar"` on a text field)? System should fall back to a sensible default display for that type and flag the mismatch in the editor.
- What happens when two presentation templates for the same schema have the same name? Template names are unique per-schema (two templates for different schemas may share a name); the system must disambiguate (e.g. automatic suffixing) or block the save, and must not overwrite an existing template silently.
- What happens when a user deletes a custom presentation template that one or more entities currently have selected? Those entities must fall back to the standard renderer (or another explicit default) rather than erroring.
- What happens when a template's `stat-group columns=N` requests more columns than fit at the current viewport? Layout must degrade to fewer columns responsively, never overflow or become unreadable.
- What happens when a built-in template is "edited" by a user? Built-ins remain read-only; edits must go through duplication, producing a separate vault-owned template.
- N/A: the source issue's "repeated/list-region" layout idea assumes a list/array-typed Stat Sheet field. The current Stat Sheet schema has no such field type (only scalar `counter`/`number`/`text`/`longtext`/`heading`/`dice`, per `packages/schema/src/stat-sheet.ts`), so there is nothing to bind a repeat directive to in V1 — see Assumptions.
- What happens when a template is imported that was authored for a newer template-syntax version than the current app supports? Unknown directives from the newer version are skipped visibly per Story 3; the rest of the template still renders.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store a Stat Sheet's presentation template separately from its schema/data, such that selecting or changing a presentation never modifies, duplicates, or removes stat values.
- **FR-002**: System MUST support an extended Markdown syntax as the primary format for authoring, storing, and exchanging presentation templates, including standard headings, paragraphs, emphasis, links, lists, tables, blockquotes, separators, and safely-scoped images.
- **FR-003**: System MUST support a small, explicitly allowlisted set of CC-specific directives for binding typed Stat Sheet fields (e.g. `{{stat.fieldname}}` with optional display/label parameters) and for responsive layout grouping (e.g. sections, rows/columns, cards, field groups).
- **FR-004**: System MUST safely strip arbitrary HTML tags, CSS, JavaScript, executable expressions, and any other user-authored script content from template source on both authoring/save and import, importing the remaining valid content and informing the user which parts were removed, rather than rejecting the whole file.
- **FR-005**: System MUST parse template Markdown into a validated internal presentation representation before rendering, and MUST validate that referenced schema fields and directives are recognized and compatible before treating the template as usable.
- **FR-006**: System MUST provide a presentation-template editor within the Stat Sheet template management area, supporting: creating a template from scratch, duplicating a built-in or existing template, selecting a compatible schema, editing Markdown with field-reference assistance (autocomplete or picker), and previewing with representative sample values.
- **FR-007**: System MUST let users set a default presentation template per schema, and MUST let users override that default on an individual entity's Stat Sheet; either selection MUST be independent of, and never alter, the entity's stored stat values. An entity with no explicit override MUST use its schema's default template.
- **FR-008**: System MUST support multiple presentation templates targeting the same Stat Sheet schema, all selectable per entity.
- **FR-009**: System MUST surface missing, renamed, or incompatible field references clearly in both the editor (at author time) and the rendered sheet (at view time), without failing the entire render.
- **FR-010**: System MUST fall back to the standard default Stat Sheet renderer whenever an entity's selected presentation template is missing, invalid, fails validation, or becomes incompatible with its schema.
- **FR-011**: System MUST treat unknown or unsupported directives encountered during rendering as a visible, non-fatal condition (e.g. a flagged placeholder), never as executed code or a silently dropped/misleading result.
- **FR-012**: System MUST provide a small set of built-in presentation templates (at minimum: standard form layout, compact stat block, dashboard/card layout, mobile quick-reference layout) that are read-only and duplicable but not directly editable.
- **FR-013**: System MUST support field-appropriate display modes selected per field reference, at minimum: plain text/number, prominent value, current/maximum value, counter, progress/resource bar, checkbox/status marker, badge/tag list, compact table or repeated list, and long-form notes; each field type MUST offer only the display modes that make sense for it.
- **FR-014**: System MUST render V1 presentation templates as read-only with respect to new interactive behaviors, while preserving any interactive controls (e.g. editable values) already supported by the standard Stat Sheet for bound fields.
- **FR-015**: System MUST let users export a presentation template to a portable file containing only Markdown source, layout directives, and field-reference metadata — never entity stat values, vault identifiers, or private assets.
- **FR-016**: System MUST let users import a presentation template file, validating it (per FR-004/FR-005) before making it available, and MUST clearly indicate when an imported template is incompatible with any schema present in the destination vault.
- **FR-017**: System MUST let users delete a vault-owned (non-built-in) presentation template. If it is a schema's default, that schema's default MUST revert to the standard renderer; any entity with it set as a per-entity override MUST fall back per FR-010 rather than error.
- **FR-018**: System MUST use a responsive layout model (sections, responsive rows/columns, cards/panels, field groups, spacing) such that templates remain usable across at least a desktop and a mobile viewport width, and MUST NOT permit arbitrary pixel-based positioning.
- **FR-019**: System MUST make the template syntax versioned or otherwise migratable, so that future changes to supported directives do not silently break previously authored templates (see FR-011 for the unknown-directive behavior this enables).
- **FR-020**: System MUST allow a presentation template to declare the single schema (and its field identifiers) it expects. Reuse of a template across more than one schema via explicit field mapping is out of scope for V1 and deferred to a later version.

### Key Entities

- **Stat Sheet Schema**: Existing entity (out of scope to redefine here) describing which typed fields exist for a category of entity, their types, and validation. Presentation templates reference this by identifier.
- **Presentation Template**: A named, versioned unit of extended-Markdown source plus parsed/validated layout and field-reference metadata. Declares the single schema and fields it expects (V1). Is either built-in (read-only, duplicable) or vault-owned (editable, deletable). Value-free — contains no entity data.
- **Schema Presentation Default**: The presentation template designated as the default for all entities of a given schema, used whenever an entity has no explicit override.
- **Entity Presentation Override**: An optional per-entity override of its schema's default presentation template. When absent, the entity uses the Schema Presentation Default. Independent of both the schema and the template's other consumers.
- **Field Reference**: A binding within a template from a placeholder (e.g. `{{stat.fieldname}}`) to a specific schema field, including an optional display mode and label override. Validated for existence/compatibility against the declared schema.
- **Presentation AST / Validated Model**: The internal, parsed representation of a template after Markdown + directive parsing and validation, used by the renderer instead of re-parsing raw source each time it's known to be unchanged.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can switch an entity between two compatible presentation templates in under 10 seconds, with the same stat values visible in both.
- **SC-002**: A user with no prior exposure to the template syntax can duplicate a built-in template, add one custom field group, and save it as a usable template in under 5 minutes.
- **SC-003**: 100% of import attempts containing raw HTML, script tags, or executable expressions have that content stripped before import completes — none render as live HTML/script in the app.
- **SC-004**: When a referenced schema field is renamed or removed, 100% of affected templates continue to render the rest of the sheet, with only the affected field flagged, rather than failing to render at all.
- **SC-005**: When an entity's selected template becomes invalid or unavailable, the entity's Stat Sheet remains viewable and editable (via fallback rendering) 100% of the time, with zero data loss to the underlying stat values.
- **SC-006**: Exported presentation template files contain zero instances of entity stat values, vault identifiers, or private asset references, verified across all export paths.
- **SC-007**: At least 4 built-in presentation templates are available out of the box and can each be duplicated into an editable copy without altering the original.
- **SC-008**: Templates using the responsive layout directives render usably (no overflow, no unreadable/cut-off content) at both a typical desktop width and a typical mobile width.

## Assumptions

- "Stat Sheet schema" and its field types/validation already exist in the product (per issue #149 reusable stat sheets) and are not being redefined by this feature; this feature only adds a presentation layer on top.
- "Compatible schema" for template selection means exact identity match with the single schema the template declares (see Clarifications); a template is never offered for a different schema even if field names overlap.
- Publishing/marketplace browsing (#1981, #1984) is explicitly out of scope; this feature only needs to produce value-free, portable files consumable by that future flow.
- V1 interactivity is limited to whatever controls the existing standard Stat Sheet renderer already exposes for a bound field (e.g. incrementing an existing counter control); no new interaction types are introduced by the template system itself in V1.
- "Sample/representative values" used in the editor preview can be either the current entity's real values (when previewing against a real entity) or schema-appropriate placeholder values (when previewing with no entity context); the spec does not mandate one over the other.
- "Compact table or repeated list" (FR-013) means rendering multiple scalar field references together as a table/list (standard Markdown tables, or several `FieldReference`s inside a `stat-group`) — it is not a per-field iteration/loop construct. The Stat Sheet schema has no list/array-typed field today, so a directive that repeats a template once per array element is out of scope until such a field type exists.
