import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "tropical-rainforest",
  name: "Tropical rainforest",
  category: "climate-zone",
  summary:
    "Hot, humid forest with towering layered trees, almost daily rain and great variety of life.",
  filters: ["hot", "wet", "forested"],
  conditions: {
    temperature: {
      low: 24,
      high: 28,
      unit: "°C",
      note: "Annual mean, with little change through the year. Nights are warm.",
    },
    precipitation: {
      low: 2000,
      high: 4000,
      unit: "mm per year",
      note: "Some places receive much more. Rain falls in most months.",
    },
    seasonality: [
      pattern(
        "Temperature barely changes through the year. Some regions have a short drier season, but none is truly dry.",
        "beck-2018-koppen",
      ),
    ],
    waterAvailability: [
      pattern(
        "Rain falls nearly every day in many areas, so rivers are broad and flood regularly.",
        "ricklefs-ecology",
      ),
    ],
    notes: [
      simplification(
        "Rainforest soil is often poor, because heavy rain washes nutrients away and the forest recycles what it has very quickly.",
        "ricklefs-ecology",
      ),
    ],
  },
  landscape: [
    pattern(
      "Broad river basins, lowland plains and steep forested hills, often cut by wide, slow rivers.",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Thin, nutrient-poor soils beneath a thick layer of rotting leaves, so few things grow on bare ground.",
      "ricklefs-ecology",
    ),
  ],
  vegetation: [
    pattern(
      "Trees form several layers: tall emergent trees above a continuous canopy, then shorter trees and a dim, open forest floor.",
      "ricklefs-ecology",
    ),
    pattern(
      "Vines, orchids and other plants grow on the trees themselves, and most of the plant life is in the canopy.",
      "iucn-habitats",
    ),
  ],
  wildlife: [
    pattern(
      "Rainforests hold more species of insects, birds and amphibians than any other land biome, and most animals live in the trees.",
      "iucn-habitats",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Monkeys, sloths and tree-dwelling snakes use the canopy, while large cats and tapirs use the floor.",
      "iucn-habitats",
    ),
  ],
  resources: [
    pattern(
      "Hardwood timber, fruit, spices, medicinal plants, rubber and resin.",
      "fao-ecozones",
    ),
    exception(
      "Farmland made by clearing rainforest often fails after a few years because the soil is poor.",
      "ricklefs-ecology",
    ),
  ],
  hazards: [
    pattern(
      "Constant heat and humidity, and diseases and parasites carried by insects.",
      "iucn-habitats",
    ),
    pattern(
      "Dense growth slows travel to a crawl, and venomous animals, flooded rivers and sudden storms add danger.",
      "olson-2001-ecoregions",
    ),
  ],
  variations: [
    simplification(
      "Rainforest grades into drier seasonal forest and savanna where the dry season gets longer.",
      "olson-2001-ecoregions",
    ),
  ],
  sourceIds: [
    "beck-2018-koppen",
    "olson-2001-ecoregions",
    "ricklefs-ecology",
    "iucn-habitats",
    "fao-ecozones",
  ],
};

export const tropicalRainforest: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A river winding through dense rainforest with tall layered trees, hanging vines and mist under the canopy.",
      {
        tool: "gpt-6-luna",
        generatedAt: "2026-10-22",
        review: {
          reviewedBy: "Espen Erlandsen",
          reviewedAt: "2026-10-22",
          notes:
            "Dense tropical canopy with winding river, towering trees, hanging vines and morning mist.",
        },
      },
    ),
  ],
};
