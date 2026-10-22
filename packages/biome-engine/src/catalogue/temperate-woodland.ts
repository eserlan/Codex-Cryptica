import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "temperate-woodland",
  name: "Temperate woodland",
  category: "climate-zone",
  summary:
    "Broadleaf and mixed forest with four clear seasons, fertile soils and steady rain.",
  filters: ["temperate", "forested", "wet"],
  conditions: {
    temperature: {
      low: 5,
      high: 15,
      unit: "°C",
      note: "Annual mean. Winters often drop below freezing and summers reach 25 °C or more.",
    },
    precipitation: {
      low: 750,
      high: 1500,
      unit: "mm per year",
      note: "Spread fairly evenly through the year.",
    },
    seasonality: [
      pattern(
        "Four distinct seasons: leaves flush in spring, the canopy is full in summer, and broadleaf trees drop their leaves in autumn.",
        "beck-2018-koppen",
        "ricklefs-ecology",
      ),
    ],
    waterAvailability: [
      pattern(
        "Rain falls in most months, so streams and springs usually run all year.",
        "ricklefs-ecology",
      ),
    ],
    notes: [
      simplification(
        "Whittaker-style diagrams place this biome by temperature and rainfall alone. Real woodland also depends on soil, history and land use.",
        "whittaker-1975",
      ),
    ],
  },
  landscape: [
    pattern(
      "Rolling hills and broad river valleys with deep, fertile brown forest soils built up from leaf litter.",
      "fao-ecozones",
    ),
    pattern(
      "Much of the original woodland in Europe, eastern Asia and eastern North America has been cleared for farming and towns.",
      "olson-2001-ecoregions",
    ),
  ],
  vegetation: [
    pattern(
      "Oak, beech, maple and other broadleaf trees form a closed canopy, with shrub and herb layers beneath.",
      "ricklefs-ecology",
    ),
    pattern(
      "Spring wildflowers bloom on the forest floor before the canopy closes and shades it.",
      "ricklefs-ecology",
    ),
    exception(
      "Some temperate forests are evergreen, such as the wet conifer forests of the Pacific coast of North America.",
      "olson-2001-ecoregions",
    ),
  ],
  wildlife: [
    pattern(
      "Deer and other browsers feed on shrubs and young trees, and are hunted by wolves, lynx or humans where large predators remain.",
      "ricklefs-ecology",
    ),
    pattern(
      "Omnivores such as bears and wild boar use acorns and nuts in autumn to build fat for winter.",
      "ricklefs-ecology",
    ),
    pattern(
      "Woodpeckers, songbirds, owls, bats and a large range of insects fill the trunk, canopy and ground niches.",
      "iucn-habitats",
    ),
  ],
  resources: [
    pattern(
      "Timber, firewood, nuts, fruit, mushrooms and game.",
      "fao-ecozones",
    ),
    pattern(
      "Cleared woodland gives some of the best farmland in the world.",
      "fao-ecozones",
    ),
  ],
  hazards: [
    pattern(
      "Cold winters, ice and heavy snow in the colder parts.",
      "beck-2018-koppen",
    ),
    pattern(
      "Storms can topple trees, and summer droughts can bring wildfire.",
      "fao-ecozones",
    ),
  ],
  variations: [
    simplification(
      "Mixed forest, where broadleaf and conifer trees share the canopy, forms the cooler edge towards boreal forest.",
      "olson-2001-ecoregions",
    ),
    simplification(
      "Oceanic woodland near western coasts is milder and wetter than continental woodland at the same latitude.",
      "beck-2018-koppen",
    ),
  ],
  sourceIds: [
    "beck-2018-koppen",
    "olson-2001-ecoregions",
    "ricklefs-ecology",
    "fao-ecozones",
  ],
};

export const temperateWoodland: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A broadleaf forest in early autumn, with oak and beech trees over a mossy floor and a stream.",
      {
        tool: "gemini-3.1-flash-image",
        generatedAt: "2026-10-22",
        review: {
          reviewedBy: "Espen Erlandsen",
          reviewedAt: "2026-10-22",
          notes:
            "Atmospheric 16:9 painterly woodland with autumnal oaks, beech trees, mossy forest floor and stream.",
        },
      },
    ),
  ],
};
