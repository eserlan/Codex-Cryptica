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

// fallow-ignore-next-line complexity
function extractMythrasVitals(
  input: Record<string, unknown>,
  category: "character" | "npc" | "creature",
  attributes: StatBlockIR["attributes"],
): StatBlockIR["vitals"] {
  const intVal = Number(attributes.int.value);
  const dexVal = Number(attributes.dex.value);
  const conVal = Number(attributes.con.value);
  const sizVal = Number(attributes.siz.value);
  const powVal = Number(attributes.pow.value);

  const defaultAp = Math.max(1, Math.min(5, Math.ceil((intVal + dexVal) / 12)));
  const defaultHp = Math.ceil((conVal + sizVal) / 5) * 5;
  const defaultMp = powVal;

  const ap = Number(input.ap ?? input.action_points ?? defaultAp);
  const hp = Number(input.hp ?? input.hit_points ?? defaultHp);
  const mp = Number(input.mp ?? input.magic_points ?? defaultMp);
  const lp = Number(
    input.lp ?? input.luck_points ?? Math.max(1, Math.ceil(powVal / 6)),
  );

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

// fallow-ignore-next-line complexity
function extractMythrasHitLocations(
  input: Record<string, unknown>,
): Record<string, string | number> {
  const secondaryDefences: Record<string, string | number> = {};

  if (Array.isArray(input.hit_locations)) {
    for (const loc of input.hit_locations) {
      if (typeof loc !== "object" || loc === null) continue;
      const locName = String(loc.location || loc.name || "").toLowerCase();
      const prefix = matchLocationPrefix(locName);

      if (prefix) {
        if (loc.ap !== undefined)
          secondaryDefences[`${prefix}_ap`] = Number(loc.ap);
        if (loc.hp !== undefined)
          secondaryDefences[`${prefix}_hp`] = Number(loc.hp);
      }
    }
  }

  const damageMod = input.damage_mod ?? input.damage_modifier;
  if (damageMod !== undefined) secondaryDefences.damage_mod = String(damageMod);
  const initiative = input.initiative ?? input.initiative_bonus;
  if (initiative !== undefined)
    secondaryDefences.initiative = Number(initiative);
  const move = input.move ?? input.movement;
  if (move !== undefined) secondaryDefences.move = Number(move);

  return secondaryDefences;
}

// fallow-ignore-next-line complexity
function extractMythrasAttacks(
  input: Record<string, unknown>,
): StatBlockIR["actionsAndAttacks"] {
  const actions: StatBlockIR["actionsAndAttacks"] = [];
  const rawAttacks = input.attacks || input.combat_styles || input.weapons;
  if (!Array.isArray(rawAttacks)) return actions;

  for (const atk of rawAttacks) {
    if (typeof atk === "object" && atk !== null) {
      actions.push({
        name: String(atk.name || "Attack"),
        actionType: "action",
        attackDice: "1d100",
        damageDice: atk.damage ? String(atk.damage) : undefined,
        description: atk.description ? String(atk.description) : undefined,
      });
    } else if (typeof atk === "string") {
      actions.push({
        name: atk,
        actionType: "action",
        attackDice: "1d100",
      });
    }
  }
  return actions;
}

// fallow-ignore-next-line complexity
function extractMythrasTraits(
  input: Record<string, unknown>,
): StatBlockIR["traitsAndFeatures"] {
  const traits: StatBlockIR["traitsAndFeatures"] = [];
  const rawTraits = input.traits || input.abilities || input.passions;
  if (!Array.isArray(rawTraits)) return traits;

  for (const t of rawTraits) {
    if (typeof t === "object" && t !== null) {
      traits.push({
        name: String(t.name || "Trait"),
        text: String(t.text || t.description || ""),
        category: "trait",
      });
    }
  }
  return traits;
}
