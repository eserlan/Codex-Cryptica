import type { StatSheetField } from "schema";
import type { StatBlockIR } from "./types";
import {
  mapMythrasVitalsAndChars,
  formatFeaturesAsProse,
} from "./mapper-shared";
export function mapToMythrasCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields = mapMythrasVitalsAndChars(ir, 12, false);
  const sec = ir.defences.secondaryDefences || {};

  if (sec.damage_mod)
    fields.push({
      id: "damage_mod",
      label: "Damage Modifier",
      type: "text",
      value: String(sec.damage_mod),
    });
  if (sec.move !== undefined)
    fields.push({
      id: "move",
      label: "Movement (m)",
      type: "number",
      value: Number(sec.move),
    });

  fields.push({
    id: "d100_check",
    label: "d100 Check",
    type: "dice",
    formula: "1d100",
  });
  return fields;
}
export function mapToMythrasNpc(ir: StatBlockIR): StatSheetField[] {
  const fields = mapMythrasVitalsAndChars(ir, 10, true);

  if (ir.actionsAndAttacks.length > 0) {
    const textProse = ir.actionsAndAttacks
      .map(
        (a) =>
          `**${a.name}**: ${[a.attackDice, a.damageDice, a.description].filter(Boolean).join(" - ")}`,
      )
      .join("\n\n");
    fields.push({
      id: "attacks",
      label: "Attacks & Combat Styles",
      type: "longtext",
      value: textProse,
    });
  }

  if (ir.traitsAndFeatures.length > 0) {
    fields.push({
      id: "traits",
      label: "Creature Traits & Special Abilities",
      type: "longtext",
      value: formatFeaturesAsProse(ir.traitsAndFeatures),
    });
  }

  return fields;
}
