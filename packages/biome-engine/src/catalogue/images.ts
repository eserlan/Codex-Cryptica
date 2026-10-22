import type { ReferenceBiome } from "../model";

/**
 * The shared look for every catalogue illustration, so the library reads as one
 * set. Library images are realistic illustrations of the real biome; the
 * "fantasy, illustration of" prefix is only for users' own fictional profiles.
 */
export const BIOME_ILLUSTRATION_STYLE =
  "Realistic landscape illustration, natural colours, soft daylight, wide composition, no text, no logos, no people:";

type PromptSource = Omit<ReferenceBiome, "images">;

/** Trim to the first sentence so the prompt stays short and readable. */
function firstSentence(text: string): string {
  const end = text.search(/[.!?](\s|$)/);
  return (end === -1 ? text : text.slice(0, end)).trim();
}

/**
 * Maintainer helper: builds the prompt for a biome's main illustration from the
 * biome's own statements, so the picture and the description agree. The web app
 * never imports this.
 */
export function buildBiomeImagePrompt(biome: PromptSource): string {
  const clauses = [
    biome.name,
    biome.landscape[0]?.text,
    biome.vegetation[0]?.text,
    biome.vegetation[1]?.text,
    biome.wildlife[0]?.text,
    biome.conditions.seasonality[0]?.text,
  ]
    .filter((clause): clause is string => Boolean(clause))
    .map(firstSentence);
  return `${BIOME_ILLUSTRATION_STYLE} ${clauses.join("; ")}.`;
}
