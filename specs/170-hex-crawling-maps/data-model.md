# Data Model: Hex Crawling Maps

**Feature**: `170-hex-crawling-maps`  
**Date**: 2026-10-05

## 1. Domain Entities & Value Objects (`packages/map-engine/src/hex.ts`)

### `HexCoord` (Axial Coordinate)

Represents a discrete hexagonal coordinate in axial 2D space.

```ts
export interface HexCoord {
  readonly q: number; // column axis
  readonly r: number; // row axis
}
```

### `CubeCoord` (Cube Coordinate)

Represents a hex coordinate in 3D cube space where $x + y + z = 0$.

```ts
export interface CubeCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
```

### `HexOrientation`

Orientation of hexagons:

- `"pointy"`: pointy-topped (vertex points North/South, edges East/West, vertical columns).
- `"flat"`: flat-topped (flat edges North/South, vertex points East/West, horizontal rows).

```ts
export type HexOrientation = "pointy" | "flat";
```

### `HexGridConfig`

Full configuration for calculating and rendering a hexagonal grid.

```ts
export interface HexGridConfig {
  orientation: HexOrientation;
  size: number; // outer radius (center to corner vertex) in pixels
  offsetX: number;
  offsetY: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
  showCoordinates?: boolean;
}
```

---

## 2. Grid Type Extensions (`packages/schema` & `packages/map-engine`)

### `GridType`

```ts
export type GridType = "square" | "hex-pointy" | "hex-flat";
```

### `RenderOptions.grid` extension in `packages/map-engine/src/renderer.ts`:

```ts
export interface RenderOptions {
  // ...
  grid?: {
    type: "none" | "square" | "hex-pointy" | "hex-flat";
    size: number;
    color: string;
    opacity: number;
    offsetX?: number;
    offsetY?: number;
    fixed?: boolean;
    fixedPan?: { x: number; y: number };
    showCoordinates?: boolean;
  };
}
```

---

## 3. Store Persistence Model (`apps/web/src/lib/stores/map.svelte.ts`)

### `PersistedMapSettings` (Extended)

```ts
type PersistedMapSettings = {
  showFog: boolean;
  showGrid: boolean;
  gridType: GridType;
  brushRadius: number;
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridColor: string | null;
  showLabels: boolean;
  showHexCoordinates: boolean;
  visionMode: TokenVisionMode;
  visionRange: number;
  layerVisibility: Record<MapLayer, boolean>;
  layerLocked: Record<MapLayer, boolean>;
};
```

Defaults:

```ts
const DEFAULT_MAP_SETTINGS: PersistedMapSettings = {
  showFog: false,
  showGrid: false,
  gridType: "square",
  brushRadius: 50,
  gridSize: 50,
  gridOffsetX: 0,
  gridOffsetY: 0,
  gridColor: null,
  showLabels: true,
  showHexCoordinates: false,
  visionMode: "party",
  visionRange: 60,
  layerVisibility: layerRecord(true),
  layerLocked: layerRecord(false),
};
```

---

## 4. Map Pin Hex Metadata (`packages/schema/src/map.ts`)

### `MapPinSchema` (Additive extension)

```ts
export const MapPinSchema = z.object({
  id: z.string().uuid(),
  mapId: z.string().uuid(),
  entityId: z.string().optional(),
  coordinates: PointSchema,
  hexCoordinates: z
    .object({
      q: z.number().int(),
      r: z.number().int(),
    })
    .optional(),
  visuals: z.object({
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});
```

This is fully backwards compatible: existing pins omit `hexCoordinates`, and pins placed on hex grids store both Cartesian pixel position and axial coordinates.
