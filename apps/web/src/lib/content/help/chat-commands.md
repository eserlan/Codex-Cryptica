---
id: chat-commands
title: Chat Commands
description: Discover slash commands for creating, revising, connecting, and visualising campaign entities with the Lore Oracle.
tags: [commands, discovery, connect, merge, oracle]
rank: 7
---

## Command Discovery

The Lore Oracle supports several interactive commands to help you manage your world. To discover available commands, simply type a forward slash (`/`) in the chat input.

### Available Commands

- `/roll [formula]`: Roll dice locally, for example `/roll 2d20kh1 + 5`.
- `/plot [entity name]`: Analyse story tensions around an entity.
- `/help`: Show available commands.
- `/clear`: Clear the Oracle conversation; this does not delete vault entities.
- `/draw [subject]`: Triggers the AI to generate a visual representation of the subject. Category words such as `character`, `location`, or `item` can guide composition when no matching entity category is available.
- `/revise`: Generate suggested Chronicle and Lore text for the selected entity in chat. Review the response before keeping it. For an instructions dialog and an inline draft, use **AI Revise Description** in the entity side panel or Zen Mode.
- `/create [description]`: Ask the Oracle to draft a new entity record based on your description.
- `/connect`: Link entities and set relationship labels directly from the chat.
- `/merge`: Combine two entities into one, synthesizing their lore and re-mapping all connections.
- `/table [name]`: Roll one of your own roll tables, with the result inline in the transcript. No AI involved.
- `/deck [name] [count]`: Draw from one of your own card decks, remembering what has already been drawn. No AI involved.

## Efficient Linking with /connect

The `/connect` command is designed for high-speed world building. You can use the **Tab** key to navigate through a structured sequence without leaving your keyboard.

### The Tab Sequence

1. Type `/con` and press **Enter** or **Tab** to start the command.
2. **From**: Start typing the first entity name. Select a suggestion with **Tab**.
3. **Relationship**: Type the connection label (e.g., `is the mentor of`) or pick a suggested one, then press **Tab**.
4. **To**: Type the second entity name and select it with **Tab** or **Enter**.

### Direct Commands (Instant)

For power users, you can create connections instantly by wrapping entity names in quotes. This bypasses the AI parser for zero-latency execution:
`/connect "Eldrin" is the mentor of "Kaelen"`

## Merging Entities with /merge

The `/merge` command allows you to consolidate duplicate entries or combine related notes into a single cohesive record.

### Direct Merge

You can trigger an immediate merge by specifying the source and target:
`/merge "Old Notes" into "Kingdom of Aethel"`

This direct command writes immediately. Export a backup first if you may want the original records back. The "Source" (Old Notes) will be deleted, and its content will be appended to the "Target" (Kingdom of Aethel). All inbound and outbound connections will be automatically updated to point to the Target.

### Guided Merge Wizard

Type `/merge oracle` to open the interactive **Merge Wizard**. This tool provides:

- **Entity Selection**: Guided lookup for source and target.
- **Merge Strategy**: Choose between simple **Concatenation** or **AI Synthesis** (where the Oracle rewrites the combined content into a single cohesive narrative).
- **Preview**: Review the merge draft in the entity panel. **Apply Changes** performs the merge; **Discard** leaves the original entities in place.

## Guided Oracle Assistance

If you are unsure how two entities should be related or how they should be combined, add `oracle` to your command:

- `/connect oracle`: Analyzes lore to propose thematic relationship types.
- `/merge oracle`: Opens the step-by-step consolidation wizard with content preview.

## Art Direction

Image generation uses Art Direction from your world before falling back to shipped Category Defaults, Default Art Style from the active theme, and the global Codex Cryptica default. To customize it, add normal notes or entity sections titled `Art Direction`, `Default Art Style`, or `Visual Direction`; no separate settings form is required.

## Related Blog Posts

- [Lore Oracle Capabilities & Commands](/blog/oracle-capabilities) — In-depth guide to slash commands, image generation, and deterministic controls.
- [Drafts Are Not Canon](/blog/drafts-are-not-canon) — Why generated suggestions remain transient until explicit GM approval.
