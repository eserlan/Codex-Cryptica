# Contracts: Solo Map Play

Internal interfaces only. The feature has no network API: nothing about solo play leaves the device (FR-021).

## 1. `map-engine`: hex travel helpers (framework-free)

New module `packages/map-engine/src/hex-travel.ts`, exported from the package index.

```ts
/** Whole hexes travelled between two image-space points on a hex grid. */
export function hexTravel(
  from: Point,
  to: Point,
  config: HexGridConfig,
): { from: HexCoord; to: HexCoord; hexes: number };

/** Hex radius for a vision range given in grid units. Never negative. */
export function visionRangeInHexes(
  visionRange: number,
  gridDistance: number,
): number;

/** Hexes within `radius` of `center` that `isRevealed` reports as fogged. */
export function newlyRevealedHexes(
  center: HexCoord,
  radius: number,
  isRevealed: (hex: HexCoord) => boolean,
): HexCoord[];
```

Guarantees: pure, no I/O, deterministic. `visionRangeInHexes(r, d)` returns `0` when `d <= 0`.

## 2. `MaskUndoRecorder` (app, `components/map/`)

Extracted from `MapFogPainter`, shared with the exploration recorder.

```ts
interface MaskUndoRecorder {
  /** Copy the live mask before a change. */
  snapshot(): HTMLCanvasElement | null;
  /** Push one undo step that restores `before`, with redo restoring the current mask. */
  commit(label: string, before: HTMLCanvasElement | null): void;
}
```

Behaviour: identical to the painter's existing undo (restores and saves the mask on the same map only).

## 3. `SoloExplorationRecorder` (app, `components/map/`)

Replaces the vision reveal effect in `MapView.svelte`. Constructor-injected dependencies (Principle VIII):

```ts
interface SoloExplorationDeps {
  revealer: TokenVisionRevealer;
  undo: MaskUndoRecorder;
  isRevealedAt: (imgPoint: Point) => boolean;
  publishCapture: (payload: JournalCapturePayload) => void;
  getState: () => {
    soloOn: boolean; // mapStore.soloFog && mapStore.showFog
    canReveal: boolean; // GM and not a guest (unchanged rule)
    hex: HexGridConfig | null; // active hex grid, or null
    visionRange: number;
    gridDistance: number;
    gridUnit: string;
    showHexCoordinates: boolean;
    mapId: string | null;
  };
}

class SoloExplorationRecorder {
  readonly lastMove: Travel | null; // reactive
  readonly total: Travel; // reactive
  /** Called whenever vision source tokens move or change. Reveals live. */
  onVisionChanged(tokens: Token[]): Promise<void>;
  /** Called when a move completes (drag end, or a single-step move). Records once. */
  onMoveSettled(tokens: Token[]): Promise<void>;
  reset(): void;
}
```

Contract:

- With `canReveal` false, it does nothing, as today.
- With SOLO off, it reveals exactly as today: no undo, no travel, no capture (non-solo behaviour unchanged).
- With SOLO on:
  - `onVisionChanged` reveals live and, on the first change of a move, snapshots the mask. It records no undo, travel or capture.
  - A move completes on drag end (signalled by `TokenDragHandler.end()` through an injected `onMoveSettled`), or immediately for a position change made outside a drag.
  - On completion: one undo step labelled "Map Exploration" restoring the snapshot, only if anything was newly revealed; travel from the hex at move start to the final hex, per vision token; at most one `map-move` capture.
- Only vision source tokens are tracked; other tokens count no travel.
- On a hex map the radius is `visionRangeInHexes(visionRange, gridDistance)`. Otherwise the existing pixel radius is used.

## 4. Journal capture payload

Published on `JOURNAL:CAPTURE` (existing event):

```ts
{
  entryType: "map-move",
  content: string,           // see data-model.md
  sourceRef: { mapId, toHex, hexes, distance, unit, revealed }
}
```

The listener skips it when `journal.captureMapMoves === false`. That is the only listener change, and it applies to `map-move` entries alone.

## 5. UI contract

| Control               | Where                    | Shown when                                                                                                      | Help target                    |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| SOLO switch           | Map bar, after FOG       | GM view, fog on (exists)                                                                                        | `vtt-solo-fog-toggle` (exists) |
| Vision Range in hexes | Map bar, existing slider | Hex grid. Label reads "Vision: N hexes"                                                                         | none                           |
| Travel readout        | Map bar, near Vision     | SOLO on and a vision source token exists. "Last: 3 hexes (18 mi) · Total: 12 hexes (72 mi)" with a Reset button | `vtt-travel-readout`           |
| Record map moves      | Journal view             | A journal is active                                                                                             | none                           |

The travel readout is announced politely to screen readers after each move.

## 6. Help engine

- New article `vtt-solo-play`, added to the `vtt-map` feature's `helpIds`.
- New highlight target `vtt-travel-readout` (requires `vtt-solo-fog`), reachable by the GM only.
- Evaluation questions per SC-006, at least five.
