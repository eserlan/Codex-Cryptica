---
id: presentation-templates
slug: presentation-templates
title: "Present Your Stat Sheets Your Way"
description: "Use Markdown-based Presentation Templates to give the same Stat Sheet a compact stat block, dashboard, mobile reference, or a layout of your own."
keywords:
  - "RPG Stat Sheet Layout"
  - "Markdown Stat Block"
  - "Custom RPG Character Sheet"
  - "VTT Stat Sheet"
  - "Codex Cryptica"
publishedAt: 2026-08-02T12:00:00Z
---

A Stat Sheet should show the right information at the right moment. During a fight, you might want a dense stat block with Hit Points, defense, and attacks together. Between scenes, the same character may be easier to use as a dashboard with resources, notes, and abilities grouped into clear sections.

**Presentation Templates** let you change that view without changing the Stat Sheet underneath. Your fields and values stay exactly where they are; a presentation only decides how they are arranged and displayed.

![Placeholder — an entity Stats tab with the Presentation picker open](https://placehold.co/1600x900/111827/f8fafc?text=Placeholder%3A+Stats+tab+and+Presentation+picker)

## Start with the built-in views

Open an entity, choose the **Stats** tab, and select a layout from the presentation picker. The available options are limited to templates that match that Stat Sheet's schema, so you will not accidentally apply a vehicle layout to an NPC sheet with different fields.

The built-in options give you a few useful starting points:

- **Standard Form** keeps the sheet in a straightforward top-to-bottom layout.
- **Compact Stat Block** puts a dense, at-a-glance summary in one card. It is useful for NPCs and creatures during combat.
- **Dashboard** groups important values into cards for a broader session view.
- **Mobile Quick Reference** favors a compact layout that is easier to scan on a smaller screen.

Switching between them never copies, resets, or recalculates your values. Increase a counter in one view, then choose another, and you will see the same updated value there too.

If an entity needs an exception, choose a presentation for that entity. Use **Use Schema Default** to return it to the schema's shared default. Choosing **Standard** removes the presentation override and uses the normal Stat Sheet view.

## Make a layout that matches your table

To create or manage layouts for a Stat Sheet, open **Presentations** from the entity's **Stats** tab. The manager shows the templates available for the current schema.

Built-in templates are read-only, so start by choosing **Duplicate**. For a new layout, choose **New Template**. Both open the Markdown editor with a live preview beside it.

![Placeholder — Presentation Templates manager showing built-in templates, Duplicate, and New Template](https://placehold.co/1600x900/111827/f8fafc?text=Placeholder%3A+Presentation+Templates+manager)

The editor is intentionally small: standard Markdown for structure, plus field references and a few layout sections. It does not run HTML, CSS, JavaScript, or expressions from a template. That keeps imported layouts safe and predictable.

### Reference fields by their ID

A field reference inserts a Stat Sheet field into the layout:

```md
{{stat.hp}}
{{stat.armour display="prominent"}}
{{stat.hp display="current-max" label="Vitality"}}
```

Use **Insert Field** in the editor instead of memorizing field IDs. It lists the fields that belong to the current schema and inserts a valid reference at the cursor.

The optional `display` setting changes the way a compatible field appears. For example, a counter can use `current-max`, while a prominent display can draw attention to Armor or another key number. The editor tells you when a requested display does not suit that field and uses a safe default instead.

### Group information into useful sections

Normal Markdown headings, paragraphs, lists, tables, and blockquotes work as you would expect. Use the layout blocks below when you want more deliberate grouping:

```md
# Goblin Skirmisher

:::stat-group columns=2
{{stat.hp display="current-max" label="Hit Points"}}
{{stat.ac display="prominent" label="Armor"}}
:::

:::section

## Actions

{{stat.scimitar}}
{{stat.shortbow}}
:::
```

The supported layout blocks are:

- `:::stat-group columns=2` for a responsive grid of related fields.
- `:::section` for a named region of content.
- `:::card` for a contained panel.
- `:::row columns=2` for a responsive row of content.

Groups and rows collapse gracefully on narrower screens. Start with one or two columns, then use the live preview to check that the sheet remains easy to read.

![Placeholder — Markdown editor beside a live stat-sheet preview with field autocomplete visible](https://placehold.co/1600x900/111827/f8fafc?text=Placeholder%3A+Markdown+editor+and+live+preview)

## Let the preview catch problems early

The live preview updates as you write. If a template refers to a field that no longer exists, the affected spot is visibly marked instead of taking down the whole sheet. An unsupported layout block is marked too.

This is especially helpful when a Stat Sheet evolves over a campaign. You can rename or remove a field without losing the rest of a useful layout. Fix the marked reference when you are ready; the other fields continue to render.

If the app cannot use a selected presentation at all—for example, if it was deleted or its schema is unavailable—it falls back to the standard Stat Sheet view. Your entity data remains intact.

## Set a sensible default, then make exceptions only when needed

Presentation Templates belong to one Stat Sheet schema. A default presentation can be shared by every entity that uses that schema, while an individual entity can choose its own view when it needs one.

That makes it practical to use a compact stat block as the default for NPCs, then give a boss or recurring ally a custom dashboard without creating duplicate Stat Sheets. The schema keeps the data shape consistent; each presentation decides how people see it.

## Export layouts without exporting campaign data

Saved custom presentations can be exported from the editor and imported into another vault that has the same Stat Sheet schema. The export contains the template's name, description, target schema, and Markdown source—not entity values, vault identifiers, or local asset references.

When an import contains disallowed content, Codex Cryptica removes that content and tells you what was stripped. When the target vault does not have the required schema, the import reports that mismatch instead of attaching the layout to unrelated data.

Presentation Templates are a way to make the sheet fit your game without making your data fragile. Start with a built-in layout, duplicate it when you find yourself reaching for the same arrangement, and let the preview keep the result honest.

### [Open your Stat Sheets in Codex Cryptica →](/)

_Need a refresher on fields, counters, dice, and reusable Stat Sheet schemas? Read the [Stat Sheets help guide](/help#help/stat-sheets)._
