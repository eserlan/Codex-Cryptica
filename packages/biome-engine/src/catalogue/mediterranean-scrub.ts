import type { ReferenceBiome } from "../model";
import { mainIllustration, pattern, simplification } from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "mediterranean-scrub",
  name: "Mediterranean scrub",
  category: "climate-zone",
  summary:
    "Sun-drenched coastal hills and scrublands with dry summers, mild rainy winters, aromatic brush, olive trees and cypress.",
  filters: ["temperate", "dry", "coastal"],
  conditions: {
    temperature: {
      low: 8,
      high: 30,
      unit: "°C",
      note: "Mild, frost-rare winters and hot, dry, sun-baked summers.",
    },
    precipitation: {
      low: 400,
      high: 800,
      unit: "mm per year",
      note: "Almost all rain falls during winter and spring; summers are virtually rainless.",
    },
    seasonality: [
      pattern(
        "Opposite to most biomes: winter is the season of green growth and rain, while summer is a dormant, sun-baked drought.",
        "beck-2018-koppen",
      ),
    ],
    waterAvailability: [
      pattern(
        "Streams rush full in winter but dry to rocky cobblestone beds or isolated pools in midsummer.",
        "ricklefs-ecology",
      ),
    ],
    notes: [
      simplification(
        "Fire is an essential ecological driver; most native plants are adapted to burn and rapidly resprout.",
        "whittaker-1975",
      ),
    ],
  },
  landscape: [
    pattern(
      "Steep coastal cliffs, rolling limestone hills, terrace-cut hillsides and sheltered bays.",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Thin, rocky terra rossa soils over white limestone bedrock, punctuated by rocky outcrops.",
      "iucn-habitats",
    ),
  ],
  vegetation: [
    pattern(
      "Dense sclerophyll scrub of evergreen scrub oak, myrtle, mastic and wild olive.",
      "whittaker-1975",
    ),
    pattern(
      "Aromatic herbs such as rosemary, lavender, thyme and sage coat the dry slopes in scent.",
      "iucn-habitats",
    ),
    simplification(
      "Scattered umbrella pines, stone pines and column-like cypress punctuate open hillsides.",
      "fao-ecozones",
    ),
  ],
  wildlife: [
    pattern(
      "Wild boar, fallow deer, badgers, stone martens, tortoises and an exceptional diversity of lizards and songbirds.",
      "iucn-habitats",
    ),
    pattern(
      "Coastal raptors like peregrine falcons and buzzards ride thermal updrafts along maritime cliffs.",
      "olson-2001-ecoregions",
    ),
  ],
  resources: [
    pattern(
      "Exceptional terroir for olives, grapes, citrus, figs and cork; plentiful marble and limestone.",
      "fao-ecozones",
    ),
    pattern(
      "Rich coastal fisheries, natural deep-water anchorages and aromatic culinary and medicinal plants.",
      "iucn-habitats",
    ),
  ],
  hazards: [
    pattern(
      "Ferocious summer brush fires driven by gale-force seasonal winds through dry, oil-rich scrub.",
      "ricklefs-ecology",
    ),
    pattern(
      "Blistering summer drought and sudden autumn flash storms causing debris flows on fire-cleared slopes.",
      "beck-2018-koppen",
    ),
  ],
  variations: [
    simplification(
      "Grades into oak-pine woodland in sheltered inland valleys and semi-arid scrub where rainfall drops below 350 mm.",
      "olson-2001-ecoregions",
    ),
  ],
  sourceIds: [
    "beck-2018-koppen",
    "olson-2001-ecoregions",
    "ricklefs-ecology",
    "whittaker-1975",
    "iucn-habitats",
    "fao-ecozones",
  ],
};

export const mediterraneanScrub: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A sun-drenched Mediterranean coastal landscape with rolling limestone hills, dry aromatic scrub, olive trees and stone pines.",
      {
        tool: "gpt-6-luna",
        generatedAt: "2026-10-22",
        review: {
          reviewedBy: "Espen Erlandsen",
          reviewedAt: "2026-10-22",
          notes:
            "Sun-drenched coastal landscape with limestone hills, aromatic scrub, olive trees, stone pines and distant turquoise sea.",
        },
      },
    ),
  ],
};
