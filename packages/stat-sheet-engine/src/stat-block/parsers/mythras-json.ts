import type { StatBlockIR } from "../types";

export function parseMythrasJson(input: Record<string, unknown>): StatBlockIR {
  const name = String(input.name || "Unnamed Mythras Being").trim();
  const category = (
    input.category === "npc" || input.category === "creature"
      ? "npc"
      : "character"
  ) as "character" | "npc" | "creature";

  const attributes = extractMythrasCharacteristics(input);
  const vitals = extractMythrasVitals(input, category, attributes);
  const secondaryDefences = extractMythrasHitLocations(input);
  const actionsAndAttacks = extractMythrasAttacks(input);
  const traitsAndFeatures = extractMythrasTraits(input);

  return {
    system: "mythras",
    identity: { name, category },
    vitals,
    attributes,
    defences: { secondaryDefences },
    actionsAndAttacks,
    traitsAndFeatures,
    rawSource: JSON.stringify(input),
  };
}

function extractMythrasCharacteristics(
  input: Record<string, unknown>,
): StatBlockIR["attributes"] {
  const getChar = (key: string): number => {
    return Number(
      input[key] ?? input[key.toLowerCase()] ?? input[key.toUpperCase()] ?? 10,
    );
  };

  const chars: Array<[string, string]> = [
    ["str", "STR"],
    ["con", "CON"],
    ["siz", "SIZ"],
    ["dex", "DEX"],
    ["int", "INT"],
    ["pow", "POW"],
    ["cha", "CHA"],
  ];

  const attributes: StatBlockIR["attributes"] = {};
  for (const [key, label] of chars) {
    attributes[key] = { label, value: getChar(key) };
  }
  return attributes;
}

function extractMythrasVitals(
  input: Record<string, unknown>,
  category: "character" | "npc" | "creature",
  attributes: StatBlockIR["attributes"],
): StatBlockIR["vitals"] {
  const defaults = mythrasVitalDefaults(attributes);
  const ap = readNumber(input, ["ap", "action_points"], defaults.ap);
  const hp = readNumber(input, ["hp", "hit_points"], defaults.hp);
  const mp = readNumber(input, ["mp", "magic_points"], defaults.mp);
  const lp = readNumber(input, ["lp", "luck_points"], defaults.lp);

  const vitals: StatBlockIR["vitals"] = [
    { id: "ap", label: "Action Points", current: ap, max: 5, min: 0 },
    { id: "hp", label: "Total Hit Points", current: hp, max: hp, min: 0 },
    { id: "mp", label: "Magic Points", current: mp, max: mp, min: 0 },
  ];

  if (category === "character") {
    vitals.push({
      id: "lp",
      label: "Luck Points",
      current: lp,
      max: 10,
      min: 0,
    });
  }

  return vitals;
}

function mythrasVitalDefaults(attributes: StatBlockIR["attributes"]) {
  const int = Number(attributes.int.value);
  const dex = Number(attributes.dex.value);
  const con = Number(attributes.con.value);
  const siz = Number(attributes.siz.value);
  const pow = Number(attributes.pow.value);
  return {
    ap: Math.max(1, Math.min(5, Math.ceil((int + dex) / 12))),
    hp: Math.ceil((con + siz) / 5) * 5,
    mp: pow,
    lp: Math.max(1, Math.ceil(pow / 6)),
  };
}

function readNumber(
  input: Record<string, unknown>,
  keys: string[],
  fallback: number,
): number {
  const key = keys.find((candidate) => input[candidate] !== undefined);
  return Number(key ? input[key] : fallback);
}

const MYTHRAS_LOC_MAP: Record<string, string> = {
  head: "loc_head",
  chest: "loc_chest",
  torso: "loc_chest",
  abdomen: "loc_abdomen",
  "right arm": "loc_rarm",
  "r. arm": "loc_rarm",
  rarm: "loc_rarm",
  "left arm": "loc_larm",
  "l. arm": "loc_larm",
  larm: "loc_larm",
  "right leg": "loc_rleg",
  "r. leg": "loc_rleg",
  rleg: "loc_rleg",
  "left leg": "loc_lleg",
  "l. leg": "loc_lleg",
  lleg: "loc_lleg",
};

function matchLocationPrefix(name: string): string | null {
  for (const [key, prefix] of Object.entries(MYTHRAS_LOC_MAP)) {
    if (name.includes(key)) return prefix;
  }
  return null;
}

function extractMythrasHitLocations(
  input: Record<string, unknown>,
): Record<string, string | number> {
  const secondaryDefences = extractLocationDefences(input.hit_locations);
  const damageMod = input.damage_mod ?? input.damage_modifier;
  if (damageMod !== undefined) secondaryDefences.damage_mod = String(damageMod);
  const initiative = input.initiative ?? input.initiative_bonus;
  if (initiative !== undefined)
    secondaryDefences.initiative = Number(initiative);
  const move = input.move ?? input.movement;
  if (move !== undefined) secondaryDefences.move = Number(move);

  return secondaryDefences;
}

function extractLocationDefences(
  rawLocations: unknown,
): Record<string, string | number> {
  const defences: Record<string, string | number> = {};
  if (!Array.isArray(rawLocations)) return defences;
  for (const raw of rawLocations) {
    if (typeof raw !== "object" || raw === null) continue;
    const location = raw as Record<string, unknown>;
    const name = String(location.location || location.name || "").toLowerCase();
    const prefix = matchLocationPrefix(name);
    if (prefix) addLocationValues(defences, prefix, location);
  }
  return defences;
}

function addLocationValues(
  defences: Record<string, string | number>,
  prefix: string,
  location: Record<string, unknown>,
): void {
  if (location.ap !== undefined) defences[`${prefix}_ap`] = Number(location.ap);
  if (location.hp !== undefined) defences[`${prefix}_hp`] = Number(location.hp);
}

function extractMythrasAttacks(
  input: Record<string, unknown>,
): StatBlockIR["actionsAndAttacks"] {
  const rawAttacks = input.attacks || input.combat_styles || input.weapons;
  if (!Array.isArray(rawAttacks)) return [];
  return rawAttacks.flatMap(parseMythrasAttack);
}

function parseMythrasAttack(value: unknown): StatBlockIR["actionsAndAttacks"] {
  if (typeof value === "string")
    return [{ name: value, actionType: "action", attackDice: "1d100" }];
  if (typeof value !== "object" || value === null) return [];
  const attack = value as Record<string, unknown>;
  return [
    {
      name: String(attack.name || "Attack"),
      actionType: "action",
      attackDice: "1d100",
      damageDice: attack.damage ? String(attack.damage) : undefined,
      description: attack.description ? String(attack.description) : undefined,
    },
  ];
}

function extractMythrasTraits(
  input: Record<string, unknown>,
): StatBlockIR["traitsAndFeatures"] {
  const rawTraits = input.traits || input.abilities || input.passions;
  if (!Array.isArray(rawTraits)) return [];
  return rawTraits.flatMap((value) => {
    if (typeof value !== "object" || value === null) return [];
    const trait = value as Record<string, unknown>;
    return [
      {
        name: String(trait.name || "Trait"),
        text: String(trait.text || trait.description || ""),
        category: "trait" as const,
      },
    ];
  });
}
