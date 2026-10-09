---
id: graph-basics
title: Knowledge Graph
description: Navigate campaign entities and relationships in the graph with selection, zoom, automatic visual grouping, and connection shortcuts.
tags: [navigation, connections, groups, visual grouping]
rank: 2
---

## Quick Guide

The graph is your primary way to navigate.

### Shortcuts

- `C`: Toggle manual Connect Mode (click source then target).
- `L`: Toggle Node Labels.
- `Scroll`: Zoom in/out.
- `Drag`: Pan the view.
- `Click Node`: Focus entity and open detail panel.
- On a touch screen, drag to pan, pinch to zoom, and tap a node to open it.
- To connect two entries without Connect Mode, right-click two selected entries, or use the Link button below.
- With several entries selected, the toolbar offers **Apply Labels** to label them all at once and **Merge** to combine duplicates into a single entry.

### Toolbar Controls

The bottom-left toolbar provides quick access to layout and visibility:

- **Minimap**: Toggle the overview map.
- **Timeline**: Toggle chronological layout.
- **Zoom**: Adjust view scale.
- **Stable Layout (Pin)**: Prevent nodes from moving automatically.
- **Link (Chain icon)**: Quickly connect two selected nodes.
- **Groups**: Cycle the backgrounds behind the larger groups of closely linked entities: soft, strong (more visible, for spotting the groups quickly), or hidden. Hover an entity to highlight its whole group.
- **Redraw (Refresh)**: Recalculate node positions. Closely linked entities are placed together in their own area, and entities with no connections are lined up separately.

### Graph Grouping

Graph groups are automatic visual clusters of closely connected entities. They
help you spot connected parts of your world, such as a faction and its members
or locations linked by events. They are not containers that you create and fill:
there is no manual add/remove, rename, resize, or style control for a Graph
group.

- **Groups**: Use the Groups button in the bottom-left toolbar to show or hide
  coloured backgrounds behind the larger groups. Click again to cycle between
  soft, strong, and off. On mobile, open the graph toolbar menu to find it. Your
  choice is saved as a local Graph display setting.
- **Redraw**: Recalculate the layout to place closely linked entities together
  in their own areas. Entities with no connections are lined up separately.

The clusters follow entity connections, not categories or labels. Turning
Groups on or off changes only the backgrounds; use Redraw to rearrange node
positions. Changes to connections can change which entities appear together.
Hover over a node to highlight its cluster and fade the other backgrounds.
Small clusters may have no background until you hover over one of their nodes,
so a node without a background can still have connections. The background is a
visual aid: it does not create or change entity relationships, labels, or other
entity data.

If you want to arrange selected cards yourself, use the [Spatial Canvas](/help#help/spatial-canvas): add entities to a board and place them where you want. To keep a Graph arrangement, save it with a Saved View's **Save current layout** option. Saved Views preserve node positions when you save a layout snapshot; they do not create manually managed Graph groups. See [Saved Views & View Sync](/help#help/saved-views).

Graph group backgrounds are hidden in Timeline and Orbit layouts, which arrange
entities by date or distance instead of connections.

### Images in Large Campaigns

The graph loads images in and near your current view. Pan or zoom towards another
part of the graph to load its images. They appear together once they have loaded,
or after about 20 seconds if some are slow. Fitting the entire graph on screen can
take longer, because every visible image needs to load. Uploaded images use saved previews, and older local images get previews cached
for later visits. Silhouettes appear for entities without images and when an image cannot be
found.

### Related Blog Posts

- [Getting Started with Codex Cryptica](/blog/getting-started-guide) — Core workflows and knowledge graph navigation.
- [Why Codex Cryptica Over Obsidian](/blog/why-codex-cryptica-over-obsidian) — Comparing interactive spatial graphs with text-only vaults.
- [Supercharged Lore Discovery](/blog/supercharged-discovery) — Using graph connections to uncover hidden lore relationships.
