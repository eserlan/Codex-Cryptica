# Data Model: Solo Play Loop

No vault, IndexedDB or OPFS schema change. Two journal entry types are added; journal entries are untyped strings today, so nothing migrates.

## SoloSession (extended from spec 172)

Key `codex-solo-session:<vaultId>`, still `version: 1`. New optional fields; a Phase 1 record without them parses with the defaults shown.

| Field      | Type                                            | Rules                                                                                                                                                       | Default when absent                                      |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `partyIds` | `string[]`                                      | At most 12; each non-empty; no duplicates. Ids of Character entities; ids no longer in the vault are dropped when shown and pruned on the next write.       | `[]`                                                     |
| `scenes`   | `{ name: string; sectionId: string \| null }[]` | At most 100, in order. `name` trimmed, at most 80 characters. The current scene is the last one made current, mirrored in `sceneName` and `sceneSectionId`. | One entry from `sceneName` if it is non-empty, else `[]` |

Validation stays in `parseSoloSession`. A malformed new field makes the whole record read as no session, which is the same rule as the Phase 1 fields.

## SoloTablePins (new)

Key `codex-solo-table-pins:<vaultId>`. Value: JSON array of up to 3 distinct random-table ids. Unknown ids are skipped when shown and pruned on the next write. An unreadable value reads as `[]`.

## Journal entry types (new)

| Type               | Written when                                | Content                                                              |
| ------------------ | ------------------------------------------- | -------------------------------------------------------------------- |
| `generated-result` | A generator draft reaches review            | "Generated NPC: Mara One-Eye — a one-eyed smuggler…" (summary ≤ 280) |
| `generated-saved`  | That draft is saved from the generator      | "Saved Mara One-Eye to the Vault as a Character."                    |
| `party-change`     | The solo party changes while a journal runs | "Party: Kael joined. Brother Ivo left."                              |

All three go through `captureToEntryInput`, so existing length limits apply.

## Derived (not stored)

- **Recent results**: `recentResults(journal.entries, 10)`, newest first, excluding the bookkeeping entries `party-change` and `generated-saved`.
- **Suggested category**: `suggestCategory(entryType, generatorId, categoryIds)`, falling back to `note` when the suggested category is not in the vault.
- **Oracle shortcut prompt**: `buildOracleShortcutPrompt(kind, { sceneName, mapName, partyNames, recent })`, at most 1,200 characters.

## State transitions added to the session

| Transition                     | Preconditions                  | Effects                                                                                                                                                                                    |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `setParty(ids)`                | Active session                 | Writes `partyIds` (deduplicated, at most 12). If the journal runs, appends a `party-change` entry for the difference.                                                                      |
| `setScene(name)` (extended)    | As Phase 1                     | Also appends `{ name, sectionId }` to `scenes`.                                                                                                                                            |
| `renameScene(name)` (extended) | As Phase 1                     | Also renames the current item in `scenes`.                                                                                                                                                 |
| `returnToScene(index)`         | Active session; index in range | Starts a new visit: `setScene("<base name> (n)")`, where n is the next visit number for that base name. A new section is created and appended to `scenes`; earlier sections are unchanged. |
