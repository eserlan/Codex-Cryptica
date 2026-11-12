# Contract: Region store and UI in `apps/web`

## `HexCrawlStore` additions

`apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.ts`

```ts
/** Goes up by one after every successful hex write on any map. */
revision: number; // $state

/** Read the normalised hex state for a map. */
stateFor(mapId: string): HexCrawlState; // was private

/**
 * Apply one change to a map's hex state and save it in a single write.
 * GM only, never in guest vaults. If the save fails the previous state is
 * restored and the error is rethrown. Returns false if nothing was written.
 */
applyChange(mapId: string, change: (state: HexCrawlState) => HexCrawlState): Promise<boolean>;
```

`applyChange` is the existing private `commit`, made public. No behaviour of existing methods changes.

## `RegionGenerationStore`

`apps/web/src/lib/stores/hex-crawl/region-generation.svelte.ts`. Constructor-injected (Constitution VIII); a default instance is created in `hex-crawl-services.svelte.ts`.

```ts
export interface RegionGenerationDeps {
  hexes: Pick<HexCrawlStore, "stateFor" | "applyChange" | "revision">;
  inBounds: (mapId: string, hex: HexCoord) => boolean;
  newSeed: () => string;
  storage: StorageLike | null;
  clock: { now: () => number };
  canEdit: () => boolean; // GM and not a guest vault
}

export class RegionGenerationStore {
  // Reactive state
  readonly review: RegionReview | null; // null when closed
  readonly undoAvailable: boolean;
  readonly message: RegionMessage | null; // refusals, save failure, skipped count

  open(mapId: string, operation: RegionOperation, centre: HexCoord): void;
  setRadius(radius: number): void;
  setSeed(text: string): void;
  reroll(): void;
  setPreset(preset: LandscapePresetId): void;
  setLevel(terrain: TerrainId, level: TerrainLevel): void;
  adjust(hex: HexCoord, terrain: Terrain | null): void; // null removes the adjustment
  accept(): Promise<void>;
  cancel(): void;
  undo(): Promise<void>;
  /** Called when the active map changes or the map view unmounts. */
  leave(): void;
}

export interface RegionReview {
  mapId: string;
  request: RegionRequest;
  proposal: RegionProposal;
  adjustments: RegionAdjustments;
  hexCount: number; // candidates the radius covers
  saving: boolean;
}
```

**Behaviour**

| Call                                                                      | Result                                                                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open` when `canEdit()` is false, or Hex Crawl is off for the map         | Nothing happens (FR-001).                                                                                                                                                  |
| `open` with no eligible hexes, an off-map centre, or no terrain available | `review` stays `null`; `message` explains; nothing is saved (FR-005).                                                                                                      |
| `open` otherwise                                                          | `review` is set from the remembered seed and settings for the map, or a new seed and Temperate.                                                                            |
| `setRadius`, `setSeed`, `setPreset`, `setLevel`                           | A new proposal replaces the old one. Seed is kept except by `setSeed`. Adjustments on hexes still in the proposal are kept. Nothing is saved (FR-010b, FR-015).            |
| `setSeed` with an invalid seed                                            | Proposal unchanged; `message` explains.                                                                                                                                    |
| `reroll`                                                                  | New seed from `newSeed()`, new proposal, adjustments cleared (FR-015).                                                                                                     |
| `cancel`, `leave`                                                         | `review` becomes `null`. No write is made (FR-025).                                                                                                                        |
| `accept`                                                                  | One `applyChange`. On success: `review` is `null`, the seed and settings are remembered, undo becomes available, and `message` reports any skipped hexes (FR-026, FR-027). |
| `accept` when the save throws or returns false                            | `review` is kept with `saving` false; `message` says the map is unchanged (FR-026).                                                                                        |
| `accept` while `saving`                                                   | Ignored.                                                                                                                                                                   |
| `undo`                                                                    | One `applyChange` restoring the prior records. If the engine refuses, undo is withdrawn and `message` explains (FR-028a, FR-028b).                                         |
| Any hex write elsewhere (`revision` changes), or `leave`                  | `undoAvailable` becomes false.                                                                                                                                             |

The store makes no network request and reads no AI setting (FR-035).

## Components

All in `apps/web/src/lib/components/map/hex-crawl/region/`. Svelte 5 runes, Tailwind 4 semantic tokens, Iconify classes.

| Component                      | Role                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RegionGenerateMenu.svelte`    | In the hex panel: a **Generate region** control offering Grow from this hex, Generate area, Fill gaps and Regenerate. Shown only to a GM on an editable map with Hex Crawl on. |
| `RegionReviewBar.svelte`       | The review surface: bottom sheet below the `md` breakpoint, side card above it.                                                                                                |
| `RegionSettings.svelte`        | Preset select and the Customise disclosure (nine terrains × None / Less / Normal / More).                                                                                      |
| `RegionProposalOverlay.svelte` | Draws the proposal on the map.                                                                                                                                                 |
| `RegionUndoBar.svelte`         | "Region added. Undo" after accept.                                                                                                                                             |

`HexCrawlPanel.svelte` gains only `RegionGenerateMenu`. `HexCrawlLayer.svelte` mounts the overlay, the review bar and the undo bar, calls `leave()` on map change, and routes hex taps while a review is open.

### Review bar: required content

- Title naming the operation.
- Radius stepper (1 to 12) with the live count, "Covers N hexes". Hidden for Grow.
- Seed field with Copy, and Reroll.
- Preset select; Customise disclosure, closed by default.
- Counts: "N hexes to generate", "N protected", and for Regenerate "N will change" and "N explored hexes will change" when above zero.
- The line: **"Generated on this device. No AI is used."** (FR-036)
- Accept and Cancel. Accept is disabled while saving and when there is nothing to apply.
- Any `message` from the store, announced with `role="status"`; failures with `role="alert"`.

### Proposal overlay: required behaviour

- Each proposed hex is drawn as a filled, tinted hex shape with a dashed outline and its terrain icon, so that it reads with no base image and cannot be mistaken for saved terrain (FR-023).
- Adjusted hexes use a solid outline.
- For Regenerate, hexes in `exploredChanges` carry a warning mark (FR-020a).
- Rendered only for the GM who opened the review; never in Player View or for guests (FR-028).
- Culled to the viewport like the existing overlay.

### Interaction

- While a review is open, tapping a proposed hex opens the existing `HexTerrainPicker` for that hex; choosing records an adjustment. Tapping a hex outside the proposal does nothing.
- The review bar has an **Adjust a hex** field: typing a hex label and pressing Enter opens the same picker for that hex, so adjusting needs no pointer. A label that is not in the proposal shows a short message and changes nothing (FR-037).
- Every control has a minimum 44 × 44 px touch target and is reachable by keyboard; Escape cancels the review (FR-037).
- At 360 px wide the bottom sheet takes at most half the viewport height and can be collapsed to a single row, so the proposal stays visible (SC-009).
- Focus moves to the review bar when it opens and returns to the map when it closes.

## Privacy and visibility

- Nothing in this feature calls the network or an AI client.
- Proposal, adjustments and undo are never written to the map, the vault, sync or export.
- `generated` provenance is part of `hexCrawl`, which `GuestExporter` already removes.
