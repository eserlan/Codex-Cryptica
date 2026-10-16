---
id: tales-of-the-valiant-generators
title: Tales of the Valiant (BFRD) Generators
description: Generate NPCs, creatures, and magic items with official Tales of the Valiant Black Flag Roleplaying mechanics and native stat sheets.
tags:
  [
    tales of the valiant,
    tov,
    bfrd,
    black flag,
    generators,
    npc,
    creature,
    monster,
    magic item,
    stat sheet,
    mechanics,
  ]
rank: 9
---

## Tales of the Valiant Mechanics in Generators

Codex Cryptica supports generating non-player characters, monsters, and magic items with native **Tales of the Valiant (BFRD)** mechanics.

### Activating Tales of the Valiant Mode

- **Vault Profile Inheritance**: If your active campaign vault is configured with the Tales of the Valiant system profile, generators automatically pre-select **Tales of the Valiant** under the **Game System** option.
- **Manual Selection**: On any campaign generator or public generator page, set the **Game System** selector to **Tales of the Valiant**.

### Supported Generators

1. **NPC Generator**:
   - **Quick NPC**: Produces a lightweight, Challenge Rating (CR)-based stat block with Armor Class, Hit Points, ability modifiers, and core attack actions. Maps directly to the built-in Quick NPC stat sheet (`builtin-tov-npc`).
   - **Leveled Character**: Produces a full adventurer or companion stat block with complete ability scores, save proficiencies, weapon attacks, spellcasting details, and features. Maps directly to the character stat sheet (`builtin-tov-character`).
2. **Creature / Monster Generator**:
   - Generates authentic BFRD monster stat blocks with creature size, type, Armor Class, Hit Points, speed, ability scores, Doom counters, traits, actions, and reactions. Maps to the monster stat sheet (`builtin-tov-monster`).
3. **Magic Item / Minor Magic Item Generator**:
   - Generates BFRD item statistics including rarity, category, attunement criteria, activation action economy, charges, and saving throw DCs. When saved, game statistics are appended to the entity under `### Game Statistics (Tales of the Valiant)`.

### Offline & AI Availability

Tales of the Valiant mechanics generation requires the AI Lore Co-Author. When working offline or with AI generation disabled, generators produce system-neutral lore and notes to ensure your worldbuilding workflow is never interrupted.
