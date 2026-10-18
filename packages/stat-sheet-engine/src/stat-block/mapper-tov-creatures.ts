import type { StatSheetField } from "schema";
import type { StatBlockIR } from "./types";
import {
  mapHpField,
  mapAcField,
  appendHpSublabelField,
  formatFeaturesAsProse,
} from "./mapper-shared";
import { mapScoresAndChecks, mapDndActionTable } from "./mapper-d20";
import { mapTovLuckField, mapTovSaveFields } from "./mapper-tov-common";

export function mapToTovNpc(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];
  const hpField = mapHpField(ir, 100);
  if (hpField) fields.push({ ...hpField, barField: true });

  const acField = mapAcField(ir);
  if (acField) fields.push(acField);

  fields.push(mapTovLuckField(ir));

  const firstRollAction = ir.actionsAndAttacks.find(
    (a) => a.attackDice || a.damageDice,
  );
  if (firstRollAction?.attackDice) {
    fields.push({
      id: "atk",
      label: "Attack Roll",
      type: "dice",
      formula: firstRollAction.attackDice,
    });
  }
  if (firstRollAction?.damageDice) {
    fields.push({
      id: "damage",
      label: "Damage Roll",
      type: "dice",
      formula: firstRollAction.damageDice,
    });
  }

  if (ir.traitsAndFeatures.length > 0 || ir.actionsAndAttacks.length > 0) {
    const notesParts: string[] = [];
    if (ir.actionsAndAttacks.length > 0) {
      notesParts.push(
        ir.actionsAndAttacks
          .map(
            (a) =>
              `**${a.name}**: ${[a.attackDice, a.damageDice, a.description].filter(Boolean).join(" - ")}`,
          )
          .join("\n"),
      );
    }
    if (ir.traitsAndFeatures.length > 0) {
      notesParts.push(formatFeaturesAsProse(ir.traitsAndFeatures));
    }
    fields.push({
      id: "notes",
      label: "Quick Stats & Traits",
      type: "longtext",
      value: notesParts.join("\n\n"),
    });
  }

  return fields;
}

// fallow-ignore-next-line complexity
export function mapToTovMonster(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];
  const sec = ir.defences.secondaryDefences || {};

  fields.push({ id: "sec_identity", label: "Identity", type: "heading" });
  if (ir.identity.size) {
    fields.push({
      id: "size",
      label: "Size",
      type: "text",
      value: ir.identity.size,
    });
  }
  if (ir.identity.ancestryOrType) {
    fields.push({
      id: "creature_type",
      label: "Creature Type",
      type: "text",
      value: ir.identity.ancestryOrType,
    });
  }
  if (ir.identity.alignment) {
    fields.push({
      id: "alignment",
      label: "Alignment",
      type: "text",
      value: ir.identity.alignment,
    });
  }
  if (ir.identity.levelOrCr) {
    fields.push({
      id: "cr",
      label: "Challenge Rating",
      type: "text",
      value: ir.identity.levelOrCr,
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

  const doomVital = ir.vitals.find((v) => v.id === "doom");
  fields.push({
    id: "doom",
    label: "Doom Points",
    type: "counter",
    value: doomVital?.current ?? 0,
    min: 0,
    max: 10,
  });

  fields.push({
    id: "sec_defence",
    label: "Defence & Movement",
    type: "heading",
  });
  const acField = mapAcField(ir);
  if (acField) fields.push(acField);
  if (ir.defences.armorDetails) {
    fields.push({
      id: "ac_details",
      label: "AC Source / Details",
      type: "text",
      value: ir.defences.armorDetails,
    });
  }
  const hpField = mapHpField(ir, 200);
  if (hpField) {
    fields.push({ ...hpField, barField: true });
    appendHpSublabelField(fields, ir, "Hit Point Maximum / Hit Dice");
  }
  if (ir.defences.speed) {
    fields.push({
      id: "speed",
      label: "Speed",
      type: "text",
      value: ir.defences.speed,
    });
  }

  // Scores without checks
  fields.push({ id: "sec_scores", label: "Ability Scores", type: "heading" });
  fields.push(...mapScoresAndChecks(ir, false));

  // Saves
  fields.push({ id: "sec_saves", label: "Saving Throws", type: "heading" });
  fields.push(...mapTovSaveFields(ir));

  // Skills
  fields.push({ id: "sec_skills", label: "Skills", type: "heading" });
  if (ir.skillsAndProficiencies && ir.skillsAndProficiencies.length > 0) {
    for (const skill of ir.skillsAndProficiencies) {
      const val = Number(skill.value);
      const valStr = val >= 0 ? `+${val}` : `${val}`;
      fields.push({
        id: skill.name.toLowerCase().replace(/[\s_-]+/g, "_"),
        label: skill.name,
        type: "dice",
        formula: skill.formula ?? `1d20${valStr}`,
      });
    }
  }

  // Defences, Senses & Languages
  fields.push({
    id: "sec_defences_senses",
    label: "Defences, Senses & Languages",
    type: "heading",
  });
  if (ir.defences.senses)
    fields.push({
      id: "senses",
      label: "Senses",
      type: "text",
      value: ir.defences.senses,
    });
  if (ir.defences.languages)
    fields.push({
      id: "languages",
      label: "Languages",
      type: "text",
      value: ir.defences.languages,
    });
  const defenceFields = [
    [
      "damage_vulnerabilities",
      "Damage Vulnerabilities",
      ir.defences.vulnerabilities,
    ],
    ["damage_resistances", "Damage Resistances", ir.defences.resistances],
    ["damage_immunities", "Damage Immunities", ir.defences.immunities],
    [
      "condition_immunities",
      "Condition Immunities",
      ir.defences.conditionImmunities,
    ],
  ] as const;
  for (const [id, label, values] of defenceFields) {
    if (values?.length) {
      fields.push({ id, label, type: "text", value: values.join(", ") });
    }
  }

  // Traits
  if (ir.traitsAndFeatures.length > 0) {
    fields.push({
      id: "sec_traits",
      label: "Traits & Spellcasting",
      type: "heading",
    });
    fields.push({
      id: "traits",
      label: "Traits / Special Abilities",
      type: "longtext",
      value: formatFeaturesAsProse(ir.traitsAndFeatures),
    });
  }

  // Structured Actions
  fields.push({ id: "sec_actions", label: "Actions", type: "heading" });
  mapDndActionTable(fields, ir, "action", "actions", "Actions");

  fields.push({
    id: "sec_bonus_reactions",
    label: "Bonus Actions & Reactions",
    type: "heading",
  });
  mapDndActionTable(fields, ir, "bonus", "bonus_actions", "Bonus Actions");
  mapDndActionTable(fields, ir, "reaction", "reactions", "Reactions");

  mapDndActionTable(
    fields,
    ir,
    "legendary",
    "legendary_actions",
    "Legendary Actions",
  );

  return fields;
}
