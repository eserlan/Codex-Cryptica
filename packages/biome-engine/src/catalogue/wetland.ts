import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "wetland",
  name: "Wetland",
  category: "landform-habitat",
  summary:
    "Land where water sits at or near the surface for much of the year: marsh, swamp, bog and fen.",
  filters: ["wet", "open"],
  conditions: {
    seasonality: [
      pattern(
        "Water levels rise and fall through the year, and some wetlands dry out for part of it.",
        "ramsar-wetlands",
      ),
    ],
    waterAvailability: [
      pattern(
        "Soils are waterlogged for long periods, so little oxygen reaches the roots. Water arrives from rain, rivers, groundwater or tides, and leaves slowly.",
        "ramsar-wetlands",
        "iucn-habitats",
      ),
    ],
    notes: [
      simplification(
        "Wetlands occur in almost every climate, so this entry gives no single temperature or rainfall range. It describes a habitat defined by water, not by climate.",
        "ramsar-wetlands",
      ),
    ],
  },
  landscape: [
    pattern(
      "Flat, low-lying ground with shallow water, winding channels, mud and peat. Edges blur between land and water.",
      "ramsar-wetlands",
    ),
    pattern(
      "Marsh has grasses and reeds, swamp has trees, bog is fed by rain and is acidic, and fen is fed by groundwater and is less acidic.",
      "ramsar-wetlands",
      "iucn-habitats",
    ),
  ],
  vegetation: [
    pattern(
      "Reeds, sedges and rushes grow in marshes, while willow, alder or cypress grow in wooded swamps.",
      "iucn-habitats",
    ),
    pattern(
      "Bogs are covered with sphagnum moss, which builds peat slowly over thousands of years.",
      "ramsar-wetlands",
    ),
  ],
  wildlife: [
    pattern(
      "Waterbirds such as herons, ducks and cranes feed and nest here, and many migrating birds use wetlands as stopovers.",
      "iucn-habitats",
    ),
    pattern(
      "Amphibians, fish nurseries, dragonflies and other insects thrive in the shallow water.",
      "ramsar-wetlands",
    ),
    pattern(
      "Beavers and otters shape and use the water directly.",
      "ricklefs-ecology",
    ),
  ],
  resources: [
    pattern(
      "Fish, waterfowl, reeds for thatch and weaving, and peat for fuel.",
      "ramsar-wetlands",
    ),
    pattern(
      "Wetlands soak up floods and filter water for the land around them.",
      "ramsar-wetlands",
    ),
  ],
  hazards: [
    pattern(
      "Soft ground, deep mud and hidden channels slow travel and are easy to get stuck in.",
      "iucn-habitats",
    ),
    pattern(
      "Biting insects can spread disease in warm climates, and floods can come suddenly.",
      "ramsar-wetlands",
    ),
  ],
  variations: [
    exception(
      "Coastal wetlands such as salt marsh and mangrove are tidal and salty, unlike inland freshwater wetlands.",
      "ramsar-wetlands",
    ),
  ],
  sourceIds: ["ramsar-wetlands", "iucn-habitats", "ricklefs-ecology"],
};

export const wetland: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A shallow wetland of reeds and still water with a heron in the foreground and mist over distant trees.",
    ),
  ],
};
