import {
  normalizeArtworkCues,
  type ArtworkCues,
} from "@codex/adventure-artwork-engine";
import { genreForTheme } from "../world-style";

const genreMap: Record<string, NonNullable<ArtworkCues["genre"]>> = {
  "Classic Fantasy": "fantasy",
  "Sci-Fi / Space Opera": "science-fiction",
  "Optimistic Exploration Sci-Fi": "science-fiction",
  "Cyberpunk / Corporate": "science-fiction",
  "Space Western": "science-fiction",
  "Modern Conspiracy": "contemporary",
  "Vampire / Gothic Noir": "horror",
  "Cosmic Horror": "horror",
};
export function artworkGenreForTheme(
  theme: string | undefined,
): ArtworkCues["genre"] {
  const label = genreForTheme(theme);
  return label ? genreMap[label] : undefined;
}
/** Accept only an explicitly player-visible place projection, never a full session. */
export function describeVisiblePlace(
  place: { id: string; name: string; sourceRecordId?: string } | undefined,
  theme: string | undefined,
):
  (ArtworkCues & { subject: { kind: "entity" | "place"; id: string } }) | null {
  if (!place?.id) return null;
  const words = place.name.toLowerCase().match(/[a-z]+/g) ?? [];
  return {
    subject: place.sourceRecordId
      ? { kind: "entity", id: place.sourceRecordId }
      : { kind: "place", id: place.id },
    type: "location",
    genre: artworkGenreForTheme(theme),
    primaryCues: normalizeArtworkCues(words),
  };
}
