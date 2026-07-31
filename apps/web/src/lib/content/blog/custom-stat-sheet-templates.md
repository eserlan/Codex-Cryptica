---
id: custom-stat-sheet-templates
slug: custom-stat-sheet-templates
title: "Build Stat Sheets That Keep Your Table Moving"
description: "Learn how to design, reuse, and manage custom Stat Sheet templates for characters, NPCs, creatures, vehicles, and every other entity in your campaign."
keywords:
  - "RPG Stat Sheet Templates"
  - "Custom Character Sheets"
  - "VTT Stat Sheets"
  - "RPG Campaign Management"
  - "Codex Cryptica"
publishedAt: 2026-07-31T14:00:00Z
---

At the table, the best character sheet is the one you can read in a glance and update without breaking the flow of play.

That is the idea behind **Stat Sheets** in Codex Cryptica. They give any entity a small, practical surface for the numbers, notes, and actions you reach for during a session — without forcing your campaign into one particular rules system.

The same layout can then be saved as a reusable template, so the next NPC, vehicle, creature, or important location starts with the structure it actually needs.

## Start with the decisions you make at the table

Open an entity and switch to its **Stats** tab. Choose **Edit Layout** to shape the sheet around the way you play.

The available fields are deliberately simple:

- **Counters** are useful for values that change often, such as Hit Points, spell slots, ammunition, stress, or supplies. Set a minimum, maximum, and step when those boundaries matter.
- **Numbers** work well for Armor Class, initiative, movement, difficulty, or any value you want to edit directly.
- **Text** keeps short details such as conditions, speed, or a character's current stance close at hand.
- **Long Text** gives abilities, traits, reminders, and other multiline notes room to breathe.
- **Headings** divide a busy sheet into collapsible sections.
- **Dice** turns an expression such as `1d20+5` into a one-tap roll.

There is no hidden modifier system waiting to reinterpret your fields. A Stat Sheet is a flexible tool for your table's rules, not a replacement for them.

## Design for the few seconds between turns

A good sheet is organized by frequency of use, not by the order in which a rulebook introduces a concept.

Put the values you check every round near the top: current Hit Points, defense, initiative, movement, and the attacks or actions players reach for most. Put situational abilities, inventory notes, and lore reminders below them. Use headings to separate combat, resources, abilities, and reference material so a long sheet stays scannable.

For a VTT session, favor short labels and compact fields. A heading such as **Combat** or **Resources** is more useful in play than a paragraph explaining what the section contains. If a value changes repeatedly, make it a counter. If it only needs to be read or rolled occasionally, a number, text, or dice field may be enough.

The goal is not to record every possible fact about an entity. It is to keep the facts that matter now within reach.

## Save a layout once, reuse it everywhere

When the layout feels right, open **Templates** and use **Save current layout as...** to give it a name. The saved template becomes available to every entity in the current vault.

Templates save the structure of a sheet — labels, field types, dice expressions, and counter bounds — but not the values currently filled in. That means a new entity gets a clean starting point instead of inheriting the previous character's Hit Points or ammunition.

When applying a template to an entity that already has a Stat Sheet, Codex Cryptica lets you choose whether to append the new fields or replace the existing layout. That makes templates useful both for new campaign setup and for gradually standardizing an active world.

For the exact field-by-field walkthrough, see the [Stat Sheets help article](/help#help/stat-sheets).

## Set a default for each kind of entity

If every new NPC should start with the same combat layout, you do not need to apply the template manually each time.

Go to **Settings → Schema → Stat Sheet Templates** and use **Default Template by Category** to associate a template with a category. For example:

- **Character** → a player-facing character sheet
- **NPC** → a compact combat sheet
- **Item** → an equipment or artifact sheet
- **Location** → a settlement, ship, or site overview

Built-in templates are available as starting points for several common systems, and saved templates can be assigned in the same way. Leave a category set to **None** when you want new entities to remain free of Stat Sheet fields.

## Keep the data with the entity

Stat Sheet data is stored in the entity's `statSheet` frontmatter, while reusable templates belong to the campaign vault. The sheet therefore travels with the entity, and the template remains available to the rest of the campaign.

This separation is useful in practice: a template defines the shape of a sheet, while the entity owns the values that change during play.

## A community library is the next step

Custom templates are currently local to your campaign vault. A future marketplace could make it easier to discover and import templates shared by other GMs — a Mythras creature sheet, a faction-reputation tracker, or a ship-crew dashboard, for example.

Until then, the best template is the one that reflects your actual session rhythm. Start with the values you touch most, keep the layout readable, and let the sheet grow only when play shows you what is missing.

### [Open Stat Sheets in Codex Cryptica →](/)

_Want the practical walkthrough? Read the full [Stat Sheets help guide](/help#help/stat-sheets)._ 
