# Adventure Conversion QA

**Gate status: Incomplete.** No live two-model runs and no human walkthrough have been recorded yet. The deterministic scorer is ready (`scoreAdventureConversion` in `packages/adventure-engine/src/adventure-json/conversion-score.ts`, CLI `bun scripts/score-adventure-conversion.ts`); a person must run real conversions through the published guide and record them here before the gate can pass.

## Results

Prompt version = git commit SHA of `apps/web/src/routes/(marketing)/adventure-import/conversion-guide.ts`.

| Source class           | Model name and version | Provider | Date    | Input mode | Prompt version | Schema version    | Manual interventions | Repair iterations | Schema  | References | Secrets | Coverage | AuthoredVsRumour | Branches | Citations | Truncation | Fidelity | Overall                         |
| ---------------------- | ---------------------- | -------- | ------- | ---------- | -------------- | ----------------- | -------------------- | ----------------- | ------- | ---------- | ------- | -------- | ---------------- | -------- | --------- | ---------- | -------- | ------------------------------- |
| Linear one-shot        | not run                | not run  | not run | not run    | not run        | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run  | not run                         |
| Linear one-shot        | not run                | not run  | not run | not run    | not run        | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run  | not run                         |
| Non-linear mystery     | not run                | not run  | not run | not run    | not run        | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run  | not run                         |
| Non-linear mystery     | not run                | not run  | not run | not run    | not run        | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run  | not run                         |
| Long structured module | not run                | not run  | not run | not run    | not run        | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run  | blocked: no fixture (follow-up) |
| Long structured module | not run                | not run  | not run | not run    | not run        | adventure-json/v1 | not run              | not run           | not run | not run    | not run | not run  | not run          | not run  | not run   | not run    | not run  | blocked: no fixture (follow-up) |

## Existing fixtures (baseline)

Scored on 2026-11-17 with `bun scripts/score-adventure-conversion.ts <conversion> <answer-key>`. Both existing fixtures fail, as expected: they are conversions of other adventures (The Sunken Belfry, The Glass Observatory), not of The Last Grind, so they do not count as linear-row evidence.

| Fixture                                     | Schema | References | Secrets | Coverage | AuthoredVsRumour | Branches | Citations | Truncation | Fidelity | Overall |
| ------------------------------------------- | ------ | ---------- | ------- | -------- | ---------------- | -------- | --------- | ---------- | -------- | ------- |
| `claude-adventure.v1.json` vs reference key | pass   | pass       | fail    | fail     | n/a              | fail     | fail      | fail       | fail     | fail    |
| `gpt-adventure.v1.json` vs reference key    | pass   | pass       | fail    | fail     | n/a              | fail     | fail      | fail       | fail     | fail    |

Positive controls (hand-written correct conversions):

| Fixture                                | Schema | References | Secrets | Coverage | AuthoredVsRumour | Branches | Citations | Truncation | Fidelity | Overall |
| -------------------------------------- | ------ | ---------- | ------- | -------- | ---------------- | -------- | --------- | ---------- | -------- | ------- |
| Reference one-shot `adventure.v1.json` | pass   | pass       | pass    | pass     | n/a              | pass     | pass      | pass       | pass     | pass    |
| Mystery `adventure.v1.json`            | pass   | pass       | pass    | pass     | pass             | pass     | pass      | pass       | n/a      | pass    |

Negative controls (hand-written conversions that must fail):

| Fixture                                            | Schema | References | Secrets | Coverage | AuthoredVsRumour | Branches | Citations | Truncation | Fidelity | Overall |
| -------------------------------------------------- | ------ | ---------- | ------- | -------- | ---------------- | -------- | --------- | ---------- | -------- | ------- |
| Reference one-shot `variants/sparse.v1.json`       | pass   | pass       | pass    | fail     | n/a              | pass     | pass      | pass       | fail     | fail    |
| Reference one-shot `variants/content-thin.v1.json` | pass   | pass       | pass    | pass     | n/a              | pass     | pass      | pass       | fail     | fail    |

`variants/content-thin.v1.json` is the regression for the "correct IDs but missing triggers" false green: it keeps every ID, anchor and structural text, so it passes every dimension except `fidelity`.

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
9. `fidelity` (the "record content fidelity" check from #5009; `sceneConditions` are scored through their matching `trigger` details, which the test in `conversion-score.test.ts` keeps consistent): `n/a` when the key has no `actionableDetails` or the list is empty. Otherwise, for each detail, take the records in every collection except `unresolved` that cite the detail's section. The detail is present when the text match holds for at least one string in any field of those records, each string checked on its own. A missing detail is one finding: `missing <category> detail in <sourceId> "<title>" (cited by: <id>, <id>): <detail>`, or `(no record cites this section)` when nothing cites it. Records in `unresolved` are excluded, so a note that a detail was dropped never hides the omission.

When the schema fails, every other dimension is `fail` with the detail `not checked: schema invalid`.

### Answer-key `actionableDetails`

The optional top-level `actionableDetails` array holds `{ sourceId, category, detail }` entries. `sourceId` must be a key section. `category` is one of `read-aloud`, `situation`, `interaction`, `trigger`, `actor-reaction`, `clue`, `alternate-outcome`, `consequence` or `gm-only`. `detail` is a short paraphrase of a fact the source states in that section. The rubric never rewards added mechanics, transitions or fields outside adventure-json/v1. A converter should record unsupported inferences in the coverage report or in `unresolved` instead of inventing them; a detail recorded only in `unresolved` still counts as missing.

Passing the schema is not the same as a playable, source-faithful conversion: an ID-complete package can still lack the triggers, clues, outcomes and consequences a table needs.

## Gate types

- **Mechanical gates**: `schema`, `references`, `citations`, `truncation`.
- **Structural gates**: `branches` checks optional-path and alternative-solution fields.
- **Mixed structural and text-match gates**: `secrets` checks secret visibility and text matching; `coverage` checks section and ending references, NPC presence, and text-matched clues.
- **Heuristic text-match gates** (deterministic and run in CI, but approximate): `authoredVsRumour`, `fidelity`.
- **Human or model judgement**: subjective fidelity, invented facts and playability. These stay outside CI and are recorded in the Results table with model, version and date.

## Promotion rule

A missing or leaked secret, or a major coverage omission (including any failing `fidelity` detail), blocks promotion even when schema validation passes.

## Preflight validation

Before import or scoring, check a file's structure offline:

```
bun scripts/preflight-adventure-json.ts <adventure.json> [--json] [--repair-prompt]
```

- Default prints a readable report. `--json` prints only the JSON report (with a `repairPrompt` field when combined with `--repair-prompt` on an invalid file). `--repair-prompt` without `--json` prints the report, then a model-agnostic repair prompt between start and end marker lines; a valid file gets no prompt.
- Exit codes: 0 valid, 1 invalid (including unparseable JSON), 2 bad arguments or unreadable file. The command never writes files.
- Each finding has a category and the validator's code. `parse`: `JSON_PARSE_ERROR`. `schema`: `SCHEMA_VALIDATION_ERROR`, `INVALID_FORMAT_VERSION`, `INVALID_VISIBILITY`. `integrity`: `DUPLICATE_ID`, `UNRESOLVED_REFERENCE`, `SELF_REFERENCE`, `HIERARCHY_CYCLE`, `DEAD_END_CYCLE`, `UNREACHABLE_SCENE`, `DUPLICATE_SCENE_PROGRESSION`.
- It uses the same decoding, parsing and `validateAdventureJson` as import, with no separate rule set. No hosted AI or network is involved.
- Source fidelity is not checked. A pass means only that the file passed structural and reference validation. Use the scorer above for coverage and fidelity.

## Human walkthrough

not run. A first-time save / import / review walkthrough has not been recorded.

## Prompt / guide defects

- #5007: the canonical prompt contradicted itself. It said the entire reply is the JSON object, while staging, source-access and coverage steps asked for plain text. It now has five named modes (Inspect, Inventory, Convert, Verify, Deliver) with JSON-only rules scoped to Convert and Deliver, four short outcome examples (Complete, Partial, Failed, Unvalidated), a soft staging heuristic, the ID secrecy rule before any ID is planned, one merged final checklist, and an example built from `fixtures/adventures/prompt-example/source.md`. Prompt length: 23,963 characters on `origin/staging`, 28,398 after (the examples and mode text add length; no safeguard was removed). The before/after first-attempt success and truncation comparison across model families is **blocked: not run**, because no live model runs were made in this work.

## Schema / runtime defects

None found in this work.

## Oracle play

Oracle play of imported packages belongs to #4828 and is not tested here.
