# Data Model: 164-answer-community-aggregate

## AnswerAggregate (D1 row)

| Column       | Type    | Constraints                                                 | Notes                                                                  |
| ------------ | ------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `slug`       | TEXT PK | must exist in answer registry (enforced in handler, not FK) | canonical answer slug, e.g. `how-do-you-run-a-heist-in-a-tabletop-rpg` |
| `yes`        | INTEGER | `>= 0`, default 0                                           | community Yes votes                                                    |
| `no`         | INTEGER | `>= 0`, default 0                                           | community No votes (ordering only, never displayed)                    |
| `views`      | INTEGER | `>= 0`, default 0                                           | RESERVED in v1, always 0; view pings deferred (Story 4)                |
| `updated_at` | TEXT    | ISO-8601 UTC                                                | bumped on every write                                                  |

DDL (`migrations/0001_answer_aggregates.sql`):

```sql
CREATE TABLE IF NOT EXISTS answer_aggregates (
  slug TEXT PRIMARY KEY,
  yes INTEGER NOT NULL DEFAULT 0,
  no INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
```

Write SQL (single statement, atomic):

```sql
-- first vote on slug:
INSERT INTO answer_aggregates (slug, yes, no, views, updated_at)
VALUES (?1, ?2, ?3, 0, ?4)
ON CONFLICT(slug) DO UPDATE SET
  yes = yes + ?2, no = no + ?3, updated_at = ?4;
```

Top query (v1: no `views` involvement — column stays 0):

```sql
SELECT slug, yes, no FROM answer_aggregates
WHERE yes >= ?1;
```

(Sort in JS over the ≤101 qualifying rows — more testable than SQL ordering. Deterministic: `yes DESC → yes/(yes+no) DESC → slug ASC`. `LIMIT` applied after sort.)

## HelpfulnessLabel (derived, never stored)

- Eligible iff `yes >= 10` (`MIN_PUBLIC_YES`).
- Copy: `N readers found this helpful` (N = `yes`). No ratio, no `No` mention.

## CommunityTop (derived, never stored)

- Inputs: all rows with `yes >= 10`, ordered by score above.
- Output: first 6 (`MAX_STRIP_ITEMS`); section rendered only if length ≥ 4 (`MIN_QUORUM_SLUGS`).

## Validation rules

- `slug`: non-empty, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, must be in registry allowlist → else 404.
- `value`: exactly `yes` | `no` → else 400.
- `previous` (optional): exactly `yes` | `no`, must differ from `value` → else ignored (treated as fresh vote).
- `limit` (top): int 1–10, default 6.
- `slugs` (by-slugs): 1–10 slugs, same format; unknown ones silently dropped from response (not an error).

## State transitions

- `none --vote(value)--> {value:1}` · `--vote(value, previous≠value)--> {previous-1, value+1}` (decrement floored at 0) · `--vote(same as previous)--> no-op (200, unchanged)`.
- No deletion API in v1 (ops truncate only).
