# Phase 1 Data Model: Bestiary & Creature Catalogue Packs

## Entities

### CreaturePack

A named, curated collection of creatures tagged by genre/theme.

| Field         | Type                  | Notes                                                                         |
| ------------- | --------------------- | ----------------------------------------------------------------------------- |
| `id`          | `string`              | Stable slug, e.g. `fantasy-bestiary`. Unique across the registry.             |
| `name`        | `string`              | User-facing display name, e.g. "Classic Fantasy Bestiary" (Natural Language). |
| `description` | `string`              | One-line summary shown on the pack card.                                      |
| `genre`       | `string`              | e.g. `fantasy`. Used for grouping/filtering in later phases.                  |
| `entries`     | `CreaturePackEntry[]` | 12–20 entries (sensible size; avoids flooding).                               |

**Validation rules**:

- `id` non-empty, unique within the registry, slug-safe.
- `entries.length` within 1–25 (target 12–20).
- Entry titles unique within a pack (case-insensitive).

### CreaturePackEntry

One creature within a pack.

| Field         | Type                  | Notes                                                               |
| ------------- | --------------------- | ------------------------------------------------------------------- |
| `title`       | `string`              | Creature name, e.g. "Goblin".                                       |
| `description` | `string`              | Short summary (the entity's `chronicle`/summary).                   |
| `habitat`     | `string`              | Environment/where found.                                            |
| `behaviour`   | `string`              | Typical behaviour/temperament.                                      |
| `threatLevel` | `string`              | System-neutral threat descriptor, e.g. "Low", "Moderate", "Deadly". |
| `variants`    | `string[]`            | Common variants, e.g. ["Hobgoblin", "Bugbear"].                     |
| `hooks`       | `string[]`            | Adventure/story hooks.                                              |
| `combatNotes` | `string \| undefined` | Optional system-neutral combat notes (no edition stat block).       |

**Validation rules**:

- `title`, `description` non-empty.
- All entries map to vault entity category `creature` (no exceptions).

### Imported Creature Entity (output, existing schema)

The normal vault `creature` entity produced from an entry — fully editable after import.

- `type`: `"creature"` (via the widened import rail).
- `content`/`lore`: rendered from the entry per the creature template section order
  (Summary, Habitat, Behaviour, Threat Level, Variants, Story Hooks, optional Combat Notes).
- `labels`: includes `creature-pack` (origin marker — a **Label**, per Constitution XII). This is a
  deliberate, distinct marker from the document-import rail's `imported-draft` default: pack-sourced
  creatures are curated content, not parsed drafts, so they carry their own origin label.
- No new fields added to the existing `Entity` schema.

## Derived / Intermediate

### DiscoveredEntity (existing, from `@codex/importer`)

The mapper output consumed by `ReviewList`. Relevant fields:

| Field                | Set by mapper to                                                        |
| -------------------- | ----------------------------------------------------------------------- |
| `id`                 | temp id from slugified title                                            |
| `suggestedTitle`     | `entry.title`                                                           |
| `suggestedType`      | `"Creature"` (requires union widening — see contracts)                  |
| `chronicle`          | `entry.description`                                                     |
| `lore` / `content`   | template-rendered markdown body                                         |
| `frontmatter.labels` | `["creature-pack"]` (+ optional pack id label)                          |
| `matchedEntityId`    | existing vault entity id when a same-id creature exists, else undefined |
| `confidence`         | `1` (curated content)                                                   |
| `detectedLinks`      | `[]` for P1 (no cross-links in v1)                                      |

## Relationships

- `CreaturePack` 1—N `CreaturePackEntry`.
- `CreaturePackEntry` 1—1 `DiscoveredEntity` (via mapper) 1—1 `Imported Creature Entity` (via importer
  save path, when selected and not a duplicate).

## State / Flow

```
registry.listPacks() ─▶ user picks pack
        │
        ▼
packToDiscoveredEntities(pack, existingTitles) ─▶ DiscoveredEntity[]
        │  (sets matchedEntityId for existing titles)
        ▼
ImportSettings: discoveredEntities = result; step = "review"
        ▼
ReviewList (preview, matched entries deselected) ─▶ onSave(selected)
        ▼
existing import save path ─▶ creature entities written to vault
```
