/**
 * Shared handling for the "Add campaign context" field every public generator
 * exposes.
 *
 * The field is one box doing two jobs: it describes the world the result has
 * to fit into, and it is the only place a user can steer generation in their
 * own words. Both jobs fail the same way — the model reads it as background
 * flavour, keeps the dropdowns, and renames whatever the user named.
 *
 * So the text gets its own block stating it outranks the form's selections,
 * with the names it introduces pinned. That mirrors what the in-app campaign
 * generator already does through `instructionsBlock`, which wraps user free
 * text in a HIGHEST PRIORITY header rather than listing it as one option among
 * many.
 *
 * Deadlines are deliberately not handled here. Promoting one only means
 * something where the output has somewhere to put it — adventure has a
 * trackable clock in `primaryObjective`, an NPC or a magic item has nothing.
 * That logic stays in the generators that can act on it.
 */

/**
 * Words that read as a deadline or a "before X happens" consequence.
 * Used by generators whose output has a pressure field to fill.
 */
const DEADLINE_PATTERNS = [
  /\bbefore\b/i,
  /\bunless\b/i,
  /\buntil\b/i,
  /\bby (?:dawn|dusk|midnight|nightfall|morning|sunrise|sunset|the end of)\b/i,
  /\bwithin \w+ (?:hour|day|week|month|cycle|shift)/i,
  /\bin \w+ (?:hours|days|weeks|months|cycles|shifts)\b/i,
  /\b(?:deadline|countdown|ticking|running out|too late)\b/i,
];

/**
 * Capitalised sequences the user's own text introduces — the people, places,
 * ships and organisations a result must keep rather than rename.
 *
 * A word that merely opens a sentence is skipped: "Investigate a series of
 * telemetry dropouts..." starts with a capital but names nothing. Multi-word
 * sequences and tokens carrying a digit or an internal hyphen ("Aurelia-7",
 * "Phobos-Zero") are kept wherever they appear, since sentence position tells
 * us nothing useful about those.
 */
export function extractProperNouns(text: string): string[] {
  const found = new Set<string>();
  for (const sentence of text.split(/(?<=[.!?;:\n])\s+/)) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    const pattern =
      /\b[A-Z][A-Za-z0-9]*(?:[-'’][A-Za-z0-9]+)*(?:\s+[A-Z][A-Za-z0-9]*(?:[-'’][A-Za-z0-9]+)*)*/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(trimmed))) {
      const candidate = match[0].trim();
      if (candidate.length < 3) continue;
      const isSentenceStart = match.index === 0;
      const isMultiWord = /\s/.test(candidate);
      const isDistinctiveToken =
        /[0-9]/.test(candidate) || /[-'’]/.test(candidate);
      if (isSentenceStart && !isMultiWord && !isDistinctiveToken) continue;
      found.add(candidate);
    }
  }
  return [...found];
}

/** True when the text states its own deadline or "before X" consequence. */
export function statesDeadline(text: string): boolean {
  return DEADLINE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * The session's "already used" names, minus anything the user's own text
 * introduced. Context handed over from another generator names entities that
 * generator has already registered as used — telling the model to avoid those
 * would defeat the point of supplying the context at all.
 */
export function avoidNamesExcludingContext(
  avoidNames: string[],
  context?: string,
): string[] {
  if (!context?.trim()) return avoidNames;
  const contextNouns = extractProperNouns(context).map((n) => n.toLowerCase());
  return avoidNames.filter((name) => {
    const lower = name.trim().toLowerCase();
    if (!lower) return true;
    return !contextNouns.some(
      (noun) => noun.includes(lower) || lower.includes(noun),
    );
  });
}

/**
 * Format the campaign context field as a binding block.
 *
 * Returns an empty string for empty input, so callers can interpolate it
 * unconditionally.
 */
export function formatCampaignContextBlock(context?: string): string {
  const trimmed = context?.trim();
  if (!trimmed) return "";
  const properNouns = extractProperNouns(trimmed);
  return [
    // Two leading breaks: callers interpolate this straight after an options
    // list line, so the block needs its own blank line to read as a block.
    ``,
    ``,
    `[HIGHEST PRIORITY — Campaign context, supplied by the user]`,
    trimmed,
    ``,
    `What you generate must fit this context and belong in the world it`,
    `describes. Where it conflicts with the options selected above, this wins.`,
    ...(properNouns.length > 0
      ? [
          `The names below are established. Use each one spelled exactly as`,
          `written; do not rename, translate, or substitute them, and do not`,
          `treat them as names to avoid: ${properNouns.join(", ")}.`,
        ]
      : []),
    ``,
  ].join("\n");
}
