---
id: default-entity-templates
title: Default Entity Templates
tags: ["templates", "formatting", "customization"]
rank: 18
---

# Default Entity Templates

Codex Cryptica provides pre-formatted structure outlines called **Default Entity Templates** to eliminate the friction of starting with an empty note. Whenever you create a new **Character**, **Faction**, **Location**, **Item**, **Event**, **Creature**, or **Note**, a tailored markdown layout is instantly pre-populated for you.

## System Default Templates

Out of the box, the following types come with high-fidelity structures:

- **Character**: Includes sections for Summary, Appearance, Personality, Goals, Relationships, and Secrets.
- **Faction**: Includes sections for Leadership, Resources, Methods, Allies and Enemies, and Internal Tensions.
- **Location**: Includes sections for Geography, Districts, Points of Interest, and Local Factions.
- **Item**: Includes sections for Origin, Appearance, Abilities, and Lore.
- **Event**: Includes sections for Date/Chronology, Key Participants, Sequence of Events, and Aftermath.
- **Creature**: Includes sections for Ecology, Combat/Abilities, Behavior, and Lore.
- **Note**: A clean generic canvas for general-purpose world-building.

## Managing Templates in Settings

Open **Settings → Templates** and choose the **Entity templates** tab (the **Stat sheets** tab next to it is for reusable stat layouts) to see every template in your vault, grouped by entity type. Each row shows where it comes from (**Built-in** or **Yours**) and which one is the **Default** for its type.

- **Preview** shows the note a new entity would start with.
- **Set as default** makes a template the starting point for every new entity of that type. It only affects notes you create afterwards; notes you already made never change.
- **Duplicate** copies any template, including built-in ones, so you can make it your own. Built-in templates are read-only.
- **Edit** opens the visual editor for your own templates. Rename the template, add, remove and reorder sections, and give each section a short hint about what belongs there. A live preview updates as you type.
- **New template** builds one from scratch for any entity type, including your own custom categories.
- **Export** saves a template as a `.json` file you can share or keep as a backup. **Import** adds a template from such a file. Imported templates never replace an existing one.
- **Delete** removes one of your templates. If it was the default, that type goes back to the built-in template.

If a template file in your vault can't be read, it is skipped and a warning appears at the top of the list. Everything else keeps working.

> [!NOTE]
> In a shared or read-only vault you can preview and export templates but not change them.

## Toggling Templates On or Off

If you prefer to start with a completely empty editor page for a new note:

1. Click **New Entity** in the top navigation or sidebar.
2. Uncheck the option **"Start from default format"** located below the Title input field.
3. Click **Add** — your newly created document will be entirely blank.

## Template Files (Advanced)

Templates you make in Settings are saved as files in your vault's `.codex/templates/` folder. If you would rather work with plain markdown, you can still override our defaults with your own files. These keep working exactly as before and show up in the list as **Yours (file)**; duplicate one to edit it in the visual editor.

1. In your linked local folder, create a directory path named `.cc/templates/` (or `.codex/templates/`).
2. Add a markdown file named after the entity type in lowercase (e.g., `character.md`, `faction.md`, `location.md`). Casing of the file itself does not matter.
3. Open the file and write your custom markdown structure (e.g. `## Cyberware` or `## Magical Lineage`).
4. Any new entities of that type created henceforth will use your custom structure, unless you choose a different default in Settings.

> [!NOTE]
> **No frontmatter or placeholders required:** You do not need to add YAML frontmatter or placeholder tags (`title`, `type`, `labels`). Codex Cryptica manages entity metadata automatically through the creation dialog and header bar. Template files only define the Markdown body of the note.

> [!TIP]
> If you want to _always_ start completely blank for a specific type without untoggling the checkbox, create an empty file at `.cc/templates/{type}.md`. The system respects empty override files as valid, giving you a blank canvas.

## Related Blog Posts

- [Default Entity Templates & Custom Vault Overrides](/blog/default-templates-announcement) — Deep dive into customizing domain structures and custom schema overrides.
