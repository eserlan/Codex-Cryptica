---
id: entity-reports
title: Entity Reports
description: Preview selected campaign entities as a report, choose what to include, and save the result as an editable Note.
tags:
  [
    report,
    reports,
    canvas,
    graph,
    table,
    selection,
    note,
    relationships,
    preview,
  ]
rank: 5
---

## Create a report

Entity Reports collect information about chosen entities into a document preview. Start from any of these places:

- **Canvas**: Choose **Generate report** in the canvas header. Pick **Entire canvas** to include its entity cards, or **Selected nodes only** to limit the report to selected cards. Canvas drawings and freehand annotations are not report content.
- **Knowledge Graph**: Select the entities you want, then use the report action for that selection.
- **Entity Table**: Select the entities you want, then use the report action for that selection.

The Graph and Table reports use the selected entities as their scope. Relationships are included only where they connect entities in that report scope. On Canvas, you can choose whether to include lines drawn between the selected cards as well as graph connections.

## Choose the contents

Review the preview before saving. You can set **Brief** or **Standard** detail and choose whether to include descriptions, relationships, factions and affiliations, portraits, and GM-only secrets. GM-only secrets are excluded unless you turn them on. When relationships are included, you can also choose canvas lines (for Canvas reports) and graph connections. An option with no matching data is unavailable or explains that there is nothing to include.

You can change the report title in the preview. If the scope is empty, the preview explains that there is nothing to report on and **Save as note** stays unavailable. Relationship and faction options explain when the selected entities have no matching data; connection options also explain when there are no canvas lines or graph connections to include.

## Save, edit, and regenerate

Choose **Save as note** to create a new Note entity with the report content. The saved report opens in Zen Mode and can be edited like a Note. Saving creates a snapshot: it does not change the source entities, even if you later edit the report.

The saved Note is marked as a report and keeps its source and generation details so the report can be regenerated. Regeneration updates that report Note; it does not edit its source entities. If the report content has manual edits, the app asks you to confirm before replacing those edits.

Choose **Cancel** to close the preview without creating a Note or changing any entities. Cif can explain how reports work, but cannot save or regenerate one for you. The Canvas report control is unavailable in guest vaults and on Adventure boards.

## Reports, Notes, Saved Views, and Canvas

- A **Report** is a point-in-time document made from selected entities. It is stored as a Note, with report provenance that supports regeneration.
- An ordinary **Note** is a document you write or edit directly; it has no report source details or regeneration behaviour.
- A **Saved View** stores reusable filters and presentation settings for the Graph or Table. It does not create a document. See [Saved Views & View Sync](/help#help/saved-views).
- A **Canvas** is a manually arranged workspace of entity cards and visual links. A report can collect information from its cards, but it is a separate document and does not preserve the canvas layout. See [Spatial Canvas](/help#help/spatial-canvas).
