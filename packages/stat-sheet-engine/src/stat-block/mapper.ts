import type { StatSheetField, StatSheetTemplate } from "schema";
import type { StatBlockIR, StatBlockImportResult } from "./types";

/**
 * Maps a StatBlockIR into concrete StatSheetField[] for Codex Cryptica.
 */
export function mapIrToStatSheet(
  ir: StatBlockIR,
  options: { targetTemplateId?: string } = {},
): StatBlockImportResult {
  const targetId = options.targetTemplateId || selectDefaultTemplateId(ir);

  switch (targetId) {
    case "builtin-dnd5e-monster":
      return { ir, fields: mapToDnd5eMonster(ir), targetTemplateId: targetId };
    case "builtin-dnd-character":
      return { ir, fields: mapToDndCharacter(ir), targetTemplateId: targetId };
    case "builtin-pathfinder-character":
      return {
        ir,
        fields: mapToPathfinderCharacter(ir),
        targetTemplateId: targetId,
      };
    case "builtin-mythras-character":
      return {
        ir,
        fields: mapToMythrasCharacter(ir),
        targetTemplateId: targetId,
      };
    case "builtin-mythras-npc":
      return { ir, fields: mapToMythrasNpc(ir), targetTemplateId: targetId };
    case "builtin-vampire-character":
      return {
        ir,
        fields: mapToVampireCharacter(ir),
        targetTemplateId: targetId,
      };
    default: {
      if (ir.system === "tales-of-the-valiant" && !options.targetTemplateId) {
        return {
          ir,
          fields: mapToDndCharacter(ir),
          targetTemplateId: "builtin-dnd-character",
        };
      }
      const synthesized = synthesizeTemplateFromIr(ir);
      return {
        ir,
        fields: mapToSynthesizedTemplate(ir, synthesized),
        targetTemplateId: synthesized.id,
        synthesizedTemplate: synthesized,
      };
    }
  }
}

function selectDefaultTemplateId(ir: StatBlockIR): string {
  if (ir.system === "dnd5e" || ir.system === "tales-of-the-valiant") {
    return ir.identity.category === "character"
      ? "builtin-dnd-character"
      : "builtin-dnd5e-monster";
  }
  if (ir.system === "pf2e") {
    return "builtin-pathfinder-character";
  }
  if (ir.system === "mythras") {
    return ir.identity.category === "character"
      ? "builtin-mythras-character"
      : "builtin-mythras-npc";
  }
  if (ir.system === "vtm") {
    return "builtin-vampire-character";
  }
  return `custom-${ir.system}-template`;
}

function mapToDnd5eMonster(ir: StatBlockIR): StatSheetField[] {
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
  const hpVital = ir.vitals.find((v) => v.id === "hp") || ir.vitals[0];
  if (hpVital) {
    fields.push({
      id: "hp",
      label: "Hit Points",
      type: "counter",
      value: hpVital.current ?? hpVital.max ?? 10,
      min: hpVital.min ?? 0,
      max: hpVital.max ?? 10,
    });
    if (hpVital.sublabel) {
      fields.push({
        id: "hit_dice",
        label: "Hit Dice",
        type: "text",
        value: hpVital.sublabel,
      });
    }
  }

  if (ir.defences.armorRating !== undefined) {
    fields.push({
      id: "ac",
      label: "Armor Class",
      type: "number",
      value: Number(ir.defences.armorRating),
    });
  }
  if (ir.defences.armorDetails) {
    fields.push({
      id: "ac_details",
      label: "AC Source / Details",
      type: "text",
      value: ir.defences.armorDetails,
    });
  }
  if (ir.defences.speed) {
    fields.push({
      id: "speed",
      label: "Speed",
      type: "text",
      value: ir.defences.speed,
    });
  }

  // Ability Scores
  const scores = ["str", "dex", "con", "int", "wis", "cha"];
  for (const s of scores) {
    const attr = ir.attributes[s];
    if (attr) {
      fields.push({
        id: `${s}_score`,
        label: attr.label,
        type: "number",
        value: Number(attr.value),
      });
    }
  }

  // Actions as item-table
  const normalActions = ir.actionsAndAttacks.filter(
    (a) => a.actionType === "action",
  );
  if (normalActions.length > 0) {
    fields.push({
      id: "actions",
      label: "Actions",
      type: "item-table",
      columns: [
        { id: "name", label: "Action", type: "text" },
        { id: "attack", label: "Attack Roll", type: "dice" },
        { id: "damage", label: "Damage", type: "dice" },
        { id: "description", label: "Description", type: "text" },
      ],
      rows: normalActions.map((a) => ({
        name: a.name,
        attack: a.attackDice ?? "",
        damage: a.damageDice ?? "",
        description: a.description ?? "",
      })),
      linkVaultItems: false,
    });
  }

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

function mapToDndCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];

  const hpVital = ir.vitals.find((v) => v.id === "hp") || ir.vitals[0];
  if (hpVital) {
    fields.push({
      id: "hp",
      label: "Hit Points",
      type: "counter",
      value: hpVital.current ?? hpVital.max ?? 10,
      min: hpVital.min ?? 0,
      max: hpVital.max ?? 10,
    });
  }

  if (ir.defences.armorRating !== undefined) {
    fields.push({
      id: "ac",
      label: "Armor Class",
      type: "number",
      value: Number(ir.defences.armorRating),
    });
  }

  // Scores & checks
  const scores = ["str", "dex", "con", "int", "wis", "cha"];
  for (const s of scores) {
    const attr = ir.attributes[s];
    if (attr) {
      const scoreVal = Number(attr.value);
      fields.push({
        id: `${s}_score`,
        label: attr.label,
        type: "number",
        value: scoreVal,
      });
      const mod = attr.modifier ?? Math.floor((scoreVal - 10) / 2);
      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
      fields.push({
        id: s,
        label: `${attr.label} Check`,
        type: "dice",
        formula: `1d20${modStr}`,
        modifierSource: `${s}_score`,
      });
    }
  }

  // Primary attack
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

function buildPfSaves(ir: StatBlockIR): StatSheetField[] {
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

function buildPfScoresAndChecks(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];
  const scores = ["str", "dex", "con", "int", "wis", "cha"];
  for (const s of scores) {
    const attr = ir.attributes[s];
    if (attr) {
      const scoreVal = Number(attr.value);
      fields.push({
        id: `${s}_score`,
        label: attr.label,
        type: "number",
        value: scoreVal,
      });
      const mod = attr.modifier ?? Math.floor((scoreVal - 10) / 2);
      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
      fields.push({
        id: s,
        label: `${attr.label} Check`,
        type: "dice",
        formula: `1d20${modStr}`,
        modifierSource: `${s}_score`,
      });
    }
  }
  return fields;
}

function mapToPathfinderCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];

  const hpVital = ir.vitals.find((v) => v.id === "hp") || ir.vitals[0];
  if (hpVital) {
    fields.push({
      id: "hp",
      label: "Hit Points",
      type: "counter",
      value: hpVital.current ?? hpVital.max ?? 10,
      min: hpVital.min ?? 0,
      max: Math.max(100, hpVital.max ?? hpVital.current ?? 100),
    });
  }

  if (ir.defences.armorRating !== undefined) {
    fields.push({
      id: "ac",
      label: "Armor Class",
      type: "number",
      value: Number(ir.defences.armorRating),
    });
  }

  fields.push(...buildPfScoresAndChecks(ir));
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
    const textProse = ir.traitsAndFeatures
      .map((t) => `**${t.name}**: ${t.text}`)
      .join("\n\n");
    fields.push({
      id: "feats",
      label: "Feats & Abilities",
      type: "longtext",
      value: textProse,
    });
  }

  return fields;
}

function buildMythrasHitLocations(
  sec: Record<string, string | number>,
): StatSheetField[] {
  const locations = [
    { key: "head", label: "Head", defaultHp: 5 },
    { key: "chest", label: "Chest", defaultHp: 7 },
    { key: "abdomen", label: "Abdomen", defaultHp: 6 },
    { key: "rarm", label: "Right Arm", defaultHp: 4 },
    { key: "larm", label: "Left Arm", defaultHp: 4 },
    { key: "rleg", label: "Right Leg", defaultHp: 5 },
    { key: "lleg", label: "Left Leg", defaultHp: 5 },
  ];

  const fields: StatSheetField[] = [];
  for (const loc of locations) {
    const apVal = Number(sec[`loc_${loc.key}_ap`] ?? 0);
    const hpVal = Number(sec[`loc_${loc.key}_hp`] ?? loc.defaultHp);
    fields.push({
      id: `loc_${loc.key}_ap`,
      label: `${loc.label} AP (Armor)`,
      type: "number",
      value: apVal,
    });
    fields.push({
      id: `loc_${loc.key}_hp`,
      label: `${loc.label} HP`,
      type: "counter",
      value: hpVal,
      min: 0,
      max: 20,
    });
  }
  return fields;
}

function mapToMythrasCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];

  const getVitalVal = (id: string, fallback: number) =>
    ir.vitals.find((v) => v.id === id)?.current ?? fallback;
  fields.push({
    id: "ap",
    label: "Action Points",
    type: "counter",
    value: getVitalVal("ap", 3),
    min: 0,
    max: 5,
  });
  fields.push({
    id: "lp",
    label: "Luck Points",
    type: "counter",
    value: getVitalVal("lp", 2),
    min: 0,
    max: 10,
  });
  fields.push({
    id: "mp",
    label: "Magic Points",
    type: "counter",
    value: getVitalVal("mp", 12),
    min: 0,
    max: 30,
  });
  fields.push({
    id: "hp",
    label: "Total Hit Points",
    type: "counter",
    value: getVitalVal("hp", 15),
    min: 0,
    max: 50,
  });

  const chars = ["str", "con", "siz", "dex", "int", "pow", "cha"];
  for (const c of chars) {
    const attr = ir.attributes[c];
    if (attr) {
      fields.push({
        id: c,
        label: attr.label,
        type: "number",
        value: Number(attr.value),
      });
    }
  }

  const sec = ir.defences.secondaryDefences || {};
  fields.push(...buildMythrasHitLocations(sec));

  if (sec.damage_mod)
    fields.push({
      id: "damage_mod",
      label: "Damage Modifier",
      type: "number",
      value: Number(sec.damage_mod) || 0,
    });
  if (sec.move)
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

function buildMythrasNpcHitLocations(
  sec: Record<string, string | number>,
): StatSheetField[] {
  const locations = [
    { key: "head", label: "Head", defaultHp: 5 },
    { key: "chest", label: "Chest", defaultHp: 7 },
    { key: "abdomen", label: "Abdomen", defaultHp: 6 },
    { key: "rarm", label: "Right Arm / Foreleg", defaultHp: 4 },
    { key: "larm", label: "Left Arm / Foreleg", defaultHp: 4 },
    { key: "rleg", label: "Right Leg / Hindleg", defaultHp: 5 },
    { key: "lleg", label: "Left Leg / Hindleg", defaultHp: 5 },
  ];

  const fields: StatSheetField[] = [];
  for (const loc of locations) {
    const apVal = Number(sec[`loc_${loc.key}_ap`] ?? 0);
    const hpVal = Number(sec[`loc_${loc.key}_hp`] ?? loc.defaultHp);
    fields.push({
      id: `loc_${loc.key}_ap`,
      label: `${loc.label} AP`,
      type: "number",
      value: apVal,
    });
    fields.push({
      id: `loc_${loc.key}_hp`,
      label: `${loc.label} HP`,
      type: "counter",
      value: hpVal,
      min: 0,
      max: 20,
    });
  }
  return fields;
}

function mapToMythrasNpc(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];

  const getVitalVal = (id: string, fallback: number) =>
    ir.vitals.find((v) => v.id === id)?.current ?? fallback;
  fields.push({
    id: "ap",
    label: "Action Points",
    type: "counter",
    value: getVitalVal("ap", 3),
    min: 0,
    max: 5,
  });
  fields.push({
    id: "mp",
    label: "Magic Points",
    type: "counter",
    value: getVitalVal("mp", 10),
    min: 0,
    max: 30,
  });
  fields.push({
    id: "hp",
    label: "Total Hit Points",
    type: "counter",
    value: getVitalVal("hp", 15),
    min: 0,
    max: 50,
  });

  const chars = ["str", "con", "siz", "dex", "int", "pow", "cha"];
  for (const c of chars) {
    const attr = ir.attributes[c];
    if (attr) {
      fields.push({
        id: c,
        label: attr.label,
        type: "number",
        value: Number(attr.value),
      });
    }
  }

  const sec = ir.defences.secondaryDefences || {};
  fields.push(...buildMythrasNpcHitLocations(sec));

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
    const textProse = ir.traitsAndFeatures
      .map((t) => `**${t.name}**: ${t.text}`)
      .join("\n\n");
    fields.push({
      id: "traits",
      label: "Creature Traits & Special Abilities",
      type: "longtext",
      value: textProse,
    });
  }

  return fields;
}

function mapToVampireCharacter(ir: StatBlockIR): StatSheetField[] {
  const fields: StatSheetField[] = [];

  const getVitalVal = (id: string, fallback: number) =>
    ir.vitals.find((v) => v.id === id)?.current ?? fallback;
  fields.push({
    id: "willpower",
    label: "Willpower",
    type: "counter",
    value: getVitalVal("willpower", 5),
    min: 0,
    max: 10,
  });
  fields.push({
    id: "blood",
    label: "Blood Pool / Hunger",
    type: "counter",
    value: getVitalVal("blood", 1),
    min: 0,
    max: 10,
  });
  fields.push({
    id: "humanity",
    label: "Humanity",
    type: "counter",
    value: getVitalVal("humanity", 7),
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
    if (attr) {
      fields.push({
        id: a,
        label: attr.label,
        type: "number",
        value: Number(attr.value),
      });
    }
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

function synthesizeTemplateFromIr(ir: StatBlockIR): StatSheetTemplate {
  const templateId = `synthesized-${ir.system}-${Date.now().toString(36)}`;
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

function mapToSynthesizedTemplate(
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
