# Quickstart: Markdown-Based Presentation Templates for Stat Sheets

Manual smoke test covering the P1 stories end-to-end, once implemented.

## 1. Switch presentation without touching data (User Story 1)

1. Open an entity with an existing populated Stat Sheet (any schema with a built-in default template).
2. In the Stat Sheet tab, open the presentation picker and select a different built-in template compatible with that schema (e.g. "Compact Stat Block").
3. Confirm the layout changes but every field value is identical to before.
4. Edit a value through the new layout's controls (e.g. increment a counter).
5. Switch back to the original presentation and confirm the edited value carries over.

## 2. Author a custom template (User Story 2)

1. Open the Stat Sheet template management area → Presentation Templates.
2. Duplicate a built-in template (e.g. "Standard Form") targeting a schema you have entities for.
3. In the editor, add a heading, a table, and a `:::stat-group columns=2` block with two `{{stat.<fieldId>}}` references (use the field autocomplete to insert valid ids).
4. Confirm the live preview reflects the group and renders sample values.
5. Type a `{{stat.doesNotExist}}` reference and confirm the editor flags it before you can save.
6. Fix it, save, and confirm the new template appears in the picker for entities using that schema, and does NOT appear for entities on other schemas.

## 3. Safe fallback behavior (User Story 3)

1. On the schema used above, rename or remove the field referenced by the saved template.
2. Open an entity using that template and confirm the sheet still renders, with the affected field visibly flagged, and no data loss.
3. Attempt to import a `.md` template file containing a raw `<script>` tag.
4. Confirm the import completes with the script content stripped and a notice listing what was removed.
5. Manually corrupt an entity's `presentationTemplateId` (or delete the template it points to) and confirm the entity falls back to the standard renderer rather than erroring.

## 4. Export/import portability (User Story 4)

1. Export the custom template created in step 2.
2. Open the exported file and confirm it contains only Markdown source and field-reference metadata — no entity values, vault id, or asset references.
3. Import it into a vault with no matching schema and confirm the app clearly reports the incompatibility rather than silently attaching it elsewhere.

## Automated coverage (see tasks.md once generated)

Each step above should have a corresponding automated test (unit test for the parser/validator in the new engine package per `contracts/presentation-engine-api.md`, component/integration test for the Svelte renderer and editor, per Constitution II TDD).
