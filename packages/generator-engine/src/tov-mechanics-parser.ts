import {
  GeneratorMechanicsBundleSchema,
  type GeneratorMechanicsBundle,
} from "./tov-mechanics-schema";

const PUBLISHED_DOOM_POOL_SCOPE_PATTERN =
  /\b(?:encounter(?:[- ]level|[- ]wide)?\s+(?:gm\s+)?doom\s+(?:resource\s+)?pool|doom\s+pool for (?:the )?encounter|start(?:ing)? (?:the )?encounter with (?:a )?(?:cr[- ]based )?(?:gm )?doom pool)\b/i;

const HOMEBREW_DOOM_SCOPE_PATTERN =
  /\b(creature-only|boss-only|not an? (universal |encounter[- ]level )?gm pool|scoped strictly to individual creatures)\b/i;

const PUBLISHED_DOOM_CR_BASIS_PATTERN =
  /\b(?:cr[- ]based|based on (?:the )?(?:encounter )?cr)\b/i;

const PUBLISHED_DOOM_SPEND_PATTERN =
  /\b(?:advantage on (?:an? |the )?(?:creature'?s? )?attack|disadvantage on (?:an? |the )?(?:pc'?s? )?save|(?:once[- ]per[- ]encounter )?(?:refresh|recharge)|(?:gain|grant) (?:one |an? )?(?:additional |extra )?use of a limited[- ]use feature)\b/i;

const NON_PUBLISHED_DOOM_SPEND_PATTERN =
  /\b(?:summon|reinforcement|extinguish|snuff|teleport|heal|regain hit points|temporary hit points|lair action|lair hazard|environmental hazard|battlefield hazard|villain action|villainous action|legendary action|as a reaction|initiative count|aoe|area of effect|bonus damage|extra damage|reroll|re-roll)\b/i;

const UNRECOGNIZED_DOOM_SPEND_PATTERN =
  /\b(?:or|and)\s+(?!(?:once[- ]per[- ]encounter\s+)?(?:give|grant|refresh|recharge|gain)\b)(?!(?:a|an|the)\b)[a-z]+\b/i;

/**
 * Returns true only when `doomNotes` establishes the published encounter-level
 * CR-based Doom pool and at least one published spend. The classifier fails
 * closed when the text lacks that evidence or a Doom-related clause names a
 * known custom spend; unrelated sentences are ignored.
 */
export function isPublishedBfrdDoomGuidance(doomNotes: string): boolean {
  const trimmed = doomNotes.trim();
  if (!trimmed) return false;
  if (/\bhomebrew\b/i.test(trimmed)) return false;
  const clauses = trimmed.split(/(?<=[.!?;])\s+|\n+/);
  const doomClauses = clauses.filter((clause) => /\bdoom\b/i.test(clause));
  if (
    !doomClauses.length ||
    HOMEBREW_DOOM_SCOPE_PATTERN.test(trimmed) ||
    !PUBLISHED_DOOM_POOL_SCOPE_PATTERN.test(trimmed) ||
    !PUBLISHED_DOOM_CR_BASIS_PATTERN.test(trimmed) ||
    !PUBLISHED_DOOM_SPEND_PATTERN.test(trimmed)
  ) {
    return false;
  }

  return !doomClauses.some(
    (clause) =>
      NON_PUBLISHED_DOOM_SPEND_PATTERN.test(clause) ||
      UNRECOGNIZED_DOOM_SPEND_PATTERN.test(clause),
  );
}

function normalizeTovMechanicsBundle(
  bundle: GeneratorMechanicsBundle,
): GeneratorMechanicsBundle {
  if (bundle.kind !== "tov-encounter") {
    return bundle;
  }

  let { doomNotes } = bundle.data;
  let dataIsHomebrew = bundle.data.isHomebrew;
  let bundleIsHomebrew = bundle.isHomebrew || dataIsHomebrew;

  if (doomNotes && !isPublishedBfrdDoomGuidance(doomNotes)) {
    dataIsHomebrew = true;
    bundleIsHomebrew = true;
    if (!/\bhomebrew\b/i.test(doomNotes)) {
      doomNotes = `${doomNotes.trim()} [Homebrew]`;
    }
  }

  return {
    ...bundle,
    isHomebrew: bundleIsHomebrew,
    data: {
      ...bundle.data,
      doomNotes,
      isHomebrew: dataIsHomebrew,
    },
  };
}

/**
 * Safely parses and validates a Tales of the Valiant mechanics bundle from
 * an unknown raw value (object, nested `{ mechanics: ... }`, or JSON string).
 * Returns `undefined` if validation fails or input is missing.
 */
export function parseTovMechanics(
  raw: unknown,
): GeneratorMechanicsBundle | undefined {
  if (!raw) return undefined;

  let candidate = raw;

  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return undefined;
    }
  }

  if (typeof candidate !== "object" || candidate === null) {
    return undefined;
  }

  // If wrapped under a `mechanics` key
  if ("mechanics" in candidate && candidate.mechanics) {
    const wrappedResult = GeneratorMechanicsBundleSchema.safeParse(
      candidate.mechanics,
    );
    if (wrappedResult.success) {
      return normalizeTovMechanicsBundle(wrappedResult.data);
    }
  }

  // Direct parse
  const directResult = GeneratorMechanicsBundleSchema.safeParse(candidate);
  if (directResult.success) {
    return normalizeTovMechanicsBundle(directResult.data);
  }

  return undefined;
}
