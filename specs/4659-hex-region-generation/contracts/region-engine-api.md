# Contract: Region generation in `hex-crawl-engine`

New folder `packages/hex-crawl-engine/src/region/`, re-exported from `src/index.ts`. Framework-free, synchronous, pure. No network, no `Math.random`, no clock except where `now` is passed in.

Types are described in [data-model.md](../data-model.md).

## Constants

```ts
export const REGION_RULES_VERSION = 1;
export const REGION_MIN_RADIUS = 1;
export const REGION_MAX_RADIUS = 12;
export const REGION_MAX_HEXES = 469; // hexes within radius 12
export const GAP_CORRIDOR_MAX = 4;
export const LANDSCAPE_PRESET_IDS = [
  "temperate",
  "coastal",
  "highlands",
  "arid",
  "frozen",
] as const;
export const TERRAIN_LEVELS = ["none", "less", "normal", "more"] as const;
```

## Seeds

```ts
/** Trim and upper-case; null when empty or longer than 32 characters. */
export function normalizeSeed(text: string): string | null;

/** Format 8 random bytes' worth of entropy as a readable seed, e.g. "K7Q2-9FXM". */
export function formatSeed(entropy: Uint8Array): string;
```

The engine never creates entropy. The caller passes it in.

## Settings

```ts
/** Read stored or typed settings defensively. Never throws; unknown values fall back to Temperate / Normal. */
export function normalizeRegionSettings(raw: unknown): RegionSettings;

/** Standard terrains that can be proposed under these settings (level not "none"). */
export function availableTerrains(settings: RegionSettings): TerrainId[];
```

## Choosing the hexes

```ts
export interface RegionTargetInput {
  operation: RegionOperation;
  state: HexCrawlState;
  centre: HexCoord;
  radius: number;
  /** True when the hex is on the map. Supplied by the web layer. */
  inBounds: (hex: HexCoord) => boolean;
}

export type RegionRefusal =
  | "nothing-to-generate"
  | "too-large"
  | "invalid-radius"
  | "centre-off-map"
  | "no-terrain-available";

export function selectRegionTargets(
  input: RegionTargetInput,
): { ok: true; targets: RegionTargets } | { ok: false; reason: RegionRefusal };
```

**Guarantees**

- No target is off the map (FR-006).
- `area`, `grow`, `gaps`: no target has terrain (FR-018).
- `regenerate`: every target has `generated` provenance (FR-019).
- `gaps`: every target satisfies the gap rule in research D6; no other empty hex is returned (FR-004).
- `targets` is sorted by `q`, then `r`, and never longer than `REGION_MAX_HEXES`.
- The input state is not mutated.

## Generating

```ts
export interface GenerateRegionInput {
  request: RegionRequest;
  state: HexCrawlState;
  targets: RegionTargets;
  inBounds: (hex: HexCoord) => boolean;
}

export function generateRegion(
  input: GenerateRegionInput,
):
  { ok: true; proposal: RegionProposal } | { ok: false; reason: RegionRefusal };
```

**Guarantees**

- **Repeatable**: equal `request`, `state` terrain around the targets and `targets` give a deeply equal `proposal` (FR-014).
- **Position-stable**: the terrain proposed for a hex does not depend on which other hexes are targets, except through the coast repair of its direct neighbours. Splitting an area into two requests, with the first accepted before the second is generated, gives the same terrain as one request for every hex not adjacent to the seam, and never an invalid coast at the seam (FR-016).
- Only standard terrains whose level is not `none` are proposed (FR-010a, FR-011).
- Every proposed coast hex has at least one water-or-undecided neighbour and one land-or-undecided neighbour (FR-009).
- Every proposed mountains hex has at least one hills-or-mountains-or-undecided neighbour (FR-009a).
- Terrain on hexes that are not targets is read but never part of the proposal (FR-008, FR-017).
- For `regenerate`, `changes` lists exactly the targets whose proposed terrain differs from their current terrain, and `exploredChanges` the explored ones among them.
- The input state is not mutated.

## Accepting

```ts
export function applyRegionProposal(
  state: HexCrawlState,
  proposal: RegionProposal,
  adjustments: RegionAdjustments,
  now: number,
): {
  state: HexCrawlState;
  applied: HexKey[];
  skipped: HexKey[];
  undo: Omit<RegionUndo, "mapId">;
};
```

**Guarantees**

- Returns a new state; the input is not mutated.
- A target is **skipped** when: for `area`, `grow` and `gaps`, it now has terrain; for `regenerate`, its terrain no longer has `generated` provenance or its `updatedAt` differs from `proposal.stamps` (FR-027).
- An applied hex changes only `terrain`, `generated` and `updatedAt`. `notes`, `aiNotes`, `explored`, `exploredAt` and `draft` are carried over unchanged (FR-017).
- An applied hex gets `generated: { seed, rules }`, unless it is in `adjustments`, in which case it gets the adjusted terrain and no `generated` (FR-022).
- Hexes outside `proposal.hexes` are untouched and no record is created for them (FR-032).
- `undo.before` holds the prior record of every applied hex; `undo.stamps` holds `now` for each.

## Undoing

```ts
export function undoRegion(
  state: HexCrawlState,
  undo: Omit<RegionUndo, "mapId">,
): HexCrawlState | null;
```

**Guarantees**

- Returns `null`, and changes nothing, if any hex in `undo.stamps` no longer has that `updatedAt` (FR-028b).
- Otherwise returns a new state in which every hex in `undo.before` is exactly its prior record, or absent if it had none (FR-028a).

## Model change

```ts
export interface HexRecord {
  // ...existing fields
  generated?: { seed: string; rules: number };
}
```

`upsertHexRecord` clears `generated` when the patch has a `terrain` key and no `generated` key. `HexRecordSchema` accepts `generated` and drops it, without rejecting the record, when malformed.

## Out of contract

The noise function, nominal terrain points, preset tables and repair internals are implementation detail and may be tuned. Any change that alters output for an existing seed **must** raise `REGION_RULES_VERSION`.
