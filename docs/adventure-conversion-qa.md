# Adventure Conversion QA

**Gate status: Incomplete.** No live two-model runs and no human walkthrough have been recorded yet. The deterministic scorer is ready (`scoreAdventureConversion` in `packages/adventure-engine/src/adventure-json/conversion-score.ts`, CLI `bun scripts/score-adventure-conversion.ts`); a person must run real conversions through the published guide and record them here before the gate can pass.

## Results

Prompt version = git commit SHA of `apps/web/src/routes/(marketing)/adventure-import/conversion-guide.ts`.

| Source class           | Model name and version | Provider | Date    | Input mode | Prompt version                             | Schema version    | Manual interventions | Repair iterations | Schema  | References | Secrets | Coverage | AuthoredVsRumour | Branches | Citations | Truncation | Overall                         |
| ---------------------- | ---------------------- | -------- | ------- | ---------- | ------------------------------------------ | ----------------- | -------------------- | ----------------- | ------- | ---------- | ------- | -------- | ---------------- | -------- | --------- | ---------- | ------------------------------- |
| Linear one-shot        | not run                | not run  | not run | not run    | `0645b7a83f7e44f761025aec482079bb6122022d` | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run                         |
| Linear one-shot        | not run                | not run  | not run | not run    | `0645b7a83f7e44f761025aec482079bb6122022d` | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run                         |
| Non-linear mystery     | not run                | not run  | not run | not run    | `0645b7a83f7e44f761025aec482079bb6122022d` | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run                         |
| Non-linear mystery     | not run                | not run  | not run | not run    | `0645b7a83f7e44f761025aec482079bb6122022d` | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run                         |
| Long structured module | not run                | not run  | not run | not run    | `0645b7a83f7e44f761025aec482079bb6122022d` | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | blocked: no fixture (follow-up) |
| Long structured module | not run                | not run  | not run | not run    | `0645b7a83f7e44f761025aec482079bb6122022d` | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | blocked: no fixture (follow-up) |

## Existing fixtures (baseline)

Scored on 2026-11-17 with `bun scripts/score-adventure-conversion.ts <conversion> <answer-key>`. Both existing fixtures fail, as expected: they are conversions of other adventures (The Sunken Belfry, The Glass Observatory), not of The Last Grind, so they do not count as linear-row evidence.

| Fixture                                     | Schema | References | Secrets | Coverage | AuthoredVsRumour | Branches | Citations | Truncation | Overall |
| ------------------------------------------- | ------ | ---------- | ------- | -------- | ---------------- | -------- | --------- | ---------- | ------- |
| `claude-adventure.v1.json` vs reference key | pass   | pass       | fail    | fail     | n/a              | fail     | fail      | fail       | fail    |
| `gpt-adventure.v1.json` vs reference key    | pass   | pass       | fail    | fail     | n/a              | fail     | fail      | fail       | fail    |

Positive controls (hand-written correct conversions):

| Fixture                                | Schema | References | Secrets | Coverage | AuthoredVsRumour | Branches | Citations | Truncation | Overall |
| -------------------------------------- | ------ | ---------- | ------- | -------- | ---------------- | -------- | --------- | ---------- | ------- |
| Reference one-shot `adventure.v1.json` | pass   | pass       | pass    | pass     | n/a              | pass     | pass      | pass       | pass    |
| Mystery `adventure.v1.json`            | pass   | pass       | pass    | pass     | pass             | pass     | pass      | pass       | pass    |

## Reproduction

1. Take the source adventure (reference one-shot `fixtures/adventures/reference-one-shot/adventure.md`, mystery `fixtures/adventures/mystery/adventure.md`, or a future long module).
2. Use only the published guide prompt (`CANONICAL_CONVERSION_PROMPT` in `conversion-guide.ts`), with no hidden system prompt and no developer repair.
3. Save the model output as JSON.
4. Run `bun scripts/score-adventure-conversion.ts <conversion.json> <answer-key.json> [--repairs N]`.
5. Record repair iterations and manual edits in the results table.

Model calls and manual judgements stay outside paid CI.

## Scoring rules

The scorer is deterministic and pure (no fs, network or model access). `overall` is `pass` only when every dimension is `pass` or `n/a`.

- **Text match**: key text A is "found" in string B when at least 60% of A's distinct lowercase alphanumeric tokens of length ≥ 4 appear among B's tokens.
- **Citation**: an entity "cites" key section S when `entity.id === S.sourceId`, or `entity.sourceRef.anchor === S.sourceId`, or the normalised `entity.sourceRef.section` (trimmed, lower-case) equals the normalised `S.title`.
- **Player-visible text**: every string in `title`, `description`, `premise`, and every string field of a record whose `visibility` is `"player-visible"`. Each field is checked on its own and never concatenated.

Dimensions:

1. `schema`: `validateAdventureJson(doc).ok`; details are the validator error codes and paths.
2. `references`: no `UNRESOLVED_REFERENCE` or `SELF_REFERENCE` errors.
3. `secrets`: every key secret with `gmOnly: true` matched by a `secrets[]` entry (equal `id` or text match); no key secret text found in any single player-visible string. Missing secrets and leaks listed separately.
4. `coverage`: every non-container section cited; every key NPC present as an actor (case-insensitive name); every key ending present (equal `id` or citing its `sourceId`); every key clue (missable clue plus conclusion clues) found in some `clues[].text`.
5. `authoredVsRumour`: `n/a` when the key has no `testimonies`; otherwise every testimony `claim` found in a `rumours[]` entry with equal `truth`, and no claim found in any `secrets[].text`.
6. `branches`: the key `branch.sourceId` cited by an optional scene (or the target of an optional branch); an encounter citing `alternativeSolution.obstacleSourceId` (or whose `sceneId` scene cites it) with a `socialBypassOfCombat: true` solution when required, or at least two solutions otherwise.
7. `citations`: at least one `sourceRef.anchor` exists and every anchor equals a key section `sourceId`; unknown anchors listed.
8. `truncation`: fails when the last non-container key section in key order is not cited; details list the uncited trailing run.

When the schema fails, every other dimension is `fail` with the detail `not checked: schema invalid`.

## Promotion rule

A missing or leaked secret, or a major coverage omission, blocks promotion even when schema validation passes.

## Human walkthrough

not run. A first-time save / import / review walkthrough has not been recorded.

## Prompt / guide defects

None found in this work.

## Schema / runtime defects

None found in this work.

## Oracle play

Oracle play of imported packages belongs to #4828 and is not tested here.
