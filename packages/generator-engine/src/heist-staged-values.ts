export { asArray as arr, asRecord as rec } from "./llm-response-utils";

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
