import type { PresentationTemplate } from "schema";

const CREATED_AT = "2026-08-02T00:00:00.000Z";

function builtIn(
  id: string,
  schemaTemplateId: string,
  name: string,
  description: string,
  source: string,
): PresentationTemplate {
  return {
    id,
    vaultId: null,
    schemaTemplateId,
    name,
    description,
    source,
    formatVersion: 1,
    isBuiltIn: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

const STANDARD_FORM_SOURCE = `## Stats

:::stat-group columns=2
{{stat.hp display="current-max" label="Hit Points"}}
{{stat.ac display="prominent" label="Armor Class"}}
:::
`;

const COMPACT_STAT_BLOCK_SOURCE = `:::card
{{stat.hp display="current-max" label="HP"}}
{{stat.ac display="plain" label="AC"}}
:::
`;

const DASHBOARD_CARD_SOURCE = `:::row
:::card
{{stat.hp display="progress" label="Hit Points"}}
:::
:::card
{{stat.ac display="prominent" label="Armor Class"}}
:::
:::
`;

const MOBILE_QUICK_REFERENCE_SOURCE = `{{stat.hp display="current-max" label="HP"}}
{{stat.ac display="plain" label="AC"}}
`;

const FACTION_INFLUENCE_BOARD_SOURCE = `## Influence Board

:::row
:::card
### Reach & Resolve
:::stat-group columns=2
{{stat.influence display="prominent" label="Influence"}}
{{stat.stability display="prominent" label="Stability"}}
:::
:::

:::card
### Means to Act
:::stat-group columns=2
{{stat.power display="prominent" label="Power"}}
{{stat.resources display="prominent" label="Resources"}}
:::
:::
:::
`;

const DND_CHARACTER_SHEET_SOURCE = `:::row
:::card
### Vital Stats
:::stat-group columns=2
{{stat.hp display="current-max" label="Hit Points"}}
{{stat.ac display="prominent" label="Armor Class"}}
:::
:::
:::

### Ability Scores & Checks
:::stat-group columns=3
:::card
{{stat.str_score display="prominent" label="STR"}}
{{stat.str display="plain" label="Check"}}
:::
:::card
{{stat.dex_score display="prominent" label="DEX"}}
{{stat.dex display="plain" label="Check"}}
:::
:::card
{{stat.con_score display="prominent" label="CON"}}
{{stat.con display="plain" label="Check"}}
:::
:::card
{{stat.int_score display="prominent" label="INT"}}
{{stat.int display="plain" label="Check"}}
:::
:::card
{{stat.wis_score display="prominent" label="WIS"}}
{{stat.wis display="plain" label="Check"}}
:::
:::card
{{stat.cha_score display="prominent" label="CHA"}}
{{stat.cha display="plain" label="Check"}}
:::
:::

:::row
:::card
### Combat
:::stat-group columns=2
{{stat.atk display="prominent" label="Attack Roll"}}
{{stat.conditions display="plain" label="Conditions"}}
:::
:::

:::card
### Skills
:::stat-group columns=1
{{stat.perception display="plain" label="Perception"}}
{{stat.stealth display="plain" label="Stealth"}}
{{stat.athletics display="plain" label="Athletics"}}
{{stat.persuasion display="plain" label="Persuasion"}}
:::
:::
:::
`;

const MYTHRAS_CHARACTER_SHEET_SOURCE = `:::row
:::card
### Pools & Derived Attributes
:::stat-group columns=3
{{stat.ap display="counter" label="AP"}}
{{stat.mp display="counter" label="MP"}}
{{stat.hp display="counter" label="Total HP"}}
:::
:::stat-group columns=3
{{stat.damage_mod display="plain" label="Damage Mod"}}
{{stat.initiative display="prominent" label="Initiative"}}
{{stat.move display="plain" label="Movement"}}
:::
:::
:::

### Characteristics & Luck Points
| STR | CON | SIZ | DEX | INT | POW | CHA | Luck |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {{stat.str hide-label}} | {{stat.con hide-label}} | {{stat.siz hide-label}} | {{stat.dex hide-label}} | {{stat.int hide-label}} | {{stat.pow hide-label}} | {{stat.cha hide-label}} | {{stat.lp display="counter" hide-label}} |

:::card
### Hit Locations & Armor
| Location | Armor AP | Current HP |
| --- | --- | --- |
| Head | [loc_head_ap] | [loc_head_hp:counter] |
| Chest | [loc_chest_ap] | [loc_chest_hp:counter] |
| Abdomen | [loc_abdomen_ap] | [loc_abdomen_hp:counter] |
| Right Arm | [loc_rarm_ap] | [loc_rarm_hp:counter] |
| Left Arm | [loc_larm_ap] | [loc_larm_hp:counter] |
| Right Leg | [loc_rleg_ap] | [loc_rleg_hp:counter] |
| Left Leg | [loc_lleg_ap] | [loc_lleg_hp:counter] |
:::

:::row
:::card
### Standard Skills & Rolls
:::stat-group columns=2
{{stat.d100_check label="d100 Roll"}}
{{stat.athletics label="Athletics"}}
{{stat.brawn label="Brawn"}}
{{stat.evade label="Evade"}}
{{stat.insight label="Insight"}}
{{stat.perception label="Perception"}}
{{stat.stealth label="Stealth"}}
{{stat.willpower label="Willpower"}}
:::
:::
:::card
### Combat & Weapons
[weapons_table]
:::
:::card
### Combat, Specializations & Passions
{{stat.combat_styles display="plain" label="Combat Styles"}}
{{stat.professional_skills display="plain" label="Professional Skills"}}
{{stat.passions_cults display="plain" label="Passions & Cults"}}
:::
:::
`;

/**
 * The built-in presentation templates required by FR-012/SC-007.
 * Read-only (never editable in place — see spec.md Edge Cases); duplicating
 * one via the editor (T026) produces a separate vault-owned copy.
 *
 * These reference the `hp`/`ac` field ids used by the built-in Stat Sheet
 * schema templates (stat-sheet-templates.svelte.ts) as a reasonable,
 * broadly-compatible default; a MissingFieldNode is rendered harmlessly
 * (FR-009) for any schema that lacks those specific field ids, and users
 * are expected to author their own templates (User Story 2) for schemas
 * with different field naming.
 */
export function getBuiltInPresentationTemplates(
  schemaTemplateId: string,
): PresentationTemplate[] {
  return [
    ...(schemaTemplateId === "builtin-faction-turn"
      ? [
          builtIn(
            `builtin-presentation-faction-influence-board-${schemaTemplateId}`,
            schemaTemplateId,
            "Faction Influence Board",
            "A two-card overview of the four stats used by faction turns.",
            FACTION_INFLUENCE_BOARD_SOURCE,
          ),
        ]
      : []),
    builtIn(
      `builtin-presentation-mythras-character-sheet-${schemaTemplateId}`,
      schemaTemplateId,
      "Mythras Character Sheet",
      "Full Mythras layout with AP/Luck/MP pools, Characteristics grid, Hit Location AP/HP table, and d100 Skills.",
      MYTHRAS_CHARACTER_SHEET_SOURCE,
    ),
    builtIn(
      `builtin-presentation-dnd-character-sheet-${schemaTemplateId}`,
      schemaTemplateId,
      "D&D Character Sheet",
      "A multi-column D&D 5e styled layout featuring Vital Stats, Ability Scores grid, Checks, and Skills.",
      DND_CHARACTER_SHEET_SOURCE,
    ),
    builtIn(
      `builtin-presentation-standard-form-${schemaTemplateId}`,
      schemaTemplateId,
      "Standard Form",
      "A straightforward, top-to-bottom layout of the sheet's key stats.",
      STANDARD_FORM_SOURCE,
    ),
    builtIn(
      `builtin-presentation-compact-stat-block-${schemaTemplateId}`,
      schemaTemplateId,
      "Compact Stat Block",
      "A dense single-card summary, suited to NPCs and monsters.",
      COMPACT_STAT_BLOCK_SOURCE,
    ),
    builtIn(
      `builtin-presentation-dashboard-card-${schemaTemplateId}`,
      schemaTemplateId,
      "Dashboard",
      "Side-by-side cards for an at-a-glance dashboard view.",
      DASHBOARD_CARD_SOURCE,
    ),
    builtIn(
      `builtin-presentation-mobile-quick-reference-${schemaTemplateId}`,
      schemaTemplateId,
      "Mobile Quick Reference",
      "A minimal single-column layout optimized for quick reference during play.",
      MOBILE_QUICK_REFERENCE_SOURCE,
    ),
  ];
}
