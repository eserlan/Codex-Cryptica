# Data Model: Markdown-Based Presentation Templates for Stat Sheets

## PresentationTemplate

Vault-owned or built-in record describing one presentation for exactly one Stat Sheet schema (V1: single-schema only, per Clarifications).

| Field                     | Type           | Notes                                                                                                                          |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`                      | string         | Stable identifier (uuid for vault-owned; fixed slug for built-ins)                                                             |
| `vaultId`                 | string \| null | `null` for built-ins; owning vault id for vault-owned templates                                                                |
| `schemaTemplateId`        | string         | The `StatSheetTemplateSchema.id` (existing entity) this presentation targets. Immutable after fields are validated against it. |
| `name`                    | string         | Unique within `(vaultId, schemaTemplateId)` — see Validation Rules                                                             |
| `description`             | string \| null | Optional author-facing summary                                                                                                 |
| `source`                  | string         | Raw extended-Markdown source (authoritative)                                                                                   |
| `formatVersion`           | number         | Template-syntax version this source was authored against (enables FR-019 migration/unknown-directive handling)                 |
| `isBuiltIn`               | boolean        | `true` → read-only, duplicable only; `false` → vault-owned, editable/deletable                                                 |
| `createdAt` / `updatedAt` | ISO string     | Standard bookkeeping                                                                                                           |

Derived (not persisted, recomputed on load/edit): `PresentationAst` — the parsed+validated representation described below. Cached in memory only; `source` is always the durable truth, consistent with `formatVersion` allowing safe re-parse after a syntax migration.

## PresentationAst (parsed, validated, in-memory)

Tree of typed nodes produced by the Parse → Validate stage (see research.md §3). Node kinds, all closed/allowlisted — never raw HTML:

- `Heading(level, inline[])`
- `Paragraph(inline[])`
- `List(ordered, items: inline[][])`
- `Table(header: inline[][], rows: inline[][][])`
- `Blockquote(block[])`
- `ThematicBreak`
- `Image(src, alt)` — safe-scoped per FR-002 (same URI allowlist as existing `renderMarkdown`)
- `Section(title?, block[])`
- `Group(columns, block[])` (`:::stat-group`)
- `Card(block[])` / `Row(block[])` — sibling containers to `Group`
- `FieldReference(fieldId, displayMode?, label?)` — inline node bound to a schema field
- `UnknownDirective(name, raw)` — anything not in the allowlisted directive set; always rendered as a visible flagged placeholder (FR-011), never executed or silently dropped
- `MissingField(fieldId)` — a `FieldReference` whose `fieldId` failed validation against the schema (FR-009); replaces the `FieldReference` node at validation time so the renderer doesn't need to re-check

A template's `PresentationAst` is either **valid** (usable for rendering, though it may still contain `MissingField`/`UnknownDirective` nodes that render as flags) or **invalid** (failed to parse at all, or its declared `schemaTemplateId` no longer exists) — only the invalid case triggers the FR-010 fallback to the standard renderer.

## SchemaPresentationDefault

**Revised during implementation**: rather than a field on the `StatSheetTemplateSchema` record itself, this is stored as a vault-scoped map (`schemaTemplateId -> PresentationTemplate.id`) in IndexedDB `settings` (key `statSheetPresentationDefaults_${vaultId}`), read/written via `StatSheetTemplateStore.presentationDefaults` (`apps/web/src/lib/stores/stat-sheet-templates.svelte.ts`) — the same pattern already used for `categoryDefaults`/`enabledTemplateIds` on that store. This was necessary because built-in schema templates (`BUILT_IN_STAT_SHEET_TEMPLATES`) are hardcoded objects, not IndexedDB records, so there is no persisted record to attach a field to; a parallel settings map works uniformly for both built-in and vault-owned schemas.

| Concept                                  | Type                | Notes                                                                                                 |
| ---------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `presentationDefaults[schemaTemplateId]` | string \| undefined | `PresentationTemplate.id`; absent = use the standard (non-templated) renderer as the schema's default |

## EntityPresentationOverride

Extends the entity's existing `statSheet` frontmatter block with one new optional field:

| Field                    | Type           | Notes                                                                                          |
| ------------------------ | -------------- | ---------------------------------------------------------------------------------------------- |
| `presentationTemplateId` | string \| null | Per-entity override of the schema default; `null`/absent = inherit `SchemaPresentationDefault` |

## FieldReference (authoring-time binding)

Not a separate storage entity — a structural part of `PresentationAst`, but validated against `StatSheetField` (existing) at parse time:

| Field         | Type           | Notes                                                                                                                                                       |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fieldId`     | string         | Must exist on the schema's field list to resolve (else becomes `MissingField`)                                                                              |
| `displayMode` | enum \| null   | One of the FR-013 display modes; must be compatible with the field's `StatSheetFieldTypeSchema` type or falls back to that type's default mode (Edge Cases) |
| `label`       | string \| null | Override for the field's own label                                                                                                                          |

## PresentationTemplatePackage (export/import envelope)

Modeled on `@codex/stat-sheet-engine`'s existing `PublicTemplatePackage` pattern (`template-package.ts`).

| Field                  | Type   | Notes                                                                                                                          |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `formatVersion`        | number | Package envelope version (independent of `PresentationTemplate.formatVersion`, which is the Markdown-directive-syntax version) |
| `name` / `description` | string |                                                                                                                                |
| `schemaTemplateId`     | string | Declared target schema identifier — used to detect incompatibility on import (FR-016)                                          |
| `source`               | string | Raw Markdown source only                                                                                                       |
| —                      | —      | Explicitly excludes: entity stat values, vault id, private asset references (FR-015/SC-006)                                    |

## Validation Rules

- `PresentationTemplate.name` MUST be unique within `(vaultId, schemaTemplateId)`; a save that collides MUST either auto-suffix or block, never silently overwrite (Edge Cases, Clarifications).
- `PresentationTemplate.schemaTemplateId` MUST reference an existing `StatSheetTemplateSchema`; V1 has exactly one schema per template (Clarifications — cross-schema reuse deferred).
- Deleting a `PresentationTemplate` that is a schema's default MUST remove that schema's entry from `presentationDefaults` (FR-017).
- Deleting a `PresentationTemplate` that is referenced by any `EntityPresentationOverride` MUST NOT block the delete; affected entities fall back per FR-010 on next render (no data migration needed since the override is just an id reference that becomes dangling → treated as invalid → fallback).
- Import MUST strip disallowed content and proceed with the remainder (Clarifications), never reject the whole file outright.

## State / Lifecycle

```text
[create from scratch] ──┐
[duplicate built-in]  ──┼──> Draft (unsaved, editor-only) ──save──> Vault-owned PresentationTemplate
[duplicate vault-owned]─┘                                              │
                                                                        ├── set as schema default (optional)
                                                                        ├── selected as entity override (optional)
                                                                        ├── exported (optional)
                                                                        └── deleted ──> defaults/overrides referencing it fall back
```

Built-in templates never leave the "read-only, duplicable" state — there is no built-in → edited transition; duplication always produces a new vault-owned record (Edge Cases).
