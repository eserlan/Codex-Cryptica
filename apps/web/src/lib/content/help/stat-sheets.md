---
id: stat-sheets
title: Stat Sheets
description: Track HP, resources, and rollable actions on any entity with a lightweight, system-agnostic Stat Sheet.
icon: icon-[lucide--list-checks]
rank: 25
tags: ["stats", "characters", "npc", "dice", "vtt", "gameplay"]
---

# Stat Sheets

Stat Sheets give any entity — a character, NPC, ship, or settlement — a small table of numbers and notes you can adjust during play, without leaving Codex Cryptica or wiring up a rules engine. Open an entity and click the **Stats** tab to see it.

## Field types

- **Counter** — a value with `-`/`+` buttons, ideal for Hit Points or resources. Can have a min, max, and step.
- **Number** — a plain numeric input, for things like Armor Class.
- **Text** — a short line, for conditions, movement speed, or skills.
- **Long Text** — a multiline note, for traits, abilities, or free-form details.
- **Heading** — a collapsible section divider to group related fields and save screen space during a session.
- **Dice** — a rollable expression (e.g. `1d20+5`) with a one-tap roll button.

Codex Cryptica doesn't enforce any particular game system — there's no automatic modifier math or damage calculation. You decide what each field means.

## Editing the layout

Click **Edit Layout** to add, relabel, reorder, or delete fields. Deleting a field that already holds a value asks for confirmation first, so you don't lose tracked state by accident.

## Templates

Click **Templates** to apply a saved layout, or save your current layout as a new one to reuse on other entities. Applying a template to an entity that already has stats lets you choose to append the new fields or replace the layout entirely.

Built-in templates cover several common systems out of the box:

- **D&D Character** / **D&D NPC** — HP, AC, ability checks, saves, and a handful of common skills.
- **Pathfinder Character** — ability checks, the three saving throws, and skills.
- **World of Darkness / Vampire** — Attributes, a generic d10 dice-pool roll, Willpower, Blood Pool/Hunger, and Disciplines.
- **Cyberpunk** — core stats, weapon attack/damage, a generic skill check, Humanity, and cyberware.
- **Mythras Character** / **Mythras Creature / NPC** — Characteristics, derived attributes (AP, LP, MP, DM), hit locations/armor, natural attacks, creature traits, and d100 roll-under skill checks (roll, then compare the result to the skill's listed percentage yourself — Codex Cryptica doesn't judge pass/fail for you).
- **Ship Systems** / **Settlement Overview** — for vessels and locations rather than characters.
- **Generic Item** / **D&D Magic Item** / **Cyberpunk Gear** / **Mythras Gear** — quantity/weight/value, rarity/attunement/charges, cost/availability, or ENC/damage/reach/armor points for the Item category.

None of these bake in automatic modifiers or success/failure logic — they just give you the right shape of fields to start from, with rollable dice already wired up where the system supports it.

### Building your own template

Templates are just a saved snapshot of a layout — there's no separate template editor:

1. On any entity, build the fields you want using **Edit Layout** (add fields, set labels/types, set counter bounds or dice formulas).
2. Open **Templates** and use the **Save current layout as...** box at the bottom to name and save it.
3. It's now available from the Templates list on every entity in this vault, and can be renamed or deleted later from **Settings → Schema → Stat Sheet Templates** (where you can also preview any built-in or saved template's fields before applying it).

Saved templates only capture structure (labels, types, dice formulas, counter bounds) — not the values you'd filled in — so applying one to a new entity always starts blank/default.

### Default template per category

In **Settings → Schema → Stat Sheet Templates**, the **Default Template by Category** section lets you pick a template (built-in or saved) for each entity category — e.g. "Character" → D&D Character, "NPC" → D&D NPC. Every new entity of that category then starts with the template's fields already applied, no manual step needed. Leave a category set to "None" if it shouldn't get stats automatically.

## Rolling dice

Tap the roll button on a Dice field to roll it in Codex Cryptica's dice engine. If you're in an active VTT session, the result is also sent to the shared session log automatically.

## Where it's stored

Stat Sheet data lives directly in the entity's note (its `statSheet` frontmatter), so it stays with the entity wherever it goes. Saved templates live in your campaign vault, so they're available across all entities in that vault.

## Related reading

- [Build Stat Sheets That Keep Your Table Moving](/blog/custom-stat-sheet-templates) — Design reusable layouts around the information you need during play.
