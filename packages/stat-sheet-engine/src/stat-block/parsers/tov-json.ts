// fallow-ignore-file complexity
import type { StatBlockIR } from "../types";

/**
 * Parses Tales of the Valiant / Black Flag JSON data into a normalized StatBlockIR.
 * Supports:
 * 1. Clean BFRD / CC ToV JSON fixtures (hero, creature, NPC)
 * 2. Official Black Flag Foundry VTT Actor JSON exports
 * 3. Generic d20 JSON objects that carry ToV mechanics (Luck, Doom, Lineage/Heritage)
 */
// fallow-ignore-next-line complexity
export function parseTovJson(input: Record<string, unknown>): StatBlockIR {
  const foundrySystem = asRecord(input.system);
  const details = asRecord(foundrySystem?.details);
  const attributesObj = asRecord(foundrySystem?.attributes);

  // 1. Identity & Classification
  const name = String(input.name || "Unnamed ToV Entity").trim();

  let category: "character" | "npc" | "creature" = "npc";
  if (
    input.category === "character" ||
    input.type === "character" ||
    input.type === "pc" ||
    input.lineage !== undefined ||
    details?.lineage !== undefined
  ) {
    category = "character";
  } else if (
    input.category === "creature" ||
    input.cr !== undefined ||
    input.challengeRating !== undefined ||
    details?.cr !== undefined
  ) {
    category = "creature";
  } else if (input.category === "npc") {
    category = "npc";
  }

  const lineage = readString(input.lineage ?? details?.lineage);
  const heritage = readString(input.heritage ?? details?.heritage);
  const background = readString(input.background ?? details?.background);
  const className = readString(input.class ?? details?.class);
  const levelNum =
    input.level !== undefined
      ? Number(input.level)
      : details?.level !== undefined
        ? Number(details.level)
        : undefined;

  let ancestryOrType = readString(input.type ?? details?.type);
  if (lineage) {
    ancestryOrType = heritage ? `${lineage} (${heritage})` : lineage;
  }

  let classOrRole: string | undefined;
  if (className) {
    classOrRole =
      levelNum !== undefined ? `${className} ${levelNum}` : className;
  }

  const cr = readString(input.cr ?? input.challengeRating ?? details?.cr);
  const levelOrCr =
    levelNum !== undefined
      ? String(levelNum)
      : cr !== undefined
        ? String(cr)
        : undefined;
  const size = readString(input.size ?? details?.size);
  const alignment = readString(input.alignment ?? details?.alignment);

  // 2. Vitals: HP, Luck, Doom
  const { hp, hitDiceStr } = extractTovHp(input, attributesObj);
  const vitals: StatBlockIR["vitals"] = [
    {
      id: "hp",
      label: "Hit Points",
      current: hp,
      max: hp,
      min: 0,
      sublabel: hitDiceStr,
    },
  ];

  const luckVital = extractLuckVital(input, attributesObj);
  if (luckVital) {
    vitals.push(luckVital);
  }

  const doomVital = extractDoomVital(input, attributesObj);
  if (doomVital) {
    vitals.push(doomVital);
  }

  // 3. Ability Scores & Modifiers
  const attributes = extractTovAttributes(input, foundrySystem);

  // 4. Defences & Movement
  const { acVal, acDetails } = extractTovAc(input, attributesObj);
  const speedStr = extractTovSpeed(input, attributesObj);
  const secondaryDefences = extractTovSecondary(input, foundrySystem, {
    lineage,
    heritage,
    background,
    className,
    levelNum,
  });

  // 5. Actions, Attacks, Bonus Actions, Reactions
  const actionsAndAttacks = extractTovActions(input);

  // 6. Skills & Proficiencies
  const skillsAndProficiencies = extractTovSkills(input, foundrySystem);

  // 7. Traits, Talents & Features
  const traitsAndFeatures = extractTovFeatures(input);

  return {
    system: "tales-of-the-valiant",
    identity: {
      name,
      category,
      ancestryOrType,
      classOrRole,
      levelOrCr,
      size,
      alignment,
    },
    vitals,
    attributes,
    defences: {
      armorRating: acVal,
      armorDetails: acDetails,
      speed: speedStr,
      secondaryDefences,
      senses: readString(input.senses ?? details?.senses),
      languages: readString(input.languages ?? details?.languages),
      vulnerabilities: readStringList(
        input.damageVulnerabilities ?? input.vulnerabilities,
      ),
      resistances: readStringList(input.damageResistances ?? input.resistances),
      immunities: readStringList(input.damageImmunities ?? input.immunities),
      conditionImmunities: readStringList(input.conditionImmunities),
    },
    actionsAndAttacks,
    skillsAndProficiencies,
    traitsAndFeatures,
    rawSource: JSON.stringify(input),
  };
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return typeof val === "object" && val !== null
    ? (val as Record<string, unknown>)
    : null;
}

function readString(val: unknown): string | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  return String(val);
}

function readStringList(val: unknown): string[] | undefined {
  if (Array.isArray(val))
    return val.map((item) => String(item).trim()).filter(Boolean);
  if (typeof val === "string" && val.trim().length > 0) {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function extractTovHp(
  input: Record<string, unknown>,
  attributesObj: Record<string, unknown> | null,
): { hp: number; hitDiceStr?: string } {
  let hp = 10;
  let hitDiceStr: string | undefined;

  const rawHp = input.hitPoints ?? input.hp ?? attributesObj?.hp;
  if (typeof rawHp === "number") {
    hp = rawHp;
  } else if (typeof rawHp === "object" && rawHp !== null) {
    const hpRecord = rawHp as Record<string, unknown>;
    hp = Number(
      hpRecord.current ??
        hpRecord.value ??
        hpRecord.max ??
        hpRecord.average ??
        10,
    );
    hitDiceStr = readString(hpRecord.formula ?? hpRecord.hitDice);
  }

  if (!hitDiceStr) {
    hitDiceStr = readString(input.hitDice ?? input.hit_dice);
  }

  return { hp, hitDiceStr };
}

function extractLuckVital(
  input: Record<string, unknown>,
  attributesObj: Record<string, unknown> | null,
): StatBlockIR["vitals"][number] | null {
  const rawLuck = input.luck ?? input.luckPoints ?? attributesObj?.luck;
  if (rawLuck === undefined || rawLuck === null) return null;

  let current = 0;
  let max = 5;

  if (typeof rawLuck === "number") {
    current = rawLuck;
  } else if (typeof rawLuck === "object") {
    const record = rawLuck as Record<string, unknown>;
    current = Number(record.current ?? record.value ?? 0);
    max = Number(record.max ?? 5);
  }

  return {
    id: "luck",
    label: "Luck Points",
    current,
    max,
    min: 0,
  };
}

function extractDoomVital(
  input: Record<string, unknown>,
  attributesObj: Record<string, unknown> | null,
): StatBlockIR["vitals"][number] | null {
  const rawDoom = input.doom ?? input.doomPoints ?? attributesObj?.doom;
  if (rawDoom === undefined || rawDoom === null) return null;

  let current = 0;
  let max = 10;

  if (typeof rawDoom === "number") {
    current = rawDoom;
  } else if (typeof rawDoom === "object") {
    const record = rawDoom as Record<string, unknown>;
    current = Number(record.current ?? record.value ?? 0);
    max = Number(record.max ?? 10);
  }

  return {
    id: "doom",
    label: "Doom Points",
    current,
    max,
    min: 0,
  };
}

function extractTovAc(
  input: Record<string, unknown>,
  attributesObj: Record<string, unknown> | null,
): { acVal: number; acDetails?: string } {
  let acVal = 10;
  let acDetails: string | undefined;

  const rawAc = input.armorClass ?? input.ac ?? attributesObj?.ac;
  if (typeof rawAc === "number") {
    acVal = rawAc;
  } else if (typeof rawAc === "object" && rawAc !== null) {
    const record = rawAc as Record<string, unknown>;
    acVal = Number(record.value ?? 10);
    acDetails = readString(record.details ?? record.source);
  }

  if (!acDetails) {
    acDetails = readString(input.acDetails ?? input.ac_details);
  }

  return { acVal, acDetails };
}

function extractTovSpeed(
  input: Record<string, unknown>,
  attributesObj: Record<string, unknown> | null,
): string | undefined {
  const rawSpeed =
    input.speed ?? attributesObj?.movement ?? attributesObj?.speed;
  if (typeof rawSpeed === "string") return rawSpeed;
  if (typeof rawSpeed === "object" && rawSpeed !== null) {
    const sObj = rawSpeed as Record<string, unknown>;
    return Object.entries(sObj)
      .map(([mode, dist]) =>
        mode === "walk" ? `${dist} ft` : `${mode} ${dist} ft`,
      )
      .join(", ");
  }
  return undefined;
}

const STAT_KEYS: Array<[string, string, string]> = [
  ["str", "STR", "strength"],
  ["dex", "DEX", "dexterity"],
  ["con", "CON", "constitution"],
  ["int", "INT", "intelligence"],
  ["wis", "WIS", "wisdom"],
  ["cha", "CHA", "charisma"],
];

function extractTovAttributes(
  input: Record<string, unknown>,
  foundrySystem: Record<string, unknown> | null,
): StatBlockIR["attributes"] {
  const abilities = asRecord(foundrySystem?.abilities);
  const inputAttrs = asRecord(input.attributes);
  const attributes: StatBlockIR["attributes"] = {};

  for (const [key, label, longKey] of STAT_KEYS) {
    let score = 10;
    let modifier: number | undefined;

    const fromObj = inputAttrs?.[key] ?? abilities?.[key];
    if (typeof fromObj === "number") {
      score = fromObj;
    } else if (typeof fromObj === "object" && fromObj !== null) {
      const rec = fromObj as Record<string, unknown>;
      score = Number(rec.score ?? rec.value ?? 10);
      if (rec.modifier !== undefined || rec.mod !== undefined) {
        modifier = Number(rec.modifier ?? rec.mod);
      }
    } else if (input[key] !== undefined) {
      score = Number(input[key]);
    } else if (input[longKey] !== undefined) {
      score = Number(input[longKey]);
    }

    if (modifier === undefined) {
      modifier = Math.floor((score - 10) / 2);
    }

    attributes[key] = { label, value: score, modifier };
  }

  return attributes;
}

function extractTovSecondary(
  input: Record<string, unknown>,
  foundrySystem: Record<string, unknown> | null,
  meta: Record<string, unknown>,
): Record<string, string | number> {
  const secondary: Record<string, string | number> = {};

  for (const [k, v] of Object.entries(meta)) {
    if (
      v !== undefined &&
      v !== null &&
      (typeof v === "string" || typeof v === "number")
    ) {
      secondary[k] = v;
    }
  }

  const profBonus =
    input.proficiencyBonus ?? asRecord(foundrySystem?.attributes)?.prof;
  if (profBonus !== undefined) {
    secondary.proficiency_bonus = Number(profBonus);
  }

  const inputAttrs = asRecord(input.attributes);
  const abilities = asRecord(foundrySystem?.abilities);
  for (const [key] of STAT_KEYS) {
    const attr = inputAttrs?.[key] ?? abilities?.[key];
    if (typeof attr === "object" && attr !== null) {
      const rec = attr as Record<string, unknown>;
      if (rec.save !== undefined) {
        secondary[`${key}_save`] = Number(rec.save);
      }
    }
  }

  return secondary;
}

function pushActionList(
  target: NonNullable<StatBlockIR["actionsAndAttacks"]>,
  rawList: unknown,
  fallbackName: string,
  actionType: "action" | "bonus" | "reaction",
): void {
  if (!Array.isArray(rawList)) return;
  for (const item of rawList) {
    if (typeof item === "object" && item !== null) {
      const act = item as Record<string, unknown>;
      target.push({
        name: String(act.name || fallbackName),
        actionType,
        attackDice: readString(
          act.attackFormula ?? act.attackDice ?? act.attack,
        ),
        damageDice: readString(
          act.damageFormula ?? act.damageDice ?? act.damage,
        ),
        reachOrRange: readString(act.reachOrRange ?? act.range),
        description: readString(
          act.notes ?? act.description ?? act.desc ?? act.type,
        ),
      });
    }
  }
}

function extractTovActions(
  input: Record<string, unknown>,
): StatBlockIR["actionsAndAttacks"] {
  const result: NonNullable<StatBlockIR["actionsAndAttacks"]> = [];
  pushActionList(result, input.attacks, "Attack", "action");
  pushActionList(result, input.actions, "Action", "action");
  pushActionList(
    result,
    input.bonusActions ?? input.bonus_actions,
    "Bonus Action",
    "bonus",
  );
  pushActionList(result, input.reactions, "Reaction", "reaction");

  // Foundry items array support (weapons, actions)
  const items = input.items;
  if (Array.isArray(items) && result.length === 0) {
    for (const it of items) {
      if (typeof it === "object" && it !== null) {
        const itemObj = it as Record<string, unknown>;
        if (itemObj.type === "weapon") {
          const itemSystem = asRecord(itemObj.system);
          const itemDesc = asRecord(itemSystem?.description);
          const attack = asRecord(itemSystem?.attack);
          const actorSystem = asRecord(input.system);
          const actorAttributes = asRecord(actorSystem?.attributes);
          const abilities = asRecord(actorSystem?.abilities);
          const ability = readString(attack?.ability ?? itemSystem?.ability);
          const abilityData = ability ? asRecord(abilities?.[ability]) : null;
          const abilityModifier = abilityData
            ? readNumber(abilityData.mod ?? abilityData.modifier)
            : undefined;
          const proficiencyBonus = readNumber(actorAttributes?.prof);
          const isProficient =
            typeof itemSystem?.proficient === "boolean"
              ? itemSystem.proficient
              : typeof attack?.proficient === "boolean"
                ? attack.proficient
                : undefined;
          const attackFormula =
            readFormula(itemSystem?.attackFormula ?? itemSystem?.attackDice) ??
            readAttackFormula(
              attack?.bonus ?? itemSystem?.attackBonus,
              abilityModifier,
              isProficient ? proficiencyBonus : 0,
              isProficient,
            );
          const damage = asRecord(itemSystem?.damage);
          const damageParts = Array.isArray(damage?.parts)
            ? damage.parts[0]
            : undefined;
          const damagePart = Array.isArray(damageParts)
            ? damageParts[0]
            : damageParts;
          const damageFormula = readFormula(
            itemSystem?.damageFormula ?? itemSystem?.damageDice ?? damagePart,
          );
          result.push({
            name: String(itemObj.name || "Weapon"),
            actionType: "action",
            attackDice: attackFormula,
            damageDice: resolveWeaponDamageFormula(
              damageFormula,
              abilityModifier,
              proficiencyBonus,
            ),
            description: readString(itemDesc?.value),
          });
        }
      }
    }
  }

  return result;
}

function readFormula(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const formula = String(value).trim();
  return formula.length > 0 ? formula : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readAttackFormula(
  rawBonus: unknown,
  abilityModifier: number | undefined,
  proficiencyBonus: number | undefined,
  isProficient: boolean | undefined,
): string | undefined {
  const bonus = readNumber(rawBonus);
  if (abilityModifier === undefined || isProficient === undefined)
    return undefined;
  if (isProficient && proficiencyBonus === undefined) return undefined;
  return `1d20${formatSignedBonus(
    abilityModifier + (proficiencyBonus ?? 0) + (bonus ?? 0),
  )}`;
}

function formatSignedBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : String(bonus);
}

function resolveWeaponDamageFormula(
  formula: string | undefined,
  abilityModifier: number | undefined,
  proficiencyBonus: number | undefined,
): string | undefined {
  if (!formula) return undefined;
  const resolved = formula
    .replace(
      /@mod\b/g,
      abilityModifier === undefined ? "@mod" : String(abilityModifier),
    )
    .replace(
      /@prof\b/g,
      proficiencyBonus === undefined ? "@prof" : String(proficiencyBonus),
    );
  return /@[a-zA-Z_][\w.]*/.test(resolved) ? undefined : resolved;
}

function extractTovSkills(
  input: Record<string, unknown>,
  _foundrySystem: Record<string, unknown> | null,
): StatBlockIR["skillsAndProficiencies"] {
  const result: Array<{
    name: string;
    value: string | number;
    formula?: string;
  }> = [];
  const skillsObj = asRecord(input.skills);

  if (skillsObj) {
    for (const [skillName, skillData] of Object.entries(skillsObj)) {
      if (typeof skillData === "number") {
        const bonusStr = skillData >= 0 ? `+${skillData}` : `${skillData}`;
        result.push({
          name: skillName,
          value: skillData,
          formula: `1d20${bonusStr}`,
        });
      } else if (typeof skillData === "object" && skillData !== null) {
        const rec = skillData as Record<string, unknown>;
        const bonus = Number(rec.bonus ?? 0);
        const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
        result.push({
          name: skillName,
          value: bonus,
          formula: `1d20${bonusStr}`,
        });
      }
    }
  }

  return result.length > 0 ? result : undefined;
}

function pushFeatureList(
  target: NonNullable<StatBlockIR["traitsAndFeatures"]>,
  rawList: unknown,
  fallbackName: string,
  category: "trait" | "feat",
): void {
  if (!Array.isArray(rawList)) return;
  for (const item of rawList) {
    if (typeof item === "object" && item !== null) {
      const rec = item as Record<string, unknown>;
      target.push({
        name: String(rec.name || fallbackName),
        text: String(rec.description ?? rec.text ?? rec.desc ?? ""),
        category,
      });
    }
  }
}

function extractTovFeatures(
  input: Record<string, unknown>,
): StatBlockIR["traitsAndFeatures"] {
  const traits: NonNullable<StatBlockIR["traitsAndFeatures"]> = [];
  pushFeatureList(traits, input.features, "Feature", "trait");
  pushFeatureList(traits, input.talents, "Talent", "feat");
  pushFeatureList(traits, input.traits, "Trait", "trait");
  return traits;
}
