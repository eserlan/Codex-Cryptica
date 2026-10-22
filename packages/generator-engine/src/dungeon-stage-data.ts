/** Read the text and presence fields accepted in staged dungeon replies. */
import { asArray as arr, asRecord as rec } from "./llm-response-utils";
import type { JsonObject as Json } from "./staged-runtime";

export const text = (v: unknown): string =>
  typeof v === "string"
    ? v.trim()
    : arr(v)
        .filter((x): x is string => typeof x === "string")
        .join(" ")
        .trim();
export const textList = (v: unknown): string[] =>
  arr(v)
    .map(text)
    .filter((s) => s.length > 0);

/** One entry per sector: a repeated sector id keeps its first detail. */
export function presenceOf(f: Json): { sectorId: string; detail: string }[] {
  const seen = new Set<string>();
  return arr(f.presence)
    .map(rec)
    .map((p) => ({ sectorId: text(p.sectorId), detail: text(p.detail) }))
    .filter((p) => {
      if (!p.sectorId || !p.detail || seen.has(p.sectorId)) return false;
      seen.add(p.sectorId);
      return true;
    });
}
