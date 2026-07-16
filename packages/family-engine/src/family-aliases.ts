import type { FamilyConnectionType } from "./family-types";

export interface FamilyAliasMatch {
  type: FamilyConnectionType;
  /** Display term describing the SOURCE's role (e.g. "Mother"), for the forward connection's label. */
  label: string;
}

/**
 * Curated relationship phrases resolved to a canonical family connection type
 * plus a display label, so freeform text like "Mother of" (typed when
 * connecting entities outside the dedicated Family tab) still produces a
 * structural family link rather than an unrecognized generic connection.
 *
 * Each phrase describes the SOURCE's role relative to the target (e.g.
 * "[source] is Mother of [target]"), so `type` is oriented source -> target.
 * Only "of"/"to"-suffixed phrasing is matched (never a bare word like
 * "parent"): the suffix is what makes the direction unambiguous, and a bare
 * relationship word already means something different elsewhere in this app
 * (the Family tab's "Add parent" labels the TARGET's role, the opposite
 * direction). Matched as a prefix so trailing text ("Mother of the Queen")
 * still hits.
 */
const ALIASES: Array<{
  pattern: RegExp;
  type: FamilyConnectionType;
  label: string;
}> = [
  { pattern: /^mother\s+of\b/i, type: "parent_of", label: "Mother" },
  { pattern: /^father\s+of\b/i, type: "parent_of", label: "Father" },
  { pattern: /^parent\s+of\b/i, type: "parent_of", label: "Parent" },
  { pattern: /^daughter\s+of\b/i, type: "child_of", label: "Daughter" },
  { pattern: /^son\s+of\b/i, type: "child_of", label: "Son" },
  { pattern: /^child\s+of\b/i, type: "child_of", label: "Child" },
  { pattern: /^husband\s+of\b/i, type: "spouse_of", label: "Husband" },
  { pattern: /^wife\s+of\b/i, type: "spouse_of", label: "Wife" },
  { pattern: /^spouse\s+of\b/i, type: "spouse_of", label: "Spouse" },
  { pattern: /^married\s+to\b/i, type: "spouse_of", label: "Spouse" },
  { pattern: /^brother\s+of\b/i, type: "sibling_of", label: "Brother" },
  { pattern: /^sister\s+of\b/i, type: "sibling_of", label: "Sister" },
  { pattern: /^sibling\s+of\b/i, type: "sibling_of", label: "Sibling" },
];

/**
 * Resolves a freeform relationship phrase to a canonical family connection
 * type + display label, or `null` if it doesn't match a known alias.
 */
export function resolveFamilyAlias(phrase: string): FamilyAliasMatch | null {
  const trimmed = phrase.trim();
  if (!trimmed) return null;
  for (const { pattern, type, label } of ALIASES) {
    if (pattern.test(trimmed)) return { type, label };
  }
  return null;
}
