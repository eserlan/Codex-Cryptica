---
id: graph-basics
title: Knowledge Graph
description: Navigate campaign entities and relationships in the graph with selection, zoom, automatic grouping, and connection shortcuts.
tags: [navigation, connections]
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

The graph automatically groups closely linked entities by their connections.
Use these groups to spot connected parts of your world, such as a faction and
its members or locations linked by events.

- **Groups**: Use the Groups button in the bottom-left toolbar to show or hide
  soft coloured backgrounds behind the larger groups. On mobile, open the graph
  toolbar menu to find it.
- **Redraw**: Recalculate the layout to place closely linked entities together
  in their own areas. Entities with no connections are lined up separately.

Grouping follows connections rather than entity categories or labels. The Groups
button only changes the backgrounds; use Redraw to rearrange node positions.
Hover over a node to highlight its group and fade the other backgrounds.
Small groups may have no background until you hover over one of their nodes,
so a node without a background can still have connections.

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
