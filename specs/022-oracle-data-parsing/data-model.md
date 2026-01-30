# Data Model: Intelligent Oracle Data Separation

## Entities

### OracleParseResult
Represents the split content from an Oracle generation.

| Field | Type | Description |
|-------|------|-------------|
| `chronicle` | `string` | The short summary or description (intended for Node `content` field). |
| `lore` | `string` | The detailed history or background (intended for Node `lore` field). |
| `wasSplit` | `boolean` | True if the content was successfully separated into two distinct parts. |

## Logic Rules

### Marker Detection
The parser searches for the following regex patterns (case-insensitive):
- `/(?:^|\n)(?:##?|\*\*)\s*(Chronicle|Summary)\s*(?::)?(?:\r?\n)+(.*?)((?=\n(?:##?|\*\*))|$)/si`
- `/(?:^|\n)(?:##?|\*\*)\s*(Lore|History|Details)\s*(?::)?(?:\r?\n)+(.*?)((?=\n(?:##?|\*\*))|$)/si`

### Heuristic Fallback
If no markers are found:
1. Split by `\n\n`.
2. First block -> `chronicle`.
3. Join the rest -> `lore`.
4. If only one block exists -> `lore` (Chronicle remains empty or uses a trimmed version of lore if desired, but default is empty to avoid duplication).
