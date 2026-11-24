import { type Place, type StateFact } from "@codex/adventure-engine";
import {
  CUE_SYNONYMS,
  isArtworkCue,
  matchArtwork,
  normalizeArtworkCues,
  resolveSceneWithAtmosphere,
  type ArtworkAsset,
  type ArtworkCues,
} from "@codex/adventure-artwork-engine";
import {
  artworkGenreForTheme,
  describeVisiblePerson,
  describeVisiblePlace,
} from "./artwork-resolver";
import {
  currentPlaceSelection,
  type ArtworkPlaceEntity,
  type ArtworkPlaceSession,
} from "./current-place-selection";
import {
  filterHereCharacters,
  type ArtworkNpcSession,
} from "./npc-portrait-selection";

const SAFE_RAW_CUE_PATTERN = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/;

function normalizeSafeStructuredCue(raw: string): string | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized.length > 0 &&
    normalized.length <= 32 &&
    SAFE_RAW_CUE_PATTERN.test(normalized)
    ? normalized
    : null;
}

function isPrivateOrArtworkCue(
  normalized: string,
  entityNames: ReadonlySet<string>,
): boolean {
  if (isArtworkCue(CUE_SYNONYMS[normalized] ?? normalized)) return true;
  const cueWords = ` ${normalized.replace(/[^a-z0-9]+/g, " ").trim()} `;
  return [...entityNames].some((visibleText) => {
    const visibleWords = ` ${visibleText.replace(/[^a-z0-9]+/g, " ").trim()} `;
    return visibleWords.includes(cueWords);
  });
}

function collectUnmappedStructuredCues(
  rawCues: readonly string[] | undefined,
  entityNames: ReadonlySet<string>,
): string[] {
  const unmapped = (rawCues ?? [])
    .map(normalizeSafeStructuredCue)
    .filter((cue): cue is string => cue !== null)
    .filter((cue) => !isPrivateOrArtworkCue(cue, entityNames));
  return [...new Set(unmapped)].sort();
}

const MONSTER_CUES = new Set<string>([
  "monster",
  "creature",
  "beast",
  "undead",
  "aberration",
  "fiend",
  "dragon",
]);

const ATMOSPHERE_CUES = new Set<string>([
  "quiet",
  "busy",
  "ominous",
  "hopeful",
  "mysterious",
  "day",
  "night",
  "dawn",
  "dusk",
  "rain",
  "fog",
  "winter",
  "summer",
]);

export interface CueSummarySlot {
  cues: readonly string[];
  unmappedCues: readonly string[];
  match: string | null;
}

export interface ArtworkCueIndicator {
  genre: string;
  place: {
    name: string;
    cues: readonly string[];
    unmappedCues?: readonly string[];
    match: string | null;
  } | null;
  npcs: Array<{
    name: string;
    cues: readonly string[];
    unmappedCues?: readonly string[];
    demographicCues?: readonly string[];
    match: string | null;
  }>;
  scene?: CueSummarySlot | null;
  atmosphere?: CueSummarySlot | null;
  monsters?: Array<{
    name: string;
    cues: readonly string[];
    unmappedCues: readonly string[];
    match: string | null;
  }>;
}

type CueSession = ArtworkPlaceSession &
  Pick<ArtworkNpcSession, "visibleState"> & {
    places?: readonly Place[];
    currentSituation?: string | null;
  };

function collectVisibleEntityNames(
  places: readonly Place[] | undefined,
  facts: readonly StateFact[],
): Set<string> {
  const names = new Set<string>();
  for (const place of places ?? []) {
    const normalized = place.name.trim().toLowerCase().replace(/\s+/g, " ");
    if (normalized) names.add(normalized);
  }
  for (const fact of facts) {
    const firstPart = fact.text.split(/[.,:—–-]/, 1)[0];
    const normalizedName = firstPart?.trim().toLowerCase().replace(/\s+/g, " ");
    if (normalizedName) names.add(normalizedName);
    const visibleText = fact.text.trim().toLowerCase().replace(/\s+/g, " ");
    if (visibleText) names.add(visibleText);
  }
  return names;
}

/** Summarize active place/NPC artwork cues and whether the catalogue matched them. */
function resolvePlaceCueMatch(
  placeSelected: ReturnType<typeof currentPlaceSelection>,
  placeCues: ReturnType<typeof describeVisiblePlace>,
  catalogue: readonly ArtworkAsset[],
): string | null {
  if (placeSelected?.kind === "catalogue") return placeSelected.asset.id;
  if (placeSelected) return `${placeSelected.kind}:${placeSelected.image}`;
  return placeCues ? (matchArtwork(catalogue, placeCues)?.id ?? null) : null;
}

function summarizeNpcFact(
  fact: StateFact,
  theme: string | undefined,
  catalogue: readonly ArtworkAsset[],
  entityNames: ReadonlySet<string>,
): {
  name: string;
  cues: readonly string[];
  unmappedCues: readonly string[];
  demographicCues: readonly string[];
  match: string | null;
} {
  const firstPart = fact.text.split(/[.,:—–-]/, 1)[0];
  const name = firstPart ? firstPart.trim() : fact.text;
  const unmappedCues = collectUnmappedStructuredCues(fact.cues, entityNames);
  const cues = describeVisiblePerson(
    { id: fact.id, name, aliases: [], sourceRecordId: fact.sourceRecordId },
    theme,
    { facts: fact.cues ? [fact.text, ...fact.cues] : [fact.text] },
  );
  if (!cues) {
    return { name, cues: [], unmappedCues, demographicCues: [], match: null };
  }
  const matched = matchArtwork(catalogue, cues);
  return {
    name,
    cues: cues.primaryCues,
    unmappedCues,
    demographicCues: cues.demographicCues ? cues.demographicCues : [],
    match: matched ? matched.id : null,
  };
}

function isMonsterFact(
  fact: StateFact,
  entities: Readonly<Record<string, ArtworkPlaceEntity & { type?: string }>>,
): boolean {
  const entityType = fact.sourceRecordId
    ? entities[fact.sourceRecordId]?.type
    : undefined;
  if (entityType === "Creature") return true;
  return (fact.cues ?? []).some((cue) =>
    MONSTER_CUES.has(cue.trim().toLowerCase()),
  );
}

function summarizeMonsterFact(
  fact: StateFact,
  theme: string | undefined,
  catalogue: readonly ArtworkAsset[],
  entityNames: ReadonlySet<string>,
): {
  name: string;
  cues: readonly string[];
  unmappedCues: readonly string[];
  match: string | null;
} {
  const firstPart = fact.text.split(/[.,:—–-]/, 1)[0];
  const name = firstPart ? firstPart.trim() : fact.text;
  const cues = describeVisiblePerson(
    { id: fact.id, name, aliases: [], sourceRecordId: fact.sourceRecordId },
    theme,
    { facts: fact.cues ? [fact.text, ...fact.cues] : [fact.text] },
  );
  const unmappedCues = collectUnmappedStructuredCues(fact.cues, entityNames);
  const matched = cues ? matchArtwork(catalogue, cues) : null;
  return {
    name,
    cues: cues ? cues.primaryCues : [],
    unmappedCues,
    match: matched ? matched.id : null,
  };
}

function summarizeAtmosphereSlot(
  atmoCues: readonly string[],
  genre: NonNullable<ArtworkCues["genre"]>,
  catalogue: readonly ArtworkAsset[],
): CueSummarySlot | undefined {
  if (atmoCues.length === 0) return undefined;
  const asset = matchArtwork(catalogue, {
    type: "atmosphere",
    genre,
    primaryCues: atmoCues,
  });
  return { cues: atmoCues, unmappedCues: [], match: asset ? asset.id : null };
}

function summarizeSceneSlot(
  normalized: readonly string[],
  place: Place | null,
  entityNames: ReadonlySet<string>,
  genre: NonNullable<ArtworkCues["genre"]>,
  atmoMatch: string | null,
  placeMatch: string | null,
  catalogue: readonly ArtworkAsset[],
): CueSummarySlot | undefined {
  if (normalized.length === 0) return undefined;
  const sceneAsset = matchArtwork(catalogue, {
    type: "scene",
    genre,
    primaryCues: normalized,
  });
  const resolved = resolveSceneWithAtmosphere({
    hasExplicitCommittedScene: true,
    sceneSelection: sceneAsset
      ? { kind: "catalogue", assetId: sceneAsset.id }
      : { kind: "none" },
    atmosphereMatch: atmoMatch,
    locationSelection: placeMatch
      ? { kind: "catalogue", assetId: placeMatch }
      : { kind: "none" },
  });
  return {
    cues: normalized,
    unmappedCues: collectUnmappedStructuredCues(
      place ? place.cues : undefined,
      entityNames,
    ),
    match: resolved.kind === "catalogue" ? resolved.assetId : null,
  };
}

function collectSceneCues(
  place: Place | null,
  currentSituation: string | null | undefined,
): string[] {
  const situationWords = currentSituation
    ? (currentSituation.toLowerCase().match(/[a-z]+/g) ?? [])
    : [];
  const placeCues = place && place.cues ? place.cues : [];
  return normalizeArtworkCues([...placeCues, ...situationWords]);
}

function summarizeSceneAndAtmosphere(
  place: Place | null,
  currentSituation: string | null | undefined,
  entityNames: ReadonlySet<string>,
  genre: NonNullable<ArtworkCues["genre"]>,
  placeMatch: string | null,
  catalogue: readonly ArtworkAsset[],
): { scene?: CueSummarySlot; atmosphere?: CueSummarySlot } {
  const normalized = collectSceneCues(place, currentSituation);
  const atmoCues = normalized.filter((c) => ATMOSPHERE_CUES.has(c));
  const atmosphere = summarizeAtmosphereSlot(atmoCues, genre, catalogue);
  if (!currentSituation) return atmosphere ? { atmosphere } : {};

  const scene = summarizeSceneSlot(
    normalized,
    place,
    entityNames,
    genre,
    atmosphere ? atmosphere.match : null,
    placeMatch,
    catalogue,
  );
  return {
    ...(scene ? { scene } : {}),
    ...(atmosphere ? { atmosphere } : {}),
  };
}

export function summarizeArtworkCues(
  session: CueSession | null,
  activeVaultId: string | null | undefined,
  entities: Readonly<Record<string, ArtworkPlaceEntity & { type?: string }>>,
  enabled: boolean,
  theme: string | undefined,
  catalogue: readonly ArtworkAsset[],
): ArtworkCueIndicator | null {
  if (!session || session.vaultId !== activeVaultId) return null;
  const genre = artworkGenreForTheme(theme) ?? "neutral";
  const place =
    session.places?.find((item) => item.id === session.currentPlaceId) ?? null;
  const placeCues = place ? describeVisiblePlace(place, theme) : null;
  const placeSelected = currentPlaceSelection(
    session,
    activeVaultId,
    entities,
    enabled,
    catalogue,
    theme,
  );
  const placeMatch = resolvePlaceCueMatch(placeSelected, placeCues, catalogue);
  const { hereCharacters } = filterHereCharacters(session);
  const entityNames = collectVisibleEntityNames(session.places, hereCharacters);
  const monsterFacts = hereCharacters.filter((fact) =>
    isMonsterFact(fact, entities),
  );
  const npcFacts = hereCharacters.filter(
    (fact) => !isMonsterFact(fact, entities),
  );
  const envSlots = summarizeSceneAndAtmosphere(
    place,
    session.currentSituation,
    entityNames,
    genre,
    placeMatch,
    catalogue,
  );
  const monsters = monsterFacts.map((fact) =>
    summarizeMonsterFact(fact, theme, catalogue, entityNames),
  );

  return {
    genre,
    place: place
      ? {
          name: place.name,
          cues: placeCues?.primaryCues ?? [],
          unmappedCues: collectUnmappedStructuredCues(place.cues, entityNames),
          match: placeMatch,
        }
      : null,
    npcs: npcFacts.map((fact) =>
      summarizeNpcFact(fact, theme, catalogue, entityNames),
    ),
    ...envSlots,
    ...(monsters.length > 0 ? { monsters } : {}),
  };
}
