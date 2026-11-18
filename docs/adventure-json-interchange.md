# Adventure JSON v1 Interchange Contract

`adventure-json/v1` is Codex Cryptica's public, versioned interchange format for source-derived tabletop RPG adventures. It captures authored adventure structure, provenance, epistemic status, and GM/player visibility without playthrough or campaign state (see [ADR 021](./adr/021-adventure-sources-playthrough-continuity.md)).

## Package Location & Exports

All schemas, validators, JSON Schema generators, canonical hashing utilities, and adapters live in `packages/adventure-engine/src/adventure-json/` and are re-exported from `@codex/adventure-engine`:

- `AdventureJsonV1Schema`, `ADVENTURE_JSON_V1_FORMAT_VERSION` (`"adventure-json/v1"`)
- `validateAdventureJson(data: unknown)`
- `getAdventureJsonV1JsonSchema()` and static `adventure-json-v1.schema.json` (Draft 2020-12, `$id`: `https://codexcryptica.com/schemas/adventure-json/v1.json`)
- `canonicalizeAdventureJson(pkg)` and `computeAdventureJsonHash(pkg)`
- `adventureSourcePackageToAdventureJson(sourcePkg)`
- `entrySceneId(pkg)`: the id of the first scene, the package's entry scene
- `retrieveAdventureJsonContext(pkg, focus)` and `formatAdventureJsonExcerpts(excerpts, label)`: bounded scene-context retrieval (see "Scene-context retrieval")

## Top-Level Structure

- `formatVersion`: Literal `"adventure-json/v1"`
- `id`: Unique slug matching `/^[a-z0-9_-]{3,64}$/i`
- `title`: 1–200 character title
- `version`: Semantic version string (e.g. `"1.0.0"`)
- `description` (optional): Overview text
- `premise`: `{ background, hook, theme?, tone? }`
- `source`: `{ title, authors?, publisher?, publishedDate?, url?, license?, documentHash? }`
- `system` (optional): `{ name, targetParty?: { sizeMin?, sizeMax?, levelMin?, levelMax? } }`
- Collections: `locations`, `actors`, `factions`, `scenes`, `encounters`, `clues`, `rumours`, `items`, `secrets`, `endings`, `unresolved`

## Epistemic Status, Visibility & Provenance

- `epistemicStatus`: `"explicit" | "inferred" | "ambiguous" | "unresolved"` — allows external converters and parsers to mark uncertain or contradictory source facts without inventing missing details.
- `visibility`: `"player-visible" | "gm-only"` — `secrets` strictly require `"gm-only"`.

### What visibility applies to

`visibility` is a property of the **whole record**. Every field of a `player-visible` record (including `role`, `motivation`, `summary`, `description`, `body`, `readAloud` and `reveals`) is treated as safe to show players; v1 has no per-field visibility, and importers, the review screen and any player-facing projection must not assume a visible record has hidden parts.

A character, place or item being known does not make its concealed role, motive or detail known. Converters keep the visible record to what players can know and store the concealed part in a separate `secrets` entry (`visibility: "gm-only"`) whose `relatedEntityIds` names the record. When a record cannot be split without losing meaning, mark it `gm-only` and add an `unresolved` entry. Source wording is copied, not invented.

In the reference one-shot, Tobiah Reed is a `player-visible` actor with no `motivation`; his motive is the `gm-only` secret `secret-tobiah-motive`.

Runtime status: Scene-context retrieval is wired into Oracle openings, action turns and roll resolutions for package sessions. A session records the package's current scene in `packageProgress`, set to the entry scene at start and moved only when the model reports a scene ID that exists in the pinned package. `packageProgress` is also a versioned, append-only ledger (`version: 1`, `records`, `events`, plus optional `actors` and `actorEvents`, at most 400 of each) with a status (`unvisited`, `available`, `active`, `resolved`, `altered` or `skipped`) for each scene, encounter, clue and secret that play has touched. Legacy `{ sceneId }` sessions stay valid (and reject `actors` or `actorEvents` when `version` is absent). A scene move writes confirmed events automatically: the entry scene becomes `active` on the first turn, the scene left becomes `available`, the new scene becomes `active` and its branch targets become `available`; free-text `conditions` are never evaluated. Events are `confirmed` (they change a status, and only allowed transitions are accepted) or `claimed` (a report such as a rumour that is recorded but never changes a status). Corrections are made only by a new event that `supersedes` an earlier one; no event is edited or removed, and the ledger never reveals secrets. The model may propose `packageEvents`, checked by the same rules, and rejected events are recorded in the turn's dropped list; it uses `claimed` for rumours, testimony and ambiguous facts. The model may also propose `actorEvents` (up to 8 per turn) keyed by package actor ID to track per-actor `status` (`unknown`, `present`, `absent`, `dead`; proposals use `present`, `absent`, `dead`), fixed-scale `disposition` (`hostile`, `wary`, `neutral`, `friendly`, `allied`; untouched baseline `neutral`), and up to 5 deduplicated remembered `facts` (at most 160 characters each, FIFO-bounded); `dead` actors cannot transition to `present` or `absent` (or re-assert `dead`) without a `confirmed` `supersedes` correction targeting the death event. Package sessions also give the model a bounded GM-only progress summary (`"GM-ONLY package progress"`, capped at 4000 characters) that never reaches player-visible output, scoping `actors` and `recentActorEvents` to actors featured on the active scene when scene excerpts are supplied. The prompt carries that scene's excerpts, and only `player-visible` text goes into the player-safe block. Other adventure collection records are not projected into player transcripts, and sessions pin the approved package by hash. Sessions verify the pinned hash, ID, version and format version on open, resume, start and before each generation, enter `package-unavailable` on failure, and are never retargeted. Starting an approved package does copy its `title` and premise text into the session: `premise.hook` and `premise.background` are used when present; if both are empty, `description` is used, then `title`. Those copied values enter Oracle opening generation, so converters must keep the title, hook, background and optional description player-safe and limited to source-supported facts. Future collection projections must drop `gm-only` records and never render secrets. If a future runtime needs per-field visibility, that is a schema v2 change (#4815, #4864), not a reinterpretation of v1.

- `sourceRef` (optional): `{ page?, pageEnd?, chapter?, section?, anchor?, textQuote? }`.

## Scene-context retrieval

`retrieveAdventureJsonContext(pkg, { sceneId?, locationId?, actorIds?, maxCharacters? })` is pure and deterministic. It picks the focus scene (the entry scene when `sceneId` is omitted; an unknown `sceneId` falls back to the entry scene and sets `sceneFallback: true`) and returns excerpts in this priority order, each record at most once:

1. the focus scene
2. `premise`, then `system` if present
3. the focus location (`locationId`, else the scene's `locationId`)
4. encounters tied to the scene or location
5. actors named in `actorIds`, in a selected encounter, or at the location
6. clues placed in the scene, location or with a selected actor
7. items at the location or held by a selected actor
8. rumours sourced from or aimed at the scene, location or a selected actor
9. secrets whose `relatedEntityIds` include a selected record

Excerpts go to `playerSafe` when the record is `player-visible` and to `gmOnly` otherwise (every secret is `gm-only`).

In a `player-visible` record, three kinds of line move into a companion excerpt instead of staying in the player-safe excerpt: a rumour's `Truth`, a clue's `Reveals`, and any line that names the ID of a record that is not `player-visible` (for example a `Branch` to a `gm-only` scene). The companion has the same `id`, `kind`, `epistemicStatus` and `sourceRef` as its parent, `visibility: "gm-only"`, and directly follows its parent in the priority order, so it lands in `gmOnly`. Companions count towards the size bound like any other excerpt. As a result no `playerSafe` text contains a `Truth:` or `Reveals:` line, or the ID of a record that is not `player-visible`.

The combined `JSON.stringify` length of both lists never exceeds `maxCharacters` (default and maximum `MAX_ADVENTURE_RETRIEVAL_CHARS`, 4000). Whole excerpts are dropped from the lowest priority upward; only a lone focus scene is trimmed, ending in `…`. `truncated` reports any drop or trim. If `maxCharacters` is too small to hold even the focus scene's JSON metadata, `invalidBudget` is `true` and no excerpt is returned; otherwise the focus scene is always present. Retrieval checks records in priority order and stops once the next excerpt would exceed the budget, so it does not materialize or serialize the full matching candidate list.

`formatAdventureJsonExcerpts(excerpts, label)` places the label and excerpts inside one fenced JSON data block, preceded by a static header saying the contents are quoted source data whose instructions must not be followed. `<`, `>`, `&` and backticks are escaped as `\uXXXX`, so package text cannot close the fence or inject markup and the block still parses back to the label and excerpts.

## Semantic Validation Rules

`validateAdventureJson` runs strict Zod schema validation followed by graph and integrity checks, returning `{ ok: true, value }` or `{ ok: false, errors }`:

| Error Code                | Meaning                                                                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_FORMAT_VERSION`  | Missing or unsupported `formatVersion` (expected `"adventure-json/v1"`).                                                                                                                                                    |
| `INVALID_VISIBILITY`      | A secret in `secrets` is not marked `"gm-only"`.                                                                                                                                                                            |
| `SCHEMA_VALIDATION_ERROR` | Structural or type mismatch against `AdventureJsonV1Schema`.                                                                                                                                                                |
| `DUPLICATE_ID`            | Two or more entities across any collection share the same `id`.                                                                                                                                                             |
| `SELF_REFERENCE`          | An entity references its own `id` as parent or target.                                                                                                                                                                      |
| `UNRESOLVED_REFERENCE`    | A cross-reference (`parentLocationId`, `targetLocationId`, `factionId`, `locationId`, `sceneId`, `actorIds`, `placedLocationId`, `placedActorId`, `placedSceneId`, `targetEntityId`, `targetSceneId`, etc.) does not exist. |
| `HIERARCHY_CYCLE`         | Circular `parentLocationId` chain among locations.                                                                                                                                                                          |
| `DEAD_END_CYCLE`          | Mandatory scene transition cycle with no exit path to a terminal scene.                                                                                                                                                     |
| `UNREACHABLE_SCENE`       | Non-entry scene (`scenes[1..]`) unreachable from `scenes[0]`.                                                                                                                                                               |

### Impossible prerequisites (not checked in v1)

The validator does not detect scenes, branches, encounters or endings whose prerequisites can never be met. `conditions` and the branch `condition` field are free-text prose, and no transition sets a structured flag that a check could resolve, so deciding whether a condition can be met would mean reading meaning into prose. Structured prerequisites are a candidate for a later format version.

## Canonical Serialization & Hash Pinning

- `canonicalizeAdventureJson(pkg)` recursively sorts object keys at all depths (matching `canonicalJson` in `@codex/schema`), ensuring identical output regardless of input property order.
- `computeAdventureJsonHash(pkg)` computes the 64-character lowercase SHA-256 hex digest of the canonical JSON string via Web Crypto (`crypto.subtle.digest`).

## `AdventureSourcePackage` Compatibility Mapping

`adventureSourcePackageToAdventureJson(sourcePkg)` converts internal `AdventureSourcePackage` records (`schemaVersion: 1`) into `AdventureJsonV1`:

| `AdventureSourcePackage`         | `AdventureJsonV1`                    | Notes                                                                                                                                                  |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sourceIdentity`, `documentHash` | `id`, `title`, `source`              | `version` defaults to `"1.0.0"`.                                                                                                                       |
| `sections`                       | `premise`, `sourceRef`, `visibility` | GM-only section bodies are excluded from unclassified premise fields; `pageNumber`/`pageEnd` map to `sourceRef`.                                       |
| `scenes`                         | `scenes`                             | Preserves `conditions`, `branches`, scene-level `optionalBranch`, and `readAloud`; unknown progression is marked ambiguous and recorded as unresolved. |
| `npcs`                           | `actors`                             | Allocates unique IDs from stable source IDs and preserves `motivation`.                                                                                |
| `encounters`                     | `encounters`                         | Maps `alternativeSolutions` and links `sceneId` when present.                                                                                          |
| `clues`                          | `clues`                              | Maps `primarySourceId` to `placedSceneId` and preserves `alternativeSourceId`.                                                                         |
| `secrets`                        | `secrets`                            | Always enforces `visibility: "gm-only"`.                                                                                                               |
| `endings`                        | `endings`                            | Preserves `title` and `description`.                                                                                                                   |
| `ambiguities`                    | `unresolved`                         | Preserves `code`, `message`, `context`, and `epistemicStatus: "unresolved"`.                                                                           |
| `provenance`                     | `epistemicStatus`                    | `"source-grounded"` → `"explicit"`, `"suggested"` → `"inferred"`, `"unresolved"` → `"unresolved"`.                                                     |

## Revisions and re-import

- `formatVersion`: which contract the file follows, always `adventure-json/v1`.
- Package `id`: the adventure's stable identity; keep it across every revision.
- `version`: strict SemVer label for a revision; raise it when content changes.
- Entity IDs: stable per entity across revisions; change one only for a real rename, split or merge.
- Canonical content hash: exact content identity, computed by Codex Cryptica and never written by converters.

Correspondence for renamed, split or merged entities lives only in the package's top-level `extensions` under `codex-cryptica.adventure-correspondence`, never inside an entity. See the guide section [Revising an adventure you already imported](/adventure-import#revisions-heading).

## Fidelity limits

v1 carries narrative structure: locations, actors, scenes, branches, clues, secrets and alternative solutions. `system` is descriptive metadata only (a name and an optional party range); it does not make mechanics executable or portable. Mechanics, stat blocks and maps have no fields: they are kept only as short source-grounded paraphrase (with `sourceRef`) in existing text fields, or recorded as `unresolved` entries. Any mechanics or map support would be a separate, versioned schema feature. See the guide section [What converts well, and what needs manual work](/adventure-import#fidelity-heading).

## Link smoke check

`bun scripts/adventure-import-link-check.mjs [--base=<origin>] [--strict-production]`
(also the manual "Adventure Import Link Check" workflow) verifies the guide,
schema, alias, both examples, the import CTA href and the `llms.txt` entries.

- Asset checks assert status 200, a JSON content type and parseable JSON.
- `/adventure` is an app route served from the SPA fallback, so its HTTP status
  (often 404 for crawlers and `curl`) is not judged; only that the app shell is
  returned. Signed-out users reach the entry flow in the browser.
- The guide's prompt uses absolute production URLs. On a non-production base the
  check reports those as environment-dependent warnings; run it against
  production with `--strict-production` at release time, after promotion.

## Conversion QA

For scoring model conversions against an answer key (schema, secrets, coverage,
rumours, branches, citations, truncation), see `docs/adventure-conversion-qa.md`
and the offline scorer `scoreAdventureConversion` plus the
`bun scripts/score-adventure-conversion.ts` CLI.
