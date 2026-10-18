---
id: vtt-tiles-layers-notes
title: Tile Decks, Layers & Map Notes
description: Build dungeon maps from tile decks, organise the map into Terrain, Furniture and Token layers, and pin notes to the map.
tags:
  [vtt, tiles, tile decks, layers, notes, stocking, geomorph, dungeon, terrain]
rank: 5
---

## Tile decks

Open **Tile Decks** in the VTT Sidebar (GM only) to build a map from tiles.

- **Add decks**: add a starter pack (Scribble Dungeons, Geomorphs 2013 or Geomorph Collection), or import your own PNG or JPG images with a **Deck name** and tile images.
- **Draw**: draw a random tile from a deck, or choose a specific tile from the palette (filter it by category). **Draw from all decks** pulls from every installed deck at once.
- **Place**: drag a tile onto the map, or click it and click the map. Press `Esc` to cancel placing.
- **Snapping**: new tiles snap edge to edge against tiles already on the map.
- **Offline**: starter tiles are downloaded once into the current vault, so drawing keeps working offline.

### Stock on draw

Each deck has a **Stock on draw** setting, applied only to tiles you draw at random (a tile you pick by hand is placed as it is):

- **None**: no extra content.
- **Table Roll**: rolls the **Source Table** you choose from your random tables automatically when the tile is placed. Create a table first if none are listed.
- **Encounter**: pins an empty encounter note on the tile, ready for you to fill in.

**Frequency** sets how often a drawn tile is stocked, from every tile to one in several.

## Layers

Every tile and token belongs to one of three layers: **Terrain**, **Furniture** or **Tokens**. They are always drawn in that order, so tokens never vanish under the map.

- Use the **layer** control in the map bar to choose which layer you are editing. New placements go there, and only items on that layer can be selected or dragged, so you can work on furniture without nudging tokens or terrain.
- **Hide** a layer to declutter your view. **Lock** a layer to stop edits to it; a locked layer blocks everyone, including the GM.
- Right-click a tile or token and choose **Move to Layer** to reassign it.
- Players moving their own token are not held back by the layer you happen to be editing.

## Map notes

Pin a note anywhere on the map to remember what happens there.

1. Choose the note button (in the VTT Sidebar, or the map bar when VTT is off).
2. Click the spot, then write the note. Press `Esc` to back out without placing one.
3. A note lands folded down to a small marker so a stocked dungeon does not hide the map. Double-click a marker to open it, and double-click again to fold it away.
4. Note text takes basic markdown, and the toolbar above it writes bold, italic, headings and bullet lists for you. `Shift` + scroll over an open note to resize it.

Notes start hidden from players, so you can stock a dungeon ahead of time. Right-click a note to show it when the party finds it. You can link a note to a placed tile so it stays with it, and unlink it again from the token details.

When you roll on a random table, **Pin to map** drops the result onto the map as a note, so a rolled encounter stays attached to its room.

A note belongs to the session. For one that turns out to matter, choose **Keep in vault** to write it into your vault as a Note entity and link the marker to it.
