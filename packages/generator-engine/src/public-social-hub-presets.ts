/**
 * Curated archetype presets for social hubs and taverns (#2534).
 */

import type { SmartPreset } from "./smart";

export const SOCIAL_HUB_PRESETS: readonly SmartPreset[] = [
  {
    id: "cozy-roadside-inn",
    label: "Cozy Roadside Inn",
    description:
      "A warm wayside shelter welcoming weary travellers and wanderers.",
    genres: ["Fantasy"],
    set: {
      venueType: "Roadside Alehouse",
      atmosphere: "Rowdy and welcoming",
      wealthLevel: "Modest (reliable, no frills)",
      clientele: "Adventurers and wanderers",
    },
  },
  {
    id: "gilded-high-guildhall",
    label: "Gilded Guildhall",
    description:
      "An opulent merchant hall where trade agreements are struck over private wine.",
    genres: ["Fantasy"],
    set: {
      venueType: "Guildhall",
      atmosphere: "Cold and professional",
      wealthLevel: "Prosperous (good drink, private rooms)",
      clientele: "Merchants and traders",
    },
  },
  {
    id: "dockside-rum-den",
    label: "Dockside Rum Den",
    description:
      "A salty freeport drinking house packed with privateers, smugglers, and gamblers.",
    genres: ["Pirate"],
    set: {
      venueType: "Rum House",
      atmosphere: "Festive and chaotic",
      wealthLevel: "Poor (cheap but honest)",
      clientele: "Pirates and privateers",
    },
  },
  {
    id: "back-alley-hacker-cafe",
    label: "Back-Alley Hacker Café",
    description:
      "A neon-lit noodle joint serving clandestine netrunners under corporate radar.",
    genres: ["Cyberpunk"],
    set: {
      venueType: "Hacker Café",
      atmosphere: "Warm but secretive",
      wealthLevel: "Modest (reliable, no frills)",
      clientele: "Hackers and netrunners",
    },
  },
  {
    id: "orbital-officers-lounge",
    label: "Orbital Officers' Lounge",
    description:
      "A sleek spaceport venue overlooking docking rings and star routes.",
    genres: ["Sci-Fi"],
    set: {
      venueType: "Orbital Lounge",
      atmosphere: "Cold and professional",
      wealthLevel: "Prosperous (good drink, private rooms)",
      clientele: "Free traders",
    },
  },
  {
    id: "isolated-expedition-mess",
    label: "Isolated Expedition Mess",
    description:
      "A remote, wind-battered research canteen harboring uneasy discoveries.",
    genres: ["Cosmic Horror"],
    set: {
      venueType: "Expedition Mess Hall",
      atmosphere: "Tense and suspicious",
      wealthLevel: "Modest (reliable, no frills)",
      clientele: "Field researchers and survey crews",
    },
  },
  {
    id: "wasteland-water-bar",
    label: "Wasteland Water Bar",
    description:
      "A fortified bunker and trading shack where clean hydration is the local gold standard.",
    genres: ["Post-Apocalyptic"],
    set: {
      venueType: "Water Bar",
      atmosphere: "Tense and suspicious",
      wealthLevel: "Destitute (dirt floors, watered-down drinks)",
      clientele: "Scavengers and traders",
    },
  },
  {
    id: "frontier-dust-saloon",
    label: "Frontier Dust Saloon",
    description:
      "A rowdy frontier saloon hosting miners, cowboys, and wandering bounty hunters.",
    genres: ["Western"],
    set: {
      venueType: "Saloon",
      atmosphere: "Rowdy and welcoming",
      wealthLevel: "Poor (cheap but honest)",
      clientele: "Cowboys and drifters",
    },
  },
];

export const TAVERN_PRESETS: readonly SmartPreset[] = [
  {
    id: "crossroads-wayfarer-inn",
    label: "Crossroads Wayfarer Inn",
    description: "A modest wayside stop where wanderers rest their mounts.",
    genres: ["Fantasy"],
    set: {
      settlementType: "Crossroads hamlet",
      tavernType: "Roadside Alehouse",
      atmosphere: "Rowdy and welcoming",
      wealthLevel: "Modest (reliable, no frills)",
      clientele: "Adventurers and wanderers",
    },
  },
  {
    id: "harbour-dockside-alehouse",
    label: "Harbour Dockside Alehouse",
    description:
      "A bustling coastal tavern serving sailors and merchant hands.",
    genres: ["Fantasy"],
    set: {
      settlementType: "Coastal port",
      tavernType: "Tavern / Inn",
      atmosphere: "Festive and chaotic",
      wealthLevel: "Poor (cheap but honest)",
      clientele: "Merchants and traders",
    },
  },
  {
    id: "market-town-mead-hall",
    label: "Market Town Mead Hall",
    description:
      "A grand civic mead hall bustling with mercenaries and local guildfolk.",
    genres: ["Fantasy"],
    set: {
      settlementType: "Market town",
      tavernType: "Mead Hall",
      atmosphere: "Rowdy and welcoming",
      wealthLevel: "Comfortable (decent food and beds)",
      clientele: "Soldiers and mercenaries",
    },
  },
];
