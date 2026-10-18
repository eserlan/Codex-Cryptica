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
  const identity = pb
    ? pathbuilderIdentity(pb)
    : fvtt
      ? foundryIdentity(input, fvtt)
      : plainIdentity(input);

  return {
    name: identity.name ?? "Unnamed Pathfinder Hero",
    category: input.category === "npc" ? "npc" : "character",
    ancestryOrType: identity.ancestryOrType,
    classOrRole: identity.classOrRole,
    levelOrCr: identity.levelOrCr,
  };
}

type PartialIdentity = Omit<
  Pick<
    StatBlockIR["identity"],
    "name" | "ancestryOrType" | "classOrRole" | "levelOrCr"
  >,
  "name"
> & { name?: string };

function pathbuilderIdentity(pb: Record<string, unknown>): PartialIdentity {
  const char = (pb.character as Record<string, unknown>) || pb;
  return {
    name: char.name ? String(char.name) : undefined,
    ancestryOrType: char.ancestry ? String(char.ancestry) : undefined,
    classOrRole: char.class ? String(char.class) : undefined,
    levelOrCr: char.level !== undefined ? String(char.level) : undefined,
  };
}

function foundryIdentity(
  input: Record<string, unknown>,
  fvtt: Record<string, unknown>,
): PartialIdentity {
  const details = fvtt.details as Record<string, unknown> | undefined;
  return {
    name: input.name ? String(input.name) : undefined,
    ancestryOrType: foundryDetailName(details?.ancestry),
    classOrRole: foundryDetailName(details?.class),
    levelOrCr: foundryDetailValue(details?.level),
  };
}

function foundryDetailName(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const name = (value as Record<string, unknown>).name;
  return name ? String(name) : "";
}

function foundryDetailValue(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return String((value as Record<string, unknown>).value ?? "");
}

function plainIdentity(input: Record<string, unknown>): PartialIdentity {
  const ancestry = input.ancestry || input.heritage;
  const role = input.class || input.role;
  return {
    name: String(input.name || "Unnamed Pathfinder Hero"),
    ancestryOrType: ancestry ? String(ancestry) : undefined,
    classOrRole: role ? String(role) : undefined,
    levelOrCr: input.level !== undefined ? String(input.level) : undefined,
  };
}

function extractPf2eHpAc(
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
): { hp: number; ac: number } {
  return pb ? pathbuilderHpAc(pb) : fvtt ? foundryHpAc(fvtt) : plainHpAc(input);
}

function pathbuilderHpAc(pb: Record<string, unknown>): {
  hp: number;
  ac: number;
} {
  const attrs = pb.attributes as Record<string, unknown> | undefined;
  const rawAc = pb.ac;
  return {
    hp: Number(attrs?.hp ?? pb.hp ?? 10),
    ac: Number(readObjectValue(rawAc, 10)),
  };
}

function foundryHpAc(fvtt: Record<string, unknown>): {
  hp: number;
  ac: number;
} {
  const attrs = fvtt.attributes as Record<string, unknown> | undefined;
  const hp = readObjectValue(attrs?.hp, 10, "max");
  return { hp: Number(hp), ac: Number(readObjectValue(attrs?.ac, 10)) };
}

function plainHpAc(input: Record<string, unknown>): { hp: number; ac: number } {
  return {
    hp: Number(input.hp ?? input.hit_points ?? 10),
    ac: Number(input.ac ?? input.armor_class ?? 10),
  };
}

function readObjectValue(
  value: unknown,
  fallback: number,
  secondary?: string,
): unknown {
  if (typeof value !== "object" || value === null) return value ?? fallback;
  const record = value as Record<string, unknown>;
  return (
    record.value ?? (secondary ? record[secondary] : undefined) ?? fallback
  );
}

function extractPf2eAbilityValue(
  key: string,
  input: Record<string, unknown>,
  pb: Record<string, unknown> | null,
  fvtt: Record<string, unknown> | null,
): { value: number; mod: number } {
  if (fvtt) {
    const rawAbility = foundryAbilityValue(fvtt, key);
    if (typeof rawAbility === "object" && rawAbility !== null) {
      return foundryAbility(rawAbility);
    }
    return abilityNumbers(rawAbility);
  }
  const rawVal = pb ? pathbuilderAbility(pb, key) : input[key];
  return abilityNumbers(rawVal);
}

function abilityNumbers(rawVal: unknown): { value: number; mod: number } {
  const val = Number(rawVal ?? 10);
  const mod = val > 9 ? Math.floor((val - 10) / 2) : val;
  const fullScore = val <= 9 && val >= -5 ? 10 + val * 2 : val;
  return { value: fullScore, mod };
}

function pathbuilderAbility(pb: Record<string, unknown>, key: string): unknown {
  const abilities = (pb.abilities || pb.attributes) as
    Record<string, unknown> | undefined;
  return abilities?.[key];
}

function foundryAbilityValue(
  fvtt: Record<string, unknown>,
  key: string,
): unknown {
  const abilities = fvtt.abilities as Record<string, unknown> | undefined;
  return abilities?.[key];
}

function foundryAbility(ability: object): { value: number; mod: number } {
  const record = ability as Record<string, unknown>;
  const value = Number(record.value ?? 10);
  const mod =
    record.mod !== undefined
      ? Number(record.mod)
      : Math.floor((value - 10) / 2);
  return { value, mod };
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
    const raw = pb
      ? readSave(pb.saves, key, alt)
      : fvtt
        ? readSave(fvtt.saves, key, alt)
        : (input[key] ?? input[alt]);
    const value =
      typeof raw === "object" && raw !== null
        ? (raw as Record<string, unknown>).value
        : raw;
    return value !== undefined ? Number(value) : fallbackMod;
  };

  return {
    fortitude: getSave("fortitude", "fort", attrs.con.modifier ?? 0),
    reflex: getSave("reflex", "ref", attrs.dex.modifier ?? 0),
    will: getSave("will", "willpower", attrs.wis.modifier ?? 0),
  };
}

function readSave(rawSaves: unknown, key: string, alias: string): unknown {
  if (typeof rawSaves !== "object" || rawSaves === null) return undefined;
  const saves = rawSaves as Record<string, unknown>;
  return saves[key] ?? saves[alias];
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

  return rawWeapons.flatMap((weapon) =>
    isRecord(weapon) ? [parsePf2eWeapon(weapon)] : [],
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePf2eWeapon(
  weapon: Record<string, unknown>,
): StatBlockIR["actionsAndAttacks"][number] {
  const system = weapon.system as Record<string, unknown> | undefined;
  const bonus = firstDefined(
    weapon.bonus,
    weapon.attack_bonus,
    (system?.bonus as Record<string, unknown> | undefined)?.value,
  );
  const damage = firstTruthy(weapon.damage, weapon.damage_dice);
  return {
    name: String(weapon.name || "Strike"),
    actionType: "action",
    attackDice: bonus !== undefined ? `1d20+${Number(bonus)}` : undefined,
    damageDice: damage === undefined ? undefined : String(damage),
    description: String(weapon.description || ""),
  };
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined);
}

function firstTruthy(...values: unknown[]): unknown {
  return values.find(Boolean);
}
