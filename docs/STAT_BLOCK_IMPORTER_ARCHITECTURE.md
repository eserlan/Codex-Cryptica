# Multi-System Stat Block Import Architecture

**Document Version**: 1.0.0  
**Tracking Issue**: [#3478](https://github.com/eserlan/Codex-Cryptica/issues/3478)  
**Parent Packages**: `packages/stat-sheet-engine`, `packages/schema`, `apps/web`

---

## 1. Executive Summary

Game masters and worldbuilders manage campaigns across multiple tabletop roleplaying game (TTRPG) systems—often switching or mixing systems across campaigns or one-shots. Codex Cryptica already provides rich, playable Stat Sheets on entities (persisted in Markdown frontmatter under `statSheet`), interactive dice rolling, VTT token quick stats, and visual presentation cards.

However, bringing existing character or creature stat blocks into Codex Cryptica currently requires manual transcription. This architecture defines a robust, extensible pipeline for importing stat blocks from **D&D 5e**, **Pathfinder 2e**, **Tales of the Valiant**, **Mythras / BRP**, **Vampire: The Masquerade (V5/V20)**, and **GURPS**—whether from digital exports (Foundry VTT, Pathbuilder 2e, GCS, 5e.tools) or unstructured text copied from PDFs and rulebooks.

---

## 2. Multi-System Mechanics Matrix

Codex Cryptica's data model represents character mechanics as an array of `StatSheetField`s (`counter`, `number`, `dice`, `text`, `longtext`, `item-table`, and `heading`). Each supported system maps to these primitives differently:

| System            | Roll Paradigm                    | Key Resources & Defences                                                                                 | Attributes & Skills                                           | Attack / Action Structure                                                                    | Built-in Template Target                           |
| :---------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| **D&D 5e / TotV** | d20 + mod vs DC/AC               | HP (counter), AC (number), Hit Dice (text), Luck points (TotV)                                           | 6 core scores (10–20), proficiency bonus, saves & skill rolls | `actions`, `bonus_actions`, `reactions` as `item-table` with rollable attack/damage formulas | `builtin-dnd-character`, `builtin-dnd5e-monster`   |
| **Pathfinder 2e** | d20 + mod (4 degrees of success) | HP (counter), AC (number), Fort/Ref/Will saves (dice with modifierSource)                                | 6 attributes, Perception, trained/expert skill ranks          | 3-action Strikes with weapon traits as `item-table`                                          | `builtin-pathfinder-character`                     |
| **Mythras / BRP** | d100 roll-under (%)              | Action Points (counter), Luck (counter), Magic Points (counter), Hit Locations (separate AP/HP per limb) | STR, CON, SIZ, DEX, INT, POW, CHA; percentage skills          | Combat styles & weapons (`item-table` with rollable damage formulas)                         | `builtin-mythras-character`, `builtin-mythras-npc` |
| **Vampire (VtM)** | d10 dice pools                   | Willpower (counter), Blood/Hunger (counter), Humanity (counter)                                          | Physical/Social/Mental dot attributes (1–5), Skills (1–5)     | Disciplines, Blood Surges, and combat pools                                                  | `builtin-vampire-character`                        |
| **GURPS**         | 3d6 roll-under                   | HP (counter), FP / Fatigue (counter), Basic Speed / Move                                                 | ST, DX, IQ, HT; relative skills (e.g. DX+2 [14])              | Weapons table with rollable 3d6 checks and swing/thrust damage formulas                      | _Synthesized Custom Template_                      |

---

## 3. Four-Tier Pipeline Architecture

```
[ Ingestion Sources ]
  • Structured Files (Foundry JSON, Pathbuilder JSON, 5e.tools, GCS)
  • Unstructured Text (PDF paste, web copy, scanned notes)
           │
           ▼
[ Tier 1: Parsing & Extraction ]
  ├── Deterministic Parsers (Fast, offline, zero-token)
  └── AI-Assisted Text Parser (Oracle/Gemini structured extraction)
           │
           ▼
[ Tier 2: StatBlock Intermediate Representation (IR) ]
  • Normalized schema in packages/stat-sheet-engine
  • System tag, identity, vitals, attributes, defences, attacks, traits
           │
           ▼
[ Tier 3: Target Template Mapping & Synthesis ]
  ├── Match Built-in Template (e.g. builtin-dnd5e-monster, builtin-mythras-character)
  └── Dynamic Template Synthesis (creates new StatSheetTemplate if system unknown)
           │
           ▼
[ Tier 4: Review, Approval & Persistence ]
  • Interactive diff modal (source text vs parsed fields)
  • Persisted to entity YAML frontmatter (statSheet) + Vault Template Registry
```

---

## 4. StatBlock Intermediate Representation (IR)

Located in `packages/stat-sheet-engine/src/import/ir.ts`, the IR normalizes disparate game system structures into an intermediate data model before transforming to `StatSheetField[]`:

```typescript
export interface StatBlockIR {
  system:
    | "dnd5e"
    | "pf2e"
    | "tales-of-the-valiant"
    | "mythras"
    | "vtm"
    | "gurps"
    | "generic";

  identity: {
    name: string;
    category: "character" | "npc" | "creature";
    ancestryOrType?: string;
    classOrRole?: string;
    levelOrCr?: string;
    size?: string;
    alignment?: string;
  };

  vitals: Array<{
    id: string;
    label: string;
    current?: number;
    max?: number;
    min?: number;
    sublabel?: string; // e.g. "Head AP: 3"
  }>;

  attributes: Record<string, { label: string; value: number | string }>;

  defences: {
    armorRating?: number | string;
    armorDetails?: string;
    secondaryDefences?: Record<string, string | number>; // e.g. saves, DR, soak
    immunities?: string[];
    resistances?: string[];
    vulnerabilities?: string[];
    conditionImmunities?: string[];
  };

  actionsAndAttacks: Array<{
    name: string;
    actionType?: "action" | "bonus" | "reaction" | "legendary" | "passive";
    attackDice?: string; // e.g. "1d20+7", "3d6<=14"
    damageDice?: string; // e.g. "2d6+4", "1d8+2"
    reachOrRange?: string;
    description?: string;
  }>;

  skillsAndProficiencies?: Array<{
    name: string;
    value: string | number; // e.g. "+6" or "65%"
    formula?: string;
  }>;

  traitsAndFeatures: Array<{
    name: string;
    text: string;
    category?:
      "trait" | "feat" | "discipline" | "advantage" | "spell" | "special";
  }>;

  rawSource?: string;
}
```

---

## 5. Ingestion Pipelines

### 5.1 Deterministic Parsers (Local-First, Offline)

Standard digital exports can be identified by signature fields and parsed instantly without network requests or LLM tokens:

1. **Foundry VTT Actor JSON**:
   - Signature: `actor.type in ["character", "npc"]`, `actor.system` contains `attributes.hp`.
   - Maps `actor.items` filtering on `type === "weapon" | "feat"` into `actions` and `traits`.
2. **Pathbuilder 2e JSON**:
   - Signature: `build.attributes`, `build.character`, `build.proficiencies`.
   - Maps 1:1 to `builtin-pathfinder-character` fields.
3. **5e.tools / MonsterLabs JSON**:
   - Signature: `cr`, `hp.average`, `ac`, `str`, `dex`.
   - Maps directly to `builtin-dnd5e-monster` (referencing `docs/DND5E_MONSTER_TEMPLATE_FIELDS.md`).
4. **GCS (GURPS Character Sheet JSON/XML)**:
   - Signature: `calc.hp`, `calc.fp`, `attributes: [{attr_id: "ST"}, ...]`.
   - Maps attributes, advantages, disadvantages, and weapon modes.

### 5.2 AI-Assisted Text Parser (PDFs, Web Clippings, Physical Books)

For unstructured text copied from PDFs, homebrew wikis, or physical books:

- An Oracle / AI service task: `extractStatBlockFromText(text: string, systemHint?: string)`.
- Uses a strict JSON schema / Zod parser targeting `StatBlockIR`.
- Includes a heuristics-based signature pre-pass to auto-detect system hints:
  - `"Armor Class"` + `"Hit Points"` + `"STR"`/`"DEX"` -> `dnd5e` / `tales-of-the-valiant`
  - `"Perception +"` + `"Fortitude +"` + `"Reflex +"` + `"Strike"` -> `pf2e`
  - `"Action Points"` + `"Hit Locations"` + `"1d100"` -> `mythras`
  - `"Hunger"` + `"Blood Potency"` + `"Disciplines"` -> `vtm`
  - `"ST ["` + `"DX ["` + `"Basic Speed"` + `"Fatigue"` -> `gurps`

---

## 6. Template Mapping & Dynamic Template Synthesis

### 6.1 Mapping to Built-in Templates

When the detected system corresponds to an existing built-in template (`builtin-dnd-character`, `builtin-dnd5e-monster`, `builtin-pathfinder-character`, `builtin-mythras-character`, `builtin-vampire-character`):

- The IR mapper maps fields into the target template's exact stable field IDs.
- Actions and attacks populate `item-table` rows with rollable formulas (`formula: "1d20+7"`).
- Ability modifier sources (`modifierSource: "str_score"`) are linked so in-app calculations remain live and dynamic.

### 6.2 Dynamic Template Synthesis (Unknown or Homebrew Systems)

When an imported stat block belongs to a system without a matching template (such as GURPS, Mörk Borg, Mothership, or Savage Worlds):

1. The synthesis engine creates a new, tailored `StatSheetTemplate`:
   - Attributes become `number` fields.
   - Resource pools (HP, FP, Stress) become `counter` fields.
   - Attacks become `item-table` fields with configurable columns.
   - Special features become `longtext` fields.
2. The template is assigned a deterministic ID (e.g. `template-gurps-character`) and saved into the campaign's vault registry (`StatSheetTemplateStore`).
3. Future character imports of the same system in that vault immediately inherit the synthesized template.

---

## 7. Review, Approval & Data Integrity (Constitution V)

Following Codex Cryptica's data integrity principles:

1. **Never Silently Mutate**: Stat block imports never overwrite an entity without user confirmation.
2. **Side-by-Side Review Modal**:
   - Left panel: Raw input source text / original JSON.
   - Right panel: Interactive form showing populated fields, counters, and rollable dice formulas.
   - Allows users to re-assign target template or adjust values before saving.
3. **Roll Verification**: All dice expressions are verified against `packages/dice-engine` notation before persistence to prevent syntax errors during table play.

---

## 8. Implementation Roadmap

- **Phase 1 (Core Prototype)**:
  - Add `StatBlockIR` and transformer interfaces to `packages/stat-sheet-engine`.
  - Implement deterministic parser for standard D&D 5e / MonsterLabs JSON.
  - Implement IR to `StatSheetField[]` mapper for `builtin-dnd5e-monster` and `builtin-dnd-character`.
  - Add comprehensive unit tests.
- **Phase 2 (Expanded Deterministic Parsers)**:
  - Implement Pathfinder 2e (Pathbuilder / Foundry) parser.
  - Implement Mythras / BRP hit-location parser.
  - Implement GURPS parser and Dynamic Template Synthesis.
- **Phase 3 (AI Text Ingestion & UI)**:
  - Implement AI unstructured text parser in `packages/oracle-engine`.
  - Add "Import Stat Block" action in Entity Detail Stats Tab and `/import` route.
  - Add split-view Stat Block Review Modal with dice roll previews.
