# D&D 5e Monster stat-sheet template — field ID reference

Template id: `builtin-dnd5e-monster` (defined in
`apps/web/src/lib/stores/stat-sheet-templates.svelte.ts`, schema in
`packages/schema/src/stat-sheet.ts`).

This is the canonical target template for D&D-compatible stat-block import,
starting with the MonsterLabs round-trip (Codex lore → MonsterLabs mechanics
→ Codex playable stat block, #2871–#2873). Field `id`s below are stable —
an import adapter can target them directly by id rather than by label, and
should not need to change when the field's label copy changes.

Sibling template: `builtin-dnd-npc` remains the lightweight quick-stats
block (`hp`, `ac`, `atk`) for NPCs that don't need a full stat block.

## Field types

See `StatSheetFieldTypeSchema` in `packages/schema/src/stat-sheet.ts` for the
authoritative type list. Relevant to this template:

- `text` — short single-line string.
- `longtext` — free-form prose, preserved as editable rules text.
- `number` — plain numeric value.
- `counter` — a `value`/`min`/`max` tracker (HP).
- `dice` — a roll formula (e.g. `"1d20+3"`). A `dice` field with
  `modifierSource: "<field-id>"` set has its trailing `+N`/`-N` term
  recomputed from that other (numeric) field's ability-score modifier —
  see `applyDerivedModifiers` in
  `apps/web/src/lib/utils/stat-sheet-field-actions.ts`.
- `item-table` — a repeatable list of rows under fixed `columns`. Used here
  for Actions/Bonus Actions/Reactions/Legendary Actions so each entry keeps
  a rollable attack and damage formula instead of collapsing into prose.
- `heading` — a non-data section divider (`sec_*` ids below); never holds a
  value and import adapters should skip these.

## Identity

| Field id            | Type   | Notes                                                                       |
| ------------------- | ------ | --------------------------------------------------------------------------- |
| `size`              | text   | e.g. "Large"                                                                |
| `creature_type`     | text   | e.g. "Dragon"                                                               |
| `subtype`           | text   | Subtype/tags, e.g. "shapechanger"                                           |
| `alignment`         | text   | Optional                                                                    |
| `cr`                | text   | Challenge Rating — text, not number, to hold fractional CRs (1/8, 1/4, 1/2) |
| `proficiency_bonus` | number |                                                                             |

## Defence & movement

| Field id      | Type    | Notes                                                        |
| ------------- | ------- | ------------------------------------------------------------ |
| `ac`          | number  | Armor Class                                                  |
| `ac_details`  | text    | AC source, e.g. "natural armor"                              |
| `hp`          | counter | Current HP as an in-play tracker; `max` holds the HP maximum |
| `hit_dice`    | text    | Hit-dice expression, e.g. "8d10+16"                          |
| `speed`       | text    | e.g. "30 ft."                                                |
| `speed_modes` | text    | Additional movement modes: fly/swim/climb/burrow             |

## Ability scores

`str_score`, `dex_score`, `con_score`, `int_score`, `wis_score`, `cha_score`
— all `number`. Any `dice` field elsewhere in the template that sets
`modifierSource` to one of these ids derives its bonus from it automatically.

## Saving throws

`str_save`, `dex_save`, `con_save`, `int_save`, `wis_save`, `cha_save` — all
`dice`, each with `modifierSource` set to the matching `*_score` field.
Formula defaults to `"1d20+0"`; a monster proficient in a given save should
have that field's formula bonus adjusted (proficiency bonus is not folded
in automatically — only the ability modifier is).

## Skills

| Field id             | Type   | Derived from                              |
| -------------------- | ------ | ----------------------------------------- |
| `perception`         | dice   | `wis_score`                               |
| `stealth`            | dice   | `dex_score`                               |
| `athletics`          | dice   | `str_score`                               |
| `arcana`             | dice   | `int_score`                               |
| `insight`            | dice   | `wis_score`                               |
| `persuasion`         | dice   | `cha_score`                               |
| `other_skills`       | text   | Free text for any skill not covered above |
| `passive_perception` | number |                                           |

## Defences, senses & languages

All `text`: `damage_vulnerabilities`, `damage_resistances`,
`damage_immunities`, `condition_immunities`, `senses`, `languages`.

## Traits & spellcasting

| Field id       | Type     | Notes                                          |
| -------------- | -------- | ---------------------------------------------- |
| `traits`       | longtext | Traits / special abilities, preserved as prose |
| `spellcasting` | longtext | Spellcasting / innate spellcasting block       |

## Actions

| Field id      | Type       | Notes                                                                                                                                                      |
| ------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `multiattack` | text       | Multiattack description                                                                                                                                    |
| `actions`     | item-table | Columns: `name` (text), `attack` (dice), `damage` (dice), `description` (text). `linkVaultItems: false` — rows are action entries, not linked vault items. |

## Bonus actions & reactions

`bonus_actions` and `reactions` — both `item-table` with the same columns as
`actions` (`name`/`attack`/`damage`/`description`).

## Legendary & lair actions

| Field id                  | Type       | Notes                                                                                           |
| ------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `legendary_actions_intro` | text       | Usage line, e.g. "Can take 3 legendary actions..."                                              |
| `legendary_actions`       | item-table | Columns: `name` (text), `cost` (number), `description` (text)                                   |
| `lair_actions`            | longtext   | Lair actions / regional effects, kept as prose since these rarely carry a per-entry attack roll |

## Section headings

Every `sec_*` field id (`sec_identity`, `sec_defence`, `sec_scores`,
`sec_saves`, `sec_skills`, `sec_defences_senses`, `sec_traits`,
`sec_actions`, `sec_bonus_reactions`, `sec_legendary`) is a `heading` field —
a visual divider only, never populated with a value.
