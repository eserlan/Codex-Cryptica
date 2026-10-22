import type { BiomeProfile, Statement } from "./model";

export const ILLUSTRATION_PROMPT_PREFIX = "fantasy, illustration of";
export const DEFAULT_PROMPT_MAX_LENGTH = 600;

const firstSentence = (text: string): string => {
  const trimmed = text.trim();
  const end = trimmed.search(/[.!?](\s|$)/);
  return (end === -1 ? trimmed : trimmed.slice(0, end)).trim();
};

const lead = (statements: readonly Statement[]): string | undefined =>
  statements[0] ? firstSentence(statements[0].text) : undefined;

/** Cut at a word boundary so the result is never longer than `max`. */
function hardTrim(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (
    space > ILLUSTRATION_PROMPT_PREFIX.length ? cut.slice(0, space) : cut
  ).replace(/[,;\s]+$/, "");
}

/** Clauses in priority order: fictional changes, the user's words, then the reference. */
function collectClauses(profile: BiomeProfile): string[] {
  const own = profile.own;
  const reference = profile.reference;
  const clauses = profile.alterations.map((alteration) =>
    firstSentence(alteration.description),
  );
  for (const text of [own.terrain, own.vegetation, own.water, own.pressures]) {
    if (text.trim()) clauses.push(firstSentence(text));
  }
  if (reference) {
    const fallbacks: [string, readonly Statement[]][] = [
      [own.terrain, reference.landscape],
      [own.vegetation, reference.vegetation],
      [own.water, reference.conditions.waterAvailability],
    ];
    for (const [ownText, statements] of fallbacks) {
      if (!ownText.trim()) clauses.push(lead(statements) ?? "");
    }
  }
  return clauses.filter(Boolean);
}

/**
 * A copyable prompt for an illustration tool. It always begins with
 * "fantasy, illustration of", puts the user's own words and fictional changes
 * first, and falls back to the reference for aspects the user left alone.
 */
export function buildIllustrationPrompt(
  profile: BiomeProfile,
  opts: { maxLength?: number; name?: string } = {},
): string {
  const maxLength = opts.maxLength ?? DEFAULT_PROMPT_MAX_LENGTH;
  const name =
    opts.name?.trim() || profile.reference?.name || "an imagined landscape";

  let prompt = `${ILLUSTRATION_PROMPT_PREFIX} ${name}`;
  for (const clause of collectClauses(profile)) {
    const next = `${prompt}, ${clause}`;
    if (next.length <= maxLength) prompt = next;
  }
  return hardTrim(prompt, maxLength);
}
