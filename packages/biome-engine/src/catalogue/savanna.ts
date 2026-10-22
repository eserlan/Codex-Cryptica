import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "savanna",
  name: "Savanna",
  category: "climate-zone",
  summary:
    "Warm grassland with scattered trees, a long dry season and a wet season that brings the herds.",
  filters: ["hot", "dry", "open"],
  conditions: {
    temperature: {
      low: 20,
      high: 30,
      unit: "°C",
      note: "Annual mean. It stays warm all year, and the day-night swing is larger in the dry season.",
    },
    precipitation: {
      low: 500,
      high: 1500,
      unit: "mm per year",
      note: "Almost all of it falls in a distinct wet season.",
    },
    seasonality: [
      pattern(
        "The seasons are wet and dry rather than warm and cold. Grass turns green and grows fast in the rains, then dries and browns.",
        "beck-2018-koppen",
        "ricklefs-ecology",
      ),
    ],
    waterAvailability: [
      pattern(
        "Rivers and waterholes shrink in the dry season, drawing animals and people to the few places where water remains.",
        "ricklefs-ecology",
      ),
    ],
    notes: [
      simplification(
        "Both climate and fire matter. In many savannas fire, grazing and soil keep trees scattered where rainfall alone could grow denser woodland.",
        "olson-2001-ecoregions",
        "ricklefs-ecology",
      ),
    ],
  },
  landscape: [
    pattern(
      "Broad plains and low hills, often with termite mounds, isolated rock outcrops and seasonal rivers.",
      "olson-2001-ecoregions",
    ),
  ],
  vegetation: [
    pattern(
      "Grasses cover the ground, with scattered trees such as acacia and baobab whose spreading crowns shade the grass.",
      "olson-2001-ecoregions",
      "iucn-habitats",
    ),
    pattern(
      "Many plants are adapted to fire and recover quickly after burning.",
      "ricklefs-ecology",
    ),
  ],
  wildlife: [
    pattern(
      "Large herds of grazers and browsers, such as zebra, wildebeest and antelope, follow the rains, with giraffes and elephants feeding on trees.",
      "ricklefs-ecology",
      "iucn-habitats",
    ),
    pattern(
      "Predators and scavengers, such as lions, hyenas and vultures, follow the herds.",
      "ricklefs-ecology",
    ),
    pattern(
      "Termites and dung beetles recycle large amounts of plant and animal waste.",
      "ricklefs-ecology",
    ),
  ],
  resources: [
    pattern(
      "Grazing for livestock, game, and wood and fruit from the trees.",
      "fao-ecozones",
    ),
  ],
  hazards: [
    pattern(
      "Drought and dust in the dry season, grass fires, and flooding in the wet season.",
      "ricklefs-ecology",
    ),
    pattern("Dangerous large animals and fierce midday heat.", "iucn-habitats"),
  ],
  variations: [
    exception(
      "Savannas in South America (cerrado, llanos) and northern Australia look similar but have very different animals and plants from African savanna.",
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

export const savanna: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "Golden grassland with a lone acacia tree, a herd of grazing animals and a waterhole under a wide sky.",
    ),
  ],
};
