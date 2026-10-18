---
id: tales-of-the-valiant
title: Tales of the Valiant (BFRD) Campaign Guide
description: Guide to Tales of the Valiant stat sheets, generators, Luck and Doom tracking in Codex Cryptica.
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

To make Tales of the Valiant the default for a whole vault, open **Settings → Vault → Game System** and choose **Tales of the Valiant**. Campaign generators in that vault then start with their **Game System** option set to Tales of the Valiant, and the ToV sheets listed below are suggested first when you apply a stat sheet. You can still change the Game System for a single generator run. Existing entities keep the sheets they have, and other vaults are not affected. Choose **System Neutral** to switch back.

---

### 2. Built-in Stat Sheet Templates

Codex Cryptica includes three pre-configured ToV stat sheet templates:

- **Tales of the Valiant Character** (`builtin-tov-character`): A full adventurer sheet featuring Lineage, Heritage, class levels, saving throw proficiencies, weapon actions, spell circles, and an interactive **Luck** resource counter.
- **Tales of the Valiant Monster** (`builtin-tov-monster`): BFRD creature stat block with challenge rating, armour class, traits, action routines, reactions, and a **Doom** counter field. The field is available for per-creature tracking in Codex; the BFRD's optional Doom rule instead gives the GM a CR-based resource for the encounter.
- **Tales of the Valiant Quick NPC** (`builtin-tov-npc`): A lightweight, CR-based block designed for rapid session prep, retaining core combat stats without the overhead of full character tracking.

---

### 3. Interactive Luck Tracking

In the BFRD, a PC starts with 0 Luck and has a maximum of 5. Once per turn, a failed attack roll or save grants 1 Luck. The GM can also award Luck for clever ideas, roleplay, difficult encounters or story goals. If a PC at 5 Luck would gain more, they immediately roll a d4 and reset their total to that result. Luck can add 1 point per point spent to a check, or 3 Luck can reroll the d20 immediately after a check. Luck gained from a failed roll cannot be spent on that same triggering roll. See the [BFRD Luck rules](https://bfrd.net/rules/playing-the-game).

- **Character Sheets**: Use the minus and plus controls on the Luck counter to spend or gain points.
- **Virtual Tabletop (VTT)**: When a character token is selected on the combat map, their Luck meter appears in **Token Quick Stats** for instantaneous mid-battle adjustments.
- **Long Rest**: The BFRD Luck rules do not prescribe a Long Rest reset. Codex Cryptica does not change Luck on a rest, so update the counter only if your table's clearly documented house rule calls for it.

---

### 4. Adversary Doom Resource Tracking

The BFRD's **optional Doom rule** gives the GM an encounter resource based on encounter CR. Doom can affect creatures in that encounter; it is not inherently a per-creature pool. The GM can spend Doom to give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter refresh, recharge or gain one more use of a limited-use feature, such as Legendary Resistance. These are the published spends in the [BFRD Doom rule](https://blackflagsrd.opengamingnetwork.com/playing-the-game/monsters/).

- **Creature stat sheet**: The built-in ToV monster sheet has a Doom counter field, and Doom controls appear for a selected creature with that field.
- **VTT HUD**: The selected token's quick stats can adjust that creature's counter during play.
- **Implementation detail**: Codex currently exposes a creature-scoped counter. Use the encounter run sheet to record the BFRD pool and any allocations; the UI counter does not change the optional rule's encounter-level scope. Different pool arrangements or spends are house rules and should be labelled as such.

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
