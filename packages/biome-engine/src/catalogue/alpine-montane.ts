import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "alpine-montane",
  name: "Alpine and montane",
  category: "climate-zone",
  summary:
    "High mountains where cold, thin air and steep ground change life in bands from valley to peak.",
  filters: ["cold", "open", "high-elevation"],
  conditions: {
    temperature: {
      low: -10,
      high: 5,
      unit: "°C",
      note: "Annual mean at and above the tree line. Temperature falls by roughly 6 °C for every 1,000 m climbed.",
    },
    precipitation: {
      low: 500,
      high: 2000,
      unit: "mm per year",
      note: "Varies widely with slope and aspect, and much of it falls as snow.",
    },
    elevation: {
      low: 1500,
      high: 5000,
      unit: "m above sea level",
      note: "The tree line sits at about 2,000 to 2,400 m in the Alps, near 4,000 m in the tropical Andes, and much lower at high latitudes.",
    },
    seasonality: [
      pattern(
        "Winters are long with deep snow, and summers are short. Weather can change within hours.",
        "korner-alpine",
        "beck-2018-koppen",
      ),
    ],
    waterAvailability: [
      pattern(
        "Snow and glaciers store water and release it in summer, feeding rivers far into the lowlands.",
        "korner-alpine",
      ),
    ],
    notes: [
      simplification(
        "Life changes in bands with height: foothill forest, then conifers, then a treeless alpine zone, then bare rock and ice. The heights of the bands vary by latitude and slope.",
        "korner-alpine",
        "olson-2001-ecoregions",
      ),
    ],
  },
  landscape: [
    pattern(
      "Steep slopes, scree, cliffs, glacier-carved valleys and basins, high passes and permanent snowfields.",
      "korner-alpine",
    ),
    pattern(
      "Soils are thin and stony, and slopes face the sun or shade differently.",
      "korner-alpine",
    ),
  ],
  vegetation: [
    pattern(
      "Above the tree line, low cushion plants, tough grasses, sedges, mosses and lichens grow tight to the ground.",
      "korner-alpine",
    ),
    pattern(
      "Wind-bent and stunted trees mark the upper edge of the forest.",
      "korner-alpine",
    ),
  ],
  wildlife: [
    pattern(
      "Surefooted grazers such as ibex, mountain goats and chamois use steep ground, while marmots and pikas shelter in burrows or among rocks.",
      "iucn-habitats",
    ),
    pattern(
      "Predators such as eagles and snow leopards hunt on the heights, and many animals move to lower ground in winter.",
      "iucn-habitats",
    ),
  ],
  resources: [
    pattern(
      "Meltwater for the lowlands, summer pasture, stone and metal ores.",
      "korner-alpine",
      "fao-ecozones",
    ),
  ],
  hazards: [
    pattern(
      "Avalanches, rockfall, storms, whiteouts and crevasses.",
      "korner-alpine",
    ),
    pattern(
      "Thin air causes altitude sickness above about 2,500 m, and cold and exposure can kill quickly.",
      "korner-alpine",
    ),
  ],
  variations: [
    exception(
      "In the tropics there are no seasons at altitude. Highland grasslands such as the páramo have mild days and freezing nights all year.",
      "korner-alpine",
      "olson-2001-ecoregions",
    ),
  ],
  sourceIds: [
    "beck-2018-koppen",
    "olson-2001-ecoregions",
    "iucn-habitats",
    "fao-ecozones",
    "korner-alpine",
  ],
};

export const alpineMontane: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A high mountain valley with a treeless alpine meadow, scree slopes, snow-covered peaks and a few stunted pines.",
    ),
  ],
};
