---
id: point-crawl-generator
title: Point Crawl Generator
description: Build connected travel networks with named locations, routes, loops, hazards, and PNG map export.
tags:
  [
    generator,
    point-crawl,
    map,
    locations,
    routes,
    travel,
    overland,
    exploration,
  ]
rank: 18
---

## Point Crawl Travel Networks

The **Point Crawl Generator** designs interconnected adventure maps made of named locations (nodes) and travel routes (edges). Unlike open-grid hex crawls, a point crawl structures overland or regional journeys into deliberate paths, meaningful shortcuts, locked gates, and navigational dilemmas.

### What is in a Point Crawl?

Every generated point crawl consists of:

- **Locations**: 6–15 starts, landmarks, junctions, hazards, discovery sites, and destinations. Structural labels such as hub, chokepoint, secret, and optional describe the generated graph; hazards and obstacles appear as separate site traits.
- **Routes & Exits**: Explicit paths between locations with travel times, terrain types, travel hazards, encounter chances, and optional passage requirements (such as climbing gear, tidal timing, or magical keys).
- **Network Topology**: Verified navigable structure ensuring no orphaned branches, guaranteed path to the goal, and tactical navigation choices (loops, alternate branches, and optional secrets).
- **Interactive Visual Preview**: Drag and rearrange nodes, inspect locations and route details from either direction, and copy or download the diagram as a high-resolution **PNG**.
- **Adventure logic**: The overview records its objective, discoveries, outcomes, detour benefits, and any feasible countdown clock. Travel durations are structured and checked against a clock that starts at the crawl or a named location.

### Generating In-App

To create a point crawl directly inside your campaign vault:

1. Open **Campaign Generators** (click the wand icon in the vault toolbar or select **Point Crawl Generator**).
2. Choose a **Setting & Genre** (Fantasy, Grimdark, Sci-Fi, Cyberpunk, Post-Apocalyptic, etc.) or provide custom steering notes.
3. Select a network size from 6 to 15 locations and choose a density: **Linear-leaning** targets N + 1 routes, **Balanced branching** targets about 1.35 routes per location, and **Highly interconnected** targets about 1.75 routes per location (capped at 24).
4. Pick an **Environment / Topology** (Fen / Marshland, Mountain Pass, Underdark / Caverns, Derelict Space Hulk, Neon Megacity, Sunken Coast, etc.).
5. Click **Generate Point Crawl**.

### Interactive Refinement & Diagram Export

Once generated:

- **Inspect Nodes and Routes**: Click any location or route on the map to inspect its structural role, traits, encounters, clues, and direction-specific approach details.
- **Rearrange & Tidy**: Drag nodes on the canvas to customize visual placement for your notes, or click **Reset Layout** to re-apply the auto-layout algorithm.
- **Surgical Refinement**: Select any location or route and request AI refinements (e.g., _"Make the bridge guarded by troll mercenaries"_ or _"Add a hidden flooded tunnel"_).
- **Export**: Use the diagram toolbar to copy or download a PNG for player handouts or VTT display.

### Saving to Your Vault

Click **Save to Vault** to convert the point crawl into your local campaign workspace:

- Creates a dedicated **Location entity** for each selected node, complete with sensory descriptions, hazards, and a markdown `## Routes & Exits` section.
- Automatically establishes bidirectional connections between connected locations with route summaries as connection labels.
- Creates an overarching **Note entity** (`kind: "point-crawl"`) summarizing the crawl's premise, navigation rules, and links to all generated locations.
- Use the graph's selection controls to save all locations, or only the core and selected locations. The overview filters out routes and plan references that point to locations outside the selection.
