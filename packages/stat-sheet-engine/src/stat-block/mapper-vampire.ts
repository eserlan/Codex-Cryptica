import type { StatSheetField } from "schema";
import type { StatBlockIR } from "./types";
import { getVitalValue } from "./mapper-shared";
export function mapToVampireCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];

  fields.push({
    id: "willpower",
    label: "Willpower",
    type: "counter",
    value: getVitalValue(ir, "willpower", 5),
    min: 0,
    max: 10,
  });
  fields.push({
    id: "blood",
    label: "Blood Pool / Hunger",
    type: "counter",
    value: getVitalValue(ir, "blood", 1),
    min: 0,
    max: 10,
  });
  fields.push({
    id: "humanity",
    label: "Humanity",
    type: "counter",
    value: getVitalValue(ir, "humanity", 7),
    min: 0,
    max: 10,
  });

  const wodAttrs = [
    "strength",
    "dexterity",
    "stamina",
    "charisma",
    "manipulation",
    "composure",
    "intelligence",
    "wits",
    "resolve",
  ];

  for (const a of wodAttrs) {
    const attr = ir.attributes[a];
    if (attr)
      fields.push({
        id: a,
        label: attr.label,
        type: "number",
        value: Number(attr.value),
      });
  }

  fields.push({
    id: "dice_pool",
    label: "Dice Pool Roll (d10s)",
    type: "dice",
    formula: "5d10",
  });

  const discTraits = ir.traitsAndFeatures.filter(
    (t) => t.category === "discipline",
  );
  if (discTraits.length > 0) {
    const discStr = discTraits
      .map((d) => d.name + (d.text ? ` (${d.text})` : ""))
      .join("\n");
    fields.push({
      id: "disciplines",
      label: "Disciplines",
      type: "longtext",
      value: discStr,
    });
  }

  return fields;
}
