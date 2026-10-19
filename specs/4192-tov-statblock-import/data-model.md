# Data Model: Import a ToV Stat Block from Pasted Text

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

No persisted schema changes. Everything below is transient, in memory for one import session, except what is saved through the existing entity fields (`statSheet`, `labels`, `content`).

## ImportRequest

| Field      | Type                                 | Rules                                                                                                                                              |
| ---------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`   | string                               | 1–12,000 chars after Foundry noise stripping (R5). Refused otherwise.                                                                              |
| `mode`     | `"copy"` \| `"convert-5e"`           | Default `"copy"`. `"convert-5e"` is not allowed when the reader is `rules`.                                                                        |
| `kindHint` | `"creature"` \| `"npc"` \| undefined | Set by the controller from the existing sheet's template (Monster → creature, NPC → npc). The prompt passes it as a hint; the GM can still switch. |
| `reader`   | `"ai"` \| `"rules"`                  | `"rules"` when AI is disabled, or when the GM picks it after an AI error.                                                                          |

## ReadResult

Produced by both readers (AI and rule-based). This is what the review screen edits.

| Field        | Type                                                        | Rules                                                                              |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `kind`       | `"creature"` \| `"npc"`                                     | Reader's guess; the GM can change it (FR-008).                                     |
| `name`       | string \| null                                              | Used for the new entity title (FR-018).                                            |
| `values`     | `CreatureValues` or `NpcValues`                             | Every leaf optional and nullable. **No defaults.**                                 |
| `notes`      | `FieldNote[]`                                               | Sparse; one per value that is not plainly **found**.                               |
| `leftovers`  | `{ label: string; text: string }[]`                         | Parsed content with no sheet field (FR-015), e.g. lair actions, spellcasting.      |
| `looksLike`  | `"tov"` \| `"5e"` \| `"unknown"`                            | Feeds the 5e notice (FR-010, R9).                                                  |
| `reader`     | `"ai"` \| `"rules"`                                         | Shown on the review screen (Story 5 notice).                                       |
| `outcome`    | `"ok"` \| `"no-stat-block"` \| `"several"` \| `"character"` | Edge cases. Anything other than `"ok"` stops before review.                        |
| `candidates` | `{ name: string; index: number }[]`                         | Present when `outcome === "several"`; the GM picks one and the read re-runs on it. |

### CreatureValues

The same keys as `TovCreatureData` (`packages/stat-sheet-engine/src/rules-sources/tov-generator-mapping.ts`), each optional and nullable: `size`, `creatureType`, `subtype`, `alignment`, `cr`, `proficiencyBonus`, `doom`, `ac`, `acDetails`, `hp`, `hitDice`, `speed`, `abilityScores.{str…cha}`, `saveProficiencies`, `skillProficiencies`, `damageVulnerabilities`, `damageResistances`, `damageImmunities`, `conditionImmunities`, `senses`, `languages`, `traits[]`, `actions[]`, `bonusActions[]`, `reactions[]`, `legendaryActions[]`.

### NpcValues

The same keys as `TovQuickNpcData`, each optional and nullable: `cr`, `ac`, `hp`, `hitDice`, `speed`, `attackName`, `attackBonus`, `attackFormula`, `damageFormula`, `damageType`, `luck`, `abilityScores.{str…cha}`, `keySaves`, `keySkills`, `notes`.

## FieldNote

| Field      | Type                                                                                                                           | Rules                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `path`     | string                                                                                                                         | Dot path into `values`, e.g. `abilityScores.dex`, `actions.1.damageFormula`.                                |
| `state`    | `"check"` \| `"converted"` \| `"derived"`                                                                                      | `check` = uncertain, malformed or not in source. `derived` = R6 (PB from CR).                               |
| `reason`   | `"uncertain"` \| `"malformed"` \| `"not-in-source"` \| `"out-of-range"` \| `"unmarked-change"` \| `"converted"` \| `"from-cr"` | For the review text. `unmarked-change` = convert mode, number not in source and no `converted` note (R2.5). |
| `source`   | string, optional                                                                                                               | Snippet of the pasted text behind the value (FR-014).                                                       |
| `original` | string \| null, optional                                                                                                       | For `converted`: the 5e value, or `null` meaning "added".                                                   |

### Field state (derived, per value)

```text
value null/absent                 → not found
note.state = "check"              → check this
note.state = "converted"          → converted
note.state = "derived"            → found (labelled "worked out from CR")
otherwise                         → found
GM edits a value                  → corrected (treated as found; any check note is cleared)
```

## Save validity (FR-015a)

`canSave` is true when `ac`, `hp` and `cr` each have a value after the merge preview: either found or corrected in the read result, or already present on the existing sheet.

## MergePlan (FR-017, R7)

| Field        | Type                                                       | Rules                                                                     |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `templateId` | `builtin-tov-monster` \| `builtin-tov-npc`                 | From `kind`.                                                              |
| `writes`     | `{ fieldId: string; before: unknown; after: unknown }[]`   | Only sheet fields whose source paths are all found, corrected or derived. |
| `overwrites` | subset of `writes` where `before` is non-empty and differs | Shown on the confirmation step.                                           |
| `untouched`  | string[]                                                   | Sheet field ids kept as-is (not found, or GM custom fields).              |
| `blocked`    | `"template-mismatch"` \| null                              | The existing sheet uses a different template; the GM must switch first.   |

## Saved entity changes

| Existing field | Change                                                                               |
| -------------- | ------------------------------------------------------------------------------------ |
| `statSheet`    | `MergePlan.writes` applied (existing entity), or the full mapped sheet (new entity). |
| `labels`       | `"Converted from 5e"` added when mode was `convert-5e` (FR-020, R10).                |
| `content`      | "Original stat block" section appended only when the opt-in is ticked (FR-021, R11). |
| `title`/`type` | New entity only: `name` and the vault's creature or NPC category (FR-018).           |

## State transitions (import session)

```text
idle → reading → (no-stat-block | several | character | error) → idle or reading
reading → reviewing → confirming (only if overwrites non-empty) → saved
reviewing | confirming → cancelled (vault unchanged, FR-016)
error → reading (retry) | reading with reader = rules
```
