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
- **Dice Pool** — an adjustable pool of dice (e.g. `3d6`) with `-`/`+` stepper controls, an optional die-face selector (`d4` through `d100`), configurable bounds, and one-tap rolling with expandable face breakdowns. Ideal for pool-based systems like Vampire/Storyteller, Year Zero Engine, or Shadowrun.

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
3. It's now available from the Templates list on every entity in this vault, and can be renamed or deleted later from **Settings → Templates → Stat sheets** (where you can also preview any built-in or saved template's fields before applying it).

To customize or share a built-in layout without first applying it to an entity, choose **Save copy to Vault** beside it in **Settings → Templates → Stat sheets**. The new vault copy can then be selected, edited, and published like any other saved template.

Saved templates only capture structure (labels, types, dice formulas, counter bounds) — not the values you'd filled in — so applying one to a new entity always starts blank/default.

### Community templates

You can choose one or more saved layouts to share in the Community Templates
directory. Before publishing, Codex Cryptica shows the fields and public details
for every selected template and asks you to confirm how many will become public.
Entity values, notes, names, vault identifiers, and local asset paths stay in
your vault. Publishing never happens automatically.

The management key shown for each published template is the key for updating or
unpublishing that listing. Copy it somewhere safe: it is stored locally and
shown during publication, but losing both copies means the listing can no longer
be managed. If browser data is cleared, use the recovery action and enter the
key again. Unpublishing removes the listing from new directory results but does
not remove your local template.

Importing a community template creates an independent local copy. It never
updates the publisher's version and does not send your campaign data to them.
If a name is already in use, choose a new name or cancel; invalid or unavailable
packages are rejected before anything is saved.

### Default template per category

In **Settings → Templates → Stat sheets**, the **Default Template by Category** section lets you pick a template (built-in or saved) for each entity category — e.g. "Character" → D&D Character, "NPC" → D&D NPC. Every new entity of that category then starts with the template's fields already applied, no manual step needed. Leave a category set to "None" if it shouldn't get stats automatically.

## Rolling dice

Tap the roll button on a Dice field to roll it in Codex Cryptica's dice engine. If you're in an active VTT session, the result is also sent to the shared session log automatically.

For **Dice Pool** fields, use the `−` and `+` buttons to adjust the number of dice before rolling. If die selection is enabled in the template, you can switch die types (such as `d6`, `d8`, or `d10`) via the dropdown next to the count. Tap **Roll** to roll the pool; the total sum is displayed alongside an expandable breakdown showing individual rolled faces. When the dice count is zero, the Roll button is disabled until you add dice to the pool.

## Where it's stored

Stat Sheet data lives directly in the entity's note (its `statSheet` frontmatter), so it stays with the entity wherever it goes. Saved templates live in your campaign vault, so they're available across all entities in that vault.

## Presentation Templates

Presentation Templates change how a compatible Stat Sheet is arranged without changing its fields or values. Open an entity's **Stats** tab and choose **Presentations** to switch layouts, set a schema default, or build a new one with the visual card editor (a Markdown source tab is also available for direct editing). Templates are limited to the Stat Sheet schema they were made for, so fields always stay compatible.

Write your own layout in Markdown with field references such as `{{stat.hp}}` and layout sections for groups, cards and rows. Repeatable Table fields (used for Weapons and Items by default) keep rows of data together: add rows, edit their cells, adjust counters and roll dice from the table. In the template editor you can customise a Repeatable Table's column headings and cell types (text, number, dice, counter or checkbox), so the same table type can hold skills, spells or any other list.

## Import a stat block

For Tales of the Valiant vaults, you can turn a monster or quick NPC you already have into a stat sheet. Open the entity's **Stats** tab and choose **Import**, or use **FROM STAT BLOCK** in the new-entity form. Paste the stat block from a PDF, a web page, a Foundry VTT export or your own notes, then choose **Read stat block**.

The review screen shows each value with a label:

- **Found**: the value is in the text you pasted.
- **Check this**: the value looks uncertain, is malformed, or isn't in your text. The original text is shown beside it. Correct it before you save.
- **Not found**: the text didn't include this value. It stays empty, and the sheet keeps whatever it already had.
- **Worked out from CR**: proficiency bonus, calculated from the Challenge Rating.

Armour Class, Hit Points and Challenge Rating are needed before you can save. Anything else can stay empty.

**Copy as written** (the default) only keeps what your text says. **Convert from 5e** turns a 5e monster into Tales of the Valiant. It marks every value it added or changed, with the 5e original beside it, and labels the entity **Converted from 5e**. Check those values, because they are a judgement call.

When you save into a sheet that already has values, only the values the import found are replaced. You are asked to confirm first. Custom fields you added are never changed.

Your pasted text is sent to the AI to be read. It isn't kept, and it isn't used for anything else. Tick **Keep the original text in notes** to save it in the entity's notes. Notes are included when you share or publish the vault, so only tick it if that's fine.

**Limits**: the import works on one creature or quick NPC at a time, and on text or Foundry JSON only. Character sheets aren't supported yet. Pastes over 12,000 characters are refused, so paste just the stat block.

**Without AI**: when AI is turned off, the import uses a simpler built-in reader. It only fills in what it can read reliably, so expect to fill in more by hand. Convert from 5e isn't available then.

## Species and ancestry

A species is a reusable set of traits you write once on a Creature and apply to many characters and NPCs. Applying one never changes the numbers you typed into a sheet.

**Mark a Creature**: open the Creature's Stats tab, find **Species/Ancestry** and turn on **Use as a Species/Ancestry definition**. Then add traits. Each trait has a name and a description.

**Add adjustments**: on a trait, add an adjustment with a target and a signed amount, such as `str_score` and `+2`. The target is the **field ID or key** of a number field on the character's sheet. Built-in templates use readable IDs like `str_score`. Templates you build yourself use the keys you set. Labels aren't matched.

**Pick a species**: open a Character or NPC, go to the Stats tab and choose a species under **Species/Ancestry**. You see a preview first. Adjustments that fit show `10 → 12`. Adjustments that don't fit say **Not applied** and why: no field with that key, or the field isn't a number field. Only number fields can be adjusted. Nothing changes until you press **Apply**.

**Base and effective values**: the number you typed stays in the field. Next to it the sheet shows the effective value and where it comes from, for example `Effective 12 · Kethari: Brute +2`. If you change the base, the effective value follows. Dice formulas, rolls and modifiers still use the base value.

**Change or remove**: **Change** picks a different species and replaces the old one. **Remove** takes away only the species' adjustments.

**Changes to the source**: the character keeps its own copy of the traits. If you edit the Creature later, characters that already have it aren't updated. Use **Change** to apply the new version. If the Creature is deleted, the character keeps its traits and shows that the source is unavailable.

## Related reading

- [The Complete Guide to Custom Character Sheets](/blog/custom-stat-sheet-templates) — Build a reusable Stat Template, fill it in per entity, present it your way, and share it.
