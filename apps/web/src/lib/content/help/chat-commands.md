---
id: chat-commands
title: Chat Commands
tags: [commands, discovery, connect, merge, oracle]
rank: 5
---

## Command Discovery

The Lore Oracle supports several interactive commands to help you manage your world. To discover available commands, simply type a forward slash (`/`) in the chat input.

### Available Commands

- `/draw [subject]`: Triggers the AI to generate a visual representation of the subject.
- `/create [description]`: Ask the Oracle to draft a new entity record based on your description.
- `/connect`: The primary tool for building relationships.
- `/merge`: Combine two entities into one, synthesizing their lore and re-mapping all connections.

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

The "Source" (Old Notes) will be deleted, and its content will be appended to the "Target" (Kingdom of Aethel). All inbound and outbound connections will be automatically updated to point to the Target.

### Guided Merge Wizard

Type `/merge oracle` to open the interactive **Merge Wizard**. This tool provides:

- **Entity Selection**: Guided lookup for source and target.
- **Merge Strategy**: Choose between simple **Concatenation** or **AI Synthesis** (where the Oracle rewrites the combined content into a single cohesive narrative).
- **Preview**: View the resulting content before finalizing the merge.

## Guided Oracle Assistance

If you are unsure how two entities should be related or how they should be combined, add `oracle` to your command:

- `/connect oracle`: Analyzes lore to propose thematic relationship types.
- `/merge oracle`: Opens the step-by-step consolidation wizard with content preview.
