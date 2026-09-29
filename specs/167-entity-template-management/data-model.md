# Data Model: Entity Template Management

## EntityTemplate

| Field        | Type                              | Notes                                                                    |
| ------------ | --------------------------------- | ------------------------------------------------------------------------ |
| `id`         | string                            | User: generated id. Built-in: `builtin:{type}`. Legacy: `legacy:{type}`. |
| `name`       | string (1–80)                     | Trimmed, single line. Not unique.                                        |
| `entityType` | string                            | Open-ended category id (`character`, custom categories, …).              |
| `markdown`   | string (0–50,000)                 | The text a new note starts with. Empty means a blank note.               |
| `source`     | `"builtin" \| "user" \| "legacy"` | Derived on load; not stored in user files.                               |
| `version`    | number                            | Format version, currently `1`. Stored in user files.                     |

Stored files keep any extra fields they contain, so later versions can add typed fields without breaking older files.

## TemplateDefaults

`{ version: 1, defaults: { [entityType: string]: templateId } }`

A missing or dangling id means "no chosen default", so resolution falls through the order in FR-018.

## Template Package (import/export)

```json
{
  "kind": "entity-template",
  "formatVersion": 1,
  "template": {
    "name": "...",
    "entityType": "...",
    "markdown": "## Summary\n"
  }
}
```

No id, source, or default state is exported. Import assigns a new id.

## Files on disk (vault OPFS directory)

```text
.codex/templates/
├── {id}.json          # one user template
├── defaults.json      # TemplateDefaults
└── {type}.md          # legacy, read-only to the app
.cc/templates/{type}.md  # legacy, read-only to the app
```

## State and transitions

- **Loading**: `idle → loading → ready | error(partial)`. Malformed files add warnings; the list still becomes `ready`.
- **Template lifecycle (user)**: `create/duplicate/import → saved → edited → saved → deleted`. Delete of a chosen default clears that entry in `defaults.json`.
- **Read-only**: `canEdit=false` disables every mutating transition.
- **Vault switch**: the store reloads for the new vault id and drops the previous snapshot.

## Invariants

- Existing entities are never read or written by any template operation (FR-017, SC-003).
- Exactly zero or one chosen default per entity type.
- Built-in templates are never written to disk.
