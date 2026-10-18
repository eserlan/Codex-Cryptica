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

export interface BraceProblem {
  kind: "unclosed" | "empty";
  /** Offset of the opening brace. */
  index: number;
}

/**
 * Brace syntax that reads like a reference but is not one.
 *
 * Rolling treats these as literal text on purpose — a real brace in an entry
 * must never break a roll — but in the editor they are almost always a typo,
 * and saying so is cheaper than a user wondering why nothing expanded (FR-013).
 */
export function findBraceProblems(text: string): BraceProblem[] {
  const problems: BraceProblem[] = [];
  let open = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      // A second `{` abandons the first, exactly as parseReferences does.
      if (open !== -1) problems.push({ kind: "unclosed", index: open });
      open = i;
    } else if (ch === "}" && open !== -1) {
      if (text.slice(open + 1, i).trim().length === 0) {
        problems.push({ kind: "empty", index: open });
      }
      open = -1;
    }
  }

  if (open !== -1) problems.push({ kind: "unclosed", index: open });
  return problems;
}

/** True when the text contains at least one resolvable reference token. */
export function hasReferences(text: string): boolean {
  return parseReferences(text).length > 0;
}
