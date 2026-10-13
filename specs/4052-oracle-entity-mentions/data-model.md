# Data Model: Oracle Entity @Mentions

## Mention (stored)

| Field          | Type   | Notes                                                               |
| -------------- | ------ | ------------------------------------------------------------------- |
| `entityId`     | string | Stable ID; the only thing used to resolve.                          |
| `displayName`  | string | Title at selection time; used for the token text and as a fallback. |
| `entityType`   | string | Category ID at selection time.                                      |
| `start`, `end` | number | Character range of `@displayName` in the message text.              |

- Saved as an optional `mentions: Mention[]` on `ChatMessage`. Missing field means no mentions (old history stays valid).
- Validation on save and load: ranges inside the text, non-overlapping, and `text.slice(start,end) === "@" + displayName`; invalid items are dropped and the text stays as plain text.
- Serialization is plain JSON; no IDs appear in the message text.

## Draft mentions (in memory)

Same shape as Mention. Edits shift or drop ranges (clarification Q3). Cleared on send, on clear, and on Vault switch.

## MentionSuggestion (transient)

`entityId`, `title`, `matchedAlias?`, `entityType`, `descriptor?` (short summary or first line), `disambiguator?` (for example the parent or a second line when titles collide).

## ResolvedMention (transient, result of `resolve`)

| Status        | Meaning                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| `resolved`    | Entity exists in the active Vault and is visible.                                      |
| `ambiguous`   | An untracked `@name` has several candidates (list attached).                           |
| `unavailable` | Entity missing, hidden, or from another Vault. Treated as plain text; no content sent. |
| `unmatched`   | An untracked `@name` has no candidate.                                                 |

## PinnedContext (transient, sent to retrieval)

`pinnedEntityIds: string[]` in mention order. The first is the primary entity. The context builder returns pinned entities in full, then bounded one-line summaries of directly linked entities.

## State transitions

Draft text edit -> mentions re-validated -> Send -> `resolve` -> (ambiguous: user chooses or sends as text) -> message saved with resolved mentions -> retrieval with `pinnedEntityIds`.
