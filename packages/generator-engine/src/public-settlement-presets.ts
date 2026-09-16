/**
 * Curated starting points for the settlement generator (#2340).
 *
 * Each preset names two or three axes and leaves the rest to roll. That is
 * deliberate: since #2341 the open axes follow the pinned ones, so a preset that
 * says "coastal harbour, trade hub" already produces merchant rule, a prosperous
 * tone and a market district without spelling any of that out. Pinning every
 * axis would just turn a preset into a fixed result.
 *
 * Presets only set axes the form actually shows, so everything a preset does
 * stays visible and editable. Official authority is resolved rather than preset
 * for that reason: the public form has no field for it.
 */

import type { SmartPreset } from "./smart";

export const SETTLEMENT_PRESETS: readonly SmartPreset[] = [
  // Fantasy
  {
    id: "merchant-port",
    label: "Merchant Port",
    description: "A harbour town that lives and dies by the trade season.",
    genres: ["Fantasy"],
    set: { environment: "Coastal harbour", primaryFunction: "Trade hub" },
  },
  {
    id: "frontier-outpost",
    label: "Frontier Outpost",
    description: "The last stop before the map stops being reliable.",
    genres: ["Fantasy"],
    set: {
      primaryFunction: "Border checkpoint",
      tone: "Frontier and rough",
    },
  },
  {
    id: "pilgrim-town",
    label: "Pilgrim Town",
    description: "Built around a holy site, and around who profits from it.",
    genres: ["Fantasy"],
    set: {
      primaryFunction: "Pilgrimage town",
      tone: "Mysterious and secretive",
    },
  },
  {
    id: "mining-village",
    label: "Mining Village",
    description: "A village clinging to a mountain and to one seam of ore.",
    genres: ["Fantasy"],
    set: {
      environment: "Mountain pass",
      primaryFunction: "Mining settlement",
      size: "Village",
    },
  },
  {
    id: "scholars-city",
    label: "Scholars' City",
    description:
      "Libraries, rivalries, and students who ask the wrong questions.",
    genres: ["Fantasy"],
    set: { primaryFunction: "Academic city", size: "City" },
  },
  {
    id: "cursed-village",
    label: "Cursed Village",
    description: "Something old woke up in the marsh, and it remembers names.",
    genres: ["Fantasy"],
    set: {
      environment: "Marshland",
      size: "Village",
      mainTension: "Ancient curse awakening",
    },
  },

  // Pirate
  {
    id: "free-port",
    label: "Free Port",
    description: "No flag, no questions, and a harbour master who takes a cut.",
    genres: ["Pirate"],
    set: {
      environment: "Storm-exposed harbour",
      primaryFunction: "Free-trade harbour",
      tone: "Prosperous and lawless",
    },
  },
  {
    id: "hidden-cove",
    label: "Hidden Cove",
    description:
      "A refuge only reachable by someone who already knows the way.",
    genres: ["Pirate"],
    set: {
      environment: "Sheltered island cove",
      primaryFunction: "Pirate haven",
      size: "Hidden Cove",
    },
  },
  {
    id: "blockaded-harbour",
    label: "Blockaded Harbour",
    description: "The navy is outside the reef and the food is running out.",
    genres: ["Pirate"],
    set: {
      primaryFunction: "Naval resupply station",
      mainTension: "Naval blockade tightening",
    },
  },

  // Cyberpunk
  {
    id: "corporate-enclave",
    label: "Corporate Enclave",
    description:
      "Clean streets, warm lighting, and a camera on every one of them.",
    genres: ["Cyberpunk"],
    set: {
      environment: "Corporate arcology district",
      primaryFunction: "Corporate logistics hub",
      tone: "Oppressive and surveilled",
    },
  },
  {
    id: "neon-strip",
    label: "Neon Strip",
    description: "Everything is for sale and most of it is a front.",
    genres: ["Cyberpunk"],
    set: {
      primaryFunction: "Entertainment district",
      tone: "Neon-soaked and decadent",
    },
  },
  {
    id: "flooded-undercity",
    label: "Flooded Undercity",
    description: "The water came up, the money left, and the people stayed.",
    genres: ["Cyberpunk"],
    set: {
      environment: "Flooded lower city",
      primaryFunction: "Refugee enclave",
      tone: "Desperate and hungry",
    },
  },

  // Sci-Fi
  {
    id: "deep-space-waystation",
    label: "Waystation",
    description: "The only refuelling point for three weeks in any direction.",
    genres: ["Sci-Fi"],
    set: {
      environment: "Deep space waystation",
      primaryFunction: "Trade waystation",
    },
  },
  {
    id: "research-colony",
    label: "Research Colony",
    description:
      "A young settlement built around one very promising discovery.",
    genres: ["Sci-Fi"],
    set: {
      environment: "Terraformed moon surface",
      primaryFunction: "Research station",
      tone: "Frontier and optimistic",
    },
  },
  {
    id: "failing-habitat",
    label: "Failing Habitat",
    description: "The extraction quota is met. Life support is not.",
    genres: ["Sci-Fi"],
    set: {
      primaryFunction: "Resource extraction colony",
      tone: "Decaying and neglected",
      mainTension: "Life support failure",
    },
  },

  // Post-Apocalyptic
  {
    id: "walled-refuge",
    label: "Walled Refuge",
    description: "Safe behind the wall, so long as nobody opens the gate.",
    genres: ["Post-Apocalyptic"],
    set: {
      environment: "Fortified hilltop",
      primaryFunction: "Survivor refuge",
      tone: "Paranoid and militarised",
    },
  },
  {
    id: "salvage-town",
    label: "Salvage Town",
    description: "Everything here was something else first.",
    genres: ["Post-Apocalyptic"],
    set: { environment: "Salvage fields", primaryFunction: "Salvage base" },
  },
  {
    id: "green-commune",
    label: "Green Commune",
    description: "The first place in years to grow more than it eats.",
    genres: ["Post-Apocalyptic"],
    set: {
      primaryFunction: "Agricultural commune",
      tone: "Hopeful but fragile",
    },
  },

  // Horror
  {
    id: "quiet-village",
    label: "Quiet Village",
    description: "Everyone is friendly. Everyone is watching you leave.",
    genres: ["Horror"],
    set: {
      environment: "Remote valley",
      primaryFunction: "Isolated village",
      tone: "Outwardly normal but deeply wrong",
    },
  },
  {
    id: "cult-commune",
    label: "Cult Commune",
    description: "A community with one belief and no way out of it.",
    genres: ["Horror"],
    set: {
      primaryFunction: "Cult commune",
      tone: "Gothic and oppressive",
    },
  },
  {
    id: "decaying-quarter",
    label: "Decaying Quarter",
    description:
      "People have been going missing here for longer than anyone admits.",
    genres: ["Horror"],
    set: {
      environment: "Decaying city district",
      mainTension: "Mass disappearances",
    },
  },

  // Western
  {
    id: "boom-town",
    label: "Boom Town",
    description: "Six months old, twice the size it was, half of it tents.",
    genres: ["Western"],
    set: {
      primaryFunction: "Mining claim town",
      size: "Boom Town",
      tone: "Boom-and-bust optimistic",
    },
  },
  {
    id: "railroad-junction",
    label: "Railroad Junction",
    description: "The company owns the line, the depot, and most of the town.",
    genres: ["Western"],
    set: {
      environment: "Railroad junction",
      primaryFunction: "Railroad depot",
      mainTension: "Railroad company pressure",
    },
  },
  {
    id: "outlaw-refuge",
    label: "Outlaw Refuge",
    description: "No law rides out this far, and everyone here knows why.",
    genres: ["Western"],
    set: {
      primaryFunction: "Outlaw hideout",
      tone: "Lawless and dangerous",
    },
  },
];
