import type {
  CreatureValues,
  FieldNote,
  NpcValues,
  ReadResult,
  SheetKind,
} from "./types";

export type FieldStateName =
  "found" | "check" | "not-found" | "converted" | "from-cr" | "corrected";

/** Values both sheet kinds share, so they carry across a kind switch (FR-008). */
const SHARED_KEYS = ["cr", "ac", "hp", "hitDice", "speed", "abilityScores"];

const LABELS: Record<string, string> = {
  creatureType: "Creature type",
  acDetails: "AC details",
  hitDice: "Hit dice",
  attackName: "Attack name",
  attackBonus: "Attack bonus",
  attackFormula: "Attack formula",
  damageFormula: "Damage formula",
  damageType: "Damage type",
  keySaves: "Key saves",
  keySkills: "Key skills",
  notes: "Notes",
};

function splitPath(path: string): string[] {
  return path.split(".");
}

export function getAtPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const part of splitPath(path)) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setAtPath(root: unknown, parts: string[], value: unknown): unknown {
  if (parts.length === 0) return value;
  const [head, ...rest] = parts;
  const container: Record<string, unknown> | unknown[] = Array.isArray(root)
    ? [...root]
    : { ...(root as Record<string, unknown>) };
  const key = Array.isArray(container) ? Number(head) : head!;
  (container as Record<string | number, unknown>)[key] = setAtPath(
    (container as Record<string | number, unknown>)[key],
    rest,
    value,
  );
  return container;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** The state the review screen shows for one value (FR-007). */
export function fieldState(result: ReadResult, path: string): FieldStateName {
  const value = getAtPath(result.values, path);
  if (result.corrected.includes(path) && !isEmptyValue(value))
    return "corrected";
  const note = result.notes.find((n) => n.path === path);
  if (note?.state === "check") return "check";
  if (note?.state === "converted") return "converted";
  if (note?.state === "derived") return "from-cr";
  return isEmptyValue(value) ? "not-found" : "found";
}

/**
 * Applies a GM edit. The value is treated as found and any note on that path
 * is cleared. Clearing the value makes it not found again.
 */
export function applyReviewEdit(
  result: ReadResult,
  path: string,
  value: unknown,
): ReadResult {
  const empty = isEmptyValue(value);
  const nextValues = setAtPath(
    result.values,
    splitPath(path),
    empty ? undefined : value,
  );
  const notes = result.notes.filter((n) => n.path !== path);
  const corrected = empty
    ? result.corrected.filter((p) => p !== path)
    : result.corrected.includes(path)
      ? result.corrected
      : [...result.corrected, path];
  return {
    ...result,
    values: nextValues as ReadResult["values"],
    notes,
    corrected,
  };
}

function formatLeftover(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item
          : ((item as { name?: string }).name ?? JSON.stringify(item)),
      )
      .join(", ");
  }
  return JSON.stringify(value);
}

function labelFor(key: string): string {
  return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Switches the sheet kind. Shared values carry across; other values move to
 * the leftovers list so nothing is dropped silently (FR-015).
 */
export function switchReadResultKind(
  result: ReadResult,
  kind: SheetKind,
): ReadResult {
  if (result.kind === kind) return result;

  const source = result.values as Record<string, unknown>;
  const kept: Record<string, unknown> = {};
  const leftovers = [...result.leftovers];
  for (const [key, value] of Object.entries(source)) {
    if (isEmptyValue(value)) continue;
    if (SHARED_KEYS.includes(key)) {
      kept[key] = value;
    } else {
      leftovers.push({ label: labelFor(key), text: formatLeftover(value) });
    }
  }

  const notes: FieldNote[] = result.notes.filter((n) =>
    SHARED_KEYS.includes(splitPath(n.path)[0] ?? ""),
  );
  const corrected = result.corrected.filter((p) =>
    SHARED_KEYS.includes(splitPath(p)[0] ?? ""),
  );

  return {
    ...result,
    kind,
    values: kept as CreatureValues | NpcValues,
    notes,
    leftovers,
    corrected,
  };
}
