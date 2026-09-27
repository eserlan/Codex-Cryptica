import type { StatBlockIR } from "../types";

export function parseDnd5eJson(input: Record<string, unknown>): StatBlockIR {
  const name = String(input.name || "Unnamed Creature").trim();
  const category = (input.category === "character" ? "character" : "npc") as
    "character" | "npc" | "creature";

  const size = input.size ? String(input.size) : undefined;
  const ancestryOrType = input.type ? String(input.type) : undefined;
  const alignment = input.alignment ? String(input.alignment) : undefined;
  const levelOrCr = input.cr !== undefined ? String(input.cr) : undefined;

  const { hp, hitDiceStr } = extractDndHp(input);
  const { acVal, acDetails } = extractDndAc(input);
  const speedStr = extractDndSpeed(input);
  const attributes = extractDndAttributes(input);
  const actionsAndAttacks = extractDndActions(input);
  const traitsAndFeatures = extractDndTraits(input);
  const secondaryDefences = extractDndSecondary(input);

  return {
    system: "dnd5e",
    identity: { name, category, size, ancestryOrType, alignment, levelOrCr },
    vitals: [
      {
        id: "hp",
        label: "Hit Points",
        current: hp,
        max: hp,
        min: 0,
        sublabel: hitDiceStr,
      },
    ],
    attributes,
    defences: {
      armorRating: acVal,
      armorDetails: acDetails,
      speed: speedStr,
      secondaryDefences,
    },
    actionsAndAttacks,
    traitsAndFeatures,
    rawSource: JSON.stringify(input),
  };
}

function extractDndHp(input: Record<string, unknown>): {
  hp: number;
  hitDiceStr?: string;
} {
  let hp = 10;
  let hitDiceStr: string | undefined;

  if (typeof input.hp === "number") {
    hp = input.hp;
  } else if (typeof input.hp === "object" && input.hp !== null) {
    const hpObj = input.hp as Record<string, unknown>;
    hp = Number(hpObj.average || hpObj.max || hpObj.value || 10);
    if (hpObj.formula) hitDiceStr = String(hpObj.formula);
  } else if (input.hit_points !== undefined) {
    hp = Number(input.hit_points);
  }

  if (!hitDiceStr && input.hit_dice) {
    hitDiceStr = String(input.hit_dice);
  }

  return { hp, hitDiceStr };
}

function extractDndAc(input: Record<string, unknown>): {
  acVal: number;
  acDetails?: string;
} {
  let acVal = 10;
  let acDetails: string | undefined;

  if (typeof input.ac === "number") {
    acVal = input.ac;
  } else if (typeof input.ac === "object" && input.ac !== null) {
    const acObj = input.ac as Record<string, unknown>;
    acVal = Number(acObj.value || 10);
    if (acObj.details) acDetails = String(acObj.details);
  } else if (input.armor_class !== undefined) {
    acVal = Number(input.armor_class);
  }

  return { acVal, acDetails };
}

function extractDndSpeed(input: Record<string, unknown>): string | undefined {
  if (typeof input.speed === "string") return input.speed;
  if (typeof input.speed === "object" && input.speed !== null) {
    const sObj = input.speed as Record<string, unknown>;
    return Object.entries(sObj)
      .map(([mode, dist]) =>
        mode === "walk" ? `${dist} ft.` : `${mode} ${dist} ft.`,
      )
      .join(", ");
  }
  return undefined;
}

function extractDndAttributes(
  input: Record<string, unknown>,
): StatBlockIR["attributes"] {
  const getScore = (key: string, alt: string): number =>
    Number(input[key] ?? input[alt] ?? 10);
  const getMod = (score: number): number => Math.floor((score - 10) / 2);

  const scores: Array<[string, string, string]> = [
    ["str", "STR", "strength"],
    ["dex", "DEX", "dexterity"],
    ["con", "CON", "constitution"],
    ["int", "INT", "intelligence"],
    ["wis", "WIS", "wisdom"],
    ["cha", "CHA", "charisma"],
  ];

  const attributes: StatBlockIR["attributes"] = {};
  for (const [key, label, alt] of scores) {
    const val = getScore(key, alt);
    attributes[key] = { label, value: val, modifier: getMod(val) };
  }
  return attributes;
}

function parseActionEntry(
  item: any,
  type: "action" | "bonus" | "reaction" | "legendary",
) {
  const aName = String(item.name || "Action");
  const desc = String(item.desc || item.description || "");

  let attackDice: string | undefined;
  if (item.attack_bonus !== undefined) {
    const bonus = Number(item.attack_bonus);
    attackDice = bonus >= 0 ? `1d20+${bonus}` : `1d20${bonus}`;
  } else {
    const atkMatch = desc.match(/([+-]\d+)\s+to\s+hit/i);
    if (atkMatch) {
      const bonus = Number(atkMatch[1]);
      attackDice = bonus >= 0 ? `1d20+${bonus}` : `1d20${bonus}`;
    }
  }

  let damageDice = item.damage_dice ? String(item.damage_dice) : undefined;
  if (!damageDice) {
    const dmgMatch = desc.match(/\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)/i);
    if (dmgMatch) damageDice = dmgMatch[1].replace(/\s+/g, "");
  }

  let reachOrRange: string | undefined;
  const rangeMatch = desc.match(
    /(reach\s+\d+\s*ft\.|range\s+\d+\/\d+\s*ft\.)/i,
  );
  if (rangeMatch) reachOrRange = rangeMatch[1];

  return {
    name: aName,
    actionType: type,
    attackDice,
    damageDice,
    reachOrRange,
    description: desc,
  };
}

function extractDndActions(
  input: Record<string, unknown>,
): StatBlockIR["actionsAndAttacks"] {
  const parseList = (
    raw: unknown,
    type: "action" | "bonus" | "reaction" | "legendary",
  ) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => parseActionEntry(item, type));
  };

  return [
    ...parseList(input.actions, "action"),
    ...parseList(input.bonus_actions, "bonus"),
    ...parseList(input.reactions, "reaction"),
    ...parseList(input.legendary_actions, "legendary"),
  ];
}

function extractDndTraits(
  input: Record<string, unknown>,
): StatBlockIR["traitsAndFeatures"] {
  const traits: StatBlockIR["traitsAndFeatures"] = [];
  const rawTraits = input.traits || input.special_abilities;
  if (Array.isArray(rawTraits)) {
    for (const t of rawTraits) {
      if (typeof t === "object" && t !== null) {
        traits.push({
          name: String(t.name || "Special Trait"),
          text: String(t.desc || t.description || ""),
          category: "trait",
        });
      }
    }
  }
  return traits;
}

function extractDndSecondary(
  input: Record<string, unknown>,
): Record<string, string | number> {
  const secondary: Record<string, string | number> = {};
  if (input.save_throws && typeof input.save_throws === "object") {
    Object.assign(secondary, input.save_throws);
  }
  return secondary;
}
