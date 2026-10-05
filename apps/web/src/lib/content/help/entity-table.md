---
id: entity-table
title: Entity Table
description: Review, sort, filter and bulk-edit every entry in your vault in a spreadsheet-style table.
icon: icon-[lucide--table]
tags: [table, entities, filter, sort, search, labels, bulk, reports, overview]
rank: 3
---

# Entity Table

The **Entity Table** lists every entry in your vault in one grid, so you can scan, sort, filter and tidy a lot of entries at once. It is the best place to find entries that are missing something, such as a summary, labels or any connections. Open it from **Table** in the navigation.

To explore the same entries as a network instead, choose **View as graph** at the top right.

## What each column shows

| Column          | What it is                                                          |
| --------------- | ------------------------------------------------------------------- |
| **Name**        | The entry's title. Click it to open the entry.                      |
| **Type**        | Its category, such as Character or Location.                        |
| **Connections** | How many connections it has, in either direction.                   |
| **Summary**     | A short preview of its text, or **Missing summary** if it has none. |
| **Labels**      | Its labels, or **No labels**.                                       |
| **Created**     | When it was created.                                                |
| **Modified**    | When it was last changed.                                           |

Long lists are shown 50 entries at a time. Use the page controls under the table to move between pages.

## Sorting

Click a column heading to sort by it. Click the same heading again to reverse the order. Name, Type, Connections, Labels, Created and Modified can be sorted; Summary cannot.

## Searching and filtering

- **Search box**: type words to search your entries. Add `#label` or `@label` to only show entries with that label, for example `#faction`.
- **Type and label chips**: click a type or a label on any row to filter the table to it. Each active filter appears above the table, and you can remove one on its own or choose **Clear all filters**.
- **Incomplete only**: shows entries that are missing a summary, labels or connections. The number beside it is how many entries are incomplete right now.
- **Column filters**: the small filter button next to Connections, Summary, Labels, Created and Modified narrows the table by that column, for example only entries with no connections, only entries with no labels, or only entries that have no created date. **Reset column filter** clears it.

Filters work together, so you can combine a search, a type, a label and a column filter. On a phone, open the filters with the filter button above the table.

If the search index is still being prepared, a text search may use a lighter match until it is ready.

## Selecting entries

- **Click a row** to select it. Click it again to deselect.
- **Hold Shift** and click another row to select, or deselect, everything between them.
- **Tick the box in the header** to select every entry that matches your current filters.
- Press **Escape** to clear the selection.

Double-click a row, or click its name, to open the entry in Zen Mode. Hold Ctrl, Cmd or Shift while clicking the name to open it in a new tab or window instead.

## Working on a selection

Once you select entries, a bar appears above the table showing how many are selected:

- **Add / remove labels** changes the labels of every selected entry at once.
- **Generate report** collects the selected entries into a report. See [Entity Reports](/help#help/entity-reports).
- **Clear selection** empties the selection.

Right-click a row for a menu that works on the selection:

- **Send to Shelf** copies the selected entries so you can bring them into another vault. See [The Shelf](/help#help/entity-shelf).
- **Manage Labels** opens the same label editor.
- **Change Type** moves the selected entries to another category.
- **Delete** removes the selected entries.

## Saved views

Save a combination of search, filters and sorting as a named view, and come back to it later. See [Saved Views & View Sync](/help#help/saved-views).

## In a shared world

Someone viewing a published world can search, sort and filter the table, but it is read-only for them: **Generate report** is not offered, and the right-click menu shows "Read-Only Guest Session" with its actions switched off.
