---
id: entity-explorer
title: Entity Explorer
description: Browse, search, group and nest every entry from the sidebar, and review drafts before they join your vault.
icon: icon-[lucide--database]
tags:
  [
    explorer,
    sidebar,
    entities,
    search,
    filter,
    nesting,
    hierarchy,
    drafts,
    review,
  ]
rank: 3
---

# Entity Explorer

The **Entity Explorer** is the sidebar list of every entry in your vault. Use it to find an entry, open it, group entries, build a hierarchy, and approve or reject drafts. Open or close it with **Explorer** in the navigation.

For a spreadsheet-style overview with columns, see the [Entity Table](/help#help/entity-table).

## All Entities and Review

The panel has two tabs:

- **All Entities** lists every entry.
- **Review** lists only entries marked as drafts, with a number showing how many there are. See [Reviewing drafts](#reviewing-drafts).

## Opening an entry

Click an entry to open it. In the sidebar, this opens Zen Mode; in the desktop Explorer workspace, it opens the entry in the workspace view. Each row also has buttons that appear when you point at it:

- **Open in Zen Mode** opens the entry.
- **Find in Graph** takes you to the entry on the graph. On a phone this also closes the sidebar so you can see it.
- **Add child entity** creates a new entry nested under this one. Type a name, choose a category and confirm, or cancel.

## Searching and filtering

- **Search entities...** searches your entries as you type. Add `#label` or `@label` to only show entries with that label; the box suggests labels as you type. **Clear search** empties it.
- **Category icons** above the list filter to one category. Choose **Show all categories** to go back.
- Active label filters appear as chips; remove one with its x, or choose **Clear All**.

## Sorting and grouping

- **Sort** by **Name** or **Last edited**, and flip between ascending and descending with the arrow beside it.
- **List View** shows your entries in their hierarchy.
- **Group by Label** and **Group by Category** gather entries under headings instead. Group by Category is unavailable while a category filter is on, because the list is already one category. Clear the filter to use it.

Long lists show 100 entries per page, with page controls at the bottom.

## Building a hierarchy

In List View you can nest entries, for example a Tavern inside a City:

- **Drag an entry onto another** to make it a child of that entry.
- **Move to Root** appears while you are dragging. Drop an entry on it to take it out of its parent.
- Use the arrow on an entry that has children to **Collapse** or **Expand** them.

Codex Cryptica will not let you nest an entry under one of its own descendants, because that would make a loop. The drop simply does nothing.

## Dragging onto a canvas or a map

On the **All Entities** tab you can drag an entry out of the Explorer and drop it onto a [Spatial Canvas](/help#help/spatial-canvas) to add it as a card, or onto a [map](/help#help/map-mode) to place it as a pin or token.

## Reviewing drafts

The **Review** tab shows entries that are still drafts. For each one:

- **Approve draft** turns it into a normal entry.
- **Reject draft** **deletes the entry**. Check the entry before you reject it.

In a shared world you cannot approve or reject drafts, nest entries or drag them.
