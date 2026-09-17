# Tiny LLM visibility benchmark (#2850)

Two fixed queries, checked by hand against public LLMs, rechecked after
indexing settles. This is a logbook, not automation: external model answers
cannot be queried from CI, so each run takes a few minutes in a browser.

## Frozen queries

1. **Best heist generator for tabletop RPG campaigns**
2. **How do you design RPG puzzles that do not stall the game?**

Query 1 is the fixed benchmark from the issue. Query 2 is provisional: it is
the question of the puzzle page already receiving organic traffic, per the
cluster map. If Search Console later shows a different puzzle query earning
the traffic, freeze that wording here and note the change below.

## Protocol

Ask each query verbatim, in a fresh conversation, to at least two of:
ChatGPT, Claude, Gemini. Record per model:

- `linked` — Codex Cryptica cited with a link to the canonical page.
- `mentioned` — Codex Cryptica named without a link.
- `absent` — no mention.

Use the canonical pages as the reference targets: `/generators/heist` for
query 1, `/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game`
for query 2. A mention of any other Codex page counts as `mentioned`, not
`linked`.

## Results log

| Date       | Query | Model | Result | Notes                |
| ---------- | ----- | ----- | ------ | -------------------- |
| 2026-09-17 | 1     | —     | —      | Baseline run pending |
| 2026-09-17 | 2     | —     | —      | Baseline run pending |
| 2026-10-15 | 1     | —     | —      | Four-week recheck    |
| 2026-10-15 | 2     | —     | —      | Four-week recheck    |

## Query changes

None. If the puzzle benchmark query is refrozen from Search Console data,
record the old wording, the new wording, and the date here.
