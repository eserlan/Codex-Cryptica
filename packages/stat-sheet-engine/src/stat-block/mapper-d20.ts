import type { StatSheetField } from "schema";
import type { StatBlockIR } from "./types";
import {
  mapHpField,
  mapAcField,
  appendHpSublabelField,
  formatFeaturesAsProse,
  D20_ABILITY_KEYS,
} from "./mapper-shared";
export function mapScoresAndChecks(
  ir: StatBlockIR,
  includeChecks = true,
): StatSheetField[] {
  const fields: StatSheetField[] = [];
  for (const s of D20_ABILITY_KEYS) {
    const attr = ir.attributes[s];
    if (!attr) continue;
    const scoreVal = Number(attr.value);
    fields.push({
      id: `${s}_score`,
      label: attr.label,
      type: "number",
      value: scoreVal,
    });
    if (includeChecks) {
      fields.push(...mapAbilityCheckFields(ir, s));
    }
  }
  return fields;
}

export function mapAbilityCheckFields(
  ir: StatBlockIR,
  onlyKey?: string,
): StatSheetField[] {
  return D20_ABILITY_KEYS.filter((key) => !onlyKey || key === onlyKey).flatMap(
    (key) => {
      const attr = ir.attributes[key];
      if (!attr) return [];
      const score = Number(attr.value);
      const modifier = attr.modifier ?? Math.floor((score - 10) / 2);
      return [
        {
          id: key,
          label: `${attr.label} Check`,
          type: "dice" as const,
          formula: `1d20${modifier >= 0 ? `+${modifier}` : modifier}`,
          modifierSource: `${key}_score`,
        },
      ];
    },
  );
}
export function mapD20Basics(
  ir: StatBlockIR,
  defaultMaxHp: number,
): StatSheetField[] {
  const fields: StatSheetField[] = [];
  const hpField = mapHpField(ir, defaultMaxHp);
  if (hpField) fields.push(hpField);
  const acField = mapAcField(ir);
  if (acField) fields.push(acField);
  fields.push(...mapScoresAndChecks(ir, true));
  return fields;
}
export function mapToDnd5eMonster(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];

  // Identity
  if (ir.identity.size)
    fields.push({
      id: "size",
      label: "Size",
      type: "text",
      value: ir.identity.size,
    });
  if (ir.identity.ancestryOrType)
    fields.push({
      id: "creature_type",
      label: "Creature Type",
      type: "text",
      value: ir.identity.ancestryOrType,
    });
  if (ir.identity.alignment)
    fields.push({
      id: "alignment",
      label: "Alignment",
      type: "text",
      value: ir.identity.alignment,
    });
  if (ir.identity.levelOrCr)
    fields.push({
      id: "cr",
      label: "Challenge Rating",
      type: "text",
      value: ir.identity.levelOrCr,
    });

  // Defence & Vitals
  const hpField = mapHpField(ir, 10);
  if (hpField) {
    fields.push(hpField);
    appendHpSublabelField(fields, ir, "Hit Dice");
  }

  const acField = mapAcField(ir);
  if (acField) fields.push(acField);
  if (ir.defences.armorDetails)
    fields.push({
      id: "ac_details",
      label: "AC Source / Details",
      type: "text",
      value: ir.defences.armorDetails,
    });
  if (ir.defences.speed)
    fields.push({
      id: "speed",
      label: "Speed",
      type: "text",
      value: ir.defences.speed,
    });

  // Ability Scores without checks
  fields.push(...mapScoresAndChecks(ir, false));

  mapDndActionTable(fields, ir, "action", "actions", "Actions");
  mapDndActionTable(fields, ir, "bonus", "bonus_actions", "Bonus Actions");
  mapDndActionTable(fields, ir, "reaction", "reactions", "Reactions");
  mapDndActionTable(
    fields,
    ir,
    "legendary",
    "legendary_actions",
    "Legendary Actions",
  );

  // Traits as longtext
  if (ir.traitsAndFeatures.length > 0) {
    const textProse = ir.traitsAndFeatures
      .map((t) => `**${t.name}.** ${t.text}`)
      .join("\n\n");
    fields.push({
      id: "traits",
      label: "Special Traits",
      type: "longtext",
      value: textProse,
    });
  }

  return fields;
}
export function mapDndActionTable(
  fields: StatSheetField[],
  ir: StatBlockIR,
  actionType: "action" | "bonus" | "reaction" | "legendary",
  id: string,
  label: string,
): void {
  const actions = ir.actionsAndAttacks.filter(
    (action) => action.actionType === actionType,
  );
  if (actions.length === 0) return;
  fields.push({
    id,
    label,
    type: "item-table",
    columns: [
      { id: "name", label: "Action", type: "text" },
      { id: "attack", label: "Attack Roll", type: "dice" },
      { id: "damage", label: "Damage", type: "dice" },
      { id: "description", label: "Description", type: "text" },
    ],
    rows: actions.map((action) => ({
      name: action.name,
      attack: action.attackDice ?? "",
      damage: action.damageDice ?? "",
      description: action.description ?? "",
    })),
    linkVaultItems: false,
  });
}
export function mapToDndCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields = mapD20Basics(ir, 10);
  const firstAttack = ir.actionsAndAttacks.find((a) => a.attackDice);
  if (firstAttack?.attackDice) {
    fields.push({
      id: "atk",
      label: `${firstAttack.name} Attack`,
      type: "dice",
      formula: firstAttack.attackDice,
    });
  }
  return fields;
}

// fallow-ignore-next-line complexity
export function buildPfSaves(ir: StatBlockIR): StatSheetField[] {
  const sec = ir.defences.secondaryDefences || {};
  const fortBonus =
    sec.fortitude ?? sec.fort ?? ir.attributes.con?.modifier ?? 0;
  const refBonus = sec.reflex ?? sec.ref ?? ir.attributes.dex?.modifier ?? 0;
  const willBonus =
    sec.will ?? sec.willpower ?? ir.attributes.wis?.modifier ?? 0;

  return [
    {
      id: "fort",
      label: "Fortitude",
      type: "dice",
      formula: `1d20+${Number(fortBonus)}`,
      modifierSource: "con_score",
    },
    {
      id: "reflex",
      label: "Reflex",
      type: "dice",
      formula: `1d20+${Number(refBonus)}`,
      modifierSource: "dex_score",
    },
    {
      id: "will",
      label: "Will",
      type: "dice",
      formula: `1d20+${Number(willBonus)}`,
      modifierSource: "wis_score",
    },
  ];
}

// fallow-ignore-next-line complexity
export function mapToPathfinderCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields = mapD20Basics(ir, 100);
  fields.push(...buildPfSaves(ir));

  const primaryAtk = ir.actionsAndAttacks.find((a) => a.attackDice);
  if (primaryAtk?.attackDice) {
    fields.push({
      id: "atk",
      label: `${primaryAtk.name} Attack`,
      type: "dice",
      formula: primaryAtk.attackDice,
    });
  }

  const perceptionSkill = ir.skillsAndProficiencies?.find(
    (s) => s.name.toLowerCase() === "perception",
  );
  const percVal = perceptionSkill
    ? Number(perceptionSkill.value)
    : (ir.attributes.wis?.modifier ?? 0);
  fields.push({
    id: "perception",
    label: "Perception",
    type: "dice",
    formula: `1d20+${percVal}`,
    modifierSource: "wis_score",
  });

  if (ir.traitsAndFeatures.length > 0) {
    fields.push({
      id: "feats",
      label: "Feats & Abilities",
      type: "longtext",
      value: formatFeaturesAsProse(ir.traitsAndFeatures),
    });
  }

  return fields;
}
