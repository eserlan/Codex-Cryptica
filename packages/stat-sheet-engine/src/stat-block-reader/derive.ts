import type { FieldNote, ReadResult } from "./types";

/** Standard Challenge Rating to proficiency bonus table (research R6). */
const PROFICIENCY_BY_CR: Record<string, number> = {
  "0": 2,
  "1/8": 2,
  "1/4": 2,
  "1/2": 2,
  "1": 2,
  "2": 2,
  "3": 2,
  "4": 2,
  "5": 3,
  "6": 3,
  "7": 3,
  "8": 3,
  "9": 4,
  "10": 4,
  "11": 4,
  "12": 4,
  "13": 5,
  "14": 5,
  "15": 5,
  "16": 5,
  "17": 6,
  "18": 6,
  "19": 6,
  "20": 6,
  "21": 7,
  "22": 7,
  "23": 7,
  "24": 7,
  "25": 8,
  "26": 8,
  "27": 8,
  "28": 8,
  "29": 9,
  "30": 9,
};

export function proficiencyForCr(cr: string): number | undefined {
  return PROFICIENCY_BY_CR[cr.trim()];
}

/**
 * Fills proficiency bonus from a stated CR when the stat block omits it. The
 * value is marked `derived` so the review screen can say where it came from.
 */
export function deriveProficiencyBonus(result: ReadResult): ReadResult {
  if (result.kind !== "creature" || result.outcome !== "ok") return result;

  const values = result.values as Record<string, unknown>;
  if (typeof values.proficiencyBonus === "number") return result;
  if (typeof values.cr !== "string") return result;

  const bonus = proficiencyForCr(values.cr);
  if (bonus === undefined) return result;

  const note: FieldNote = {
    path: "proficiencyBonus",
    state: "derived",
    reason: "from-cr",
  };
  return {
    ...result,
    values: { ...values, proficiencyBonus: bonus },
    notes: [...result.notes, note],
  };
}
