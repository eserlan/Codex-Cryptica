/**
 * Art Direction v2 — subject preparation.
 *
 * The `{subject}` layer must describe what is visually present, never who it
 * is. Proper names carry no visual information and push models toward
 * whatever they associate with that string, so they are removed before the
 * prompt is composed. Names remain in metadata for provenance.
 */

/** Filler that adds no visual information and dilutes the rest of the prompt. */
const FILLER_TERMS = [
  "epic",
  "8k",
  "4k",
  "masterpiece",
  "super heroic",
  "superheroic",
  "hyperdetailed",
  "hyper detailed",
  "ultra detailed",
  "highly detailed",
  "trending on artstation",
  "artstation",
  "award winning",
  "award-winning",
  "best quality",
  "photorealistic masterpiece",
  "cinematic masterpiece",
];

/**
 * Leading appositive connectors. `Valerius, a weary veteran officer` becomes
 * `a weary veteran officer` rather than a dangling `, a weary veteran officer`.
 */
const APPOSITIVE_LEAD = /^\s*,\s*(?:an?|the)\s+/i;

export interface SubjectPreparationOptions {
  /** Proper names to strip — entity title, aliases, linked entity titles. */
  names?: (string | undefined)[];
  /**
   * Descriptive phrase substituted when stripping a name would leave the
   * subject without a head noun, e.g. `male human veteran officer`.
   */
  descriptor?: string;
  /** Drop known filler terms. Defaults to true. */
  stripFiller?: boolean;
}

export interface PreparedSubject {
  /** The anonymised, provider-bound subject text. */
  subject: string;
  /** Names that were found and removed, for diagnostics and metadata. */
  removedNames: string[];
  /** True when a descriptor had to stand in for a stripped head noun. */
  usedDescriptor: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Collects the distinct name tokens worth stripping. A multi-word title like
 * `Blackfang Keep` is matched whole; its individual words are matched too so
 * later references to just `Blackfang` are caught. Words shorter than three
 * characters and common nouns embedded in titles are left alone to avoid
 * mangling ordinary text.
 */
const TITLE_COMMON_NOUNS = new Set([
  "keep",
  "tower",
  "city",
  "guild",
  "order",
  "company",
  "council",
  "house",
  "clan",
  "crew",
  "gate",
  "hall",
  "fort",
  "temple",
  "the",
  "of",
  "and",
]);

function collectNameTokens(names: (string | undefined)[]): string[] {
  const tokens = new Set<string>();

  for (const raw of names) {
    const name = (raw || "").trim();
    if (name.length < 3) continue;
    tokens.add(name);

    const words = name.split(/\s+/).filter(Boolean);
    if (words.length < 2) continue;
    for (const word of words) {
      const bare = word.replace(/[^\p{L}\p{N}'-]/gu, "");
      if (bare.length < 3) continue;
      if (TITLE_COMMON_NOUNS.has(bare.toLowerCase())) continue;
      tokens.add(bare);
    }
  }

  // Longest first so `Blackfang Keep` is removed before `Blackfang`.
  return Array.from(tokens).sort((a, b) => b.length - a.length);
}

function tidy(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,;:])\s*(?=[,.;:])/g, "")
    .replace(/^[\s,;:.\-–—]+/, "")
    .replace(/[\s,;:\-–—]+$/, "")
    .trim();
}

/**
 * Removes proper names and filler from a subject line, leaving a purely
 * descriptive phrase safe to send to an image provider.
 */
export function prepareSubject(
  rawSubject: string,
  options: SubjectPreparationOptions = {},
): PreparedSubject {
  let subject = (rawSubject || "").trim();
  const removedNames: string[] = [];

  const tokens = collectNameTokens(options.names || []);
  for (const token of tokens) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(token)}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    if (!pattern.test(subject)) continue;
    removedNames.push(token);
    subject = subject.replace(pattern, " ");
  }

  if (options.stripFiller !== false) {
    for (const filler of FILLER_TERMS) {
      subject = subject.replace(
        new RegExp(
          `(?<![\\p{L}\\p{N}])${escapeRegExp(filler)}(?![\\p{L}\\p{N}])`,
          "giu",
        ),
        " ",
      );
    }
  }

  // Run before tidy, while the appositive comma left behind by the removed
  // name is still present: `Valerius, a weary officer` → `weary officer`.
  subject = subject.replace(APPOSITIVE_LEAD, "");
  subject = tidy(subject);

  // Stripping a name can leave the phrase with no head noun at all
  // (`Valerius` alone) or a dangling modifier. Fall back to the descriptor.
  let usedDescriptor = false;
  const descriptor = (options.descriptor || "").trim();
  if (descriptor && (!subject || subject.length < 3)) {
    subject = descriptor;
    usedDescriptor = true;
  } else if (
    descriptor &&
    removedNames.length > 0 &&
    startsWithModifier(subject)
  ) {
    subject = tidy(`${descriptor} ${subject}`);
    usedDescriptor = true;
  }

  return { subject, removedNames, usedDescriptor };
}

/**
 * True when the phrase opens with a connector that needs a noun in front of
 * it, e.g. `wearing a patched coat` or `with a scarred breastplate`.
 */
function startsWithModifier(value: string): boolean {
  return /^(?:wearing|holding|carrying|wielding|with|in|standing|seated|clad)\b/i.test(
    value,
  );
}

/** Terms that signal a subject is leaning on mood instead of physical fact. */
export const SUBJECT_FILLER_TERMS: readonly string[] = FILLER_TERMS;
