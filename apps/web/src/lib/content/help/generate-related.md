---
id: generate-related
title: Generating Related Entities
tags: [oracle, generate, create, entities, connections]
rank: 8
---

## Grounded World Expansion

The **Generate Related** feature allows you to quickly expand your campaign setting by generating new entities grounded in your existing lore. Instead of generating ideas in a vacuum, this feature compiles context from the current entity and its direct first-degree neighbors in your connection graph.

### How to Use

1. Navigate to any entity page in either standard or **Zen Mode**.
2. Click the **Generate Related** button at the top-right of the connections section.
3. In the configuration modal, specify the target type (e.g., Character, Faction, Location) or select **Surprise Me** to let the AI dynamically pick a fitting category from your allowed vault categories.
4. Choose or define a custom relationship label (e.g., `arch-nemesis`, `signature item`) and provide optional custom instructions.
5. Click **Generate** to prompt the AI model.

### Review, Edit, and persist

Once the draft is generated, you will see a preview screen displaying all generated properties. You can edit the entity name, summary, description, and labels to refine the output before committing.

- The system uses the term **Labels** for metadata categories (rather than tags).
- You can also revise the draft with adjusted guidelines or cancel without making any changes.
- Clicking **Create Entity** commits the new record to your vault and automatically creates a directed relationship connection from the source entity to your new creation.
