import {
  BIOME_REFERENCE_LINKS_MAX,
  BIOME_ALTERATION_ASPECTS,
  BIOME_OWN_TEXT_MAX,
  type BiomeAlteration,
  type BiomeAlterationAspect,
  type BiomeOwnFields,
  type BiomeProfile,
  type BiomeReferenceSnapshot,
  type Range,
  type ReferenceBiome,
  type Statement,
} from "./model";
import { formatRange, listBiomeSources } from "./format";

export const EDITABLE_ASPECTS = [
  "climate",
  "terrain",
  "vegetation",
  "water",
  "pressures",
  "notes",
] as const;

export type EditableAspect = (typeof EDITABLE_ASPECTS)[number];

export interface Departure {
  aspect: EditableAspect;
  /** The reference's text for this aspect ("" when there is no reference). */
  referenceSummary: string;
  ownText: string;
  changed: boolean;
}

const emptyOwn = (): BiomeOwnFields => ({
  climate: {},
  terrain: "",
  vegetation: "",
  water: "",
  pressures: "",
  notes: "",
});

const copyStatements = (statements: readonly Statement[]): Statement[] =>
  statements.map((s) => ({ ...s, sourceIds: [...s.sourceIds] }));

const copyRange = (range: Range | undefined): Range | undefined =>
  range ? { ...range } : undefined;

/** Snapshot a reference biome so the profile keeps its own copy of the values. */
export function createProfileFromReference(
  biome: ReferenceBiome,
  now: number,
): BiomeProfile {
  const reference: BiomeReferenceSnapshot = {
    biomeId: biome.id,
    name: biome.name,
    capturedAt: now,
    conditions: {
      temperature: copyRange(biome.conditions.temperature),
      precipitation: copyRange(biome.conditions.precipitation),
      elevation: copyRange(biome.conditions.elevation),
      seasonality: copyStatements(biome.conditions.seasonality),
      waterAvailability: copyStatements(biome.conditions.waterAvailability),
      notes: copyStatements(biome.conditions.notes),
    },
    landscape: copyStatements(biome.landscape),
    vegetation: copyStatements(biome.vegetation),
    wildlife: copyStatements(biome.wildlife),
    resources: copyStatements(biome.resources),
    hazards: copyStatements(biome.hazards),
    sourceIds: [...biome.sourceIds],
    sources: listBiomeSources(biome).map((source) => ({ ...source })),
  };
  return {
    version: 1,
    reference,
    own: emptyOwn(),
    alterations: [],
    referenceLinks: [],
  };
}

export function createBlankProfile(): BiomeProfile {
  return {
    version: 1,
    reference: null,
    own: emptyOwn(),
    alterations: [],
    referenceLinks: [],
  };
}

type TextField = Exclude<keyof BiomeOwnFields, "climate">;

export function setOwnField(
  profile: BiomeProfile,
  field: TextField,
  value: string,
): BiomeProfile {
  if (value.length > BIOME_OWN_TEXT_MAX) {
    throw new RangeError(
      `${field} can be at most ${BIOME_OWN_TEXT_MAX} characters.`,
    );
  }
  return { ...profile, own: { ...profile.own, [field]: value } };
}

export function setOwnClimate(
  profile: BiomeProfile,
  patch: Partial<BiomeOwnFields["climate"]>,
): BiomeProfile {
  if (
    patch.seasonality !== undefined &&
    patch.seasonality.length > BIOME_OWN_TEXT_MAX
  ) {
    throw new RangeError(
      `seasonality can be at most ${BIOME_OWN_TEXT_MAX} characters.`,
    );
  }
  return {
    ...profile,
    own: { ...profile.own, climate: { ...profile.own.climate, ...patch } },
  };
}

const joinText = (statements: readonly Statement[]) =>
  statements.map((s) => s.text).join(" ");

function climateSummary(reference: BiomeReferenceSnapshot): string {
  const parts: string[] = [];
  const { temperature, precipitation } = reference.conditions;
  if (temperature) parts.push(`Temperature: ${formatRange(temperature)}.`);
  if (precipitation)
    parts.push(`Rainfall and snow: ${formatRange(precipitation)}.`);
  parts.push(joinText(reference.conditions.seasonality));
  return parts.filter(Boolean).join(" ");
}

function referenceSummaryFor(
  aspect: EditableAspect,
  reference: BiomeReferenceSnapshot | null,
): string {
  if (!reference) return "";
  switch (aspect) {
    case "climate":
      return climateSummary(reference);
    case "terrain":
      return joinText(reference.landscape);
    case "vegetation":
      return joinText(reference.vegetation);
    case "water":
      return joinText(reference.conditions.waterAvailability);
    case "pressures":
      return joinText(reference.hazards);
    case "notes":
      return "";
  }
}

function ownTextFor(aspect: EditableAspect, own: BiomeOwnFields): string {
  if (aspect !== "climate") return own[aspect].trim();
  const parts: string[] = [];
  if (own.climate.temperature)
    parts.push(`Temperature: ${formatRange(own.climate.temperature)}.`);
  if (own.climate.precipitation)
    parts.push(`Rainfall and snow: ${formatRange(own.climate.precipitation)}.`);
  if (own.climate.seasonality?.trim())
    parts.push(own.climate.seasonality.trim());
  return parts.join(" ");
}

/** What the user changed against the reference, for each editable aspect. */
export function computeDepartures(profile: BiomeProfile): Departure[] {
  return EDITABLE_ASPECTS.map((aspect) => {
    const ownText = ownTextFor(aspect, profile.own);
    return {
      aspect,
      referenceSummary: referenceSummaryFor(aspect, profile.reference),
      ownText,
      changed: ownText.length > 0,
    };
  });
}

export interface AlterationInput {
  aspect: BiomeAlterationAspect;
  description: string;
  cause?: string;
  effects?: string[];
}

function checkAlteration(aspect: string, description: string): void {
  if (!BIOME_ALTERATION_ASPECTS.includes(aspect as BiomeAlterationAspect)) {
    throw new RangeError(`Unknown aspect: ${aspect}`);
  }
  if (description.trim().length === 0) {
    throw new RangeError("Describe what is different before adding it.");
  }
  if (description.length > BIOME_OWN_TEXT_MAX) {
    throw new RangeError(
      `A description can be at most ${BIOME_OWN_TEXT_MAX} characters.`,
    );
  }
}

/** Adds a fictional change. A cause is encouraged but never required. */
export function addAlteration(
  profile: BiomeProfile,
  input: AlterationInput,
  id: string,
): BiomeProfile {
  checkAlteration(input.aspect, input.description);
  const alteration: BiomeAlteration = {
    id,
    aspect: input.aspect,
    description: input.description,
    cause: input.cause ?? "",
    effects: input.effects ?? [],
  };
  return { ...profile, alterations: [...profile.alterations, alteration] };
}

export function updateAlteration(
  profile: BiomeProfile,
  id: string,
  patch: Partial<Omit<BiomeAlteration, "id">>,
): BiomeProfile {
  return {
    ...profile,
    alterations: profile.alterations.map((alteration) => {
      if (alteration.id !== id) return alteration;
      const next = { ...alteration, ...patch };
      checkAlteration(next.aspect, next.description);
      return next;
    }),
  };
}

export function removeAlteration(
  profile: BiomeProfile,
  id: string,
): BiomeProfile {
  return {
    ...profile,
    alterations: profile.alterations.filter((a) => a.id !== id),
  };
}

/** Keeps only https links (at most 10) and reports the addresses it left out. */
export function setReferenceLinks(
  profile: BiomeProfile,
  links: readonly { url: string; label: string }[],
): { profile: BiomeProfile; rejected: string[] } {
  const kept: { url: string; label: string }[] = [];
  const rejected: string[] = [];
  for (const link of links) {
    const url = link.url.trim();
    let isHttps: boolean;
    try {
      isHttps = new URL(url).protocol === "https:";
    } catch {
      isHttps = false;
    }
    if (isHttps && kept.length < BIOME_REFERENCE_LINKS_MAX) {
      kept.push({ url, label: link.label.trim() });
    } else {
      rejected.push(url);
    }
  }
  return { profile: { ...profile, referenceLinks: kept }, rejected };
}
