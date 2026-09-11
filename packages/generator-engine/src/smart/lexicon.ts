import type { Trait } from "./types";

/**
 * The shared phrase vocabulary for reading a free-text description (#2338).
 *
 * Each entry maps one trait to the phrases a person might actually type for it.
 * Nothing here is generator-specific: a description says "coastal" or "run by
 * merchants" the same way whether it is aimed at a settlement, a faction or a
 * ship, so generators extend this rather than restating it.
 *
 * Phrases are matched as whole words or word sequences, so short entries are
 * safe: "port" will not fire on "important".
 */
export interface LexiconEntry {
  trait: Trait;
  phrases: readonly string[];
}

export type Lexicon = readonly LexiconEntry[];

export const BASE_LEXICON: Lexicon = [
  // Where it is
  {
    trait: "coastal",
    phrases: [
      "coastal",
      "coast",
      "seaside",
      "harbour",
      "harbor",
      "port",
      "port town",
      "seaport",
      "dockside",
      "by the sea",
      "on the sea",
      "waterfront",
      "island",
    ],
  },
  {
    trait: "riverine",
    phrases: [
      "river",
      "riverside",
      "on the river",
      "delta",
      "estuary",
      "canal",
    ],
  },
  { trait: "inland", phrases: ["inland", "landlocked", "interior"] },
  {
    trait: "mountain",
    phrases: ["mountain", "mountainous", "alpine", "highland", "cliff", "peak"],
  },
  { trait: "forest", phrases: ["forest", "wooded", "woodland", "jungle"] },
  { trait: "desert", phrases: ["desert", "arid", "dunes", "sunbaked"] },
  { trait: "swamp", phrases: ["swamp", "marsh", "marshland", "bog", "fen"] },
  { trait: "plains", phrases: ["plains", "grassland", "prairie", "steppe"] },
  {
    trait: "arctic",
    phrases: ["arctic", "frozen", "icy", "glacial", "tundra"],
  },
  { trait: "volcanic", phrases: ["volcanic", "volcano", "ashen"] },
  {
    trait: "urban",
    phrases: ["urban", "city", "metropolis", "sprawl", "downtown", "district"],
  },
  {
    trait: "underground",
    phrases: ["underground", "subterranean", "cavern", "tunnels", "buried"],
  },
  {
    trait: "orbital",
    phrases: [
      "orbital",
      "orbit",
      "space station",
      "in space",
      "asteroid",
      "moon",
    ],
  },
  {
    trait: "ruined",
    phrases: ["ruined", "ruins", "crumbling", "derelict", "abandoned", "razed"],
  },
  {
    trait: "wasteland",
    phrases: ["wasteland", "wastes", "barren", "blasted", "irradiated"],
  },
  {
    trait: "isolated",
    phrases: [
      "isolated",
      "remote",
      "far from",
      "cut off",
      "hidden",
      "secluded",
      "out of the way",
      "middle of nowhere",
    ],
  },

  // What it does
  {
    trait: "trade",
    phrases: [
      "trade",
      "trading",
      "merchant",
      "merchants",
      "mercantile",
      "commerce",
      "commercial",
      "market",
      "caravan",
      "bazaar",
    ],
  },
  {
    trait: "maritime",
    phrases: ["fishing", "fishery", "shipping", "shipyard", "whaling", "naval"],
  },
  {
    trait: "military",
    phrases: [
      "military",
      "garrison",
      "fortress",
      "fortified",
      "barracks",
      "army",
      "soldiers",
      "war camp",
    ],
  },
  {
    trait: "religious",
    phrases: [
      "religious",
      "holy",
      "sacred",
      "temple",
      "shrine",
      "monastery",
      "pilgrimage",
      "cult",
      "faithful",
      "holy site",
    ],
  },
  {
    trait: "mining",
    phrases: [
      "mining",
      "mine",
      "mines",
      "quarry",
      "ore",
      "seam",
      "prospecting",
    ],
  },
  {
    trait: "industrial",
    phrases: [
      "industrial",
      "factory",
      "factories",
      "works",
      "foundry",
      "manufacturing",
      "smog",
    ],
  },
  {
    trait: "agrarian",
    phrases: [
      "farming",
      "farm",
      "agricultural",
      "agrarian",
      "pastoral",
      "harvest",
      "ranching",
    ],
  },
  {
    trait: "academic",
    phrases: [
      "university",
      "academic",
      "scholarly",
      "scholars",
      "library",
      "archive",
      "college",
      "students",
    ],
  },
  {
    trait: "research",
    phrases: [
      "research",
      "laboratory",
      "lab",
      "expedition",
      "survey",
      "science",
    ],
  },
  {
    trait: "criminal",
    phrases: [
      "criminal",
      "crime",
      "smuggling",
      "smugglers",
      "thieves",
      "gang",
      "gangs",
      "underworld",
      "black market",
      "outlaw",
      "pirate",
    ],
  },
  {
    trait: "refuge",
    phrases: [
      "refuge",
      "refugee",
      "sanctuary",
      "haven",
      "survivors",
      "shelter",
    ],
  },
  {
    trait: "transit",
    phrases: [
      "crossroads",
      "waystation",
      "junction",
      "checkpoint",
      "staging",
      "on the road",
      "trade route",
    ],
  },
  {
    trait: "administrative",
    phrases: [
      "administrative",
      "capital",
      "seat of government",
      "diplomatic",
      "civic",
    ],
  },
  {
    trait: "entertainment",
    phrases: [
      "entertainment",
      "nightlife",
      "gambling",
      "pleasure",
      "tourist",
      "resort",
    ],
  },
  {
    trait: "medical",
    phrases: ["hospital", "quarantine", "medical", "plague ward", "clinic"],
  },

  // How it feels
  { trait: "cosy", phrases: ["cosy", "cozy", "welcoming", "friendly", "warm"] },
  {
    trait: "grim",
    phrases: ["grim", "bleak", "harsh", "hard-bitten", "joyless", "dour"],
  },
  {
    trait: "mysterious",
    phrases: ["mysterious", "secretive", "enigmatic", "shadowy", "occult"],
  },
  { trait: "heroic", phrases: ["heroic", "proud", "noble", "valiant"] },
  {
    trait: "decadent",
    phrases: ["decadent", "corrupt", "corrupted", "indulgent", "debauched"],
  },
  {
    trait: "prosperous",
    phrases: [
      "prosperous",
      "wealthy",
      "rich",
      "affluent",
      "thriving",
      "booming",
      "well off",
    ],
  },
  {
    trait: "declining",
    phrases: [
      "declining",
      "decaying",
      "dying",
      "faded",
      "abandoned slowly",
      "being abandoned",
      "past its prime",
      "emptying",
    ],
  },
  {
    trait: "frontier",
    phrases: ["frontier", "pioneer", "borderland", "untamed", "edge of"],
  },
  {
    trait: "oppressive",
    phrases: [
      "oppressive",
      "authoritarian",
      "surveilled",
      "surveillance",
      "policed",
      "under the boot",
      "repressive",
    ],
  },
  {
    trait: "lawless",
    phrases: ["lawless", "no law", "rowdy", "wild", "anarchic", "ungoverned"],
  },
  {
    trait: "eerie",
    phrases: [
      "eerie",
      "creepy",
      "unsettling",
      "uncanny",
      "sinister",
      "wrong",
      "haunted",
      "unnerving",
      "disquieting",
    ],
  },
  {
    trait: "desperate",
    phrases: [
      "desperate",
      "starving",
      "hunted",
      "on the brink",
      "at breaking point",
    ],
  },
  {
    trait: "sterile",
    phrases: ["sterile", "clinical", "antiseptic", "efficient"],
  },
  {
    trait: "vibrant",
    phrases: ["vibrant", "lively", "bustling", "colourful", "colorful"],
  },
  {
    trait: "bureaucratic",
    phrases: ["bureaucratic", "red tape", "paperwork", "officious"],
  },
  {
    trait: "hopeful",
    phrases: ["hopeful", "optimistic", "rebuilding", "utopian"],
  },
  {
    trait: "defiant",
    phrases: ["defiant", "rebellious", "resistance", "insurgent", "scrappy"],
  },

  // What is going wrong
  {
    trait: "war",
    phrases: ["war", "invasion", "conquest", "civil war", "raiders"],
  },
  { trait: "siege", phrases: ["siege", "besieged", "blockade", "surrounded"] },
  {
    trait: "crime",
    phrases: ["crime wave", "murders", "disappearances", "racket", "extortion"],
  },
  {
    trait: "disease",
    phrases: [
      "plague",
      "disease",
      "outbreak",
      "epidemic",
      "contagion",
      "sickness",
    ],
  },
  {
    trait: "supernatural",
    phrases: [
      "cursed",
      "curse",
      "haunting",
      "undead",
      "possessed",
      "ritual",
      "monster",
      "eldritch",
      "supernatural",
    ],
  },
  {
    trait: "scarcity",
    phrases: [
      "famine",
      "drought",
      "shortage",
      "scarcity",
      "running out",
      "rationing",
    ],
  },
  {
    trait: "politics",
    phrases: [
      "political",
      "politics",
      "succession",
      "scandal",
      "faction struggle",
      "divided",
      "contested",
    ],
  },
  {
    trait: "betrayal",
    phrases: [
      "betrayal",
      "treachery",
      "informant",
      "double cross",
      "mutiny",
      "saboteur",
    ],
  },
  {
    trait: "environmental",
    phrases: [
      "flooding",
      "storms",
      "contamination",
      "poisoned land",
      "erosion",
      "drought",
    ],
  },
  {
    trait: "labour",
    phrases: ["strike", "unrest", "union", "labour", "labor", "workers"],
  },
  {
    trait: "technology",
    phrases: [
      "malfunction",
      "blackout",
      "reactor",
      "machinery",
      "system failure",
    ],
  },

  // Who is in charge
  {
    trait: "feudal",
    phrases: ["feudal", "lord", "baron", "old family", "nobility"],
  },
  {
    trait: "elected",
    phrases: ["elected", "council", "democratic", "mayor", "town council"],
  },
  {
    trait: "oligarchic",
    phrases: [
      "oligarchy",
      "oligarchic",
      "guild",
      "syndicate",
      "corporate",
      "corporation",
      "cartel",
      "controlled by merchants",
      "run by merchants",
    ],
  },
  {
    trait: "criminal-rule",
    phrases: ["crime boss", "gang boss", "mob", "kingpin", "run by criminals"],
  },
  {
    trait: "autocratic",
    phrases: [
      "despot",
      "tyrant",
      "dictator",
      "warlord",
      "autocratic",
      "strongman",
    ],
  },
  {
    trait: "imperial",
    phrases: ["imperial", "empire", "colonial", "occupied", "governor"],
  },
  { trait: "tribal", phrases: ["tribal", "clan", "elders", "chieftain"] },
  {
    trait: "artificial",
    phrases: ["ai", "artificial intelligence", "machine rule", "computer"],
  },

  // How big
  {
    trait: "tiny",
    phrases: ["tiny", "hamlet", "outpost", "camp", "a handful of"],
  },
  { trait: "small", phrases: ["small", "village", "little"] },
  { trait: "medium", phrases: ["town", "mid-sized", "medium"] },
  { trait: "large", phrases: ["large", "big", "huge", "sprawling", "great"] },
];

/** Layer generator-specific phrases on top of the shared vocabulary. */
export function mergeLexicons(...lexicons: Lexicon[]): Lexicon {
  return lexicons.flat();
}
