import type { StatSheetField, StatSheetTemplate } from "schema";
import type { StatBlockIR } from "./types";
export function synthesizeTemplateFromIr(ir: StatBlockIR): StatSheetTemplate {
  const templateId = `synthesized-${ir.system}-${ir.identity.category}`;
  const systemName = ir.system.toUpperCase();
  const templateFields: StatSheetTemplate["fields"] = [];

  for (const v of ir.vitals) {
    templateFields.push({
      id: v.id,
      label: v.label,
      type: "counter",
      min: v.min ?? 0,
      max: v.max ?? 50,
    });
  }

  templateFields.push({ id: "sec_attr", label: "Attributes", type: "heading" });
  for (const [key, attr] of Object.entries(ir.attributes)) {
    templateFields.push({ id: key, label: attr.label, type: "number" });
  }

  if (ir.system === "gurps") {
    templateFields.push(
      { id: "basic_speed", label: "Basic Speed", type: "number" },
      { id: "move", label: "Move", type: "number" },
    );
  }

  if (ir.defences.armorRating !== undefined) {
    templateFields.push({
      id: "armour",
      label: "Armor / Defence",
      type: "number",
    });
  }

  templateFields.push({
    id: "sec_combat",
    label: "Combat & Actions",
    type: "heading",
  });
  templateFields.push({
    id: "actions",
    label: "Attacks & Actions",
    type: "item-table",
    columns: [
      { id: "name", label: "Name", type: "text" },
      { id: "check", label: "Roll / Check", type: "dice" },
      { id: "effect", label: "Effect / Damage", type: "text" },
    ],
  });

  templateFields.push({
    id: "features",
    label: "Features & Traits",
    type: "longtext",
  });

  return {
    id: templateId,
    name: `${systemName} Import Template`,
    description: `Auto-synthesized stat sheet template for ${systemName} imports.`,
    category: ir.identity.category === "character" ? "character" : "npc",
    isBuiltIn: false,
    fields: templateFields,
  };
}

// fallow-ignore-next-line complexity
export function mapToSynthesizedTemplate(
  ir: StatBlockIR,
  template: StatSheetTemplate,
): StatSheetField[] {
  const fields: StatSheetField[] = [];

  for (const f of template.fields) {
    if (f.type === "heading") continue;

    const matchingVital = ir.vitals.find((v) => v.id === f.id);
    if (matchingVital && f.type === "counter") {
      fields.push({
        ...f,
        value: matchingVital.current ?? matchingVital.max ?? 10,
      });
      continue;
    }

    const matchingAttr = ir.attributes[f.id];
    if (matchingAttr && f.type === "number") {
      fields.push({ ...f, value: Number(matchingAttr.value) });
      continue;
    }

    const matchingSecondary = ir.defences.secondaryDefences?.[f.id];
    if (matchingSecondary !== undefined && f.type === "number") {
      fields.push({ ...f, value: Number(matchingSecondary) });
      continue;
    }

    if (f.id === "armour" && ir.defences.armorRating !== undefined) {
      fields.push({ ...f, value: Number(ir.defences.armorRating) });
      continue;
    }

    if (f.id === "actions" && f.type === "item-table") {
      fields.push({
        ...f,
        rows: ir.actionsAndAttacks.map((a) => ({
          name: a.name,
          check: a.attackDice ?? "",
          effect: [a.damageDice, a.description].filter(Boolean).join(" - "),
        })),
      });
      continue;
    }

    if (f.id === "features" && ir.traitsAndFeatures.length > 0) {
      fields.push({
        ...f,
        value: ir.traitsAndFeatures
          .map((t) => `**${t.name}**: ${t.text}`)
          .join("\n\n"),
      });
      continue;
    }

    fields.push({ ...f });
  }

  return fields;
}
