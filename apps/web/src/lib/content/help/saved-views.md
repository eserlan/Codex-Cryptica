---
id: saved-views
title: Saved Views & View Sync
tags: [views, presets, table, graph, filters, navigation]
rank: 6
---

## Overview

**Saved Views** (also known as View Presets) allow you to save any combination of filters, search queries, and presentation settings as a named, reusable lens over your vault.

Instead of locking notes into rigid hierarchical folders, Codex Cryptica uses dynamic, rule-based views. When you define a view, any entity matching its criteria is automatically included across both the **Interactive Graph** and the **Entity Table**.

---

## How It Works: Rule-Based Lenses vs. Folders

Codex Cryptica does not use file folders. Everything in your vault lives in a flat, interconnected knowledge graph. Saved Views act as real-time queries:

1. **Automatic Membership**: Entities appear in a view whenever their metadata matches the view's criteria.
2. **Same Content, Different Perspectives**: A saved view captures the _same content scope_ whether you inspect it as a network of nodes in the Graph or as a dense, sortable matrix in the Table.

---

## What a Saved View Captures

When you save a view, it stores:

- **Categories & Types**: Active entity types (e.g., _Characters_, _Locations_, _Factions_).
- **Labels & Tags**: Any filtered `#labels` (e.g., `#quest-lead`, `#act-2`, `#patron`).
- **Search Queries**: Active search terms and keyword filters.
- **Incompleteness Status**: The "Incomplete only" toggle to isolate notes missing summaries, labels, or connections.
- **Column Filters**: Column-level criteria configured in the Entity Table.
- **Table Presentation**: Active sort column and sort direction.
- **Graph Presentation**: Timeline layout, orbit mode, selected central node, and camera viewport pan/zoom.

---

## Creating & Using Saved Views

### In the Entity Table

1. Apply your desired filters (e.g. select categories, type in search, toggle "Incomplete only", or configure column filters).
2. Click the **Saved views** dropdown in the table toolbar.
3. Type a descriptive name into the _Name this view..._ input.
4. Click **`+`** (or press `Enter`) to save.

### In the Knowledge Graph

1. Filter the graph using the HUD controls, search bar, or timeline mode.
2. Click the **Saved Views** bookmark icon in the bottom toolbar.
3. Type a name and click **`+`** to save your filters along with the current camera position.

---

## How to Add Entities to a View

Because views are query-based, you don't drag-and-drop entities into them:

- **To add an entity to an automatic view**: Update the entity's type, content, or metadata so it matches the view's filter criteria (for example, setting its category to _NPC_ or giving it a summary).
- **To build a hand-curated view** (e.g., _Session 14 Cast_ or _Dungeon Bosses_):
  1. Create a dedicated label such as `#session-14` or `#boss`.
  2. Filter for that label in the Table or Graph and save the view.
  3. Tag any relevant entity with that `#label` in the detail panel or table. It will immediately appear in that view!

---

## Managing Views

- **Switch Views**: Open the **Saved Views** dropdown and click any named view to activate it.
- **Reset to Default**: Click _Reset to default_ inside the dropdown to clear all active filters.
- **Rename**: Hover over a preset in the dropdown list and click the **Pencil icon** (or focus with keyboard), edit the name, and confirm.
- **Delete**: Click the **Trash icon** to remove a view. (This only deletes the view preset; your entities remain completely untouched).

---

## Mobile Usage

Saved Views are fully accessible on mobile devices:

- **On Table View**: Tap the **Saved views** button in the header toolbar.
- **On Graph View**: Tap the floating **Settings / Graph Controls** button in the bottom corner to open the mobile controls panel, then tap the **Bookmark** icon.

---

## Related Blog Posts

- [Same Content, Different Perspectives: Unified Saved Views in Codex Cryptica](/blog/same-content-different-views) — How to seamlessly switch between topological graphs and dense tables.
- [Supercharged Lore Discovery](/blog/supercharged-discovery) — Mastering labels and filters for dynamic campaign prep.
- [Why Codex Cryptica Over Obsidian](/blog/why-codex-cryptica-over-obsidian) — Graph-first worldbuilding without brittle folder structures.
