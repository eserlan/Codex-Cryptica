import type { Reference } from "./types";

/**
 * Reference parsing.
 *
 * Syntax is brace-delimited (`{creature}`), matching the convention in other
 * table tools and staying readable in exported files. Anything malformed —
 * unclosed, empty, whitespace-only, or a stray closing brace — is literal text
 * rather than a parse error, so a user typing a real brace never sees a failure.
 */
export function parseReferences(text: string): Reference[] {
  const refs: Reference[] = [];
  let open = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      // A second `{` restarts the token: in "{a{b}" only "{b}" is well-formed.
      open = i;
    } else if (ch === "}" && open !== -1) {
      const raw = text.slice(open, i + 1);
      const name = raw.slice(1, -1).trim();
      if (name.length > 0) {
        refs.push({ raw, name, start: open, end: i + 1 });
      }
      open = -1;
    }
  }

  return refs;
}

/** True when the text contains at least one resolvable reference token. */
export function hasReferences(text: string): boolean {
  return parseReferences(text).length > 0;
}
