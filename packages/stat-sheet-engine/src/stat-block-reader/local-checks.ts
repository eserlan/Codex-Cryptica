import { DiceParser } from "dice-engine";
import { SIZE_VALUES } from "./read-result-schema";
import type {
  AbilityKey,
  CreatureValues,
  FieldNote,
  ImportMode,
  NoteReason,
  ReadResult,
} from "./types";

const dice = new DiceParser();
const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export function isValidDice(formula: string): boolean {
  try {
    dice.parse(formula);
    return true;
  } catch {
    return false;
  }
}

/** Lower-cases, folds ligatures and accents, and turns punctuation into spaces. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function textInSource(value: string, normalizedSource: string): boolean {
  const needle = normalizeText(value);
  return needle === "" || normalizedSource.includes(needle);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when the number appears as its own token (so 8 is not found in 18). */
export function numberInSource(
  value: number | string,
  source: string,
): boolean {
  const pattern = new RegExp(
    `(^|[^\\d/.])${escapeRegExp(String(value))}(?![\\d/]|\\.\\d)`,
  );
  return pattern.test(source);
}

interface NumberCheck {
  path: string;
  value: number;
  min: number;
  max: number;
}

interface TextCheck {
  path: string;
  value: string;
}

function numberChecks(result: ReadResult): NumberCheck[] {
  const out: NumberCheck[] = [];
  const push = (path: string, value: unknown, min: number, max: number) => {
    if (typeof value === "number") out.push({ path, value, min, max });
  };
  const v = result.values as Record<string, unknown>;
  const scores = (v.abilityScores ?? {}) as Record<string, unknown>;
  for (const key of ABILITY_KEYS) {
    push(`abilityScores.${key}`, scores[key], 1, 30);
  }
  push("ac", v.ac, 1, 40);
  push("hp", v.hp, 1, 9999);
  if (result.kind === "creature") {
    push("proficiencyBonus", v.proficiencyBonus, 2, 9);
    push("doom", v.doom, 0, 10);
  } else {
    push("luck", v.luck, 0, 5);
    push("attackBonus", v.attackBonus, -5, 30);
  }
  return out;
}

function textStrings(values: unknown, path: string): TextCheck[] {
  return typeof values === "string" ? [{ path, value: values }] : [];
}

function textListChecks(list: unknown, path: string): TextCheck[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((item, index) =>
    typeof item === "string" ? [{ path: `${path}.${index}`, value: item }] : [],
  );
}

function objectNameChecks(list: unknown, path: string): TextCheck[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((item, index) => {
    const name = (item as { name?: unknown }).name;
    return typeof name === "string"
      ? [{ path: `${path}.${index}.name`, value: name }]
      : [];
  });
}

function textChecks(result: ReadResult): TextCheck[] {
  const v = result.values as Record<string, unknown>;
  if (result.kind === "npc") {
    return [
      ...textStrings(v.cr, "cr"),
      ...textStrings(v.speed, "speed"),
      ...textStrings(v.attackName, "attackName"),
      ...textStrings(v.damageType, "damageType"),
      ...textListChecks(v.keySaves, "keySaves"),
      ...textListChecks(v.keySkills, "keySkills"),
    ];
  }
  const scalars = [
    "size",
    "creatureType",
    "subtype",
    "alignment",
    "cr",
    "senses",
    "languages",
    "speed",
    "acDetails",
  ];
  const lists = [
    "saveProficiencies",
    "skillProficiencies",
    "damageVulnerabilities",
    "damageResistances",
    "damageImmunities",
    "conditionImmunities",
  ];
  return [
    ...scalars.flatMap((key) => textStrings(v[key], key)),
    ...lists.flatMap((key) => textListChecks(v[key], key)),
    ...objectNameChecks(v.traits, "traits"),
    ...objectNameChecks(v.actions, "actions"),
    ...objectNameChecks(v.bonusActions, "bonusActions"),
    ...objectNameChecks(v.reactions, "reactions"),
    ...objectNameChecks(v.legendaryActions, "legendaryActions"),
  ];
}

function diceChecks(result: ReadResult): TextCheck[] {
  const v = result.values as Record<string, unknown>;
  const out: TextCheck[] = [];
  const hitDice = textStrings(v.hitDice, "hitDice");
  out.push(...hitDice);
  const actionLists =
    result.kind === "npc"
      ? []
      : ["actions", "bonusActions", "reactions"].map((key) => ({
          key,
          list: v[key],
        }));
  for (const { key, list } of actionLists) {
    if (!Array.isArray(list)) continue;
    list.forEach((item, index) => {
      for (const field of ["attackFormula", "damageFormula"] as const) {
        const formula = (item as Record<string, unknown>)[field];
        if (typeof formula === "string") {
          out.push({ path: `${key}.${index}.${field}`, value: formula });
        }
      }
    });
  }
  if (result.kind === "npc") {
    out.push(...textStrings(v.attackFormula, "attackFormula"));
    out.push(...textStrings(v.damageFormula, "damageFormula"));
  }
  return out;
}

/**
 * Adds check notes for values the model may have invented or mangled. It
 * never removes a note the model already gave (research R2).
 *
 * - copy mode: numbers and short text must appear in the pasted source.
 * - convert-5e mode: a number not in the source needs a `converted` note.
 * - dice that the dice parser rejects are marked malformed in both modes.
 */
interface CheckContext {
  notes: FieldNote[];
  add: (path: string, reason: NoteReason) => void;
  hasState: (path: string, state: FieldNote["state"]) => boolean;
}

function checkContext(notes: FieldNote[]): CheckContext {
  return {
    notes,
    add: (path, reason) => {
      if (notes.some((n) => n.path === path && n.reason === reason)) return;
      notes.push({ path, state: "check", reason });
    },
    hasState: (path, state) =>
      notes.some((n) => n.path === path && n.state === state),
  };
}

function checkNumbers(
  result: ReadResult,
  input: { mode: ImportMode; source: string },
  ctx: CheckContext,
) {
  for (const check of numberChecks(result)) {
    if (ctx.hasState(check.path, "derived")) continue;
    if (check.value < check.min || check.value > check.max) {
      ctx.add(check.path, "out-of-range");
      continue;
    }
    const inSource = numberInSource(check.value, input.source);
    if (input.mode === "copy") {
      if (!inSource) ctx.add(check.path, "not-in-source");
    } else if (!inSource && !ctx.hasState(check.path, "converted")) {
      ctx.add(check.path, "unmarked-change");
    }
  }
}

function checkTexts(
  result: ReadResult,
  normalizedSource: string,
  ctx: CheckContext,
) {
  for (const check of textChecks(result)) {
    if (!textInSource(check.value, normalizedSource))
      ctx.add(check.path, "not-in-source");
  }
}

function checkDice(result: ReadResult, ctx: CheckContext) {
  for (const check of diceChecks(result)) {
    if (!isValidDice(check.value)) ctx.add(check.path, "malformed");
  }
}

function checkSize(result: ReadResult, ctx: CheckContext) {
  if (result.kind !== "creature") return;
  const size = (result.values as CreatureValues).size;
  if (typeof size === "string" && !SIZE_VALUES.some((s) => s === size)) {
    ctx.add("size", "malformed");
  }
}

/**
 * Adds check notes for values the model may have invented or mangled. It
 * never removes a note the model already gave (research R2).
 *
 * - copy mode: numbers and short text must appear in the pasted source.
 * - convert-5e mode: a number not in the source needs a `converted` note.
 * - dice that the dice parser rejects are marked malformed in both modes.
 */
export function runLocalChecks(
  result: ReadResult,
  input: { mode: ImportMode; source: string },
): ReadResult {
  if (result.outcome !== "ok") return result;
  const notes: FieldNote[] = [...result.notes];
  const ctx = checkContext(notes);
  checkNumbers(result, input, ctx);
  if (input.mode === "copy")
    checkTexts(result, normalizeText(input.source), ctx);
  checkDice(result, ctx);
  checkSize(result, ctx);
  return { ...result, notes };
}
