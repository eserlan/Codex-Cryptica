/** Parses an LLM response that may be wrapped in a ```json ... ``` fence. */
export function parseFencedJson<T = any>(text: string): T {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleanText) as T;
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Light defensive cleanup for common AI wording slips: doubled whitespace,
 * duplicated terminal punctuation ("!!", "??"), and stray dash/em-dash
 * collisions ("—-", "-—") that turn up when free-text AI output gets
 * concatenated with generated suffixes elsewhere. Deliberately leaves an
 * intentional ellipsis ("...") untouched.
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\.\.(?!\.)/g, ".")
    .replace(/([!?,;:])\1+/g, "$1")
    .replace(/—-|-—/g, "—")
    .trim();
}
