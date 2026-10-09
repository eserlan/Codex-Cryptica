import { SILHOUETTES, SILHOUETTE_MAP } from "./catalogue/index";
import type {
  SilhouetteCategory,
  SilhouetteDefinition,
  SilhouetteGenre,
} from "./types";

/**
 * Normalises input strings for fast keyword matching.
 */
function tokenize(text?: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export interface SilhouetteInferenceInput {
  silhouette?: string;
  type?: string;
  title?: string;
  labels?: string[];
  kind?: string;
  content?: string;
  lore?: string;
}

export interface SilhouetteInferenceOptions {
  worldTheme?: string; // e.g. "dark-fantasy", "cyberpunk", "space-western", "gothic"
}

/**
 * Deterministically resolves the best silhouette for an entity.
 * If entity.silhouette is set and valid, returns it immediately.
 * Otherwise scores candidates across category, genre, labels, title, and keywords.
 */
// fallow-ignore-next-line complexity -- scoring branches are covered by silhouette inference tests.
export function resolveEntitySilhouette(
  entity: SilhouetteInferenceInput,
  options?: SilhouetteInferenceOptions,
): SilhouetteDefinition {
  // 1. Explicit selection
  if (entity.silhouette) {
    const direct = SILHOUETTE_MAP.get(entity.silhouette);
    if (direct) return direct;
  }

  // 2. Identify target category
  const rawType = (entity.type || "note").toLowerCase();
  let targetCategory: SilhouetteCategory | undefined;
  if (
    rawType.includes("creature") ||
    rawType.includes("monster") ||
    rawType.includes("beast")
  ) {
    targetCategory = "creature";
  } else if (
    rawType.includes("location") ||
    rawType.includes("place") ||
    rawType.includes("settlement") ||
    rawType.includes("dungeon")
  ) {
    targetCategory = "location";
  } else if (
    rawType.includes("item") ||
    rawType.includes("relic") ||
    rawType.includes("artifact") ||
    rawType.includes("weapon")
  ) {
    targetCategory = "item";
  } else if (
    rawType.includes("faction") ||
    rawType.includes("guild") ||
    rawType.includes("organization") ||
    rawType.includes("corp")
  ) {
    targetCategory = "faction";
  } else if (
    rawType.includes("character") ||
    rawType.includes("person") ||
    rawType.includes("npc")
  ) {
    targetCategory = "character";
  } else if (
    rawType.includes("event") ||
    rawType.includes("festival") ||
    rawType.includes("ritual") ||
    rawType.includes("war") ||
    rawType.includes("quest") ||
    rawType.includes("encounter")
  ) {
    targetCategory = "event";
  } else if (rawType.includes("note") || rawType.includes("document")) {
    targetCategory = "note";
  }

  // 3. World genre context
  const themeContext = (options?.worldTheme || "").toLowerCase();
  let preferredGenre: SilhouetteGenre = "fantasy";
  if (
    themeContext.includes("cyberpunk") ||
    themeContext.includes("neon") ||
    themeContext.includes("tech")
  ) {
    preferredGenre = "cyberpunk";
  } else if (
    themeContext.includes("scifi") ||
    themeContext.includes("space") ||
    themeContext.includes("solar")
  ) {
    preferredGenre = "scifi";
  } else if (
    themeContext.includes("gothic") ||
    themeContext.includes("horror") ||
    themeContext.includes("vampire") ||
    themeContext.includes("victorian")
  ) {
    preferredGenre = "gothic";
  } else if (
    themeContext.includes("western") ||
    themeContext.includes("frontier") ||
    themeContext.includes("dust")
  ) {
    preferredGenre = "western";
  } else if (
    themeContext.includes("cosmic") ||
    themeContext.includes("cthulhu") ||
    themeContext.includes("eldritch")
  ) {
    preferredGenre = "cosmic-horror";
  }

  // 4. Extract token pools
  const titleTokens = new Set(tokenize(entity.title));
  const labelTokens = new Set(
    (entity.labels || []).flatMap((l) => tokenize(l)),
  );
  const kindTokens = new Set(tokenize(entity.kind));
  const contentSnippet =
    (entity.content || "").slice(0, 1000) +
    " " +
    (entity.lore || "").slice(0, 500);
  const contentTokens = new Set(tokenize(contentSnippet));

  // 5. Score candidates
  let bestSilhouette: SilhouetteDefinition = SILHOUETTE_MAP.get(
    "generic-humanoid-unknown",
  )!;
  let highestScore = -1;

  for (const s of SILHOUETTES) {
    // Entity type is authoritative. Without this guard, a strongly tagged
    // document (for example, a map case) can be assigned a note silhouette.
    if (targetCategory && s.category !== targetCategory) continue;

    let score = 0;

    // Known categories share the requested-category baseline. For custom
    // entity types, preserve semantic cross-category inference for backwards
    // compatibility with the flexible EntityTypeSchema.
    if (targetCategory && s.category === targetCategory) {
      score += 10;
    }

    // Genre affinity
    if (s.genres.includes(preferredGenre)) {
      score += 6;
    }

    // Tag matches against metadata tokens
    for (const tag of s.tags) {
      const lowerTag = tag.toLowerCase();
      if (labelTokens.has(lowerTag)) score += 8;
      if (kindTokens.has(lowerTag)) score += 6;
      if (titleTokens.has(lowerTag)) score += 5;
      if (contentTokens.has(lowerTag)) score += 2;
    }

    // Extra gender / archetype heuristic boost
    if (s.gender === "female") {
      if (
        titleTokens.has("female") ||
        titleTokens.has("lady") ||
        titleTokens.has("countess") ||
        titleTokens.has("witch") ||
        labelTokens.has("female")
      ) {
        score += 7;
      }
    } else if (s.gender === "male") {
      if (
        titleTokens.has("male") ||
        titleTokens.has("lord") ||
        titleTokens.has("count") ||
        titleTokens.has("wizard") ||
        titleTokens.has("sir") ||
        labelTokens.has("male")
      ) {
        score += 7;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestSilhouette = s;
    }
  }

  return bestSilhouette;
}
