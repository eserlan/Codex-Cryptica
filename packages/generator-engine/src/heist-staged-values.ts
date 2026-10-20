export { asArray as arr, asRecord as rec } from "./llm-response-utils";
import type { JsonObject } from "./staged-runtime";

export function detailText(value: JsonObject): string {
  return String(value.detail || value.text || "").trim();
}

export const text = (v: unknown): string => {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    return v
      .filter((x): x is string => typeof x === "string")
      .join(" ")
      .trim();
  }
  return "";
};
