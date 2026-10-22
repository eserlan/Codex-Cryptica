import type { GeneratedImage, ReferenceBiome, Statement } from "../model";
import { BIOME_IMAGE_HOST } from "../model";
import { buildBiomeImagePrompt } from "./images";

/**
 * Marks provenance fields that are filled in when the team generates and
 * reviews the image. The release-gate test refuses to ship while any remain.
 */
export const PENDING = "pending";

type Basis = Statement["basis"];

export const pattern = (text: string, ...sourceIds: string[]): Statement => ({
  text,
  basis: "pattern",
  sourceIds,
});
export const simplification = (
  text: string,
  ...sourceIds: string[]
): Statement => ({ text, basis: "simplification", sourceIds });
export const exception = (text: string, ...sourceIds: string[]): Statement => ({
  text,
  basis: "exception",
  sourceIds,
});
export type { Basis };

/** The deterministic R2 URL for a biome's nth image. */
export function biomeImageUrl(id: string, n = 1): string {
  return `${BIOME_IMAGE_HOST}/biomes/${id}/${n}.webp`;
}

/** The main illustration: prompt derived from the biome's own text. */
export function mainIllustration(
  biome: Omit<ReferenceBiome, "images">,
  alt: string,
  overrides?: Partial<Pick<GeneratedImage, "tool" | "generatedAt" | "review">>,
): GeneratedImage {
  return {
    origin: "generated",
    url: biomeImageUrl(biome.id),
    alt,
    kind: "illustration",
    tool: overrides?.tool ?? PENDING,
    generatedAt: overrides?.generatedAt ?? PENDING,
    prompt: buildBiomeImagePrompt(biome),
    ...(overrides?.review ? { review: overrides.review } : {}),
  };
}
