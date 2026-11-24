import { type Place, type StateFact } from "@codex/adventure-engine";
import {
  CUE_SYNONYMS,
  isArtworkCue,
  matchArtwork,
  type ArtworkAsset,
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

function isPrivateOrMappedCue(
  normalized: string,
  mapped: string,
  entityNames: ReadonlySet<string>,
): boolean {
  const cueWords = normalized.replace(/[^a-z0-9]+/g, " ").trim();
  const appearsInVisibleText = [...entityNames].some((visibleText) => {
    const visibleWords = ` ${visibleText.replace(/[^a-z0-9]+/g, " ").trim()} `;
    return visibleWords.includes(` ${cueWords} `);
  });
  return appearsInVisibleText || isArtworkCue(mapped);
}

function collectUnmappedStructuredCues(
  rawCues: readonly string[] | undefined,
  entityNames: ReadonlySet<string>,
): string[] {
  if (!rawCues || rawCues.length === 0) return [];
  const result = new Set<string>();
  for (const raw of rawCues) {
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (
      normalized.length === 0 ||
      normalized.length > 32 ||
      !SAFE_RAW_CUE_PATTERN.test(normalized)
    ) {
      continue;
    }
    const mapped = CUE_SYNONYMS[normalized] ?? normalized;
    if (!isPrivateOrMappedCue(normalized, mapped, entityNames)) {
      result.add(normalized);
    }
  }
  return [...result].sort();
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
}

type CueSession = ArtworkPlaceSession &
  Pick<ArtworkNpcSession, "visibleState"> & {
    places?: readonly Place[];
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

export function summarizeArtworkCues(
  session: CueSession | null,
  activeVaultId: string | null | undefined,
  entities: Readonly<Record<string, ArtworkPlaceEntity>>,
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
  const { hereCharacters } = filterHereCharacters(session);
  const entityNames = collectVisibleEntityNames(session.places, hereCharacters);

  return {
    genre,
    place: place
      ? {
          name: place.name,
          cues: placeCues?.primaryCues ?? [],
          unmappedCues: collectUnmappedStructuredCues(place.cues, entityNames),
          match: resolvePlaceCueMatch(placeSelected, placeCues, catalogue),
        }
      : null,
    npcs: hereCharacters.map((fact) =>
      summarizeNpcFact(fact, theme, catalogue, entityNames),
    ),
  };
}
