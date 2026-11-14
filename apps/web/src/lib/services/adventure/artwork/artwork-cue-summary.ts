import { isHere, type Place, type StateFact } from "@codex/adventure-engine";
import {
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
import type { ArtworkNpcSession } from "./npc-portrait-selection";

export interface ArtworkCueIndicator {
  genre: string;
  place: {
    name: string;
    cues: readonly string[];
    match: string | null;
  } | null;
  npcs: Array<{
    name: string;
    cues: readonly string[];
    match: string | null;
  }>;
}

type CueSession = ArtworkPlaceSession &
  Pick<ArtworkNpcSession, "visibleState"> & {
    places?: readonly Place[];
  };

/** Summarize active place/NPC artwork cues and whether the catalogue matched them. */
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
  const placeMatched =
    placeSelected?.kind === "catalogue"
      ? placeSelected.asset.id
      : placeSelected
        ? `${placeSelected.kind}:${placeSelected.image}`
        : placeCues
          ? (matchArtwork(catalogue, placeCues)?.id ?? null)
          : null;

  const placeScope = {
    currentPlaceId: session.currentPlaceId,
    places: session.places ? [...session.places] : undefined,
  };
  const hereCharacters: readonly StateFact[] = (
    session.visibleState?.activeCharacters ?? []
  ).filter((fact) => isHere(fact, placeScope));

  const npcs = hereCharacters.map((fact) => {
    const name = fact.text.split(/[.,:—–-]/, 1)[0]?.trim() || fact.text;
    const cues = describeVisiblePerson(
      {
        id: fact.id,
        name,
        aliases: [],
        ...(fact.sourceRecordId ? { sourceRecordId: fact.sourceRecordId } : {}),
      },
      theme,
      { facts: [fact.text, ...(fact.cues ?? [])] },
    );
    const matched = cues ? (matchArtwork(catalogue, cues)?.id ?? null) : null;
    return {
      name,
      cues: cues?.primaryCues ?? [],
      match: matched,
    };
  });

  return {
    genre,
    place: place
      ? {
          name: place.name,
          cues: placeCues?.primaryCues ?? [],
          match: placeMatched,
        }
      : null,
    npcs,
  };
}
