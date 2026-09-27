import type { StatBlockIR } from "../types";

export function parsePf2eJson(input: Record<string, unknown>): StatBlockIR {
  const isPathbuilder =
    "build" in input && typeof input.build === "object" && input.build !== null;
  const pb = isPathbuilder ? (input.build as Record<string, unknown>) : null;

  const isFoundry =
    "system" in input &&
    typeof input.system === "object" &&
    input.system !== null;
  const fvtt = isFoundry ? (input.system as Record<string, unknown>) : null;

  const identity = extractPf2eIdentity(input, pb, fvtt);
  const { hp, ac } = extractPf2eHpAc(input, pb, fvtt);
  const attributes = extractPf2eAttributes(input, pb, fvtt);
  const secondaryDefences = extractPf2eSaves(input, pb, fvtt, attributes);
  const skillsAndProficiencies = extractPf2ePerception(
    input,
    pb,
    fvtt,
    attributes.wis.modifier ?? 0,
  );
  const actionsAndAttacks = extractPf2eActions(input, pb, fvtt);

  return {
    system: "pf2e",
    identity,
    vitals: [{ id: "hp", label: "Hit Points", current: hp, max: hp, min: 0 }],
    attributes,
    defences: { armorRating: ac, secondaryDefences },
    actionsAndAttacks,
    skillsAndProficiencies,
    traitsAndFeatures: [],
    rawSource: JSON.stringify(input),
  };
}

function extractPf2eIdentity(
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
): StatBlockIR["identity"] {
  let name = "Unnamed Pathfinder Hero";
  let ancestryOrType: string | undefined;
  let classOrRole: string | undefined;
  let levelOrCr: string | undefined;

  if (pb) {
    const char = (pb.character as Record<string, unknown>) || pb;
    if (char.name) name = String(char.name);
    if (char.ancestry) ancestryOrType = String(char.ancestry);
    if (char.class) classOrRole = String(char.class);
    if (char.level !== undefined) levelOrCr = String(char.level);
  } else if (fvtt) {
    if (input.name) name = String(input.name);
    const details = fvtt.details as Record<string, unknown> | undefined;
    if (details) {
      if (details.ancestry && typeof details.ancestry === "object") {
        ancestryOrType = String((details.ancestry as any).name || "");
      }
      if (details.class && typeof details.class === "object") {
        classOrRole = String((details.class as any).name || "");
      }
      if (details.level && typeof details.level === "object") {
        levelOrCr = String((details.level as any).value ?? "");
      }
    }
  } else {
    name = String(input.name || "Unnamed Pathfinder Hero");
    if (input.ancestry || input.heritage)
      ancestryOrType = String(input.ancestry || input.heritage);
    if (input.class || input.role)
      classOrRole = String(input.class || input.role);
    if (input.level !== undefined) levelOrCr = String(input.level);
  }

  return {
    name,
    category: input.category === "npc" ? "npc" : "character",
    ancestryOrType,
    classOrRole,
    levelOrCr,
  };
}

function extractPf2eHpAc(
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
): { hp: number; ac: number } {
  let hp = 10;
  let ac = 10;

  if (pb) {
    const attrs = pb.attributes as Record<string, unknown> | undefined;
    if (attrs?.hp !== undefined) hp = Number(attrs.hp);
    else if (pb.hp !== undefined) hp = Number(pb.hp);

    if (pb.ac !== undefined) {
      ac =
        typeof pb.ac === "object" && pb.ac !== null
          ? Number((pb.ac as any).value ?? 10)
          : Number(pb.ac);
    }
  } else if (fvtt) {
    const attrs = fvtt.attributes as Record<string, unknown> | undefined;
    if (attrs?.hp && typeof attrs.hp === "object") {
      hp = Number((attrs.hp as any).value ?? (attrs.hp as any).max ?? 10);
    }
    if (attrs?.ac && typeof attrs.ac === "object") {
      ac = Number((attrs.ac as any).value ?? 10);
    }
  } else {
    hp = Number(input.hp ?? input.hit_points ?? 10);
    ac = Number(input.ac ?? input.armor_class ?? 10);
  }

  return { hp, ac };
}

function extractPf2eAbilityValue(
  key: string,
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
): { value: number; mod: number } {
  let rawVal: any;
  if (pb) {
    const abilities = (pb.abilities || pb.attributes) as
      Record<string, unknown> | undefined;
    rawVal = abilities?.[key];
  } else if (fvtt) {
    const abilities = fvtt.abilities as Record<string, unknown> | undefined;
    const ab = abilities?.[key];
    if (typeof ab === "object" && ab !== null) {
      const val = Number((ab as any).value ?? 10);
      const mod =
        (ab as any).mod !== undefined
          ? Number((ab as any).mod)
          : Math.floor((val - 10) / 2);
      return { value: val, mod };
    }
    rawVal = ab;
  } else {
    rawVal = input[key];
  }

  const val = Number(rawVal ?? 10);
  const mod = val > 9 ? Math.floor((val - 10) / 2) : val;
  const fullScore = val <= 9 && val >= -5 ? 10 + val * 2 : val;
  return { value: fullScore, mod };
}

function extractPf2eAttributes(
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
): StatBlockIR["attributes"] {
  const scores: Array<[string, string]> = [
    ["str", "STR"],
    ["dex", "DEX"],
    ["con", "CON"],
    ["int", "INT"],
    ["wis", "WIS"],
    ["cha", "CHA"],
  ];

  const attributes: StatBlockIR["attributes"] = {};
  for (const [key, label] of scores) {
    const ability = extractPf2eAbilityValue(key, input, pb, fvtt);
    attributes[key] = { label, value: ability.value, modifier: ability.mod };
  }
  return attributes;
}

function extractPf2eSaves(
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
  attrs: StatBlockIR["attributes"],
): Record<string, string | number> {
  const getSave = (key: string, alt: string, fallbackMod: number): number => {
    let raw: any;
    if (pb) {
      const saves = pb.saves as Record<string, unknown> | undefined;
      raw = saves?.[key] ?? saves?.[alt];
    } else if (fvtt) {
      const saves = fvtt.saves as Record<string, unknown> | undefined;
      const s = saves?.[key] ?? saves?.[alt];
      raw = typeof s === "object" && s !== null ? (s as any).value : s;
    } else {
      raw = input[key] ?? input[alt];
    }
    return raw !== undefined ? Number(raw) : fallbackMod;
  };

  return {
    fortitude: getSave("fortitude", "fort", attrs.con.modifier ?? 0),
    reflex: getSave("reflex", "ref", attrs.dex.modifier ?? 0),
    will: getSave("will", "willpower", attrs.wis.modifier ?? 0),
  };
}

function extractPf2ePerception(
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
  wisMod: number,
): StatBlockIR["skillsAndProficiencies"] {
  let perceptionVal = wisMod;
  if (pb && pb.perception !== undefined) {
    perceptionVal = Number(pb.perception);
  } else if (fvtt) {
    const attrs = fvtt.attributes as Record<string, unknown> | undefined;
    if (attrs?.perception && typeof attrs.perception === "object") {
      perceptionVal = Number((attrs.perception as any).value ?? wisMod);
    }
  } else if (input.perception !== undefined) {
    perceptionVal = Number(input.perception);
  }

  return [
    {
      name: "Perception",
      value: perceptionVal,
      formula: `1d20+${perceptionVal}`,
    },
  ];
}

function extractPf2eActions(
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
): StatBlockIR["actionsAndAttacks"] {
  const rawWeapons =
    pb?.weapons || fvtt?.items || input.actions || input.weapons;
  if (!Array.isArray(rawWeapons)) return [];

  const actions: StatBlockIR["actionsAndAttacks"] = [];
  for (const w of rawWeapons) {
    if (typeof w !== "object" || w === null) continue;
    const wName = String(w.name || "Strike");
    let atkBonus: number | undefined;
    let dmg: string | undefined;

    if (w.bonus !== undefined) atkBonus = Number(w.bonus);
    else if (w.attack_bonus !== undefined) atkBonus = Number(w.attack_bonus);
    else if (w.system?.bonus?.value !== undefined)
      atkBonus = Number(w.system.bonus.value);

    if (w.damage) dmg = String(w.damage);
    else if (w.damage_dice) dmg = String(w.damage_dice);

    actions.push({
      name: wName,
      actionType: "action",
      attackDice: atkBonus !== undefined ? `1d20+${atkBonus}` : undefined,
      damageDice: dmg,
      description: String(w.description || ""),
    });
  }
  return actions;
}
