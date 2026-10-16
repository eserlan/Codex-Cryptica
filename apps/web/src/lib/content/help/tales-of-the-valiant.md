---
id: tales-of-the-valiant
title: Tales of the Valiant (BFRD) Campaign Guide
description: Complete guide to using Tales of the Valiant stat sheet templates, generators, Luck and Doom tracking in Codex Cryptica.
tags:
  [
    tales of the valiant,
    tov,
    bfrd,
    black flag,
    luck,
    doom,
    stat sheets,
    encounters,
  ]
rank: 8
---

## Tales of the Valiant & Black Flag Roleplaying in Codex Cryptica

Codex Cryptica provides native support for **Tales of the Valiant (ToV)** and the open **Black Flag Reference Document (BFRD)** published by Kobold Press under the Creative Commons Attribution 4.0 International license.

---

### 1. Using Tales of the Valiant templates

Vault-wide system profile selection is not currently available. To use Tales of the Valiant in a generator, choose it from the **Game System** option when available. The built-in ToV sheets listed below can be applied to individual entities.

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
- **Long Rest**: The campaign's resting variant determines whether unspent Luck is preserved or reset towards the pool maximum. Codex Cryptica does not reset Luck automatically; update the counter manually after the rest according to the rules your campaign uses.

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

### 6. Using characters from external tools

Codex Cryptica does not currently import ToV character JSON from `tov-chargen` or other external builders. To bring a character's details into your campaign, create an entity and enter its values manually using the character sheet described above.

---

### 7. Attribution & Legal Disclosures

Codex Cryptica is an independent application and is not affiliated with, endorsed, or sponsored by Open Design LLC d/b/a Kobold Press.

This work includes open game mechanics from the **Black Flag Reference Document**, made available under the **Creative Commons Attribution 4.0 International License (CC BY 4.0)** by Open Design LLC d/b/a Kobold Press.
