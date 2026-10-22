import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "grassland-steppe",
  name: "Grassland and steppe",
  category: "climate-zone",
  summary:
    "Open plains of grasses with few trees, deep soils, hot summers, cold winters and uneven rain.",
  filters: ["temperate", "dry", "open"],
  conditions: {
    temperature: {
      low: 0,
      high: 20,
      unit: "°C",
      note: "Annual mean. The range is wide, and continental steppe swings from below -20 °C in winter to above 35 °C in summer.",
    },
    precipitation: {
      low: 250,
      high: 750,
      unit: "mm per year",
      note: "Often highest in early summer and highly variable between years.",
    },
    seasonality: [
      pattern(
        "Summers are warm to hot and winters cold in the continental interior. Rain is concentrated in the growing season.",
        "beck-2018-koppen",
      ),
    ],
    waterAvailability: [
      pattern(
        "Too dry for continuous forest, but wet enough for grass. Rivers and springs matter a great deal, and small streams may dry up in late summer.",
        "ricklefs-ecology",
      ),
    ],
    notes: [
      pattern(
        "Fire and grazing keep some grassland open in places that receive enough rain to grow trees.",
        "ricklefs-ecology",
        "olson-2001-ecoregions",
      ),
    ],
  },
  landscape: [
    pattern(
      "Broad, gently rolling plains with long horizons, sometimes broken by river valleys.",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Deep, dark, fertile soils such as chernozem, built from centuries of grass roots.",
      "fao-ecozones",
    ),
  ],
  vegetation: [
    pattern(
      "Grasses dominate, with deep root systems that survive drought, fire and grazing. Tall-grass prairie lies in wetter areas and short-grass steppe in drier ones.",
      "ricklefs-ecology",
    ),
    pattern(
      "Trees are rare and grow mainly along rivers and in sheltered hollows.",
      "olson-2001-ecoregions",
    ),
  ],
  wildlife: [
    pattern(
      "Large grazing herds, such as bison on the North American prairie and saiga and wild horses on the Eurasian steppe, move over long distances to follow fresh grass.",
      "ricklefs-ecology",
    ),
    pattern(
      "Burrowing animals such as ground squirrels, prairie dogs and marmots live in colonies, and hawks, eagles and wolves hunt them and the herds.",
      "iucn-habitats",
    ),
  ],
  resources: [
    pattern(
      "Grazing for livestock and some of the richest farmland on Earth.",
      "fao-ecozones",
    ),
    pattern("Wind for power and open ground for travel.", "iucn-habitats"),
  ],
  hazards: [
    pattern("Drought, grass fires and dust storms.", "ricklefs-ecology"),
    pattern(
      "Blizzards and exposure on open ground, with little natural shelter.",
      "beck-2018-koppen",
    ),
  ],
  variations: [
    simplification(
      "Temperate grassland (prairie, pampas, steppe) is separate from tropical savanna, which has a wet and dry season rather than a warm and cold one.",
      "olson-2001-ecoregions",
    ),
    exception(
      "Some grassland regions are far wetter than their reputation, and in many of them farming has replaced most of the original grass.",
      "olson-2001-ecoregions",
    ),
  ],
  sourceIds: [
    "beck-2018-koppen",
    "olson-2001-ecoregions",
    "ricklefs-ecology",
    "fao-ecozones",
    "iucn-habitats",
  ],
};

export const grasslandSteppe: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A wide plain of tall grass under a large sky, with a herd of grazing animals in the distance.",
      {
        tool: "gemini-3.1-flash-image",
        generatedAt: "2026-10-22",
        review: {
          reviewedBy: "Espen Erlandsen",
          reviewedAt: "2026-10-22",
          notes:
            "Expansive windswept steppe grasslands under vast atmospheric clouds with distant grazing herd.",
        },
      },
    ),
  ],
};
