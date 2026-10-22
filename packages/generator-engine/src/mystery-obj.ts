/** Defensive readers for model-shaped stage data. */

export type Obj = Record<string, unknown>;
export const record = (value: unknown): Obj =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Obj)
    : {};
export const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
export const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
