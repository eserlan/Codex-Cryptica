# Implementation Plan: Hex Crawling Maps

**Branch**: `feat/170-hex-crawling-maps` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Issue #1951: Support Hex Crawling maps with hex grid overlay, axial coordinate system, and hex fog of war

## Summary

Expand Codex Cryptica's spatial map engine (`packages/map-engine`) and map application (`apps/web`) to support tabletop RPG overland hexcrawls. This adds regular hexagonal grid rendering (pointy-topped and flat-topped orientations), axial/cube coordinate mathematics, token and pin snapping to hex cell centers, hex-based polygonal Fog of War revealing/hiding, discrete hex distance measurement, and overland travel units.

All core geometric mathematics, coordinate conversions, and rendering algorithms reside in `packages/map-engine` (framework-free), while Svelte 5 reactive stores and VTT UI controls in `apps/web` expose the settings to users and integrate with existing OPFS mask storage.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: Canvas 2D API, `@codex/spatial-engine`, Tailwind 4 semantic tokens, Lucide Iconify utility classes  
**Storage**: Browser-local OPFS (for standard 2D map mask WebP/PNG persistence) and `localStorage` / vault settings (for per-map grid settings). Zero new databases or external schemas required.  
**Testing**: Vitest (`packages/map-engine/src/hex.test.ts`, `apps/web/src/lib/stores/map.test.ts`, component/interaction tests)  
**Target Platform**: Modern desktop and tablet web browsers (Canvas 2D + OPFS)  
**Project Type**: Workspace package extraction (`packages/map-engine`) + SvelteKit web client (`apps/web`)  
**Performance Goals**: 60 FPS viewport rendering; hex grid stroke batched in $< 1\text{ms}$ per frame by bounding rendering strictly to visible viewport hexes.  
**Constraints**: Zero server dependencies; 100% offline-capable; fully backwards-compatible with existing square grids, pins, tokens, and fog masks.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **I. Library-First**: All geometric calculations (axial/cube math, projection, neighbors, distance, vertex generation) are isolated in `packages/map-engine/src/hex.ts` and `hex-renderer.ts`, completely independent of Svelte or browser UI frameworks.
- [x] **II. Test-Driven Development**: Full test suites for axial coordinate conversions, cube rounding, distance, neighbor ranges, and hex snapping in `packages/map-engine/src/hex.test.ts` before UI wiring.
- [x] **III. Simplicity & YAGNI**: Reuses the existing 2D `maskCanvas` pipeline for Fog of War by filling 6-point hex polygon paths rather than inventing a separate hex-state database store.
- [x] **V. Privacy & Client-Side**: All map data, masks, and pins remain strictly client-side in browser OPFS and IndexedDB.
- [x] **VI. Clean Implementation**: Svelte 5 Runes, Tailwind 4 semantic tokens (`bg-theme-surface`, `text-theme-primary`), Iconify utility classes (`class="icon-[lucide--hexagon] ..."`), zero `lucide-svelte` imports.
- [x] **VIII. Dependency Injection**: `MapStore` and interaction handlers retain constructor DI.

### Discovery Intent Check

_Mark N/A: Feature adds internal VTT and spatial map capabilities, not a public indexable discovery landing page._

- **Status**: N/A

### Bounded Responsibility Check

- [x] `packages/map-engine/src/renderer.ts` (1,033 lines): Rather than appending hundreds of lines of hex drawing code to `renderer.ts`, all hex rendering algorithms will live in a new modular file `packages/map-engine/src/hex-renderer.ts`. `renderer.ts` simply delegates `drawGrid` to `drawHexGrid(...)` when `grid.type === "hex-pointy" | "hex-flat"`.
- [x] `apps/web/src/lib/stores/map.svelte.ts` (850 lines): Extended with `gridType: GridType` and `showHexCoordinates: boolean` in `PersistedMapSettings`. Fits directly into the existing map settings responsibility without adding new subsystems.
- [x] `apps/web/src/lib/components/map/fog-stroke.ts`: Extracted helper `hex-fog-stroke.ts` will house hex polygon mask stamping functions (`punchHexFogCell`, `punchHexFogRadius`) rather than bloating `fog-stroke.ts`.

### User Help Check

- [x] Help article updated/added in `apps/web/src/lib/content/help/` explaining how to configure hex grids, adjust cell size, snap tokens, measure travel distance, and use hex fog of war.

## Project Structure

### Documentation (this feature)

```text
specs/170-hex-crawling-maps/
├── spec.md              # Feature specification
├── plan.md              # This plan
├── research.md          # Mathematics, geometry & rendering research
├── data-model.md        # Data models and schema extensions
├── quickstart.md        # User quickstart guide
└── contracts/           # API contracts
    ├── hex-engine.ts
    └── hex-fog.ts
```

### Source Code Impact

```text
packages/map-engine/
├── src/
│   ├── hex.ts               # Core axial/cube coordinate math, distance, snapping
│   ├── hex.test.ts          # Unit tests for all hex mathematics
│   ├── hex-renderer.ts      # Viewport-bounded hex line and coordinate rendering
│   ├── hex-renderer.test.ts # Rendering unit tests
│   ├── renderer.ts          # Updated RenderOptions and delegation to hex-renderer
│   └── index.ts             # Export hex APIs

apps/web/src/lib/
├── stores/
│   ├── map.svelte.ts        # PersistedMapSettings (gridType, showHexCoordinates)
│   └── map-session.svelte.ts# Hex distance and snapping integration
├── components/map/
│   ├── VTTGridSettings.svelte # UI controls for Hex Pointy / Hex Flat & coordinates
│   ├── hex-fog-stroke.ts      # Canvas mask polygon stampers
│   ├── hex-fog-stroke.test.ts # Mask stamping unit tests
│   ├── map-fog-painter.ts     # Hex reveal tool integration
│   └── MapContextMenu.svelte # Hex token resize options
```

## Planned Implementation Phases

### Phase 1: Core Geometry & Math (`packages/map-engine/src/hex.ts`)

1. Implement `axialToCube`, `cubeToAxial`, `cubeRound`.
2. Implement forward projection `hexToPoint` and inverse projection `pointToHex` for both `"pointy"` and `"flat"` orientations.
3. Implement `getHexCorners` (6 polygon vertices).
4. Implement `hexDistance`, `getHexNeighbors`, `getHexRange` (radius spiral), and `getHexLine`.
5. Implement `snapPointToHexCenter`.
6. Write comprehensive unit test suite in `packages/map-engine/src/hex.test.ts` covering precision, rounding boundaries, negative coordinates, and distance calculations.

### Phase 2: Viewport-Bounded Hex Grid Rendering (`packages/map-engine/src/hex-renderer.ts`)

1. Implement `drawHexGrid`:
   - Calculate visible viewport bounds in image space.
   - Enumerate visible axial coordinate bounds $(q_{\min} \dots q_{\max}, r_{\min} \dots r_{\max})$.
   - Batch hex border strokes with configurable line color, opacity, and width.
   - Render centered coordinate text (`01.04` or `q, r`) when `showCoordinates` is true and zoom level provides $\ge 25\text{px}$ hex radius.
2. Update `packages/map-engine/src/renderer.ts` to support `grid.type`: `"none" | "square" | "hex-pointy" | "hex-flat"` and delegate to `drawHexGrid`.
3. Add rendering tests in `packages/map-engine/src/hex-renderer.test.ts`.

### Phase 3: Store State & Grid Settings UI (`apps/web`)

1. Update `MapStore` (`apps/web/src/lib/stores/map.svelte.ts`):
   - Add `gridType: "square" | "hex-pointy" | "hex-flat"` to `PersistedMapSettings`.
   - Add `showHexCoordinates: boolean` to `PersistedMapSettings`.
   - Update defaults and local storage persistence.
2. Update `VTTGridSettings.svelte`:
   - Add Grid Type selector: "Square", "Hex (Pointy)", "Hex (Flat)".
   - Add "Show Coordinates" toggle (visible when a hex grid is active).
   - Label radius / spacing controls appropriately.

### Phase 4: Token Snapping & Measurement (`apps/web`)

1. Update token drag release and placement:
   - When active grid is hex-based, snap token center to `snapPointToHexCenter(point, config)`.
   - Scale token width and height to match hex cell diameter.
2. Update measurement ruler:
   - When active grid is hex-based, calculate discrete hex distance using `hexDistance`.
   - Format measurement label: `${distance} hexes (${distance * gridDistance} ${gridUnit})`.

### Phase 5: Hex Fog of War Reveal & Hide

1. Create `apps/web/src/lib/components/map/hex-fog-stroke.ts`:
   - `punchHexFogCell(ctx, hex, config, isHiding)`: fills regular hexagon path on `maskCanvas`.
   - `punchHexFogRadius(ctx, centerHex, radius, config, isHiding)`: fills range of hexagons.
2. Integrate into `MapFogPainter` and `token-vision-revealer`:
   - Add hex click-to-reveal mode.
   - Reveal hex radius in token vision mode when on a hex grid.
3. Write unit tests in `apps/web/src/lib/components/map/hex-fog-stroke.test.ts`.

### Phase 6: Documentation & Validation

1. Add user documentation in `apps/web/src/lib/content/help/` for hexcrawling, hex grids, and hex fog of war.
2. Run impacted tests: `bun run test:changed`.
3. Run changed lint: `bun run lint:changed`.
4. Run scoped type checking: `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`.
5. Run Fallow audit: `bunx fallow audit --format json --quiet --explain --gate-marker agent`.
