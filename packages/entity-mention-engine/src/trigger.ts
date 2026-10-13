import type { Trigger } from "./types";

/**
 * Finds an active `@query` that ends at the caret. Returns null when the `@`
 * is part of a word (e.g. an email address), the query already contains a
 * space, or there is no `@` before the caret.
 */
export function detectTrigger(text: string, caret: number): Trigger | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;

  const charBefore = at === 0 ? "" : before[at - 1];
  if (charBefore !== "" && !/\s/.test(charBefore)) return null;

  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;

  return { query, start: at, end: caret };
}
