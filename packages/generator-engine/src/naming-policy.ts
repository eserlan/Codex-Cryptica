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

export const BANNED_NAMES = [
  "Aethel",
  "Aethelgard",
  "Vance",
  "Vane",
  "Elara",
  "Valerius",
  "Kael",
  "Kaelen",
  "Caelen",
  "Theron",
  "Zara",
  "Aldric",
  "Kane",
  "Drake",
  "Maren",
  "Cross",
  "Vale",
  "Stone",
  "Grey",
  "Ash",
  "Cole",
  "Thorne",
  "Voss",
  "Julian",
  "Julianne",
  "Halloway",
  "Oakhaven",
  "Oakhollow",
  "Millbrook",
  "Riverdale",
  "Verdant",
  "Verdant Reach",
  "Silas",
  "Vesper",
  "Sterling",
  "Blackwood",
  "Ironwood",
  "Ravenscroft",
] as const;

export const NAME_BAN_PROMPT =
  `Names must never include: ${BANNED_NAMES.join(", ")}. ` +
  `Avoid all similar generic fantasy placeholders and common English monosyllable surnames.`;

// ---------------------------------------------------------------------------
// Pattern-level repetition avoidance
//
// The ban list above only stops exact names/tokens. Models also fall into
// *families* — "Kaelthorn", "Kaelwyn", "Kaelorin" — that never trip it. These
// helpers detect recurring words, openings and endings in the titles a vault
// already has, so the prompt can steer away from them and the retry loops can
// reject a draft that joins the pattern. Pure and local: no extra AI call.
// ---------------------------------------------------------------------------

export interface OverusedNamePatterns {
  words: string[];
  prefixes: string[];
  suffixes: string[];
}

/** A word/opening/ending must show up in at least this many distinct titles... */
const PATTERN_MIN_TITLES = 3;
/** ...and in at least this share of all titles, so chance overlap in a big vault isn't flagged. */
const PATTERN_MIN_SHARE = 0.02;
/** Connectives and particles that appear in titles but are not name material. */
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "von",
  "van",
  "der",
  "den",
  "des",
  "del",
  "della",
  "los",
  "las",
  "les",
  "une",
  "with",
  "from",
  "into",
  "over",
  "under",
  "upon",
  "that",
  "this",
  "its",
  "his",
  "her",
  "their",
  "not",
  "but",
]);
/**
 * Common English openings/endings. Descriptive titles ("Burning Fields",
 * "Ancient Contest") share these by chance; they say nothing about an
 * invented-name family, so they are never reported.
 */
const COMMON_ENGLISH_SUFFIXES = new Set([
  "ing",
  "ion",
  "ons",
  "ers",
  "ent",
  "ant",
  "ter",
  "ler",
  "der",
  "ian",
  "ess",
  "est",
  "ate",
  "age",
  "ace",
  "ire",
  "nce",
  "ght",
  "tle",
  "ack",
  "ine",
  "nts",
  "tor",
  "ity",
  "ure",
  "ble",
  "ful",
  "ous",
  "ial",
  "ive",
  "ned",
  "ted",
  "ded",
  "les",
  "ies",
  "ger",
  "per",
  "ver",
  "ard",
  "ist",
]);
const COMMON_ENGLISH_PREFIXES = new Set([
  "con",
  "pro",
  "com",
  "dis",
  "des",
  "def",
  "gen",
  "int",
  "sta",
  "for",
  "per",
  "pre",
  "res",
  "sub",
  "sup",
  "tra",
  "und",
  "unt",
  "wit",
  "the",
]);
/** Opening/ending length compared across names. */
const AFFIX_LENGTH = 3;
/** Only tokens at least this long contribute an opening/ending (skips "of", "the"). */
const AFFIX_MIN_TOKEN_LENGTH = 5;
/** Keep the prompt fragment short. */
const MAX_PATTERNS_PER_KIND = 8;

function nameTokens(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function topRepeated(
  counts: Map<string, number>,
  minCount: number,
  ignore?: Set<string>,
): string[] {
  return [...counts.entries()]
    .filter(([key, n]) => n >= minCount && !ignore?.has(key))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_PATTERNS_PER_KIND)
    .map(([key]) => key);
}

/**
 * Finds words, openings and endings that recur across at least three distinct
 * titles (and 2% of all titles, for large vaults), ignoring connectives and
 * common English openings/endings. A title repeating a word against itself is counted once.
 */
export function findOverusedNamePatterns(
  titles: Iterable<string>,
  opts: { affixes?: boolean } = {},
): OverusedNamePatterns {
  const { affixes = true } = opts;
  const list = [...titles];
  const minCount = Math.max(
    PATTERN_MIN_TITLES,
    Math.ceil(list.length * PATTERN_MIN_SHARE),
  );
  const words = new Map<string, number>();
  const prefixes = new Map<string, number>();
  const suffixes = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string) =>
    map.set(key, (map.get(key) ?? 0) + 1);

  for (const title of list) {
    const tokens = [...new Set(nameTokens(title))];
    const seenPrefix = new Set<string>();
    const seenSuffix = new Set<string>();
    for (const token of tokens) {
      // Short connectives ("of", "the") are not name material.
      if (token.length >= AFFIX_LENGTH && !STOPWORDS.has(token)) {
        bump(words, token);
      }
      if (!affixes || token.length < AFFIX_MIN_TOKEN_LENGTH) continue;
      seenPrefix.add(token.slice(0, AFFIX_LENGTH));
      seenSuffix.add(token.slice(-AFFIX_LENGTH));
    }
    for (const p of seenPrefix) bump(prefixes, p);
    for (const s of seenSuffix) bump(suffixes, s);
  }

  return {
    words: topRepeated(words, minCount),
    prefixes: topRepeated(prefixes, minCount, COMMON_ENGLISH_PREFIXES),
    suffixes: topRepeated(suffixes, minCount, COMMON_ENGLISH_SUFFIXES),
  };
}

/** True when any token of the title is an overused word or shares an overused opening/ending. */
export function matchesOverusedPattern(
  title: string,
  patterns: OverusedNamePatterns,
): boolean {
  const { words, prefixes, suffixes } = patterns;
  if (!words.length && !prefixes.length && !suffixes.length) return false;
  for (const token of nameTokens(title)) {
    if (words.includes(token)) return true;
    if (token.length < AFFIX_MIN_TOKEN_LENGTH) continue;
    if (prefixes.includes(token.slice(0, AFFIX_LENGTH))) return true;
    if (suffixes.includes(token.slice(-AFFIX_LENGTH))) return true;
  }
  return false;
}

/** Prompt fragment steering away from patterns this vault already overuses. Returns "" when there are none. */
export function overusedPatternsInstruction(
  patterns: OverusedNamePatterns,
): string {
  const parts: string[] = [];
  if (patterns.words.length) {
    parts.push(`words (${patterns.words.join(", ")})`);
  }
  if (patterns.prefixes.length) {
    parts.push(
      `openings (${patterns.prefixes.map((p) => `"${p}-"`).join(", ")})`,
    );
  }
  if (patterns.suffixes.length) {
    parts.push(
      `endings (${patterns.suffixes.map((s) => `"-${s}"`).join(", ")})`,
    );
  }
  if (!parts.length) return "";
  return `This world's existing names already lean heavily on certain ${parts.join(" and ")}. Give the new name a clearly different sound and shape — do not reuse these, unless the name deliberately belongs to the same family, culture or place.`;
}

/** Titles longer than this are descriptions ("The Long Winter"), not names. */
const MAX_EXAMPLE_NAME_WORDS = 4;

/**
 * A random handful of the vault's own names, to show the model the sound of
 * this world by example. Examples anchor style far better than "avoid X"
 * lists, and a fresh sample each request keeps the anchor from being the same
 * few names every time. Skips blanks, duplicates and long descriptive titles.
 */
export function sampleNameExamples(
  titles: Iterable<string>,
  opts: { count?: number; rng?: () => number } = {},
): string[] {
  const { count = 10, rng = Math.random } = opts;
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const raw of titles) {
    const title = raw.trim();
    const key = title.toLowerCase();
    if (!title || seen.has(key)) continue;
    if (title.split(/\s+/).length > MAX_EXAMPLE_NAME_WORDS) continue;
    seen.add(key);
    pool.push(title);
  }
  const picked: string[] = [];
  while (picked.length < count && pool.length) {
    const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

/** Prompt fragment showing the world's naming style by example. Returns "" with no examples. */
export function nameExamplesInstruction(examples: string[]): string {
  if (!examples.length) return "";
  return `Existing names from this world, shown only so you can match their sound and style: ${examples.join(", ")}. Invent a new name in that spirit — do not reuse or lightly alter any of these.`;
}

/** Prompt fragment carrying the naming conventions the vault records for a culture. Returns "" without guidance. */
export function cultureNamingInstruction(
  culture: { culture: string; guidance: string[] } | undefined,
): string {
  if (!culture?.guidance.length) return "";
  const lines = culture.guidance.map((g) => `- ${g}`).join("\n");
  return `This vault records these naming conventions for the ${culture.culture} culture — follow them:\n${lines}`;
}
