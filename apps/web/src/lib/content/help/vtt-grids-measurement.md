---
id: vtt-grids-measurement
title: Grids & Measurement
description: Choose square or hex grids, set cell size and scale, show hex coordinates, fit the grid to your map image, and measure distances with the ruler.
tags:
  [
    vtt,
    grid,
    hex,
    square,
    scale,
    measurement,
    ruler,
    coordinates,
    snapping,
    fit,
  ]
rank: 5
---

## Showing the grid

Use the **grid button** in the map bar to show or hide the grid. Right-click it to open the grid settings.

## Grid settings

- **Grid type**: **Square**, **Hex (Pointy)** or **Hex (Flat)**. Match the orientation of the hexes on your map.
- **Show Hex Coordinates**: on hex grids, labels each hex with axial coordinates (q.r) at its centre.
- **Grid Cell Size** (square) or **Hex Radius** (hex): the size in pixels. Drag the slider from 20 to 500.
- **Distance per Cell** and **Unit Name**: set the scale, such as `5` and `ft`, or `6` and `mi` for overland maps.

Choose **Apply to All** to save the settings.

Tokens snap to the grid, and token sizes on a hex grid match the hex. See [Hexcrawl & Overland Maps](/help#help/hexcrawl-maps).

## Lining the grid up with your map

If your map image already shows a grid:

- **Fit Grid from Map**: drag across a few squares of the grid on the image, rather than just one. It is easier to land on 3 squares than exactly 1. While dragging, hold `Shift` and scroll to choose how many squares the drag spans (1, 2, 3, 5 or 10). The cell size is worked out from that.
- **Move Map to Fine-tune** (shown once a size is set): drag the map under the fixed grid, release to apply, or press `Esc` to cancel.

Fit Grid from Map is built for **square** grids. On a hex map, set the **Hex Radius** by eye and use **Move Map to Fine-tune** to line it up. A fitting tool for hex grids already on a map image is not available yet.

## Measuring distance

Use the **ruler switch** at the bottom left of the map. Click the map to set the start, then click again to set the end. The label shows the distance using your scale, and on hex maps it also counts hexes, for example `4 hexes (24 mi)`.

## Pings

To point something out, right-click and choose **Ping Here**, or choose **Ping Token** on a token. Everyone connected sees the ping.
