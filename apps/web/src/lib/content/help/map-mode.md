---
id: map-mode
title: Map Mode
description: Place campaign locations on a map and navigate your world with spatial pins.
tags: [map, spatial, pins, fog of war, hierarchy]
rank: 3
---

## Spatial Lore Navigation

**Map Mode** transitions Codex Cryptica from a document-heavy manager to a visual, spatial experience. You can plot your campaign data onto custom geographic or tactical canvases.

### Getting Started

1. Click the **MAP** tab in the top navigation bar.
2. If no map exists, click **Upload World Image** to select a JPG or PNG from your device.
3. Once uploaded, use your **Mouse Wheel** to zoom and **Click-Drag** to pan.

### Placing Lore Pins

Connect your geography directly to your notes:

- **Double-Click** anywhere on the map to create a new pin.
- **Drag an entity** from the **Entity Explorer** sidebar and drop it anywhere on the map to instantly create a pin linked to that entity.
- Use the **Link Lore** search box on a pin to connect it to an existing NPC, Location, or Item.
- **Click a Pin** to instantly open its associated chronicle in the side panel.

### Fog of War (GM Only)

Manage mystery and player progression:

1. Toggle **GM MODE** in the bottom control bar.
2. Ensure **FOG** is toggled ON.
3. Hold the **Alt Key** and **Click-Drag** to "paint away" the fog and reveal areas of the map.
4. Reveals are persistent and will be saved to your vault.

### Hierarchical Maps

Dive deeper into your world:

- You can attach specific sub-maps to entities (e.g., a "Tavern" note can have its own floor plan).
- In the **Entity Detail Panel**, go to the **MAP** tab to upload a sub-map.
- Once attached, pins linked to that entity will show an **ENTER** button, allowing you to dive into the sub-map.
- Use the breadcrumbs or "Go Back" logic to return to the parent map.

### Starting a VTT Session

Transform any map into a live tactical Virtual Tabletop:

1. Click the **VTT OFF** button in the top-right map controls overlay to activate **VTT ON**.
2. Drag character or monster notes from **Entity Explorer** directly onto the grid to place tokens.
3. Track initiative, measure spell and movement ranges with the ruler, ping the map from the right-click menu, and stream live map updates to players with **Share Campaign**. See [VTT Overview & Modes](/help#help/vtt-session) for the full guide.
4. For detailed step-by-step instructions, open the [Starting a VTT Session from Maps](/help#help/vtt-session) help article.

### Map or canvas?

Use a **map** for geography: a town, region or dungeon image with pins locating
entities, fog to reveal terrain, and optional tactical tokens. Use a **Spatial
Canvas** for arranging entity cards, notes and visual links on a planning board.
A canvas is useful for an investigation or plot outline where positions do not
represent geographic locations. See [Spatial Canvas](/help#help/spatial-canvas).

### Is a map pin a connection?

A map pin places an entity at a location on an image. A connection records a
relationship between two entities, such as a character living in a town.
Placing a pin does not create that relationship. Use **+ Add** under Connections
on the entity’s **Status** tab to create a relationship separately.
See [Connections Tab](/help#help/connections-tab).

### Map fog or hidden entities?

Map fog covers parts of a map image; the fog brush reveals terrain to players.
Entity visibility controls which records and graph nodes players can see.
Revealing terrain does not make a private entity public. Check both map fog and
entity visibility when preparing a player-facing view.
See [Fog of War](/help#help/fog-of-war) for entity visibility.

### Related Blog Posts

- [Introducing Tactical VTT Mode](/blog/vtt-introduction) — Overview of zero-overhead, Peer-to-Peer tactical map sessions.
- [Spatial Intelligence & Map Navigation](/blog/spatial-intelligence) — Integrating geographic maps, pins, and spatial lore navigation.
