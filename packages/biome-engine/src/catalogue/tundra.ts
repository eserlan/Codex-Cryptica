import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "tundra",
  name: "Tundra",
  category: "climate-zone",
  summary:
    "Treeless, windswept plains of the far north, with frozen ground, low plants and a brief summer.",
  filters: ["cold", "dry", "open"],
  conditions: {
    temperature: {
      low: -20,
      high: 0,
      unit: "°C",
      note: "Annual mean. Winter lows below -30 °C are common, and the warmest month averages below 10 °C.",
    },
    precipitation: {
      low: 150,
      high: 400,
      unit: "mm per year",
      note: "Mostly snow. Very dry in the high Arctic.",
    },
    seasonality: [
      pattern(
        "Winters are long, dark and bitterly cold. Summers are short, with near-constant daylight at high latitudes and a growing season of roughly 50 to 60 days.",
        "beck-2018-koppen",
        "olson-2001-ecoregions",
      ),
    ],
    waterAvailability: [
      pattern(
        "Rainfall is low, yet the summer ground is boggy because permafrost blocks drainage, leaving ponds, pools and wet mud.",
        "ricklefs-ecology",
      ),
    ],
    notes: [
      simplification(
        "The tree line, where trees stop, is a gradual zone rather than a sharp line, and shifts with local shelter and warmth.",
        "olson-2001-ecoregions",
      ),
    ],
  },
  landscape: [
    pattern(
      "Flat to gently rolling plains with permafrost beneath. Frost action creates patterned ground, mounds and thaw lakes.",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Strong winds blow across the open ground for most of the year.",
      "beck-2018-koppen",
    ),
  ],
  vegetation: [
    pattern(
      "Low sedges, grasses, mosses, lichens and dwarf shrubs. Roots stay shallow above the frozen ground.",
      "ricklefs-ecology",
    ),
    pattern(
      "Plants grow slowly and low to the ground to escape wind and cold, and flower quickly in the short summer.",
      "ricklefs-ecology",
    ),
  ],
  wildlife: [
    pattern(
      "Caribou and reindeer migrate in large herds, and musk oxen stay year-round.",
      "iucn-habitats",
    ),
    pattern(
      "Lemmings are a key food source for Arctic foxes, snowy owls and weasels, and their numbers rise and fall in cycles.",
      "ricklefs-ecology",
    ),
    pattern(
      "Millions of migratory birds arrive in summer to nest and feed on insects.",
      "iucn-habitats",
    ),
  ],
  resources: [
    pattern(
      "Herd animals for meat, hides and bone, fish, sea mammals on the coast, and summer berries.",
      "iucn-habitats",
    ),
    pattern("Minerals and oil beneath the permafrost.", "fao-ecozones"),
  ],
  hazards: [
    pattern(
      "Extreme cold, wind chill and whiteouts. Shelter and fuel are scarce.",
      "beck-2018-koppen",
    ),
    pattern(
      "Summer brings clouds of biting insects and thawing, boggy ground that is slow to cross.",
      "olson-2001-ecoregions",
    ),
  ],
  variations: [
    exception(
      "Alpine tundra occurs on high mountains anywhere in the world, above the tree line. It is cold and treeless but is not frozen as deeply or as widely as Arctic tundra.",
      "korner-alpine",
    ),
  ],
  sourceIds: [
    "beck-2018-koppen",
    "olson-2001-ecoregions",
    "ricklefs-ecology",
    "iucn-habitats",
    "fao-ecozones",
    "korner-alpine",
  ],
};

export const tundra: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A flat, treeless plain of low sedges and lichen with small pools, patches of snow and a pale low sun.",
    ),
  ],
};
