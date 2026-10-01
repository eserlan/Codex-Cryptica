---
id: graph-basics
title: Knowledge Graph
description: Navigate campaign entities and relationships in the graph with selection, zoom, and connection shortcuts.
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
- **Redraw (Refresh)**: Recalculate node positions.

### Images in Large Campaigns

The graph loads images in and near your current view. Pan or zoom towards another
part of the graph to load its images. Images that finish loading appear without
waiting for slower ones. Fitting the entire graph on screen can still take longer,
because every visible image needs to load. Uploaded images use saved previews, and older local images get previews cached
for later visits. Silhouettes appear for entities without images and when an image cannot be
found.

### Related Blog Posts

- [Getting Started with Codex Cryptica](/blog/getting-started-guide) — Core workflows and knowledge graph navigation.
- [Why Codex Cryptica Over Obsidian](/blog/why-codex-cryptica-over-obsidian) — Comparing interactive spatial graphs with text-only vaults.
- [Supercharged Lore Discovery](/blog/supercharged-discovery) — Using graph connections to uncover hidden lore relationships.
