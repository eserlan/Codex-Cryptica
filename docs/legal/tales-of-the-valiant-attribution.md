# Tales of the Valiant & Black Flag Reference Document Attribution

**Document Version**: 1.0.0  
**Parent Epic**: [#3941](https://github.com/eserlan/Codex-Cryptica/issues/3941)  
**Tracking Issue**: [#3942](https://github.com/eserlan/Codex-Cryptica/issues/3942)  
**Parent Packages**: `packages/stat-sheet-engine`, `packages/schema`

---

## 1. Pinned Source & License

Codex Cryptica provides support for the **Tales of the Valiant (ToV)** roleplaying game and the underlying **Black Flag Roleplaying** system by utilizing open game mechanics published in the **Black Flag Reference Document (BFRD)**.

- **Authoritative Source**: Black Flag Reference Document (BFRD)
- **Publisher**: Open Design LLC d/b/a Kobold Press
- **Repository**: [https://github.com/koboldpress/black-flag](https://github.com/koboldpress/black-flag)
- **Official Portal**: [https://koboldpress.com/black-flag-roleplaying/](https://koboldpress.com/black-flag-roleplaying/)
- **Pinned Release**: `1.0.0` (Creative Commons Release, July 2024; incorporating Core Rules and GM's Guide reference updates)
- **Applicable License**: **Creative Commons Attribution 4.0 International (CC BY 4.0)**

---

## 2. Required Attribution Notices

In accordance with the Creative Commons Attribution 4.0 International License, any distribution of material based on the Black Flag Reference Document incorporates the following legal disclosures:

### Black Flag Reference Document Notice

> _This work includes material from the Black Flag Reference Document, made available under the Creative Commons Attribution 4.0 International License (CC BY 4.0) by Open Design LLC d/b/a Kobold Press._

### Upstream SRD 5.1 Notice

> _This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC, available under the Creative Commons Attribution 4.0 International License._

---

## 3. Trademark Usage & Guardrails

- **"Tales of the Valiant"** and **"Black Flag Roleplaying"** are registered or common-law trademarks of Open Design LLC (Kobold Press).
- Codex Cryptica refers to these names strictly under nominative fair use to describe mechanical compatibility and system profiles.
- **Compatibility Logo Restriction**: Codex Cryptica does **not** display, distribute, or bundle the official _"Tales of the Valiant Compatibility Logo"_ or _"Black Flag Compatible"_ badges unless an independent commercial agreement or specific trademark license with Open Design LLC is executed.

---

## 4. Content Boundaries: Open Mechanics vs. Proprietary Content

Codex Cryptica maintains strict boundaries between open reference game mechanics and protected commercial content:

### Permitted Open Mechanics (Included in Codex Cryptica)

- Core game mechanics (ability scores, modifiers, proficiencies, checks, saving throws).
- Lineage and Heritage structural definitions and open racial mechanics.
- Talents, categorizations (Martial, Magic, Technical), and prerequisite trees.
- Luck mechanics: starting Luck pool calculation, earning Luck on failed d20 rolls, spending Luck, and long-rest resets.
- Doom points framework for GM adversary tracking.
- Spell Circle designations (1st through 9th circle) and spell schools/sources (Arcane, Divine, Primordial, Wyrd).
- Open creature statistics, challenge ratings, traits, and action definitions.

### Strictly Excluded Proprietary Content

- **Setting Lore**: Setting-specific material belonging to Kobold Press (e.g. Midgard, the Southlands, the Margreve, the Scarlet Citadel, Zobeck).
- **Commercial Text**: Flavor paragraphs, full setting descriptions, and prose from the published _Player's Guide_ or _Game Master's Guide_.
- **Artwork and Media**: Proprietary illustrations, portraits, maps, and graphic layout elements published by Kobold Press.

---

## 5. Local-First & AI / Oracle Guardrails

1. **Local-First Determinism**: All core mechanics—character sheet rendering, dice rolling, stat block parsing, Luck point accounting, and local export/import—run entirely offline in the browser without requiring network calls or AI processing.
2. **AI & Oracle Scoping**:
   - The **Lore Oracle** may ground its gameplay answers in open BFRD rules mechanics under CC BY 4.0.
   - The Oracle must **never** ingest or hallucinate proprietary book content or claim authority beyond the open BFRD.
   - **Cif** (the in-app assistant) remains strictly focused on teaching and navigating Codex Cryptica product workflows, keeping system-specific game arbitration within the Oracle.

---

## 6. Guidance for Homebrewers & Creators

Creators using Codex Cryptica to author Tales of the Valiant content can do so with full legal confidence:

- Under **CC BY 4.0**, your custom campaigns, character sheets, and exported entities remain your own property.
- You are not required to open-source your narrative worldbuilding or proprietary adventure plots.
- If you redistribute stat blocks derived from BFRD mechanics, simply include the attribution notice in Section 2 above.
