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

| `AdventureSourcePackage`         | `AdventureJsonV1`                    | Notes                                                                                                                                                       |
| -------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sourceIdentity`, `documentHash` | `id`, `title`, `source`              | `version` defaults to `"1.0.0"`.                                                                                                                            |
| `sections`                       | `premise`, `sourceRef`, `visibility` | Section `gmOnly` maps to `"gm-only"`; `pageNumber`/`pageEnd` map to `sourceRef`.                                                                            |
| `scenes`                         | `scenes`                             | Preserves `conditions`, `branches`, `optionalBranch`, and `readAloud`; adds sequential fallback edges when non-entry scenes lack explicit inbound branches. |
| `npcs`                           | `actors`                             | Allocates unique `actor-*` IDs and preserves `motivation`.                                                                                                  |
| `encounters`                     | `encounters`                         | Maps `alternativeSolutions` and links `sceneId` when present.                                                                                               |
| `clues`                          | `clues`                              | Maps `primarySourceId` to `placedSceneId` and preserves `alternativeSourceId`.                                                                              |
| `secrets`                        | `secrets`                            | Always enforces `visibility: "gm-only"`.                                                                                                                    |
| `endings`                        | `endings`                            | Preserves `title` and `description`.                                                                                                                        |
| `ambiguities`                    | `unresolved`                         | Preserves `code`, `message`, `context`, and `epistemicStatus: "unresolved"`.                                                                                |
| `provenance`                     | `epistemicStatus`                    | `"source-grounded"` → `"explicit"`, `"suggested"` → `"inferred"`, `"unresolved"` → `"unresolved"`.                                                          |
