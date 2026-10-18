import { importStatBlock, detectStatBlockSystem } from "../stat-block";
import type { StatBlockIR } from "../stat-block";
import { deriveProficiencyBonus } from "./derive";
import { runLocalChecks } from "./local-checks";
import { applyReviewEdit } from "./review";
import { assertSourceLength, prepareStatBlockSource } from "./source";
import type {
  AbilityKey,
  AbilityScores,
  ActionValue,
  CreatureValues,
  ImportRequest,
  NpcValues,
  ReadResult,
  SheetKind,
} from "./types";

type Plain = Record<string, unknown>;

const ABILITIES: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LONG: Record<AbilityKey, string> = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
};

function asRecord(value: unknown): Plain | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Plain)
    : null;
}

function parseJsonObject(source: string): Plain | null {
  if (!source.trim().startsWith("{")) return null;
  try {
    return asRecord(JSON.parse(source));
  } catch {
    return null;
  }
}

/**
 * The ToV JSON parser fills missing ability scores with 10. For JSON input,
 * an ability counts as given only when the export actually contains it.
 */
function abilityGiven(raw: Plain | null, key: AbilityKey): boolean {
  if (!raw) return true;
  const system = asRecord(raw.system);
  const candidates: unknown[] = [
    asRecord(raw.attributes)?.[key],
    asRecord(system?.abilities)?.[key],
    asRecord(raw.abilities)?.[key],
    raw[key],
    raw[ABILITY_LONG[key]],
  ];
  return candidates.some((value) => value !== undefined && value !== null);
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\s*\d+\s*$/.test(value))
    return Number(value);
  return undefined;
}

function nullable<T>(value: T | undefined | null): T | null {
  return value ?? null;
}

function toAction(
  action: StatBlockIR["actionsAndAttacks"][number],
): ActionValue {
  return {
    name: action.name,
    attackFormula: action.attackDice ?? null,
    damageFormula: action.damageDice ?? null,
    description: action.description ?? null,
  };
}

function scoresFrom(ir: StatBlockIR, raw: Plain | null): AbilityScores {
  const scores: AbilityScores = {};
  for (const key of ABILITIES) {
    const attribute = ir.attributes[key];
    if (
      abilityGiven(raw, key) &&
      attribute &&
      typeof attribute.value === "number"
    ) {
      scores[key] = attribute.value;
    }
  }
  return scores;
}

/** Drops keys with no value so "not found" means absent, as elsewhere. */
function compact<T extends object>(values: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (key === "abilityScores" && Object.keys(value as object).length === 0)
      continue;
    out[key] = value;
  }
  return out as T;
}

function irToValues(
  ir: StatBlockIR,
  kind: SheetKind,
  raw: Plain | null,
): CreatureValues | NpcValues {
  return compact(buildValues(ir, kind, raw));
}

function sharedValues(ir: StatBlockIR, raw: Plain | null) {
  const hp = ir.vitals.find((v) => v.id === "hp");
  const armor = numberOrUndefined(ir.defences.armorRating);
  return {
    cr: nullable(ir.identity.levelOrCr),
    ac: nullable(armor),
    hp: nullable(hp?.max ?? hp?.current),
    hitDice: nullable(hp?.sublabel),
    speed: nullable(ir.defences.speed),
    abilityScores: scoresFrom(ir, raw),
  };
}

function npcValues(ir: StatBlockIR, raw: Plain | null): NpcValues {
  const first = ir.actionsAndAttacks[0];
  const luck = ir.vitals.find((v) => v.id === "luck");
  return {
    ...sharedValues(ir, raw),
    attackName: first?.name ?? null,
    attackFormula: first?.attackDice ?? null,
    damageFormula: first?.damageDice ?? null,
    luck: luck?.current ?? null,
  };
}

function creatureCombatValues(
  ir: StatBlockIR,
): Pick<
  CreatureValues,
  "actions" | "bonusActions" | "reactions" | "legendaryActions"
> {
  const actions = ir.actionsAndAttacks;
  const ofType = (type: string) =>
    actions.filter((a) => a.actionType === type).map(toAction);
  return {
    actions: ofType("action"),
    bonusActions: ofType("bonus"),
    reactions: ofType("reaction"),
    legendaryActions: actions
      .filter((a) => a.actionType === "legendary")
      .map((a) => ({ name: a.name, description: a.description ?? null })),
  };
}

function creatureValues(ir: StatBlockIR, raw: Plain | null): CreatureValues {
  const doom = numberOrUndefined(
    ir.vitals.find((v) => v.id === "doom")?.current,
  );
  return {
    ...sharedValues(ir, raw),
    size: nullable(ir.identity.size),
    creatureType: nullable(ir.identity.ancestryOrType),
    alignment: nullable(ir.identity.alignment),
    acDetails: nullable(ir.defences.armorDetails),
    senses: nullable(ir.defences.senses),
    languages: nullable(ir.defences.languages),
    damageVulnerabilities: nullable(ir.defences.vulnerabilities),
    damageResistances: nullable(ir.defences.resistances),
    damageImmunities: nullable(ir.defences.immunities),
    conditionImmunities: nullable(ir.defences.conditionImmunities),
    doom: nullable(doom),
    traits: ir.traitsAndFeatures.map((t) => ({
      name: t.name,
      description: t.text,
    })),
    ...creatureCombatValues(ir),
  };
}

function buildValues(
  ir: StatBlockIR,
  kind: SheetKind,
  raw: Plain | null,
): CreatureValues | NpcValues {
  return kind === "npc" ? npcValues(ir, raw) : creatureValues(ir, raw);
}

/**
 * Rule-based read, used when AI is off or fails. No network call. Anything
 * that is not in the pasted text is cleared rather than shown as found
 * (FR-006, FR-012).
 */
export function readStatBlockWithRules(request: ImportRequest): ReadResult {
  const source = prepareStatBlockSource(request.source);
  assertSourceLength(source);
  const raw = parseJsonObject(source);
  const input: unknown = raw ?? source;

  const { ir } = importStatBlock(input, { systemHint: "tales-of-the-valiant" });
  const kind: SheetKind = request.kindHint ?? "creature";

  const base: ReadResult = {
    outcome: "ok",
    candidates: [],
    looksLike: detectStatBlockSystem(input) === "dnd5e" ? "5e" : "unknown",
    kind,
    name: ir.identity.name || null,
    values: irToValues(ir, kind, raw),
    notes: [],
    leftovers: [],
    reader: "rules",
    corrected: [],
  };

  const checked = runLocalChecks(deriveProficiencyBonus(base), {
    mode: "copy",
    source,
  });

  // Anything the copy check cannot find in the text was not really read.
  return checked.notes
    .filter((note) => note.reason === "not-in-source")
    .reduce(
      (result, note) => applyReviewEdit(result, note.path, undefined),
      checked,
    );
}
