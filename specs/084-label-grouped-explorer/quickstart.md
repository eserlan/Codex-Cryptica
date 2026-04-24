# Quickstart: Label-Grouped Entity Explorer

This guide validates the explorer grouping feature against the current web app behavior.

## Prerequisites

Start the app locally:

```bash
npm install
npm run dev
```

## Validation Steps

## Explorer Mock

Example label-grouped explorer layout:

```text
┌──────────────────────────────────────┐
│ Search entities...              [🔎] │
├──────────────────────────────────────┤
│ [All] [NPC] [LOC] [ITEM]  |  [≡] [#] │
│                            list label│
├──────────────────────────────────────┤
│ NPC                                  │
│ ▾ 3                                  │
│ ──────────────────────────────────── │
│ • Alaric Stormborn          [npc]    │
│ • Mira of Ash               [npc]    │
│ • Quartermaster Venn        [npc]    │
│                                      │
│ QUEST                                │
│ ▸ 3                                  │
│ ──────────────────────────────────── │
│                                      │
│ UNLABELED                            │
│ ──────────────────────────────────── │
│ • Forgotten Shrine          [loc]    │
│ • Iron Ledger               [item]   │
└──────────────────────────────────────┘
```

In label mode, a multi-labeled entity can appear in more than one section. The exact colors, icons, and spacing follow the active theme, but the overall hierarchy should remain the same.

### 1. Prepare Explorer Data

1. Open the app in your browser.
2. Open any vault with several entities.
3. Add labels to a few entities so at least one entity has one label, one entity has multiple labels, and one entity has no labels.
4. Leave at least one entity without labels so the unlabeled fallback can be verified.

### 2. Verify the Explorer Toolbar

1. Open the **Entity Explorer** from the left sidebar.
2. Confirm the toolbar includes the existing category filters plus two layout controls:
   - **List View**
   - **Group by Label**

### 3. Verify Label Grouping

1. Select **Group by Label**.
2. Confirm each label renders as its own section header.
3. Confirm an entity with multiple labels appears in every matching section.
4. Confirm unlabeled entities appear in a dedicated **Unlabeled** section.

### 4. Verify Label Section Toggles

1. While in label view, click a label section header.
2. Confirm the entities under that label hide without affecting other label sections.
3. Click the same header again.
4. Confirm the entities for that label become visible again.

### 5. Verify Filter Integration

1. While in label view, apply a search query.
2. Toggle one or more category filters.
3. Confirm only matching entities remain visible.
4. Confirm empty sections do not render.

### 6. Verify Explorer Interactions

1. Click an entity from a grouped section.
2. Confirm it still opens normally in the main app view.
3. If drag-and-drop is enabled in your current workflow, confirm grouped entries still start drag operations correctly.

### 7. Verify Label Filtering & Graph Synchronization

1. Click on a label pill on any entity.
2. Confirm that the list filters to show only entities with that label.
3. Confirm an "Active Filters" bar appears below the search bar showing the selected label.
4. **Confirm that the Graph View (if visible) also filters to show only nodes matching that label.**
5. Ctrl/Cmd+Click on another label pill.
6. Confirm that the list now shows only entities containing BOTH labels (AND logic).
7. **Confirm that the Graph View also reflects the combined "AND" filter.**
8. Click the 'X' on an active filter pill to remove it.
9. Confirm that the filter is removed and both the list and graph update accordingly.
10. **Add a label filter from the Graph HUD and confirm it appears in the Explorer.**

### 8. Verify Search Integration

1. Clear all filters.
2. Type the name of a label into the search bar.
3. Confirm that entities with that label are surfaced, even if the label name is not in their title or content.

### 9. Verify Persistence

1. Leave the explorer in label view.
2. Collapse one label section.
3. Reload the browser tab.
4. Confirm the same explorer layout is restored after reload.
5. Confirm the same label section remains collapsed after reload.
