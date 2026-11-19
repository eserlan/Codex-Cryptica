import type { AdventureSession } from "@codex/adventure-engine";
import {
  matchArtwork,
  type ArtworkAsset,
} from "@codex/adventure-artwork-engine";
import { readAdventureArtworkState } from "schema";
import { describeVisiblePlace } from "./artwork-resolver";

/** Add an optional local assignment to a candidate turn, never changing its narrative. */
export function assignCommittedPlaceArtwork(
  previous: AdventureSession,
  next: AdventureSession,
  catalogue: readonly ArtworkAsset[],
  theme: string | undefined,
  enabled: boolean,
): AdventureSession {
  const turn = next.turns.at(-1);
  if (
    !enabled ||
    previous.id !== next.id ||
    previous.vaultId !== next.vaultId ||
    next.revision <= previous.revision ||
    !turn ||
    previous.turns.at(-1)?.id === turn.id ||
    !next.currentPlaceId
  )
    return next;
  const place = next.places?.find((entry) => entry.id === next.currentPlaceId);
  if (!place) return next;
  const parsed = readAdventureArtworkState(next.artwork);
  if (parsed.kind === "opaque") return next;
  const state =
    parsed.kind === "known"
      ? parsed.value
      : { version: 1 as const, associations: [] };
  if (
    state.associations.length >= 200 ||
    state.associations.some(
      (entry) =>
        entry.subject.kind === "place" && entry.subject.id === place.id,
    )
  )
    return next;
  const cues = describeVisiblePlace(place, theme);
  const match = cues && matchArtwork(catalogue, cues);
  if (!match) return next;
  return {
    ...next,
    artwork: {
      ...state,
      associations: [
        ...state.associations,
        {
          subject: { kind: "place", id: place.id },
          association: {
            version: 1,
            automatic: {
              assetId: match.id,
              catalogueVersion: match.version,
              assignedOnTurnId: turn.id,
            },
          },
        },
      ],
    },
  };
}
