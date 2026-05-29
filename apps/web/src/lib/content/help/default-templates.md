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

## Toggling Templates On or Off

If you prefer to start with a completely empty editor page for a new note:

1. Click **New Entity** in the top navigation or sidebar.
2. Uncheck the option **"Start from default format"** located below the Title input field.
3. Click **Add** — your newly created document will be entirely blank.

## Vault-Level Override Templates

For advanced world-builders or genre-specific campaigns (e.g., sci-fi vs. high fantasy), you can fully override our system defaults with your own custom markdown files:

1. In your linked local folder, create a directory path named `.cc/templates/` (or `.codex/templates/`).
2. Add a markdown file named after the entity type in lowercase (e.g., `character.md`, `faction.md`, `location.md`). Casing of the file itself does not matter.
3. Open the file and write your custom markdown structure (e.g. `## Cyberware` or `## Magical Lineage`).
4. Any new entities of that type created henceforth will immediately use your custom structure.

> [!TIP]
> If you want to _always_ start completely blank for a specific type without untoggling the checkbox, create an empty file at `.cc/templates/{type}.md`. The system respects empty override files as valid, giving you a blank canvas.
