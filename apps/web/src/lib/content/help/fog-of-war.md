---
id: fog-of-war
title: Fog of War
description: Hide undiscovered entities from the graph while keeping GM-only information out of players' view.
tags: [exploration, graph, security]
rank: 12
---

## Hiding Information

The **Fog of War** system lets you track what your players have discovered. You can hide nodes on the graph so they don't see spoilers during a session.

### Entity visibility or map fog?

This article covers hiding entity records and graph nodes from player-facing
views. Map fog is a separate layer covering terrain on a map image. Its brush
reveals map areas; it does not reveal a private entity or change that entity’s
visibility. Check both controls when sharing a world with players.
See [Map Mode](/help#help/map-mode) for the map fog controls.

### Visibility States

- **Revealed**: Everyone can see this node and its links.
- **Hidden**: Only you (the GM) can see this entry in the list, but it's gone from the graph.
- **Rumor (Link Only)**: A "ghost" node that appears when an entry is mentioned but not yet fully discovered.

### How to Reveal

1. **Right-Click**: Tap a node and look for the Visibility menu.
2. **Toggle Reveal**: Click to show or hide it from the graph.
3. **GM View**: Click the **Eye Icon** in the bottom controls (or press `P`) to see everything at once, regardless of Fog of War.
