import type { ReferenceBiome } from "../model";
import { mainIllustration, pattern, simplification } from "./helpers";

const base: Omit<ReferenceBiome, "images"> = {
  id: "polar-ice-sheet",
  name: "Polar ice sheet",
  category: "climate-zone",
  summary:
    "Vast permanent continental glaciers and pack ice swept by katabatic blizzards, with sheer crevasses and zero plant life.",
  filters: ["cold", "dry", "open"],
  conditions: {
    temperature: {
      low: -60,
      high: -5,
      unit: "°C",
      note: "Even in midsummer, temperatures almost never rise above freezing.",
    },
    precipitation: {
      low: 20,
      high: 200,
      unit: "mm per year",
      note: "Technically a polar desert; what little snow falls never melts, compressing into solid blue glacial ice.",
    },
    seasonality: [
      pattern(
        "Months of continuous polar night in winter, and months of uninterrupted low-angle midnight sun in summer.",
        "beck-2018-koppen",
      ),
    ],
    waterAvailability: [
      pattern(
        "Abundant water exists everywhere but strictly locked as solid ice; liquid water is lethal, scarce or found only in subglacial lakes.",
        "ricklefs-ecology",
      ),
    ],
    notes: [
      simplification(
        "True abiotic terrestrial interior; life is entirely dependent on the surrounding marine food web.",
        "whittaker-1975",
      ),
    ],
  },
  landscape: [
    pattern(
      "Vast domed ice caps, rolling snowfields, bottomless crevasses, seracs and wind-carved sastrugi snow ridges.",
      "iucn-habitats",
    ),
    pattern(
      "Isolated nunataks—black, jagged mountain summits poking through miles-thick continental ice.",
      "olson-2001-ecoregions",
    ),
  ],
  vegetation: [
    simplification(
      "No vascular plant life exists. Rare microscopic snow algae and cryptoendolithic lichens cling inside porous nunatak rocks.",
      "whittaker-1975",
    ),
  ],
  wildlife: [
    pattern(
      "Terrestrial interior is virtually lifeless; life gathers at ice margins and leads (penguins, seals, polar bears, seabirds).",
      "iucn-habitats",
    ),
    pattern(
      "Marine nutrients sustain coastal rookeries, while inland traversal is utterly devoid of game or forage.",
      "olson-2001-ecoregions",
    ),
  ],
  resources: [
    pattern(
      "Primal, pure ancient ice preserving historical air and relics across thousands of millennia.",
      "ricklefs-ecology",
    ),
    pattern(
      "Nunatak peaks occasionally expose rich unmined mineral veins stripped bare of all soil.",
      "iucn-habitats",
    ),
  ],
  hazards: [
    pattern(
      "Deadly whiteout blizzards erasing horizon and ground, katabatic winds exceeding hurricane force, and hidden snow bridges over crevasses.",
      "beck-2018-koppen",
    ),
    pattern(
      "Rapid hypothermia, frostbite within seconds of skin exposure, and snow blindness from intense reflected glare.",
      "ricklefs-ecology",
    ),
  ],
  variations: [
    simplification(
      "Coastal ice shelves calve colossal icebergs into freezing seas and grade into polar marine waters and coastal tundra.",
      "olson-2001-ecoregions",
    ),
  ],
  sourceIds: [
    "beck-2018-koppen",
    "olson-2001-ecoregions",
    "ricklefs-ecology",
    "whittaker-1975",
    "iucn-habitats",
  ],
};

export const polarIceSheet: ReferenceBiome = {
  ...base,
  images: [
    mainIllustration(
      base,
      "A sweeping polar ice sheet with sculpted blue glacial crevasses, snow ridges, a lone jagged black nunatak peak and low polar sun.",
      {
        tool: "gpt-6-luna",
        generatedAt: "2026-10-22",
        review: {
          reviewedBy: "Espen Erlandsen",
          reviewedAt: "2026-10-22",
          notes:
            "Sweeping polar ice sheet with sculpted blue glacial crevasses, sastrugi snow ridges, black nunatak peak and low polar sun.",
        },
      },
    ),
  ],
};
