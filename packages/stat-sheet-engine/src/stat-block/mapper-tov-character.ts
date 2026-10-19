import type { StatSheetField } from "schema";
import type { StatBlockIR } from "./types";
import { mapTovLuckField, mapTovSaveFields } from "./mapper-tov-common";
import { mapAbilityCheckFields } from "./mapper-d20";
import {
  mapHpField,
  mapAcField,
  appendHpSublabelField,
  formatFeaturesAsProse,
  D20_ABILITY_KEYS,
  derivedRollFormula,
} from "./mapper-shared";

export const TOV_SKILL_DEFINITIONS: Array<[string, string, string]> = [
  ["acrobatics", "Acrobatics", "dex"],
  ["animal_handling", "Animal Handling", "wis"],
  ["arcana", "Arcana", "int"],
  ["athletics", "Athletics", "str"],
  ["deception", "Deception", "cha"],
  ["history", "History", "int"],
  ["insight", "Insight", "wis"],
  ["intimidation", "Intimidation", "cha"],
  ["investigation", "Investigation", "int"],
  ["medicine", "Medicine", "wis"],
  ["nature", "Nature", "int"],
  ["perception", "Perception", "wis"],
  ["performance", "Performance", "cha"],
  ["persuasion", "Persuasion", "cha"],
  ["religion", "Religion", "int"],
  ["sleight_of_hand", "Sleight of Hand", "dex"],
  ["stealth", "Stealth", "dex"],
  ["survival", "Survival", "wis"],
];

// fallow-ignore-next-line complexity
export function mapToTovCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];
  const sec = ir.defences.secondaryDefences || {};

  fields.push({
    id: "sec_identity",
    label: "Identity & Heritage",
    type: "heading",
  });
  if (sec.lineage || ir.identity.ancestryOrType) {
    fields.push({
      id: "lineage",
      label: "Lineage",
      type: "text",
      value: String(sec.lineage ?? ir.identity.ancestryOrType),
    });
  }
  if (sec.heritage) {
    fields.push({
      id: "heritage",
      label: "Heritage",
      type: "text",
      value: String(sec.heritage),
    });
  }
  if (sec.background) {
    fields.push({
      id: "background",
      label: "Background",
      type: "text",
      value: String(sec.background),
    });
  }
  if (sec.className || ir.identity.classOrRole) {
    fields.push({
      id: "class",
      label: "Class & Subclass",
      type: "text",
      value: String(sec.className ?? ir.identity.classOrRole),
    });
  }
  const levelVal =
    sec.levelNum ??
    (ir.identity.levelOrCr ? Number(ir.identity.levelOrCr) : undefined);
  if (levelVal !== undefined && !Number.isNaN(Number(levelVal))) {
    fields.push({
      id: "level",
      label: "Level",
      type: "number",
      value: Number(levelVal),
    });
  }
  if (sec.proficiency_bonus !== undefined) {
    fields.push({
      id: "proficiency_bonus",
      label: "Proficiency Bonus",
      type: "number",
      value: Number(sec.proficiency_bonus),
    });
  }

  // Vitals & Defences
  fields.push({
    id: "sec_vitals",
    label: "Vitals & Defences",
    type: "heading",
  });
  const hpField = mapHpField(ir, 100);
  if (hpField) {
    fields.push({ ...hpField, barField: true });
    appendHpSublabelField(fields, ir, "Hit Dice");
  }
  const acField = mapAcField(ir);
  if (acField) fields.push(acField);
  if (ir.defences.speed) {
    fields.push({
      id: "speed",
      label: "Speed",
      type: "text",
      value: ir.defences.speed,
    });
  }
  fields.push(mapTovLuckField(ir));

  // Ability Scores
  fields.push({ id: "sec_scores", label: "Ability Scores", type: "heading" });
  for (const s of D20_ABILITY_KEYS) {
    const attr = ir.attributes[s];
    if (!attr) continue;
    fields.push({
      id: `${s}_score`,
      label: attr.label,
      type: "number",
      value: Number(attr.value),
    });
  }

  // Ability Checks
  fields.push({
    id: "sec_abilities",
    label: "Ability Checks",
    type: "heading",
  });
  fields.push(...mapAbilityCheckFields(ir));

  // Saving Throws
  fields.push({ id: "sec_saves", label: "Saving Throws", type: "heading" });
  fields.push(...mapTovSaveFields(ir));

  // Skills
  fields.push({ id: "sec_skills", label: "Skills", type: "heading" });
  for (const [skillId, skillLabel, abilityKey] of TOV_SKILL_DEFINITIONS) {
    const foundSkill = ir.skillsAndProficiencies?.find(
      (s) =>
        s.name.toLowerCase().replace(/[\s_-]+/g, "") ===
        skillId.replace(/[\s_-]+/g, ""),
    );
    let bonus: number;
    if (foundSkill) {
      bonus = Number(foundSkill.value);
    } else {
      bonus = ir.attributes[abilityKey]?.modifier ?? 0;
    }
    fields.push({
      id: skillId,
      label: skillLabel,
      type: "dice",
      formula: derivedRollFormula(bonus, ir.attributes[abilityKey]?.value),
      modifierSource: `${abilityKey}_score`,
    });
  }

  // Combat & Attacks
  fields.push({ id: "sec_combat", label: "Combat & Attacks", type: "heading" });
  const attackRows = ir.actionsAndAttacks.map((a) => ({
    name: a.name,
    attack: a.attackDice ?? "1d20+0",
    damage: a.damageDice ?? "1d6+0",
    type: a.reachOrRange ?? "",
    description: a.description ?? "",
  }));
  fields.push({
    id: "attacks",
    label: "Attacks & Weapons",
    type: "item-table",
    columns: [
      { id: "name", label: "Name", type: "text" },
      { id: "attack", label: "Attack", type: "dice", formula: "1d20+0" },
      { id: "damage", label: "Damage", type: "dice", formula: "1d6+0" },
      { id: "type", label: "Damage Type", type: "text" },
      { id: "description", label: "Notes / Range", type: "text" },
    ],
    rows: attackRows,
    linkVaultItems: false,
  });
  fields.push({ id: "conditions", label: "Conditions & Buffs", type: "text" });

  // Talents & Features
  fields.push({
    id: "sec_talents",
    label: "Talents & Lineage Traits",
    type: "heading",
  });
  const talents = ir.traitsAndFeatures.filter((t) => t.category === "feat");
  if (talents.length > 0) {
    fields.push({
      id: "talents",
      label: "Talents (Martial, Magic, Technical)",
      type: "longtext",
      value: formatFeaturesAsProse(talents),
    });
  }
  const feats = ir.traitsAndFeatures.filter(
    (t) => t.category === "trait" || t.category === "special",
  );
  if (feats.length > 0) {
    fields.push({
      id: "features",
      label: "Class & Subclass Features",
      type: "longtext",
      value: formatFeaturesAsProse(feats),
    });
  }

  return fields;
}
