---
id: in-app-generators
title: In-App Campaign Generators
description: Draft campaign characters, factions, settlements, items, and other content with the in-app generators.
tags:
  [
    generator,
    create,
    entities,
    npc,
    faction,
    settlement,
    magic-item,
    holidays,
    festivals,
    calendar,
  ]
rank: 7
---

## Generate Campaign Entities From Inside Your Vault

The **Campaign Generators** let you create NPCs, factions, settlements, magic items, and more directly inside your active campaign vault. The **Holiday & Festival** generator creates one observance or a connected calendar. Every result is previewed before you choose to open it as an entity draft.

### How to Open the Generator

- Click the **wand icon** in the vault toolbar at the top of the entity list.
- On mobile, tap the **plus menu** and choose **Generate**.
- From any entity's detail panel, use the **Generate Related** button to open the generator pre-loaded with that entity as context.

### Configuring a Generator

1. Pick a generator type, such as **NPC**, **Faction**, **Settlement**, **Magic Item**, or **Holiday & Festival**.
2. Adjust any available options (race, type, rarity, calendar size, etc.). For a holiday calendar, choose a scope and size, then optionally add cultural, seasonal, religious, or historical context and important people or events.
3. Click **Generate** to produce a draft. Holiday calendars include individual observances with traditions, timing, who observes them, and table-ready tensions. With AI enabled, the Oracle writes the draft for you; if AI is unavailable or turned off, generators fall back to a built-in local template — so you always get a result, no AI key required.

### Reviewing and Saving

After generation you see a **review screen** showing the full draft. You can:

- Edit the title, type, summary, lore, and labels before committing.
- Toggle **Link to source entity** to automatically create a connection when launched from an entity's context.
- Click **Open in Editor** to review the entity draft, or **Back** to refine the configuration.

**Open in Editor** creates a temporary entity record and opens its suggested Chronicle and Lore for review. **Apply Changes** keeps the generated content; **Discard** removes the new draft entity. Before you choose Open in Editor, the preview does not create an entity.

### Contextual Generation

When the generator is opened from an entity's detail panel, it automatically includes that entity's name and a summary of its immediate neighbors as generation context. This grounds the new entity in your existing lore without sending your full vault to any server.

### Privacy

When AI generation is enabled, your instruction plus a small, bounded slice of relevant lore (the source entity and its immediate neighbours) is sent to the Lore Oracle to write the draft — your **full vault is never sent**. When Oracle Memory is enabled for a supported system-proxy conversation, context can also be retained server-side between turns. A personal-key connection bypasses that proxy memory path. Prefer to keep everything on your device? Turn **AI Disabled** on in Settings: generators then use built-in local templates and no generation context leaves your device. A personal API key still sends AI requests and relevant lore to the selected provider; it changes the connection, not where the AI runs.

### Related Blog Posts

- [AI Campaign Prep Without Losing Your Voice](/blog/ai-campaign-prep-without-losing-your-voice) — How to use generators to accelerate prep while keeping full creative control.
- [Drafts Are Not Canon](/blog/drafts-are-not-canon) — Why previewing drafts before saving maintains lore integrity.
