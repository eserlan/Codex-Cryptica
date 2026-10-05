# Research & Technical Decisions: Hex Crawling Maps

**Feature**: `1951-hex-crawling-maps`  
**Date**: 2026-10-05

## 1. Hexagonal Mathematics & Coordinate Systems

### Decision: Axial Coordinates `(q, r)` as Canonical Storage, Cube `(x, y, z)` for Calculations

- **Rationale**:
  - Axial coordinates `(q, r)` are a 2D integer representation that uniquely identifies any hex in a regular triangular lattice without redundancy.
  - Cube coordinates `(x, y, z)` where `x + y + z = 0` (with `x = q`, `z = r`, `y = -x - z`) enable symmetric linear algebra, distance calculation, rotation, line drawing, and rounding.
  - Offset coordinates (e.g. `col, row` with even/odd shifts) introduce awkward piecewise branch conditions for distance and neighbor calculation; axial and cube coordinate math is branch-free and elegant.
- **Reference**: Red Blob Games Hexagonal Grids canonical reference (Amit Patel).

### Pointy-Topped vs. Flat-Topped Hex Geometries

#### Pointy-Topped Geometry (Vertical Columns)

- Hex orientation angle: $30^\circ, 90^\circ, 150^\circ, 210^\circ, 270^\circ, 330^\circ$.
- Dimensions: Width $w = \sqrt{3} \times \text{size}$, Height $h = 2 \times \text{size}$.
- Center spacing:
  - Horizontal spacing between adjacent column centers: $\sqrt{3} \times \text{size}$.
  - Vertical spacing between adjacent row centers: $\frac{3}{2} \times \text{size}$.
- Forward projection (Axial $\to$ Pixel Center):
  $$x = \text{size} \times \left(\sqrt{3} \times q + \frac{\sqrt{3}}{2} \times r\right) + \text{offsetX}$$
  $$y = \text{size} \times \left(\frac{3}{2} \times r\right) + \text{offsetY}$$
- Inverse projection (Pixel $\to$ Fractional Axial):
  $$q = \frac{\frac{\sqrt{3}}{3} \times (x - \text{offsetX}) - \frac{1}{3} \times (y - \text{offsetY})}{\text{size}}$$
  $$r = \frac{\frac{2}{3} \times (y - \text{offsetY})}{\text{size}}$$

#### Flat-Topped Geometry (Horizontal Rows)

- Hex orientation angle: $0^\circ, 60^\circ, 120^\circ, 180^\circ, 240^\circ, 300^\circ$.
- Dimensions: Width $w = 2 \times \text{size}$, Height $h = \sqrt{3} \times \text{size}$.
- Center spacing:
  - Horizontal spacing: $\frac{3}{2} \times \text{size}$.
  - Vertical spacing: $\sqrt{3} \times \text{size}$.
- Forward projection (Axial $\to$ Pixel Center):
  $$x = \text{size} \times \left(\frac{3}{2} \times q\right) + \text{offsetX}$$
  $$y = \text{size} \times \left(\frac{\sqrt{3}}{2} \times q + \sqrt{3} \times r\right) + \text{offsetY}$$
- Inverse projection (Pixel $\to$ Fractional Axial):
  $$q = \frac{\frac{2}{3} \times (x - \text{offsetX})}{\text{size}}$$
  $$r = \frac{-\frac{1}{3} \times (x - \text{offsetX}) + \frac{\sqrt{3}}{3} \times (y - \text{offsetY})}{\text{size}}$$

#### Fractional Axial to Discrete Hex Rounding

Convert fractional $(q, r)$ to cube $(x, y, z)$, round each component to nearest integer $(rx, ry, rz)$, compute differences, and adjust the component with the largest rounding error so that $rx + ry + rz = 0$.

---

## 2. Rendering Strategy & Bounded Viewport

### Decision: Viewport-Bounded Procedural Stroke Path

- **Alternative Considered**: `CanvasPattern` via `createPattern`.
  - _Why Rejected_: Rectangular repeating pattern canvases require exact matching tile boundaries. In hex grids, pointy hexes repeat vertically over 3 sizes and horizontally over $\sqrt{3}$ sizes, leading to subpixel seam artifacts and floating-point phase drifts across large zoom ranges.
- **Chosen Approach**:
  - Query visible image-space bounding box:
    $$\text{minX} = \text{unproject}(0, 0).x, \quad \text{maxX} = \text{unproject}(\text{width}, 0).x$$
    $$\text{minY} = \text{unproject}(0, 0).y, \quad \text{maxY} = \text{unproject}(0, \text{height}).y$$
  - Determine bounding range of axial coordinates $(q_{\min}, q_{\max}, r_{\min}, r_{\max})$ covering the visible viewport plus a 1-hex safety apron.
  - Draw shared hex segments or 6-point polygons into a single canvas path with `ctx.stroke()`.
  - At 60 FPS, a typical 1080p viewport at 50px hex radius renders $\approx 150 - 400$ hexes. In benchmarks, batching these into a single canvas stroke takes $< 0.8\text{ms}$.
  - If `showHexCoordinates` is true and rendered hex radius is $\ge 25\text{px}$, stroke text coordinates at each hex center. Suppress text when zoomed out to prevent visual clutter and frame rate drops.

---

## 3. Hex Fog of War Integration

### Decision: Reuse Existing `maskCanvas` via Polygonal Mask Stamping

- **Existing Architecture**:
  - Fog is a 2D offscreen `maskCanvas` where white pixels (`#ffffff`) represent revealed areas, and transparent pixels (`#00000000` or `destination-out`) represent shroud.
  - Persisted as WebP/PNG in OPFS (`MapMask.maskPath`), synchronized across P2P guest sessions, and composited in `renderMap`.
- **Hex Fog Execution**:
  - Revealing a hex:
    1. Calculate center $(cx, cy)$ in image coordinates.
    2. Compute 6 corner vertices of the hexagon.
    3. `ctx.save()`; `ctx.fillStyle = "white"`; `ctx.globalCompositeOperation = "source-over"`.
    4. `ctx.beginPath()`; trace 6 vertices; `ctx.closePath()`; `ctx.fill()`.
    5. `ctx.restore()`.
  - Hiding a hex:
    Same as above with `ctx.globalCompositeOperation = "destination-out"`.
  - Vision Radius / Multi-Hex Reveal:
    Enumerate all axial coordinates within distance $N$ using hex range query, and fill their polygons in a single composite operation.
  - **Benefit**: 100% backward and forward compatibility with existing OPFS mask files, undo/redo stack (`pushUndoAction`), P2P host/guest synchronization, and canvas shaders. Zero database migrations or mask format changes required.

---

## 4. Snapping & Measurement

### Snapping

- Function: `snapPointToHex(point: Point, config: HexGridConfig): Point`
  - Calls `pointToHex(point, config)` to find discrete $(q, r)$.
  - Calls `hexToPoint({ q, r }, config)` to get the exact center point.
- Tokens:
  - When dragged on a hex grid, the token center snaps to the nearest hex center.
  - Token width and height scale with hex cell diameter ($2 \times \text{size}$ for flat, $\sqrt{3} \times \text{size}$ for pointy).
- Pins:
  - Pins snap to nearest hex center or vertex.

### Measurement

- Function: `getHexPath(from: HexCoord, to: HexCoord): HexCoord[]` and `getHexDistance(from: HexCoord, to: HexCoord): number`.
- Ruler Tool:
  - If `gridType` is `"hex-pointy"` or `"hex-flat"`, the measurement label computes `hexDistance` instead of Euclidean pixel distance:
    $$\text{distance} = \frac{|q_1 - q_2| + |r_1 - r_2| + |s_1 - s_2|}{2}$$
  - Displays: `${dist} hexes (${dist * gridDistance} ${gridUnit})`.
