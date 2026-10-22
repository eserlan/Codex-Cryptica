import type { ReferenceBiome } from "../model";
import {
  exception,
  mainIllustration,
  pattern,
  simplification,
} from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "coastline",
  name: "Coastline",
  category: "landform-habitat",
  summary:
    "The edge of the sea: beaches, cliffs, estuaries and tidal flats, shaped by waves, tides and storms.",
  filters: ["coastal", "wet"],
  conditions: {
    elevation: {
      low: 0,
      high: 100,
      unit: "m above sea level",
      note: "Most of the coastal zone lies close to sea level, but cliffs can be much higher.",
    },
    seasonality: [
      pattern(
        "The sea warms and cools slowly, so coastal climates are milder than the interior at the same latitude. Storm seasons depend on the region.",
        "beck-2018-koppen",
      ),
    ],
    waterAvailability: [
      pattern(
        "Seawater is salty. Fresh water is scarce near the shore except at river mouths, springs and rainfall.",
        "iucn-habitats",
      ),
    ],
    notes: [
      simplification(
        "Coasts occur in every climate, so this entry gives no single temperature or rainfall range. It describes a landform and habitat set by the sea, not a climate zone.",
        "iucn-habitats",
      ),
    ],
  },
  landscape: [
    pattern(
      "Beaches and dunes, rocky shores and cliffs, muddy estuaries and tidal flats. Waves, tides and currents rework them constantly.",
      "iucn-habitats",
    ),
    pattern(
      "Tides move the shoreline twice a day in most places, exposing and covering the shore zone.",
      "ricklefs-ecology",
    ),
  ],
  vegetation: [
    pattern(
      "Marram grass holds dunes in place, and salt-tolerant plants colonise salt marshes and rocky ledges.",
      "iucn-habitats",
    ),
    pattern(
      "Mangroves line sheltered tropical shores, and seaweeds and kelp grow in the water.",
      "iucn-habitats",
      "ricklefs-ecology",
    ),
  ],
  wildlife: [
    pattern(
      "Seabirds nest on cliffs and islands, and waders feed on mudflats at low tide.",
      "iucn-habitats",
    ),
    pattern(
      "Rock pools and the shore zone hold crabs, shellfish, anemones and small fish, and seals haul out on quiet shores.",
      "iucn-habitats",
      "ricklefs-ecology",
    ),
  ],
  resources: [
    pattern(
      "Fish, shellfish, seaweed, salt, and harbours that connect trade routes.",
      "iucn-habitats",
    ),
  ],
  hazards: [
    pattern(
      "Storm surges, strong tides, rip currents and crumbling cliffs.",
      "iucn-habitats",
    ),
    exception(
      "Tsunamis are rare but devastating and are caused by undersea earthquakes and landslides rather than local weather.",
      "iucn-habitats",
    ),
  ],
  variations: [
    simplification(
      "Rocky, sandy and muddy coasts, coral and mangrove coasts, and ice-bound polar coasts differ greatly in life, travel and shelter.",
      "iucn-habitats",
    ),
  ],
  sourceIds: ["beck-2018-koppen", "iucn-habitats", "ricklefs-ecology"],
};

export const coastline: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A rocky shoreline with a sandy cove, grass-topped dunes, breaking waves and seabirds over the water.",
      {
        tool: "gpt-6-luna",
        generatedAt: "2026-10-22",
        review: {
          reviewedBy: "Espen Erlandsen",
          reviewedAt: "2026-10-22",
          notes:
            "Coastal marine environment with rocky cliffs, sandy cove, dune grasses, breaking waves and soaring seabirds.",
        },
      },
    ),
  ],
};
