import type { BiomeAlterationAspect } from "biome-engine";

/** Plain-language names for the parts of an environment a change can touch. */
export const ASPECT_LABELS: Record<BiomeAlterationAspect, string> = {
  climate: "Climate",
  terrain: "Terrain",
  vegetation: "Plants",
  water: "Water",
  pressures: "Pressures",
  other: "Something else",
};
