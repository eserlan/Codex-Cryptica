---
id: point-crawl-generator
title: Point Crawl Generator
description: Build connected travel networks with named locations, routes, loops, hazards, and SVG/PNG map exports.
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

- **Locations**: Start locations, landmarks, settlements, crossroad hubs, hazard zones, discovery sites, and final destinations with environmental tags, encounters, and interactive discoveries.
- **Routes & Exits**: Explicit paths between locations with travel times, terrain types, travel hazards, encounter chances, and optional passage requirements (such as climbing gear, tidal timing, or magical keys).
- **Network Topology**: Verified navigable structure ensuring no orphaned branches, guaranteed path to the goal, and tactical navigation choices (loops, alternate branches, and optional secrets).
- **Interactive Visual Preview**: Drag and rearrange nodes to adjust layout, inspect locations and route details, and export the diagram as standalone **SVG** or high-resolution **PNG**.

### Generating In-App

To create a point crawl directly inside your campaign vault:

1. Open **Campaign Generators** (click the wand icon in the vault toolbar or select **Point Crawl Generator**).
2. Choose a **Setting & Genre** (Fantasy, Grimdark, Sci-Fi, Cyberpunk, Post-Apocalyptic, etc.) or provide custom steering notes.
3. Select your network scale: **Micro (5-7 nodes)** for quick delves or local fens, **Standard (8-12 nodes)** for regional adventures, or **Sprawling (13-18 nodes)** for large expeditions.
4. Pick an **Environment / Topology** (Fen / Marshland, Mountain Pass, Underdark / Caverns, Derelict Space Hulk, Neon Megacity, Sunken Coast, etc.).
5. Click **Generate Point Crawl**.

### Interactive Refinement & Diagram Export

Once generated:

- **Inspect Nodes**: Click any location on the map diagram to open its full dossier, encounters, clues, and outgoing paths.
- **Rearrange & Tidy**: Drag nodes on the canvas to customize visual placement for your notes, or click **Reset Layout** to re-apply the auto-layout algorithm.
- **Surgical Refinement**: Select any location or route and request AI refinements (e.g., _"Make the bridge guarded by troll mercenaries"_ or _"Add a hidden flooded tunnel"_).
- **Export**: Click **Export SVG** or **Export PNG** in the diagram toolbar to download the visual map for player handouts or VTT display.

### Saving to Your Vault

Click **Save to Vault** to convert the point crawl into your local campaign workspace:

- Creates a dedicated **Location entity** for each selected node, complete with sensory descriptions, hazards, and a markdown `## Routes & Exits` section.
- Automatically establishes bidirectional connections between connected locations with route summaries as connection labels.
- Creates an overarching **Note entity** (`kind: "point-crawl"`) summarizing the crawl's premise, navigation rules, and links to all generated locations.
