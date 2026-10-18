import {
  GeneratorMechanicsBundleSchema,
  type GeneratorMechanicsBundle,
} from "./tov-mechanics-schema";

const HOMEBREW_DOOM_CLAIM_PATTERN =
  /\b(creature-only|boss-only|not an? (universal |encounter[- ]level )?gm pool|scoped strictly to individual creatures)\b/i;

const INVENTED_DOOM_SPEND_PATTERN =
  /\b(summon|reinforcement|extinguish|snuff|teleport|heal|regain hit points|temporary hit points|lair action|lair hazard|environmental hazard|battlefield hazard|villain action|villainous action|legendary action|as a reaction|initiative count|aoe|area of effect|bonus damage|extra damage)\b/i;

const PUBLISHED_DOOM_CONCEPT_PATTERN =
  /\b(advantage|disadvantage|refresh|recharge|additional use|extra use|limited-use|encounter pool|encounter-level|cr-based)\b/i;

/**
 * Returns true only when `doomNotes` aligns with the published BFRD optional
 * encounter-level Doom rule and its published spends (advantage on a creature's
 * attack, disadvantage on a PC's save, or once-per-encounter refresh, recharge,
 * or one additional use of a limited-use feature), without invented creature
 * spends or creature-only scope claims.
 */
export function isPublishedBfrdDoomGuidance(doomNotes: string): boolean {
  const trimmed = doomNotes.trim();
  if (!trimmed) return false;
  if (/\bhomebrew\b/i.test(trimmed)) return false;
  if (HOMEBREW_DOOM_CLAIM_PATTERN.test(trimmed)) return false;
  if (INVENTED_DOOM_SPEND_PATTERN.test(trimmed)) return false;
  return PUBLISHED_DOOM_CONCEPT_PATTERN.test(trimmed);
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
