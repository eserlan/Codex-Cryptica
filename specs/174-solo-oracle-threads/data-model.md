# Data Model: Solo Oracle and Threads

## SoloSession (extended)

Stored in `localStorage` as `codex-solo-session:<vaultId>`, still `version: 1`.

| Field     | Type             | Rule                                                                                                                                                |
| --------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tension` | number, optional | An integer from 1 to 9. Missing reads as 5. Out of range or not an integer makes the record invalid (it reads as no session), as with other fields. |

All Phase 1 and 2 fields are unchanged.

## Thread

Stored in the vault in `.codex/threads.json`.

| Field         | Type                                               | Rule                                                                                                             |
| ------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`          | string                                             | Non-empty and unique within the file.                                                                            |
| `title`       | string                                             | Trimmed, 1 to 120 characters.                                                                                    |
| `kind`        | `"question" \| "lead" \| "objective" \| "mystery"` | Required.                                                                                                        |
| `note`        | string                                             | 0 to 500 characters.                                                                                             |
| `status`      | `"open" \| "closed"`                               | Required.                                                                                                        |
| `closingNote` | string                                             | 0 to 500 characters. Kept when reopened, so the history stays.                                                   |
| `entityIds`   | string[]                                           | Unique, at most 20. Ids that are no longer in the vault are dropped when read for display and on the next write. |
| `createdAt`   | number                                             | A timestamp.                                                                                                     |
| `updatedAt`   | number                                             | A timestamp, at or after `createdAt`.                                                                            |

**State transitions**: open → closed (close, with an optional closing note) → open (reopen). Any state → deleted (after confirmation).

## ThreadsFile

| Field     | Type     | Rule                                                                  |
| --------- | -------- | --------------------------------------------------------------------- |
| `version` | `1`      | Any other value reads as no threads, and the file is not overwritten. |
| `threads` | Thread[] | At most 200. Invalid items are skipped, and the valid ones are kept.  |

## Likelihood

`"very_unlikely" | "unlikely" | "even" | "likely" | "very_likely"`, with `"even"` as the default.

## OracleAnswer (not stored; shown, then journaled)

| Field        | Type                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `question`   | string, 0 to 200 characters                                           |
| `likelihood` | Likelihood                                                            |
| `roll`       | 1 to 100                                                              |
| `answer`     | `"Yes, and" \| "Yes" \| "Yes, but" \| "No, but" \| "No" \| "No, and"` |
| `event`      | RandomEvent or null                                                   |
| `eventRoll`  | 1 to 100                                                              |

## RandomEvent (not stored; shown, then journaled)

| Field     | Type                                                                                       |
| --------- | ------------------------------------------------------------------------------------------ |
| `focus`   | one of 10 focus ids, each with a label                                                     |
| `action`  | one of 30 action words                                                                     |
| `subject` | `{ kind: "thread" \| "party" \| "place" \| "newcomer"; label: string; threadId?: string }` |
| `text`    | one sentence, for example: "A thread moves: _Why is the keeper lying?_ — reveal."          |

## CaptureKind

`"dice" | "tables" | "decks" | "map-moves" | "scenes" | "oracle" | "tension" | "threads" | "party" | "generated"`

## SessionJournal (extended)

Stored in IndexedDB `session_journals`, with no migration.

| Field        | Type                    | Rule                                                                                                                |
| ------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `captureOff` | CaptureKind[], optional | Missing means everything is captured. Combined with `captureMapMoves: false` (which still means map moves are off). |

## Journal entry types (new)

| Entry type       | Kind    | Content example                                                                 |
| ---------------- | ------- | ------------------------------------------------------------------------------- |
| `oracle-answer`  | oracle  | `Oracle (Likely): "Is the guard asleep?" — Yes, but (34)`                       |
| `random-event`   | oracle  | `Random event: A thread moves: Why is the keeper lying? — reveal.`              |
| `tension-change` | tension | `Tension: 5 → 6`                                                                |
| `thread-change`  | threads | `Thread opened (mystery): Why is the keeper lying?` / `Thread closed: … — note` |
