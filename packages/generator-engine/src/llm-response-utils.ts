/**
 * Removes trailing commas before a closing `}` or `]`, ignoring anything inside
 * a string literal. Models occasionally emit `{"a": "b",\n}`, which strict
 * `JSON.parse` rejects even though the content is intact.
 */
function stripTrailingCommas(json: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (inString) {
      out += char;
      if (char === "\\") {
        out += json[++i] ?? "";
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
    } else if (char === ",") {
      const next = json.slice(i + 1).match(/^\s*([}\]])/);
      if (!next) out += char;
    } else {
      out += char;
    }
  }
  return out;
}

/**
 * Parses an LLM response that may be wrapped in a ```json ... ``` fence, and
 * tolerates trailing commas. Other malformed JSON still throws.
 */
export function parseFencedJson<T = any>(text: string): T {
  const cleanText = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleanText) as T;
  } catch (error) {
    const repaired = stripTrailingCommas(cleanText);
    if (repaired === cleanText) throw error;
    return JSON.parse(repaired) as T;
  }
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
