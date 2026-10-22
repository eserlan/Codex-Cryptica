import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "hot-desert",
  name: "Hot desert",
  category: "climate-zone",
  summary:
    "Very dry land with scorching days, cool nights, sparse plants and water hidden in a few places.",
  filters: ["hot", "dry", "open"],
  conditions: {
    temperature: {
      low: 18,
      high: 30,
      unit: "°C",
      note: "Annual mean. Daytime highs can exceed 45 °C, and nights can be 20 °C cooler or more.",
    },
    precipitation: {
      low: 0,
      high: 250,
      unit: "mm per year",
      note: "Rain is rare and erratic. Some places go years without any.",
    },
    seasonality: [
      pattern(
        "The largest swing is between day and night rather than between seasons. Winters are mild and summers are extreme.",
        "beck-2018-koppen",
      ),
    ],
    waterAvailability: [
      pattern(
        "Surface water is rare. It appears at oases fed by groundwater, in rare flash floods, and at a few rivers that cross the desert from wetter highlands.",
        "ricklefs-ecology",
        "iucn-habitats",
      ),
    ],
    notes: [
      exception(
        "This entry covers hot deserts. Cold deserts, such as the Gobi, share the dryness but have freezing winters.",
        "beck-2018-koppen",
      ),
    ],
  },
  landscape: [
    pattern(
      "Sand seas make up only a minority of desert land. Much of it is bare rock, gravel plains and rocky uplands.",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Dry riverbeds (wadis or arroyos) can fill suddenly with flash floods from rain far away.",
      "iucn-habitats",
    ),
  ],
  vegetation: [
    pattern(
      "Sparse, drought-adapted shrubs and grasses with deep or wide roots, and succulents such as cacti in the Americas.",
      "ricklefs-ecology",
    ),
    pattern(
      "After rare rain, short-lived flowers sprout, bloom and set seed within weeks.",
      "ricklefs-ecology",
    ),
  ],
  wildlife: [
    pattern(
      "Most animals are small and shelter from the heat by day: reptiles, insects, rodents and foxes that hunt at night.",
      "ricklefs-ecology",
    ),
    pattern(
      "Larger animals, such as camels, antelope and wild asses, range widely between water sources.",
      "iucn-habitats",
    ),
  ],
  resources: [
    pattern("Minerals, salts, building stone and sunlight.", "fao-ecozones"),
    pattern(
      "Oases support date palms and small farms, and caravans have long used them as stops.",
      "iucn-habitats",
    ),
  ],
  hazards: [
    pattern(
      "Heat stroke and dehydration are the main dangers, followed by getting lost in featureless terrain.",
      "beck-2018-koppen",
    ),
    pattern("Sandstorms and flash floods.", "ricklefs-ecology"),
  ],
  variations: [
    simplification(
      "Deserts include sand seas (ergs), gravel plains (regs), rocky plateaus (hamadas) and salt flats, each with different travel and water conditions.",
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

export const hotDesert: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A desert of rock and sand with dunes in the distance, a few dry shrubs and a pale sky at dusk.",
      {
        tool: "gemini-3.1-flash-image",
        generatedAt: "2026-10-22",
        review: {
          reviewedBy: "Espen Erlandsen",
          reviewedAt: "2026-10-22",
          notes:
            "Golden dunes, rocky desert pavement and arid shrubs beneath a dramatic dusk sky.",
        },
      },
    ),
  ],
};
