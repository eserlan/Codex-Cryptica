---
id: context-aware-entity-generator
slug: context-aware-entity-generator
title: "Introducing Context-Aware Entity Generation: Grounded Campaign Expansion"
description: "Branch your campaign setting organically. Discover how the new Generate Related feature pulls context from surrounding nodes and chronicles to draft connected entities with the help of Gemini."
keywords:
  [
    "Worldbuilding AI",
    "Grounded Entity Creator",
    "RPG Campaign Setting Tools",
    "AI Campaign Generator",
    "Directed Connections",
    "Lore Oracle Updates",
  ]
publishedAt: 2026-05-30T22:46:00Z
---

We've all been there: your campaign setting is growing, you've designed a magnificent stronghold or a mysterious artifact, and now you need to populate its surrounding details. Who is the guardian of the temple? What signature item did the archmage leave behind?

Typically, using generic AI chatbots means writing long, repetitive prompts explaining your world's backstory, only to receive generic suggestions that don't fit your lore.

Today, we are thrilled to introduce **Context-Aware Entity Generation**—a new way to expand your campaign settings organically, grounded directly in the lore you've already created.

## Grounded Local Context

The core superpower of this new feature is **first-degree graph neighborhood analysis**.

Instead of generating details in a vacuum, the Lore Oracle compiles a compilation payload containing:

1. **The Source Entity**: The chronicle and lore details of the entity you are launching the creator from.
2. **Direct Neighbors**: The titles, types, relationships, and full content fields of all first-degree connected entities.
3. **Allowed Vault Categories**: Restricting suggestions to the actual structural configuration of your vault.

This means when you generate a new character related to a specific city, the AI already knows about the city's ruler, the local tavern, and the neighboring region, ensuring the generated character feels like they've lived in that city their whole life.

## Seamless Guided Wizard

The feature is integrated directly into both the standard Detail Status Tab and **Zen Mode**:

- **Quick Configuration**: Choose the target entity type (e.g. Character, Location, Item) or select **Surprise Me** to let the AI dynamically pick a fitting category from your allowed vault categories.
- **Suggested Relationships**: The relationship list adapts dynamically based on the source-target combination (e.g., character to item suggests "signature item" or "wielder of").
- **Outline Templates**: It automatically resolves your current theme layout outlines, ensuring the description field returned by the AI is pre-formatted with your custom template headings.
- **Complete Editorial Control**: Review and edit the name, summary, description, and labels before committing the draft to the vault.
- **Directed Connections**: Saving the draft automatically creates the new entity in your vault and establishes a directed relationship connection (`Source → New Entity`) using the selected relationship back label.

This puts complete editorial control in your hands—ensuring AI suggestions remain a spark of inspiration while you curate the final canon.

Try it out on your active campaign notes today by clicking the **Generate Related** action button!
