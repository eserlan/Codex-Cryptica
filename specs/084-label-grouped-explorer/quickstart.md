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
│ ──────────────────────────────────── │
│ • Alaric Stormborn          [npc]    │
│ • Mira of Ash               [npc]    │
│ • Quartermaster Venn        [npc]    │
│                                      │
│ QUEST                                │
│ ──────────────────────────────────── │
│ • Mira of Ash               [npc]    │
│ • The Broken Seal           [note]   │
│ • Road to Glass Hollow      [loc]    │
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

### 4. Verify Filter Integration

1. While in label view, apply a search query.
2. Toggle one or more category filters.
3. Confirm only matching entities remain visible.
4. Confirm empty sections do not render.

### 5. Verify Explorer Interactions

1. Click an entity from a grouped section.
2. Confirm it still opens normally in the main app view.
3. If drag-and-drop is enabled in your current workflow, confirm grouped entries still start drag operations correctly.

### 6. Verify Persistence

1. Leave the explorer in label view.
2. Reload the browser tab.
3. Confirm the same explorer layout is restored after reload.
