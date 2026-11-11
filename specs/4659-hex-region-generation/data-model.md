# Data Model: Generate Region for Hex Crawl Maps

**Feature**: `4659-hex-region-generation` | **Date**: 2026-11-11

Only one thing is added to stored data: an optional `generated` field on a hex record. Everything else here lives in memory while a region is being reviewed.

## Stored

### HexRecord (existing, one field added)

`packages/hex-crawl-engine/src/model.ts`. Stored sparsely under `map.hexCrawl.hexes["q,r"]` in `.codex/maps.json`.

| Field        | Type                              | Status       | Notes                                                                |
| ------------ | --------------------------------- | ------------ | -------------------------------------------------------------------- |
| `terrain`    | `Terrain`                         | existing     | Accepted proposals write ordinary preset terrain here (FR-029).      |
| `notes`      | `string`                          | existing     | Never touched by generation (FR-017).                                |
| `aiNotes`    | `string`                          | existing     | Never touched.                                                       |
| `explored`   | `boolean`                         | existing     | Never touched.                                                       |
| `exploredAt` | `number`                          | existing     | Never touched.                                                       |
| `draft`      | `HexDiscoveryDraft`               | existing     | Never touched.                                                       |
| `updatedAt`  | `number`                          | existing     | Set on every write; used to detect change for skip and undo (D8).    |
| `generated`  | `{ seed: string; rules: number }` | **new, opt** | Present only when `terrain` was generated and not since hand-edited. |

**Rules**

- `generated` absent means the terrain is hand-set and is always protected (FR-021).
- `generated` is cleared by `upsertHexRecord` whenever a patch sets `terrain` without also setting `generated` (FR-022).
- `generated` never appears without `terrain`. If terrain is removed, `generated` is removed with it.
- `generated` alone does not keep a record: `pruneHexRecord` is unchanged.
- `seed`: 1 to 32 characters after normalisation. `rules`: positive integer.
- A malformed `generated` is dropped on read; the rest of the record is kept.
- No migration. Records written before this feature have no `generated` and read as hand-set (FR-033).
- Never exported to guests: `GuestExporter` already omits `hexCrawl` (FR-034).

### Device-local preference (new)

`localStorage` key `codex-hex-region:<mapId>`, through the injected `StorageLike`. Not synced, not exported.

| Field      | Type             | Notes                       |
| ---------- | ---------------- | --------------------------- |
| `seed`     | `string`         | Last seed used on this map. |
| `settings` | `RegionSettings` | Last preset and levels.     |

Read defensively: anything unreadable falls back to a new seed and the Temperate preset.

## In memory only

### RegionSettings

| Field    | Type                                                            | Notes                                            |
| -------- | --------------------------------------------------------------- | ------------------------------------------------ |
| `preset` | `"temperate" \| "coastal" \| "highlands" \| "arid" \| "frozen"` | Default `"temperate"`.                           |
| `levels` | `Partial<Record<TerrainId, TerrainLevel>>`                      | Only terrains the GM changed; others are Normal. |

`TerrainLevel` = `"none" | "less" | "normal" | "more"`.

**Validation**: at least one terrain must not be `none`, otherwise the request is refused with `no-terrain-available` (FR-010a).

### RegionRequest

| Field       | Type                                         | Notes                                                   |
| ----------- | -------------------------------------------- | ------------------------------------------------------- |
| `operation` | `"area" \| "grow" \| "gaps" \| "regenerate"` |                                                         |
| `centre`    | `HexCoord`                                   | The hex the GM had open.                                |
| `radius`    | `number`                                     | 1 to 12. Ignored for `grow` (always the 7-hex cluster). |
| `seed`      | `string`                                     | Normalised: trimmed, upper case.                        |
| `settings`  | `RegionSettings`                             |                                                         |

### RegionTargets (result of `selectRegionTargets`)

| Field       | Type         | Notes                                                                             |
| ----------- | ------------ | --------------------------------------------------------------------------------- |
| `targets`   | `HexCoord[]` | Sorted by `q` then `r`. At most 469.                                              |
| `protected` | `number`     | Candidates left out because they hold terrain that this operation may not change. |

### RegionProposal

| Field             | Type                        | Notes                                                                      |
| ----------------- | --------------------------- | -------------------------------------------------------------------------- |
| `request`         | `RegionRequest`             | What produced it.                                                          |
| `rules`           | `number`                    | `REGION_RULES_VERSION` at generation time.                                 |
| `hexes`           | `Record<HexKey, TerrainId>` | Proposed terrain per target.                                               |
| `stamps`          | `Record<HexKey, number>`    | `updatedAt` of each target when proposed (0 if no record). Used on accept. |
| `protected`       | `number`                    | From targets.                                                              |
| `changes`         | `HexKey[]`                  | `regenerate` only: targets whose terrain would differ from now.            |
| `exploredChanges` | `HexKey[]`                  | Subset of `changes` on explored hexes (FR-020a).                           |

### RegionAdjustments

`Record<HexKey, Terrain>`: hexes in the proposal that the GM changed by hand in the preview. Saved without `generated`.

### RegionUndo

| Field    | Type                                | Notes                                                        |
| -------- | ----------------------------------- | ------------------------------------------------------------ |
| `mapId`  | `string`                            |                                                              |
| `before` | `Record<HexKey, HexRecord \| null>` | Each affected hex before accept; `null` if it had no record. |
| `stamps` | `Record<HexKey, number>`            | `updatedAt` written by the accept.                           |

Held by `RegionGenerationStore` together with the `HexCrawlStore.revision` at accept. Dropped on any later hex write, map switch, leave or reload.

## Review lifecycle

```text
closed
  │  GM picks an operation on a hex
  ▼
reviewing ──(change radius / seed / preset / level / reroll)──► reviewing   (new proposal, nothing saved)
  │            ──(tap a proposed hex, pick terrain)──────────► reviewing   (adjustment recorded)
  │
  ├── Cancel, map switch, leave, reload ─────────────────────► closed       (map untouched)
  │
  └── Accept ─► save in one write
                 ├── fails ─────────────────────────────────► reviewing    (map untouched, message shown)
                 └── succeeds ──────────────────────────────► undo-offered (skipped count reported)

undo-offered
  ├── Undo ─► restore in one write ─────────────────────────► closed
  └── any hex write, map switch, leave, reload ─────────────► closed
```

A request that selects no targets, exceeds the limit, or has no terrain available never enters `reviewing`; the GM gets a message and nothing changes (FR-005).

## Relationships

- A `RegionProposal` refers to hexes by key only; it holds no copy of map data beyond `stamps`.
- A hex record with `generated` is the only lasting trace of a region. There is no stored region entity, list of runs or history.
- `RegionUndo` is the only place earlier hex records are kept, and only until it expires.
