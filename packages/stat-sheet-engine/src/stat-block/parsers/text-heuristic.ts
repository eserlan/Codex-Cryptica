import type { StatBlockIR, StatBlockSystem } from "../types";
import { detectStatBlockSystem } from "../detect";

export function parseTextStatBlock(
  text: string,
  systemHint?: StatBlockSystem,
): StatBlockIR {
  const system = systemHint || detectStatBlockSystem(text);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const name = lines[0] || "Unknown Character";

  if (system === "pf2e") {
    return parsePf2eText(name, lines, text);
  }

  if (system === "mythras") {
    return parseMythrasText(name, lines, text);
  }

  if (system === "vtm") {
    return parseVtmText(name, lines, text);
  }

  return parseGenericOrDndText(name, lines, text, system);
}

function parsePf2eText(
  name: string,
  _lines: string[],
  text: string,
): StatBlockIR {
  let acVal = 10;
  const acMatch =
    text.match(/\bAC\s+(\d+)/i) || text.match(/Armor\s+Class\s+(\d+)/i);
  if (acMatch) acVal = Number(acMatch[1]);

  let hpVal = 10;
  const hpMatch =
    text.match(/\bHP\s+(\d+)/i) || text.match(/Hit\s+Points\s+(\d+)/i);
  if (hpMatch) hpVal = Number(hpMatch[1]);

  let speedStr: string | undefined;
  const speedMatch = text.match(/(?:Speed|Stride)\s+([0-9]+\s*feet|[^\n;]+)/i);
  if (speedMatch) speedStr = speedMatch[1].trim();

  let perceptionVal = 0;
  const percMatch = text.match(/Perception\s*\+(\d+)/i);
  if (percMatch) perceptionVal = Number(percMatch[1]);

  const secondaryDefences = extractPf2eTextSaves(text);
  const attributes = extractPf2eTextAttributes(text);
  const actionsAndAttacks = extractPf2eTextStrikes(text);

  return {
    system: "pf2e",
    identity: { name, category: "npc" },
    vitals: [
      { id: "hp", label: "Hit Points", current: hpVal, max: hpVal, min: 0 },
    ],
    attributes,
    defences: { armorRating: acVal, speed: speedStr, secondaryDefences },
    actionsAndAttacks,
    skillsAndProficiencies: [
      {
        name: "Perception",
        value: perceptionVal,
        formula: `1d20+${perceptionVal}`,
      },
    ],
    traitsAndFeatures: [],
    rawSource: text,
  };
}

function extractPf2eTextSaves(text: string): Record<string, string | number> {
  const secondaryDefences: Record<string, string | number> = {};
  const fortMatch =
    text.match(/Fortitude\s*\+(\d+)/i) || text.match(/Fort\s*\+(\d+)/i);
  if (fortMatch) secondaryDefences.fortitude = Number(fortMatch[1]);

  const refMatch =
    text.match(/Reflex\s*\+(\d+)/i) || text.match(/Ref\s*\+(\d+)/i);
  if (refMatch) secondaryDefences.reflex = Number(refMatch[1]);

  const willMatch = text.match(/Will\s*\+(\d+)/i);
  if (willMatch) secondaryDefences.will = Number(willMatch[1]);

  return secondaryDefences;
}

function extractPf2eTextAttributes(text: string): StatBlockIR["attributes"] {
  const attributes: StatBlockIR["attributes"] = {};
  const pfAttrs = [
    { key: "str", label: "STR" },
    { key: "dex", label: "DEX" },
    { key: "con", label: "CON" },
    { key: "int", label: "INT" },
    { key: "wis", label: "WIS" },
    { key: "cha", label: "CHA" },
  ];

  for (const { key, label } of pfAttrs) {
    const match = text.match(
      new RegExp(`\\b${label}\\s*([+-]?\\d+)(?:\\s*\\(([+-]?\\d+)\\))?`, "i"),
    );
    if (match) {
      const rawNum = Number(match[1]);
      if (rawNum <= 9 && rawNum >= -5) {
        attributes[key] = { label, value: 10 + rawNum * 2, modifier: rawNum };
      } else {
        const mod = match[2] ? Number(match[2]) : Math.floor((rawNum - 10) / 2);
        attributes[key] = { label, value: rawNum, modifier: mod };
      }
    } else {
      attributes[key] = { label, value: 10, modifier: 0 };
    }
  }
  return attributes;
}

function extractPf2eTextStrikes(
  text: string,
): StatBlockIR["actionsAndAttacks"] {
  const actionsAndAttacks: StatBlockIR["actionsAndAttacks"] = [];
  const strikeRegex =
    /(?:Melee|Ranged|Strike)\s*(?:\[[^\]]+\])?\s*([A-Za-z0-9\s'-]+)?\s*\+(\d+)(?:\s*\([^)]+\))?(?:,\s*Damage\s*([^\n;]+))?/gi;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = strikeRegex.exec(text)) !== null) {
    const atkName = (sMatch[1] || "Strike").trim();
    const atkBonus = Number(sMatch[2]);
    const dmg = sMatch[3]?.trim();
    actionsAndAttacks.push({
      name: atkName,
      actionType: "action",
      attackDice: `1d20+${atkBonus}`,
      damageDice: dmg,
      description: sMatch[0].trim(),
    });
  }
  return actionsAndAttacks;
}

function parseMythrasText(
  name: string,
  _lines: string[],
  text: string,
): StatBlockIR {
  const getChar = (label: string): number => {
    const m = text.match(new RegExp(`\\b${label}\\s*[:]?\\s*(\\d+)`, "i"));
    return m ? Number(m[1]) : 10;
  };

  const str = getChar("STR");
  const con = getChar("CON");
  const siz = getChar("SIZ");
  const dex = getChar("DEX");
  const int = getChar("INT");
  const pow = getChar("POW");
  const cha = getChar("CHA");

  const ap = textNumber(
    text,
    [/Action\s+Points\s*[:]?\s*(\d+)/i],
    Math.max(1, Math.min(5, Math.ceil((int + dex) / 12))),
  );
  const hp = textNumber(
    text,
    [/Hit\s+Points\s*[:]?\s*(\d+)/i, /\bHP\s*[:]?\s*(\d+)/i],
    Math.ceil((con + siz) / 5) * 5,
  );
  const mp = textNumber(
    text,
    [/Magic\s+Points\s*[:]?\s*(\d+)/i, /\bMP\s*[:]?\s*(\d+)/i],
    pow,
  );
  const lpValue = textNumberOptional(text, [
    /Luck\s+Points\s*[:]?\s*(\d+)/i,
    /\bLP\s*[:]?\s*(\d+)/i,
  ]);
  const lp = lpValue ?? 2;

  const secondaryDefences = extractMythrasTextSecondary(text);

  return {
    system: "mythras",
    identity: { name, category: lpValue !== undefined ? "character" : "npc" },
    vitals: [
      { id: "ap", label: "Action Points", current: ap, max: 5, min: 0 },
      { id: "hp", label: "Total Hit Points", current: hp, max: hp, min: 0 },
      { id: "mp", label: "Magic Points", current: mp, max: mp, min: 0 },
      ...(lpValue !== undefined
        ? [{ id: "lp", label: "Luck Points", current: lp, max: 10, min: 0 }]
        : []),
    ],
    attributes: {
      str: { label: "STR", value: str },
      con: { label: "CON", value: con },
      siz: { label: "SIZ", value: siz },
      dex: { label: "DEX", value: dex },
      int: { label: "INT", value: int },
      pow: { label: "POW", value: pow },
      cha: { label: "CHA", value: cha },
    },
    defences: { secondaryDefences },
    actionsAndAttacks: [],
    traitsAndFeatures: [],
    rawSource: text,
  };
}

function textNumberOptional(
  text: string,
  patterns: RegExp[],
): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function textNumber(
  text: string,
  patterns: RegExp[],
  fallback: number,
): number {
  return textNumberOptional(text, patterns) ?? fallback;
}

function extractMythrasTextSecondary(
  text: string,
): Record<string, string | number> {
  const secondaryDefences: Record<string, string | number> = {};
  const locRegex =
    /(Head|Chest|Abdomen|Right Arm|Left Arm|Right Leg|Left Leg)[^0-9]*(\d+)\s*AP\s*[/]?\s*(\d+)\s*HP/gi;
  let locMatch: RegExpExecArray | null;

  const prefixMap: Record<string, string> = {
    head: "loc_head",
    chest: "loc_chest",
    abdomen: "loc_abdomen",
    "right arm": "loc_rarm",
    "left arm": "loc_larm",
    "right leg": "loc_rleg",
    "left leg": "loc_lleg",
  };

  while ((locMatch = locRegex.exec(text)) !== null) {
    const locName = locMatch[1].toLowerCase();
    const prefix = prefixMap[locName];
    if (prefix) {
      secondaryDefences[`${prefix}_ap`] = Number(locMatch[2]);
      secondaryDefences[`${prefix}_hp`] = Number(locMatch[3]);
    }
  }

  const dmMatch = text.match(
    /Damage\s+Mod(?:ifier)?\s*[:]?\s*([+-]?[0-9a-zA-Z]+)/i,
  );
  if (dmMatch) secondaryDefences.damage_mod = dmMatch[1];

  const moveMatch = text.match(/Movement\s*[:]?\s*(\d+)/i);
  if (moveMatch) secondaryDefences.move = Number(moveMatch[1]);

  return secondaryDefences;
}

function parseVtmText(
  name: string,
  _lines: string[],
  text: string,
): StatBlockIR {
  const getNum = (label: string, fallback: number): number => {
    const m = text.match(new RegExp(`\\b${label}\\s*[:]?\\s*(\\d+)`, "i"));
    return m ? Number(m[1]) : fallback;
  };

  const willpower = getNum("Willpower", 5);
  const humanity = getNum("Humanity", 7);
  const hunger = getNum("Hunger", 1);
  const bloodPotency = text.match(/Blood\s+Potency\s*[:]?\s*(\d+)/i);

  const getAttr = (label: string): { label: string; value: number } => ({
    label,
    value: getNum(label, 2),
  });

  const attributes: StatBlockIR["attributes"] = {
    strength: getAttr("Strength"),
    dexterity: getAttr("Dexterity"),
    stamina: getAttr("Stamina"),
    charisma: getAttr("Charisma"),
    manipulation: getAttr("Manipulation"),
    composure: getAttr("Composure"),
    intelligence: getAttr("Intelligence"),
    wits: getAttr("Wits"),
    resolve: getAttr("Resolve"),
  };

  const traitsAndFeatures: StatBlockIR["traitsAndFeatures"] = [];
  const discMatch = text.match(/Disciplines\s*[:]?\s*([^\n]+)/i);
  if (discMatch) {
    const discList = discMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const d of discList) {
      traitsAndFeatures.push({ name: d, text: "", category: "discipline" });
    }
  }

  const clanMatch = text.match(/Clan\s*[:]?\s*([A-Za-z]+)/i);

  return {
    system: "vtm",
    identity: {
      name,
      category: "character",
      ancestryOrType: clanMatch ? clanMatch[1] : undefined,
      levelOrCr: bloodPotency ? `Blood Potency ${bloodPotency[1]}` : undefined,
    },
    vitals: [
      {
        id: "willpower",
        label: "Willpower",
        current: willpower,
        max: 10,
        min: 0,
      },
      {
        id: "blood",
        label: "Blood Pool / Hunger",
        current: hunger,
        max: 10,
        min: 0,
      },
      { id: "humanity", label: "Humanity", current: humanity, max: 10, min: 0 },
    ],
    attributes,
    defences: {
      secondaryDefences: bloodPotency
        ? { blood_potency: Number(bloodPotency[1]) }
        : {},
    },
    actionsAndAttacks: [],
    traitsAndFeatures,
    rawSource: text,
  };
}

function parseGenericOrDndText(
  name: string,
  lines: string[],
  text: string,
  system: StatBlockSystem,
): StatBlockIR {
  const { size, ancestryOrType, alignment } = extractTextSubheader(lines);
  const {
    acVal,
    acDetails,
    currentHp,
    maxHp,
    hitDiceStr,
    speedStr,
    levelOrCr,
  } = extractTextDefencesAndVitals(text);
  const attributes = extractTextAttributes(text, system);
  const actionsAndAttacks = extractTextActions(lines);

  let sensesStr: string | undefined;
  const sensesMatch = text.match(/Senses\s+([^\n]+)/i);
  if (sensesMatch) sensesStr = sensesMatch[1].trim();

  let langStr: string | undefined;
  const langMatch = text.match(/Languages\s+([^\n]+)/i);
  if (langMatch) langStr = langMatch[1].trim();

  return {
    system,
    identity: {
      name,
      category: "npc",
      size,
      ancestryOrType,
      alignment,
      levelOrCr,
    },
    vitals: [
      {
        id: "hp",
        label: "Hit Points",
        current: currentHp,
        max: maxHp,
        min: 0,
        sublabel: hitDiceStr,
      },
    ],
    attributes,
    defences: {
      armorRating: acVal,
      armorDetails: acDetails,
      speed: speedStr,
      senses: sensesStr,
      languages: langStr,
    },
    actionsAndAttacks,
    traitsAndFeatures: [],
    rawSource: text,
  };
}

function extractTextSubheader(lines: string[]) {
  let size: string | undefined;
  let ancestryOrType: string | undefined;
  let alignment: string | undefined;

  if (lines.length > 1) {
    const secondLine = lines[1];
    const sizeMatch = secondLine.match(
      /^(Tiny|Small|Medium|Large|Huge|Gargantuan)\b/i,
    );
    if (sizeMatch) {
      size = sizeMatch[1];
      const remainder = secondLine.slice(sizeMatch[0].length).trim();
      const parts = remainder.split(",").map((p) => p.trim());
      ancestryOrType = parts[0] || undefined;
      alignment = parts[1] || undefined;
    }
  }

  return { size, ancestryOrType, alignment };
}

function extractTextDefencesAndVitals(text: string) {
  let acVal: number | string = 10;
  let acDetails: string | undefined;
  const acMatch = text.match(/Armor\s+Class\s+(\d+)(?:\s*\(([^)]+)\))?/i);
  if (acMatch) {
    acVal = Number(acMatch[1]);
    if (acMatch[2]) acDetails = acMatch[2].trim();
  }

  let currentHp = 10;
  let maxHp = 10;
  let hitDiceStr: string | undefined;
  const hpMatch = text.match(/Hit\s+Points\s+(\d+)(?:\s*\(([^)]+)\))?/i);
  if (hpMatch) {
    currentHp = Number(hpMatch[1]);
    maxHp = currentHp;
    if (hpMatch[2]) hitDiceStr = hpMatch[2].trim();
  }

  let speedStr: string | undefined;
  const speedMatch = text.match(/Speed\s+([^\n]+)/i);
  if (speedMatch) speedStr = speedMatch[1].trim();

  let levelOrCr: string | undefined;
  const crMatch = text.match(/Challenge\s+([0-9/]+)/i);
  if (crMatch) levelOrCr = crMatch[1];

  return {
    acVal,
    acDetails,
    currentHp,
    maxHp,
    hitDiceStr,
    speedStr,
    levelOrCr,
  };
}

function extractTextAttributes(
  text: string,
  system: StatBlockSystem,
): StatBlockIR["attributes"] {
  const isGurps =
    system === "gurps" ||
    /\b(ST\s*[:[]?\s*\d+|DX\s*[:[]?\s*\d+|Basic Speed)\b/i.test(text);
  return isGurps
    ? extractGurpsAttributes(text)
    : extractStandardAttributes(text);
}

function extractGurpsAttributes(text: string): StatBlockIR["attributes"] {
  const attributes: StatBlockIR["attributes"] = {};
  const fields = [
    { key: "st", label: "ST" },
    { key: "dx", label: "DX" },
    { key: "iq", label: "IQ" },
    { key: "ht", label: "HT" },
  ];
  for (const { key, label } of fields) {
    const match = text.match(new RegExp(`\\b${label}\\s*[:[]?\\s*(\\d+)`, "i"));
    if (match)
      attributes[key] = { label, value: Number(match[1]), modifier: 0 };
  }
  return attributes;
}

function extractStandardAttributes(text: string): StatBlockIR["attributes"] {
  const attributes: StatBlockIR["attributes"] = {};
  const fields = [
    { key: "str", label: "STR" },
    { key: "dex", label: "DEX" },
    { key: "con", label: "CON" },
    { key: "int", label: "INT" },
    { key: "wis", label: "WIS" },
    { key: "cha", label: "CHA" },
  ];
  for (const { key, label } of fields) {
    const match = text.match(
      new RegExp(
        `\\b${label}\\s*[:]?\\s*(\\d+)(?:\\s*\\(([+-]?\\d+)\\))?`,
        "i",
      ),
    );
    const value = match ? Number(match[1]) : 10;
    const modifier = match?.[2]
      ? Number(match[2])
      : Math.floor((value - 10) / 2);
    attributes[key] = { label, value, modifier };
  }
  return attributes;
}

function extractTextActions(lines: string[]): StatBlockIR["actionsAndAttacks"] {
  const actionsAndAttacks: StatBlockIR["actionsAndAttacks"] = [];
  const actionHeaderIdx = lines.findIndex((l) => /^actions\b/i.test(l));
  if (actionHeaderIdx === -1) return actionsAndAttacks;

  const actionLines = lines.slice(actionHeaderIdx + 1);
  let currentAction: { name: string; desc: string } | null = null;

  for (const l of actionLines) {
    if (/^(reactions|bonus actions|legendary actions)\b/i.test(l)) break;

    const itemMatch = l.match(/^([A-Z][A-Za-z0-9\s'-]+)\.\s*(.*)/);
    if (itemMatch) {
      if (currentAction) {
        actionsAndAttacks.push(
          buildActionEntry(currentAction.name, currentAction.desc),
        );
      }
      currentAction = { name: itemMatch[1].trim(), desc: itemMatch[2].trim() };
    } else if (currentAction) {
      currentAction.desc += " " + l;
    }
  }

  if (currentAction) {
    actionsAndAttacks.push(
      buildActionEntry(currentAction.name, currentAction.desc),
    );
  }

  return actionsAndAttacks;
}

function buildActionEntry(name: string, desc: string) {
  let attackDice: string | undefined;
  let damageDice: string | undefined;
  let reachOrRange: string | undefined;

  const atkMatch = desc.match(/([+-]\d+)\s+to\s+hit/i);
  if (atkMatch) {
    const bonus = Number(atkMatch[1]);
    attackDice = bonus >= 0 ? `1d20+${bonus}` : `1d20${bonus}`;
  }

  const dmgMatch = desc.match(/\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)/i);
  if (dmgMatch) damageDice = dmgMatch[1].replace(/\s+/g, "");

  const rangeMatch = desc.match(
    /(reach\s+\d+\s*ft\.|range\s+\d+\/\d+\s*ft\.)/i,
  );
  if (rangeMatch) reachOrRange = rangeMatch[1];

  return {
    name,
    actionType: "action" as const,
    attackDice,
    damageDice,
    reachOrRange,
    description: desc,
  };
}
