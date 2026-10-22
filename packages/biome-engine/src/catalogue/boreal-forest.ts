import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "boreal-forest",
  name: "Boreal forest (taiga)",
  category: "climate-zone",
  summary:
    "Vast conifer forest of the cold north, with long winters, short summers, lakes and bogs.",
  filters: ["cold", "forested", "wet"],
  conditions: {
    temperature: {
      low: -10,
      high: 3,
      unit: "°C",
      note: "Annual mean. Winter lows can fall below -40 °C in the continental interior.",
    },
    precipitation: {
      low: 300,
      high: 900,
      unit: "mm per year",
      note: "Often falls as snow. Low evaporation keeps the ground wet.",
    },
    seasonality: [
      pattern(
        "Winters are long and severe. The growing season is short, often only 50 to 100 frost-free days.",
        "beck-2018-koppen",
        "fao-ecozones",
      ),
    ],
    waterAvailability: [
      pattern(
        "Water is plentiful on the ground even though rainfall is modest: cold air evaporates little, and frozen or waterlogged subsoil stops drainage, so lakes and bogs fill the hollows.",
        "ricklefs-ecology",
        "olson-2001-ecoregions",
      ),
    ],
    notes: [
      simplification(
        "The forest is one belt around the northern hemisphere. Its two halves, North America and Eurasia, differ in tree species and in climate.",
        "olson-2001-ecoregions",
      ),
    ],
  },
  landscape: [
    pattern(
      "Gently rolling plains shaped by ice-age glaciers, scattered with lakes, bogs and meandering rivers.",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Poorly drained, acidic soils with a thick layer of needles and moss.",
      "fao-ecozones",
    ),
  ],
  vegetation: [
    pattern(
      "Spruce, fir, pine and larch dominate, with birch and aspen where fire or clearing has opened the forest.",
      "olson-2001-ecoregions",
    ),
    pattern(
      "Moss and lichen cover the forest floor, with berry shrubs in clearings.",
      "ricklefs-ecology",
    ),
    exception(
      "In eastern Siberia, larch forest grows on permafrost and loses its needles each winter.",
      "olson-2001-ecoregions",
    ),
  ],
  wildlife: [
    pattern(
      "Large browsers such as moose and caribou feed on willow, birch and lichen.",
      "ricklefs-ecology",
    ),
    pattern(
      "Wolves, lynx and bears are the top predators, with snowshoe hares and rodents as the main prey.",
      "ricklefs-ecology",
    ),
    pattern(
      "Many songbirds and waterfowl arrive only in summer to nest and feed on the abundant insects.",
      "iucn-habitats",
    ),
  ],
  resources: [
    pattern("Timber, pulpwood, furs, fish and peat.", "fao-ecozones"),
    pattern("Berries and game in the short warm season.", "iucn-habitats"),
  ],
  hazards: [
    pattern(
      "Severe winter cold and deep snow make travel slow and dangerous.",
      "beck-2018-koppen",
    ),
    pattern(
      "Wildfire is a natural, recurring event. Summer brings swarms of biting insects.",
      "fao-ecozones",
    ),
    pattern(
      "Soft bog ground and thin lake ice can be treacherous.",
      "olson-2001-ecoregions",
    ),
  ],
  variations: [
    simplification(
      "Open lichen woodland, with widely spaced trees, forms the northern edge where the forest meets tundra.",
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

export const borealForest: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A spruce and fir forest beside a still lake, with moss on the ground and early snow on the far hills.",
    ),
  ],
};
