/** Small readers for untrusted JSON, shared by the one-shot parsers. */

export type Rec = Record<string, unknown>;

export const rec = (v: unknown): Rec =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
export const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;
export const strs = (v: unknown): string[] =>
  list(v).filter((x): x is string => typeof x === "string" && !!x.trim());
