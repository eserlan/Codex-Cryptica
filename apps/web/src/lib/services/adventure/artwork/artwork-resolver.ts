import {
  CUE_SYNONYMS,
  isNpcDemographicCue,
  isNpcPersonCue,
  isSettingCue,
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

const multiWordPhrasePattern = new RegExp(
  `\\b(?:${Object.keys(CUE_SYNONYMS)
    .filter((key) => /[\s-]/.test(key))
    .sort((a, b) => b.length - a.length)
    .map((key) => key.replace(/[\s-]+/g, "[\\s-]+"))
    .join("|")})\\b`,
  "g",
);

function extractPersonCueTokens(
  sources: readonly (string | undefined)[],
): string[] {
  const tokens: string[] = [];
  for (const source of sources) {
    if (!source) continue;
    const lower = source.toLowerCase();
    const withoutPhrases = lower.replace(multiWordPhrasePattern, (match) => {
      const normalized = match.replace(/[\s-]+/g, " ");
      tokens.push(CUE_SYNONYMS[match] ?? CUE_SYNONYMS[normalized] ?? match);
      return " ";
    });
    const words = withoutPhrases.match(/[a-z]+/g);
    if (words) tokens.push(...words);
  }
  return tokens;
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
  const tokens = extractPersonCueTokens([
    person.name,
    ...(person.aliases ?? []),
    context?.entity?.title,
    context?.entity?.type,
    context?.entity?.kind,
    ...(context?.entity?.labels ?? []),
    ...(context?.entity?.aliases ?? []),
    ...(context?.facts ?? []),
  ]);
  const primaryCues = normalizeArtworkCues(
    tokens.filter((token) => {
      const lower = token.trim().toLowerCase();
      return isNpcPersonCue(CUE_SYNONYMS[lower] ?? lower);
    }),
  );
  const settingCues = normalizeArtworkCues(
    tokens.filter((token) => {
      const lower = token.trim().toLowerCase();
      return isSettingCue(CUE_SYNONYMS[lower] ?? lower);
    }),
  );
  const demographicCues = normalizeArtworkCues(
    tokens.filter((token) => {
      const lower = token.trim().toLowerCase();
      return isNpcDemographicCue(CUE_SYNONYMS[lower] ?? lower);
    }),
  );
  return {
    subject: person.sourceRecordId
      ? { kind: "entity", id: person.sourceRecordId }
      : { kind: "person", id: person.id },
    type: "npc",
    genre: artworkGenreForTheme(theme),
    primaryCues,
    ...(settingCues.length > 0 ? { settingCues } : {}),
    ...(demographicCues.length > 0 ? { demographicCues } : {}),
  };
}
