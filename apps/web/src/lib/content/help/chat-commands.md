---
id: chat-commands
title: Chat Commands
tags: [commands, discovery, connect, oracle]
rank: 5
---

## Command Discovery

The Lore Oracle supports several interactive commands to help you manage your world. To discover available commands, simply type a forward slash (`/`) in the chat input.

### Available Commands

- `/draw [subject]`: Triggers the AI to generate a visual representation of the subject.
- `/create [description]`: Ask the Oracle to draft a new entity record based on your description.
- `/connect`: The primary tool for building relationships. Supports both a guided wizard and instant direct commands.

## Efficient Linking with /connect

The `/connect` command is designed for high-speed world building. You can use the **Tab** key to navigate through a structured sequence without leaving your keyboard.

### The Tab Sequence

1. Type `/con` and press **Enter** or **Tab** to start the command.
2. **From**: Start typing the first entity name. Select a suggestion with **Tab**.
3. **Relationship**: Type the connection label (e.g., `is the mentor of`) or pick a suggested one, then press **Tab**.
4. **To**: Type the second entity name and select it with **Tab** or **Enter**.

### Direct Commands (Instant)

For power users, you can create connections instantly by wrapping entity names in quotes. This bypasses the AI parser for zero-latency execution:
` /connect "Eldrin" is the mentor of "Kaelen"`

## Guided Connection Wizard

If you are unsure how two entities should be related, type `/connect oracle`. This opens an interactive wizard that analyzes the lore of both selected entities in the background to propose thematic relationship types and labels.
