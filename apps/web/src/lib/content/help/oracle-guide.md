---
id: oracle-guide
title: The Lore Oracle
description: Use the Lore Oracle to ask questions and generate content grounded in your campaign notes.
tags: [ai, gemini, rag]
rank: 5
---

## Using the Lore Oracle

Open **Lore Oracle** and ask a question about your world. The Oracle retrieves relevant entity descriptions, Lore and connections to help ground its answer in your campaign. Check its suggestions against your notes before keeping them.

### Revise an existing entity

- **Entity side panel**: click **AI Revise Description** (sparkles) near the title.
- **Zen Mode**: use the same sparkle button in the editor toolbar.
- **Oracle chat**: select an entity, then send `/revise`.

From either entity-view button, add optional instructions in **Revise Description**, click **Revise**, and review the Chronicle and Lore draft. **Apply Changes** saves it; **Discard** keeps the original. See [Creating and Editing Entities](/help#help/creating-and-editing-entities) for the full workflow and Lore review.

The `/revise` chat command returns suggested Chronicle and Lore in the conversation. Review the response before keeping it.

### Create and connect

- `/create [description]` asks for a new entity draft.
- `/connect` opens the linking helper; quoted names let you create a connection directly.
- `/plot [entity name]` analyses story tensions around an entity.
- `/draw [description]` generates an image using your world’s art direction.

See [Chat Commands](/help#help/chat-commands) for syntax, deterministic commands and merge behaviour. Some commands, such as direct connections and merges, write immediately; read their instructions before using them.

### AI access and privacy

Open **Settings → Intelligence** to see your connection mode and key controls. The system proxy and a personal key are different ways to reach an AI service; a personal key does not make AI run on your device. Questions and relevant lore used as context leave your browser when you request AI assistance.

The Oracle sends only lore relevant to your question, not your full vault. For a custom NPC grounded in your notes, ask the Lore Oracle; generators use templates for structured drafts.

Turn on **AI Disabled** in Settings to stop AI assistance. Manual writing, connections, local roll tables and local generator templates remain available. AI revisions cannot run in a guest vault.

**Cif**, the Codex guide, answers questions about using Codex Cryptica. It is separate from the Lore Oracle and cannot edit your vault.

### Related Blog Posts

- [Lore Oracle: Co-GM, Not the Author](/blog/lore-oracle-not-the-author)
- [Lore Oracle Capabilities & Slash Commands](/blog/oracle-capabilities)
- [Revising Your Lore with the Oracle](/blog/revising-your-lore-with-the-oracle)
