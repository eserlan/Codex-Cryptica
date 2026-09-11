/**
 * Shared banned-name enforcement policy. Both entity-creation paths —
 * the Generators panel (campaign-generator-registry.ts) and Oracle chat's
 * /create command (ai-engine's prompts/entity-creation.ts) — need to ban
 * the same names and check generated titles the same way. This used to be
 * duplicated (chat had its own hand-written ban prose that drifted out of
 * sync with no enforcement at all), which is exactly the kind of thing that
 * let a banned name slip through one path but not the other. Kept here as
 * the single source of truth so it can't drift again.
 */

/**
 * True when a generated title collides with a banned name. Matches whole tokens
 * case-insensitively (splitting on spaces, hyphens, punctuation, and accents
 * preserved) so derivatives like "Vane-Smithe" are caught for a banned "Vane",
 * while substrings inside a larger word ("Vanessa") are not.
 */
export function isTitleBanned(
  title: string,
  banned: Iterable<string>,
): boolean {
  const normalize = (s: string) =>
    ` ${s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()} `;
  const haystack = normalize(title);
  for (const name of banned) {
    const needle = normalize(name).trim();
    if (needle && haystack.includes(` ${needle} `)) return true;
  }
  return false;
}

/**
 * Prompt fragment banning a set of names as the title of the entity being
 * generated now. Returns "" when there's nothing to ban, so callers can
 * inline the result without a conditional.
 */
export function bannedNamesInstruction(names: Iterable<string>): string {
  const all = [...names];
  if (!all.length) return "";
  return `This ban applies only to the "title" of the entity you are generating now — do NOT title it any of these names, or a hyphenated/compound variation of one (e.g. if "Vane" is listed, do not title it "Vane-Smithe"): ${all.join(", ")}. These are existing entities and may still be referenced normally elsewhere (in "lore", "summary", or "connections") whenever they belong in the content — the ban is on reusing the name as this new entity's own title, not on mentioning them.`;
}
