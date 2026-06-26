---
id: oracle-guide
title: The Lore Oracle
tags: [ai, gemini, rag]
rank: 5
---

## AI Intelligence

The Oracle is powered by **Google Gemini**. It doesn't just 'chat'; it retrieves relevant lore from your graph to provide context-aware answers.

### Features

- **Context Fusion**: Combines visible chronicles and hidden lore.
- **Image Generation**: Type `/draw [description]` to visualize your world.
- **Instant Visualization**: Advanced Tier users will see a "DRAW VISUAL" button on Oracle responses and empty Entity profiles to quickly generate images based on lore.

## Plot — Narrative Tension Analysis

The **Plot** action generates campaign-ready plot ideas seeded by a specific entity. It analyses the entity's connections, relationships, and any other entities that mention it, then produces a structured story hook with a premise, key NPCs, escalation, and possible outcomes.

### How to trigger it

There are two ways to run a plot analysis:

- **Entity detail panel** — Open any entity and click the **PLOT** button in the footer (view mode only).
- **ZenView** — Open an entity in full-screen mode and click the scroll icon in the header toolbar.
- **Oracle chat** — Type `/plot [entity name]` directly in the Oracle chat input.

The button approach pre-fills all context automatically and shows the result in a focused modal. The Oracle chat approach works the same way but the result appears in the chat history.

### What it uses as context

- The entity's own lore, chronicle, and fields
- All outbound and inbound graph connections
- Other entities that mention the entity by name in their content (even if not explicitly linked)

### The result

The generated plot appears in a modal with:

- A title and one-sentence premise
- What is really going on
- Key NPCs and entities involved
- An escalation or twist
- A player-facing hook
- Possible outcomes

Use **Regenerate** to get a different take, or **Copy** to paste the result elsewhere.
