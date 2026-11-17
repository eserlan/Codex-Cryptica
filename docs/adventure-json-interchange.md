# Adventure JSON v1 Interchange Contract

`adventure-json/v1` is Codex Cryptica's public, versioned interchange format for source-derived tabletop RPG adventures. It captures authored adventure structure, provenance, epistemic status, and GM/player visibility without playthrough or campaign state (see [ADR 021](./adr/021-adventure-sources-playthrough-continuity.md)).

## Package Location & Exports

All schemas, validators, JSON Schema generators, canonical hashing utilities, and adapters live in `packages/adventure-engine/src/adventure-json/` and are re-exported from `@codex/adventure-engine`:

- `AdventureJsonV1Schema`, `ADVENTURE_JSON_V1_FORMAT_VERSION` (`"adventure-json/v1"`)
- `validateAdventureJson(data: unknown)`
- `getAdventureJsonV1JsonSchema()` and static `adventure-json-v1.schema.json` (Draft 2020-12, `$id`: `https://codexcryptica.com/schemas/adventure-json/v1.json`)
- `canonicalizeAdventureJson(pkg)` and `computeAdventureJsonHash(pkg)`
- `adventureSourcePackageToAdventureJson(sourcePkg)`

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

Runtime status: Adventure collection records are not yet projected into Oracle prompts or player transcripts, and sessions pin the approved package by hash. Starting an approved package does copy its `title` and premise text into the session: `premise.hook` and `premise.background` are used when present; if both are empty, `description` is used, then `title`. Those copied values enter Oracle opening generation, so converters must keep the title, hook, background and optional description player-safe and limited to source-supported facts. Future collection projections must drop `gm-only` records and never render secrets. If a future runtime needs per-field visibility, that is a schema v2 change (#4815, #4864), not a reinterpretation of v1.

- `sourceRef` (optional): `{ page?, pageEnd?, chapter?, section?, anchor?, textQuote? }`.

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
