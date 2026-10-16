---
id: tales-of-the-valiant
title: Tales of the Valiant (BFRD) Campaign Guide
description: Complete guide to running Tales of the Valiant campaigns in Codex Cryptica, including system profiles, Luck and Doom tracking, and BFRD stat blocks.
tags:
  [
    tales of the valiant,
    tov,
    bfrd,
    black flag,
    luck,
    doom,
    stat sheets,
    character import,
    encounters,
  ]
rank: 8
---

## Tales of the Valiant & Black Flag Roleplaying in Codex Cryptica

Codex Cryptica provides native support for **Tales of the Valiant (ToV)** and the open **Black Flag Reference Document (BFRD)** published by Kobold Press under the Creative Commons Attribution 4.0 International license.

---

### 1. Activating the System Profile

You can configure any campaign vault to automatically inherit Tales of the Valiant rules:

1. Open **Vault Settings** (or Campaign Overview) from the sidebar.
2. Under **RPG System Profile**, select **Tales of the Valiant**.
3. Once active, new character, creature, and NPC sheets automatically default to official ToV templates, and generator dialogues pre-select Tales of the Valiant.

---

### 2. Built-in Stat Sheet Templates

Codex Cryptica includes three pre-configured ToV stat sheet templates:

- **Tales of the Valiant Character** (`builtin-tov-character`): A full adventurer sheet featuring Lineage, Heritage, class levels, saving throw proficiencies, weapon actions, spell circles, and an interactive **Luck** resource counter.
- **Tales of the Valiant Monster** (`builtin-tov-monster`): Complete BFRD creature stat block with challenge rating, armour class, traits, action routines, reactions, and an optional **Doom** counter for solo bosses.
- **Tales of the Valiant Quick NPC** (`builtin-tov-npc`): A lightweight, CR-based block designed for rapid session prep, retaining core combat stats without the overhead of full character tracking.

---

### 3. Interactive Luck Tracking

In Tales of the Valiant, characters gain Luck when they fail d20 attack rolls or saving throws, spending accumulated points to improve subsequent d20 rolls.

- **Character Sheets**: Use the minus and plus controls on the Luck counter to spend or gain points.
- **Virtual Tabletop (VTT)**: When a character token is selected on the combat map, their Luck meter appears in **Token Quick Stats** for instantaneous mid-battle adjustments.
- **Long Rest Reset**: Luck points reset to a character's starting baseline value upon completing a Long Rest.

---

### 4. Adversary Doom Resource Tracking

Major villains, legendary monsters, and solo encounter bosses can harness **Doom Points** to execute villainous actions, interrupt player turns, or trigger explosive reactions.

- **Verified Counter**: Doom controls appear exclusively on creatures with an active Doom counter (e.g. `builtin-tov-monster` with Doom configured).
- **VTT HUD**: Adjust Doom pools live from token quick stats during combat encounters.
- **Bounded Pool**: Unlike Luck, Doom points are strictly scoped to the individual adversary token and are never shared as an arbitrary global pool.

---

### 5. Encounters & Challenge Guidance

The Encounter Generator provides qualitative challenge pacing tailored to your party:

- Select your **Party Size** (1 to 8 adventurers) and **Party Level** (Level 1 to 20).
- Encounters calculate a qualitative challenge rating (**Trivial**, **Moderate**, **Dangerous**, or **Deadly**) along with recommended CR distributions.
- Suggested adversary creatures indicate whether they match official BFRD templates or are custom homebrew concepts.

---

### 6. Importing from tov-chargen & External Tools

You can import characters created in external builders like `tov-chargen`:

1. In `tov-chargen`, export your character as standard JSON.
2. Open the **Importer** in Codex Cryptica and paste or drop the JSON file.
3. The importer automatically detects the Black Flag schema and maps ability scores, skills, lineage, heritage, and Luck values directly into a `builtin-tov-character` entity.

---

### 7. Attribution & Legal Disclosures

Codex Cryptica is an independent application and is not affiliated with, endorsed, or sponsored by Open Design LLC d/b/a Kobold Press.

This work includes open game mechanics from the **Black Flag Reference Document**, made available under the **Creative Commons Attribution 4.0 International License (CC BY 4.0)** by Open Design LLC d/b/a Kobold Press.
