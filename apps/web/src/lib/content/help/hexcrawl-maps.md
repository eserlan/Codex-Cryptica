---
id: hexcrawl-maps
title: Hexcrawl & Overland Maps
description: Configure hexagonal grid overlays, token snapping, coordinate labels, and hex-based Fog of War for TTRPG overland travel.
tags: [map, hex, hexcrawl, vtt, grid, fog of war, exploration]
rank: 4
---

## Overland Hex Crawling

Codex Cryptica provides native support for overland hexcrawls and region exploration on any spatial map or battlemap.

### Configuring Hex Grids

1. Open any map in **Map Mode** (`/map`).
2. Click the **grid button** in the map bar to show the grid overlay.
3. Right-click the grid button to open **Grid Settings**.
4. Select your desired **Grid Type**:
   - **Square**: Traditional tactical dungeon grid.
   - **Hex (Pointy)**: Pointy-topped hexagons with vertical columns.
   - **Hex (Flat)**: Flat-topped hexagons with horizontal rows.
5. Adjust **Hex Radius** (cell size in pixels) and your campaign scale (e.g. `6` `miles` per cell).
6. If your map image already has hexes drawn on it, choose **Fit Grid from Map** and drag across a few of them to match their size and position. See [Grids & Measurement](/help#help/vtt-grids-measurement).

### Coordinate Overlays

When managing large overland regions, toggle **Show Hex Coordinates** in Grid Settings:

- Visible hexes render centered axial coordinates in `(q.r)` format (such as `01.04` or `02.05`).
- Labels automatically hide when zoomed out past the legibility threshold to prevent visual clutter and keep navigation smooth.

### Token Snapping & Sizing

- **Automatic Snapping**: Dragging a party token, NPC, or monster token on an active hex map snaps its center to the nearest hex cell upon release.
- **Hex Diameter Sizing**: Right-click any token and choose **Resize** (1x, 2x, 3x) to scale it to the exact diameter of the hexagonal cell ($2 \times \text{radius}$ or $\sqrt{3} \times \text{radius}$).

### Hex Fog of War Exploration

Reveal wilderness regions hexagon by hexagon without ragged brush strokes:

1. Ensure **Fog of War** is enabled on the map.
2. In GM mode, click or drag across shrouded hexes to stamp clean hexagonal reveals into the fog mask.
3. To reveal or hide exactly one hex, right-click it and choose **Reveal hex** or **Hide hex**. The menu offers whichever one applies to that hex.
4. Tokens with active vision sources automatically reveal their vision radius in discrete hex rings as they move across the region.
5. Exploring on your own? Turn on **SOLO** next to **FOG** so fogged hexes are completely hidden while you keep every GM tool. See [Fog, Player View & Solo Play](/help#help/vtt-fog-player-view).
6. All hex fog changes integrate seamlessly with the Oracle undo/redo stack (`Ctrl+Z`) and local OPFS mask storage.

### Distance & Travel Measurement

Use the measurement ruler (the ruler switch at the bottom left of the map) on a hex map:

- Dragging between two locations calculates the discrete hex distance using axial cube mathematics.
- The measurement label displays both the total hex count and converted travel distance (for example, `4 hexes (24 mi)`).
