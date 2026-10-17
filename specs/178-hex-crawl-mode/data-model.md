# Data Model: Hex Crawl Mode

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

All persisted data is additive and optional on the existing map record in `.codex/maps.json`. No new store, file or migration (FR-010, FR-012).

## 1. `Map` (existing, extended) — `packages/schema/src/map.ts`

| Field                                                                                                        | Type              | New?              | Notes                                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `id`, `name`, `assetPath`, `dimensions`, `parentEntityId`, `isWorldMap`, `pins`, `fogOfWar`, `playerVisible` | (unchanged)       | —                 | `parentEntityId` is the region entity used for discovery context.                                       |
| `grid`                                                                                                       | `MapGridGeometry` | **new, optional** | Absent on maps not yet opened since this feature shipped.                                               |
| `hexCrawl`                                                                                                   | `HexCrawlState`   | **new, optional** | Absent until Hex Crawl mode is first turned on or a hex is touched. **Never exported to guests** (D16). |

## 2. `MapGridGeometry` — `packages/schema/src/map.ts`

| Field     | Type                                     | Validation                                                                          |
| --------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `type`    | `"square" \| "hex-pointy" \| "hex-flat"` | Same enum as the existing `GridType`.                                               |
| `size`    | `number`                                 | Finite and > 0.                                                                     |
| `offsetX` | `number`                                 | Finite.                                                                             |
| `offsetY` | `number`                                 | Finite.                                                                             |
| `labels`  | `HexLabelConfig`                         | Optional. Same shape and allowed styles as the existing persisted `hexLabelConfig`. |

**Resolution order** (D3): `map.grid` → this device's existing persisted settings for the map → defaults. Adoption writes the device value into `map.grid` once (FR-038).

**Not stored here (device-local display preferences)**: `showGrid`, `gridColor`, `fogColor`, `showHexCoordinates`, `showTerrainIcons` (new, default `false`) (FR-040, FR-005a).

## 3. `HexCrawlState` — `packages/hex-crawl-engine/src/model.ts`

| Field     | Type                        | Validation                                                                  |
| --------- | --------------------------- | --------------------------------------------------------------------------- |
| `enabled` | `boolean`                   | Default `false`. Turning it off keeps `hexes` (FR-002).                     |
| `hexes`   | `Record<HexKey, HexRecord>` | Sparse. Keys must parse as `HexKey`; anything else is dropped on normalise. |

`HexKey` is the string `"q,r"`, with axial integer coordinates as used by `map-engine` and `MapPin.hexCoordinates`. Helpers: `toHexKey(hex)` and `parseHexKey(key) → HexCoord | null`.

## 4. `HexRecord` — `packages/hex-crawl-engine/src/model.ts`

| Field        | Type                | Validation / rules                                                                                         |
| ------------ | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `terrain`    | `Terrain`           | Optional.                                                                                                  |
| `notes`      | `string`            | Optional. GM text only. ≤ 20,000 chars. **Never written by discovery** (FR-027).                           |
| `aiNotes`    | `string`            | Optional. The marked AI section. Discovery appends here only. The GM may edit or clear it. ≤ 20,000 chars. |
| `explored`   | `boolean`           | Optional. `true` means Explored.                                                                           |
| `exploredAt` | `number`            | Epoch ms, set when `explored` becomes true and cleared when it becomes false (FR-016).                     |
| `draft`      | `HexDiscoveryDraft` | Optional. Present only while at least one part is pending (FR-033a).                                       |
| `updatedAt`  | `number`            | Epoch ms of the last change.                                                                               |

**Existence rule (FR-011)**: a record exists only if at least one of `terrain`, a non-empty `notes`, a non-empty `aiNotes`, `explored`, or `draft` is set. `pruneHexRecord` removes a record that has become empty.

## 5. `Terrain` — `packages/hex-crawl-engine/src/terrain.ts`

```text
Terrain =
  | { kind: "preset"; id: TerrainId }
  | { kind: "custom"; label: string }   // trimmed, 1–40 chars

TerrainId = "plains" | "forest" | "hills" | "mountains" | "swamp"
          | "desert" | "water" | "coast" | "tundra"
```

The catalogue (data module) maps each `TerrainId` to a display label and an Iconify Lucide icon. Custom terrains use `map-pin` (D17).

## 6. `HexDiscoveryDraft` — `packages/hex-crawl-engine/src/discovery/draft.ts`

| Field               | Type                                 | Rules                                                                                                                                            |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `source`            | `"ai" \| "tables"`                   | How the draft was produced. A per-part regeneration may switch a part's source (on fallback).                                                    |
| `createdAt`         | `number`                             | Epoch ms.                                                                                                                                        |
| `usedGeneralTables` | `boolean`                            | Optional. True when the table fallback had no tables for the hex's terrain (custom or none) and used the general set. Drives the FR-030 message. |
| `parts`             | `Record<DiscoveryPartId, DraftPart>` | Exactly six keys.                                                                                                                                |

`DiscoveryPartId` is `"landmark" | "encounter" | "hazard" | "secret" | "factionPresence" | "atmosphere"`.

`DraftPart`:

| Field         | Type                                  | Rules                                                                                   |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `text`        | `string`                              | 1–2,000 chars. For `landmark` and `encounter` the first line is the title (≤ 80 chars). |
| `factionName` | `string`                              | Optional, `factionPresence` only. The faction name the draft refers to.                 |
| `source`      | `"ai" \| "tables"`                    |                                                                                         |
| `status`      | `"pending" \| "saved" \| "discarded"` |                                                                                         |

**Lifecycle** (state machine per part):

```text
pending ──regenerate──▶ pending (new text, other parts unchanged — FR-023)
pending ──discard────▶ discarded
pending ──save───────▶ saved
```

The draft is removed from the record when no part is `pending`, or when the GM discards the whole draft (FR-033a). A draft is never written while generation is still running. Cancelling leaves the record unchanged (FR-033).

## 7. `HexStocking` (AI and table output, not persisted as-is) — `packages/hex-crawl-engine/src/discovery/schema.ts`

The zod schema the model output must satisfy:

```text
{
  landmark:        { title: string(1..80), description: string(1..1200) },
  encounter:       { title: string(1..80), description: string(1..1200) },
  hazard:          string(1..600),
  secret:          string(1..600),
  factionPresence: { faction?: string(1..80), description: string(1..600) },
  atmosphere:      string(1..400)
}
```

A single-part regeneration validates only that part's sub-schema. Output that fails validation is treated as an AI failure (FR-034).

## 8. `HexContext` (built per request, not persisted) — `packages/hex-crawl-engine/src/context.ts`

| Field              | Content                                                                                                                 | Limit (D11)                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `hex`              | coordinate, label, terrain, `notes`, `aiNotes`                                                                          | Notes excerpt ≤ 1,500 chars                |
| `contents`         | entities in the hex: title, type, summary                                                                               | ≤ 8 entities                               |
| `neighbours`       | hexes within radius 2 with a record or pinned entities: label, distance, terrain, explored, entity titles and summaries | ≤ 18 hexes, ≤ 12 entities total            |
| `nearestLocations` | location entities on the map by hex distance                                                                            | ≤ 5                                        |
| `nearestFactions`  | faction entities on the map by hex distance                                                                             | ≤ 5                                        |
| `region`           | the map's parent entity: title, summary                                                                                 | 1                                          |
| `campaign`         | the existing campaign context block                                                                                     | ≤ 1,500 chars                              |
| total              | serialised prompt context                                                                                               | ≤ 8,000 chars, truncated deterministically |

Every entity excerpt is ≤ 600 chars. GM-only lore of entities is included only where the existing Generate Related context already includes it.

## 9. Derived values (not persisted)

| Value                     | Function                                                  | Rule                                                                                                 |
| ------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Exploration state         | `deriveHexState(record, revealed)`                        | Explored if `record.explored`, otherwise Seen if `revealed`, otherwise Unknown (FR-013, FR-014).     |
| Hex contents              | `pinsInHex(pins, hex)`                                    | Pins whose `hexCoordinates` equal the hex, excluding pins whose entity no longer exists (edge case). |
| Nearest linkable location | `selectNearestLocation(candidates, hex, maxDistance = 2)` | Lowest `hexDistance`, then title (locale-insensitive), then id (FR-024a).                            |
| Grid-change impact        | `countHexRecords(state)`                                  | Number of records in `hexes` (FR-039).                                                               |

## 10. Entities created by discovery (existing `Entity`, no schema change)

| Draft part      | Entity `type`                        | `status`     | `labels`                                             | Pin                                                                                                                                        | Relationship                                        |
| --------------- | ------------------------------------ | ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| landmark        | `location`                           | `draft`      | `hex-crawl-discovery`, plus `ai-drafted` or `rolled` | At the hex centre (`hexCoordinates` set)                                                                                                   | `related_to` the proposed location, if still ticked |
| encounter       | `event` (default) or `note`          | `draft`      | as above                                             | At the hex centre                                                                                                                          | as above                                            |
| factionPresence | existing faction, or a new `faction` | new: `draft` | new: as above                                        | — Every entity saved from this hex's discoveries `related_to` the faction (FR-025), plus a "Faction presence: {faction}" line in `aiNotes` |

## 11. Journal entries (existing journal, new formatter)

| Event           | Formatter                         | Content                                                                                                                                                                                  |
| --------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hex explored    | `formatHexExplored` (new)         | "Explored hex 0412 (forest)" with `mapId` and the hex as reference. Name-free. Bounded by `JOURNAL_CAPTURE_LIMITS`. Captured whether the party moved there or the GM marked it (FR-019). |
| Discovery saved | `formatGeneratedSaved` (existing) | The saved entity's title, with a hex-crawl generator id.                                                                                                                                 |
