import type { ReferenceBiome } from "../model";
import { temperateWoodland } from "./temperate-woodland";
import { borealForest } from "./boreal-forest";
import { grasslandSteppe } from "./grassland-steppe";
import { hotDesert } from "./hot-desert";
import { tundra } from "./tundra";
import { wetland } from "./wetland";
import { tropicalRainforest } from "./tropical-rainforest";
import { coastline } from "./coastline";
import { savanna } from "./savanna";
import { alpineMontane } from "./alpine-montane";
import { semiAridDesert } from "./semi-arid-desert";
import { mediterraneanScrub } from "./mediterranean-scrub";
import { polarIceSheet } from "./polar-ice-sheet";

export { BIOME_SOURCES } from "./sources";

/** Ordered reference biomes. Add a biome by adding one data module here. */
export const BIOME_CATALOGUE: readonly ReferenceBiome[] = [
  temperateWoodland,
  borealForest,
  grasslandSteppe,
  hotDesert,
  semiAridDesert,
  mediterraneanScrub,
  tundra,
  polarIceSheet,
  wetland,
  tropicalRainforest,
  coastline,
  savanna,
  alpineMontane,
];

export function getBiome(id: string): ReferenceBiome | undefined {
  return BIOME_CATALOGUE.find((biome) => biome.id === id);
}
