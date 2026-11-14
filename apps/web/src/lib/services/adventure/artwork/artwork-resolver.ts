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
  place:
    | {
        id: string;
        name: string;
        sourceRecordId?: string;
        cues?: readonly string[];
      }
    | undefined,
  theme: string | undefined,
):
  (ArtworkCues & { subject: { kind: "entity" | "place"; id: string } }) | null {
  if (!place?.id) return null;
  const words = place.name.toLowerCase().match(/[a-z]+/g) ?? [];
  const explicitCues = (place.cues ?? []).map((cue) => cue.toLowerCase());
  return {
    subject: place.sourceRecordId
      ? { kind: "entity", id: place.sourceRecordId }
      : { kind: "place", id: place.id },
    type: "location",
    genre: artworkGenreForTheme(theme),
    primaryCues: normalizeArtworkCues([...explicitCues, ...words]),
  };
}

export interface VisiblePersonEntity {
  id?: string;
  title?: string;
  type?: string;
  kind?: string;
  labels?: readonly string[];
  aliases?: readonly string[];
}

export interface DescribeVisiblePersonContext {
  entity?: VisiblePersonEntity;
  facts?: readonly string[];
}

/** Accept only an explicitly player-visible person projection, never a full session. */
export function describeVisiblePerson(
  person:
    | {
        id: string;
        name: string;
        aliases?: readonly string[];
        sourceRecordId?: string;
      }
    | undefined,
  theme: string | undefined,
  context?: DescribeVisiblePersonContext,
):
  | (ArtworkCues & { subject: { kind: "entity" | "person"; id: string } })
  | null {
  if (!person?.id) return null;
  const sources = [
    person.name,
    ...(person.aliases ?? []),
    context?.entity?.title,
    context?.entity?.type,
    context?.entity?.kind,
    ...(context?.entity?.labels ?? []),
    ...(context?.entity?.aliases ?? []),
    ...(context?.facts ?? []),
  ];
  const words: string[] = [];
  for (const source of sources) {
    if (!source) continue;
    const matches = source.toLowerCase().match(/[a-z]+/g);
    if (matches) words.push(...matches);
  }
  return {
    subject: person.sourceRecordId
      ? { kind: "entity", id: person.sourceRecordId }
      : { kind: "person", id: person.id },
    type: "npc",
    genre: artworkGenreForTheme(theme),
    primaryCues: normalizeArtworkCues(words),
  };
}
