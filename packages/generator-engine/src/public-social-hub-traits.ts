/**
 * Semantic traits for the social hub and tavern generators (#2534).
 *
 * Reuses SETTLEMENT_TRAIT_VOCABULARY where concepts overlap (environment, tone, function)
 * to maintain vocabulary continuity across worldbuilding generators.
 */

import { SETTLEMENT_TRAIT_VOCABULARY } from "./public-settlement-traits";

export const SOCIAL_HUB_EXTRA_TRAITS = [
  "destitute",
  "poor",
  "modest",
  "comfortable",
  "wealthy",
  "clandestine",
  "highborn",
  "working-class",
  "hospitality",
] as const;

export const SOCIAL_HUB_TRAIT_VOCABULARY = [
  ...SETTLEMENT_TRAIT_VOCABULARY,
  ...SOCIAL_HUB_EXTRA_TRAITS,
] as const;

export type SocialHubTrait = (typeof SOCIAL_HUB_TRAIT_VOCABULARY)[number];

type TraitMap = Readonly<Record<string, readonly SocialHubTrait[]>>;

// ---------------------------------------------------------------------------
// Venue Types By Genre
// ---------------------------------------------------------------------------

export const VENUE_TYPE_TRAITS: TraitMap = {
  // Fantasy
  "Tavern / Inn": ["hospitality", "trade", "cosy", "medium"],
  "Mead Hall": ["hospitality", "military", "heroic", "large"],
  "Roadside Alehouse": ["hospitality", "transit", "frontier", "small"],
  "Adventurer Lodge": ["hospitality", "heroic", "military", "medium"],
  Guildhall: ["trade", "administrative", "prosperous", "large"],

  // Dark Fantasy
  "Cursed Alehouse": ["hospitality", "supernatural", "grim", "eerie"],
  "Witch's Den": ["mysterious", "supernatural", "clandestine", "eerie"],
  "Underground Fighting Pit": ["criminal", "underground", "grim", "lawless"],
  "Plague Hospice": ["medical", "disease", "desperate", "grim"],
  "Smuggler's Hollow": ["criminal", "clandestine", "lawless", "underground"],

  // Pirate
  "Dockside Tavern": ["maritime", "coastal", "trade", "working-class"],
  "Rum House": ["maritime", "entertainment", "lawless", "vibrant"],
  "Sailor's Inn": ["maritime", "coastal", "transit", "hospitality"],
  "Gambling Den": ["criminal", "entertainment", "lawless", "clandestine"],
  "Freeport Alehouse": ["maritime", "lawless", "trade", "vibrant"],

  // Cyberpunk
  "Noodle Bar": ["hospitality", "urban", "working-class", "cosy"],
  "Dive Bar": ["urban", "criminal", "grim", "working-class"],
  Nightclub: ["entertainment", "urban", "decadent", "vibrant"],
  "Hacker Café": ["technology", "research", "clandestine", "urban"],
  "Braindance Lounge": ["entertainment", "technology", "decadent", "urban"],

  // Sci-Fi
  "Spaceport Cantina": ["orbital", "transit", "trade", "vibrant"],
  "Station Bar": ["orbital", "working-class", "transit", "cosy"],
  "Mess Hall": ["military", "administrative", "sterile", "modest"],
  "Orbital Lounge": ["orbital", "prosperous", "decadent", "wealthy"],
  "Asteroid Miner Pub": ["mining", "working-class", "frontier", "grim"],

  // Modern
  Pub: ["hospitality", "urban", "cosy", "working-class"],
  "Café / Diner": ["hospitality", "urban", "cosy", "modest"],
  "Hotel Bar": ["hospitality", "prosperous", "comfortable", "urban"],
  "Truck Stop": ["transit", "frontier", "working-class", "modest"],

  // Horror
  "Goth Club": ["entertainment", "decadent", "mysterious", "urban"],
  "Occult Café": ["mysterious", "supernatural", "clandestine", "academic"],
  Speakeasy: ["criminal", "clandestine", "comfortable", "urban"],
  "Blood Bar": ["supernatural", "criminal", "decadent", "grim"],
  "Private Lounge": ["clandestine", "highborn", "wealthy", "mysterious"],

  // Cosmic Horror
  "Expedition Mess Hall": ["academic", "research", "frontier", "sterile"],
  "Restricted Reading Room": [
    "academic",
    "research",
    "mysterious",
    "clandestine",
  ],
  "Weather Station Canteen": ["arctic", "isolated", "research", "desperate"],
  "Diving Bell Lounge": ["maritime", "coastal", "mysterious", "isolated"],
  "Museum Staff Common Room": ["academic", "administrative", "modest", "cosy"],

  // Post-Apocalyptic
  "Trade Shack": ["trade", "scarcity", "wasteland", "destitute"],
  "Bunker Canteen": ["underground", "military", "scarcity", "refuge"],
  "Water Bar": ["trade", "scarcity", "wasteland"],
  "Settlement Mess": ["refuge", "agrarian", "scarcity", "modest"],
  Caravanserai: ["transit", "trade", "desert", "frontier"],

  // Western
  Saloon: ["hospitality", "frontier", "entertainment", "vibrant"],
  "Boarding House": ["hospitality", "frontier", "modest", "cosy"],
  "Trading Post": ["trade", "frontier", "transit", "modest"],
  Roadhouse: ["transit", "frontier", "isolated", "working-class"],
  "Gambling Parlour": ["entertainment", "lawless", "prosperous", "frontier"],

  // Steampunk
  "Aetheric Lounge": ["technology", "decadent", "prosperous", "urban"],
  "Artificers' Club": ["technology", "academic", "trade", "prosperous"],
  "Engine-District Pub": ["industrial", "working-class", "grim", "urban"],
  "Sky-Dock Canteen": ["transit", "industrial", "working-class", "urban"],
  "Guild Factor's Parlour": ["trade", "administrative", "highborn", "wealthy"],

  // Lancer
  "Mech Bay Canteen": ["military", "industrial", "technology", "working-class"],
  "Outpost Transit Bar": ["frontier", "transit", "isolated", "modest"],
  "Union Admin Mess Hall": [
    "administrative",
    "bureaucratic",
    "hopeful",
    "modest",
  ],
  "Pilot's Debrief Lounge": [
    "military",
    "technology",
    "comfortable",
    "sterile",
  ],
  "Colonial Settlement Common Room": ["agrarian", "refuge", "frontier", "cosy"],

  // Space Opera Resistance
  "Smuggler's Cantina": ["criminal", "transit", "clandestine", "lawless"],
  "Underground Resistance Hub": [
    "military",
    "defiant",
    "clandestine",
    "underground",
  ],
  "Imperial Officers' Club": ["military", "imperial", "oppressive", "wealthy"],
  "Scrap-Town Bar": ["industrial", "wasteland", "working-class", "desperate"],
  "Spaceport Transit Lounge": ["transit", "trade", "orbital", "modest"],

  // Optimistic Exploration Sci-Fi
  "Starship Observation Lounge": [
    "orbital",
    "hopeful",
    "comfortable",
    "prosperous",
  ],
  "Space Station Promenade": ["orbital", "trade", "vibrant", "hopeful"],
  "Embassy Reception Hall": ["administrative", "highborn", "wealthy"],
  "Planetary Academy Campus": ["academic", "research", "hopeful", "prosperous"],
  "Frontier Research Outpost Canteen": [
    "research",
    "frontier",
    "isolated",
    "modest",
  ],
};

// ---------------------------------------------------------------------------
// Atmospheres
// ---------------------------------------------------------------------------

export const ATMOSPHERE_TRAITS: TraitMap = {
  "Rowdy and welcoming": ["vibrant", "cosy", "hospitality"],
  "Tense and suspicious": ["grim", "clandestine", "oppressive"],
  "Quiet and melancholic": ["declining", "cosy", "mysterious"],
  "Festive and chaotic": ["vibrant", "entertainment", "lawless"],
  "Cold and professional": ["sterile", "administrative", "bureaucratic"],
  "Warm but secretive": ["cosy", "clandestine", "mysterious"],
};

// ---------------------------------------------------------------------------
// Wealth Levels
// ---------------------------------------------------------------------------

export const WEALTH_LEVEL_TRAITS: TraitMap = {
  "Destitute (dirt floors, watered-down drinks)": [
    "destitute",
    "scarcity",
    "grim",
    "desperate",
  ],
  "Poor (cheap but honest)": ["poor", "working-class", "scarcity", "modest"],
  "Modest (reliable, no frills)": ["modest", "working-class", "comfortable"],
  "Comfortable (decent food and beds)": [
    "comfortable",
    "hospitality",
    "prosperous",
  ],
  "Prosperous (good drink, private rooms)": [
    "prosperous",
    "comfortable",
    "wealthy",
  ],
  "Wealthy (exclusive clientele)": [
    "wealthy",
    "highborn",
    "decadent",
    "prosperous",
  ],
};

// ---------------------------------------------------------------------------
// Clienteles By Genre
// ---------------------------------------------------------------------------

export const CLIENTELE_TRAITS: TraitMap = {
  // Fantasy
  "Adventurers and wanderers": ["heroic", "transit", "frontier"],
  "Merchants and traders": ["trade", "prosperous", "transit"],
  "Soldiers and mercenaries": ["military", "working-class", "grim"],
  "Pilgrims and clergy": ["religious", "modest", "hopeful"],
  "Criminals and fence-seekers": ["criminal", "clandestine", "lawless"],
  "Mixed locals": ["hospitality", "modest", "working-class"],

  // Dark Fantasy
  "Mercenaries and cultists": ["military", "supernatural", "grim"],
  "Outlaws and desperate souls": ["criminal", "desperate", "lawless"],
  "Corrupt clergy": ["religious", "politics", "decadent"],
  "Cursed travellers": ["supernatural", "disease", "desperate"],
  "Black-market traders": ["trade", "criminal", "clandestine"],

  // Pirate
  "Pirates and privateers": ["maritime", "criminal", "lawless"],
  "Sailors and dockworkers": ["maritime", "industrial", "working-class"],
  "Smugglers and fences": ["maritime", "criminal", "clandestine"],
  "Bounty hunters": ["military", "lawless", "transit"],
  "Stranded merchants": ["trade", "desperate", "maritime"],

  // Cyberpunk
  "Hackers and netrunners": ["technology", "research", "clandestine"],
  "Off-duty security": ["military", "administrative", "working-class"],
  "Smugglers and fixers": ["criminal", "trade", "clandestine"],
  "Street gang members": ["criminal", "lawless", "desperate"],
  "Corporate burnouts": ["administrative", "declining", "desperate"],

  // Sci-Fi
  "Spacers and pilots": ["transit", "orbital", "working-class"],
  "Colonial marines": ["military", "frontier", "modest"],
  "Free traders": ["trade", "orbital", "prosperous"],
  "Scientists and researchers": ["academic", "research", "technology"],
  "Station workers": ["industrial", "orbital", "working-class"],

  // Modern
  "Office workers": ["administrative", "urban", "modest"],
  "Local regulars": ["hospitality", "urban", "cosy"],
  "Tourists and travellers": ["transit", "prosperous", "vibrant"],
  "Journalists and students": ["academic", "research", "vibrant"],
  "Off-duty police": ["military", "administrative", "urban"],

  // Horror
  "Occultists and hunters": ["mysterious", "supernatural", "clandestine"],
  "Lost souls and drifters": ["desperate", "declining", "isolated"],
  "Curious investigators": ["academic", "research", "mysterious"],
  "Predators in disguise": ["supernatural", "criminal", "clandestine"],
  "Frightened locals": ["desperate", "supernatural", "eerie"],

  // Cosmic Horror
  "Field researchers and survey crews": ["research", "academic", "isolated"],
  "Anxious locals with half-told stories": ["eerie", "desperate", "mysterious"],
  "Archive staff and visiting scholars": ["academic", "research", "modest"],
  "Divers, sailors, and salvage teams": ["maritime", "industrial", "isolated"],
  "Investigators following an unsettling lead": [
    "academic",
    "clandestine",
    "mysterious",
  ],

  // Post-Apocalyptic
  "Scavengers and traders": ["trade", "scarcity", "wasteland"],
  "Wasteland survivors": ["desperate", "frontier", "wasteland"],
  "Cult members": ["religious", "supernatural", "desperate"],
  Mercenaries: ["military", "working-class", "lawless"],
  "Settlers and refugees": ["refuge", "agrarian", "desperate"],

  // Western
  "Cowboys and drifters": ["frontier", "transit", "working-class"],
  "Miners and prospectors": ["mining", "industrial", "working-class"],
  "Outlaws and bounty hunters": ["criminal", "lawless", "military"],
  Townsfolk: ["hospitality", "modest", "frontier"],
  "Railroad workers": ["industrial", "transit", "working-class"],

  // Steampunk
  "Artificers and engine-wrights": [
    "technology",
    "industrial",
    "working-class",
  ],
  "Guild factors and patent brokers": ["trade", "administrative", "prosperous"],
  "Sky-dock workers and airship crew": ["transit", "maritime", "working-class"],
  "Off-duty imperial constables": ["military", "imperial", "administrative"],
  "Underclass agitators in disguise": [
    "defiant",
    "clandestine",
    "working-class",
  ],

  // Lancer
  "Off-duty mech pilots and crew chiefs": [
    "military",
    "technology",
    "working-class",
  ],
  "Union administrators and logistics staff": [
    "administrative",
    "bureaucratic",
    "hopeful",
  ],
  "Colonial settlers and outpost workers": ["frontier", "agrarian", "modest"],
  "Mercenary contractors between jobs": [
    "military",
    "working-class",
    "transit",
  ],
  "NHP handlers on downtime protocols": [
    "technology",
    "research",
    "mysterious",
  ],

  // Space Opera Resistance
  "Rebel spies and informants": ["defiant", "clandestine", "politics"],
  "Off-duty imperial officers and stormtroopers": [
    "imperial",
    "military",
    "oppressive",
  ],
  "Smugglers and bounty hunters": ["criminal", "trade", "transit"],
  "Mystic order exiles in hiding": ["supernatural", "isolated", "clandestine"],
  "Scrap workers and frontier traders": ["industrial", "trade", "wasteland"],

  // Optimistic Exploration Sci-Fi
  "Off-duty officers": ["military", "hopeful", "modest"],
  "Visiting alien diplomats": ["administrative", "highborn", "hopeful"],
  "Research scientists": ["academic", "research", "hopeful"],
  "Civilian colonists": ["agrarian", "hopeful", "transit"],
  "Exchange students": ["academic", "vibrant", "hopeful"],
  "Stellar cartographers": ["research", "transit", "orbital"],
};

// ---------------------------------------------------------------------------
// Troubles
// ---------------------------------------------------------------------------

export const TROUBLE_TRAITS: TraitMap = {
  "The owner owes a dangerous debt that is coming due": [
    "crime",
    "desperate",
    "scarcity",
  ],
  "A recent violent incident was quietly buried — the responsible party may still be inside":
    ["crime", "clandestine", "betrayal"],
  "A protected criminal is hiding among the staff": [
    "criminal",
    "crime",
    "clandestine",
  ],
  "A back room connects to something the owner refuses to discuss": [
    "supernatural",
    "mysterious",
    "eerie",
  ],
  "A faction is using the venue as a dead-drop without the owner's knowledge": [
    "politics",
    "clandestine",
    "betrayal",
  ],
  "The place is being squeezed out by a rival backed by local power": [
    "politics",
    "crime",
    "oppressive",
  ],
};

// ---------------------------------------------------------------------------
// Settlement Types (for Tavern Generator)
// ---------------------------------------------------------------------------

export const SETTLEMENT_TYPE_TRAITS: TraitMap = {
  "Capital city": ["urban", "large", "prosperous", "administrative"],
  "Market town": ["trade", "medium", "prosperous", "transit"],
  "Frontier outpost": ["frontier", "small", "military", "isolated"],
  "Coastal port": ["coastal", "maritime", "trade", "medium"],
  "Remote village": ["isolated", "agrarian", "small", "cosy"],
  "Crossroads hamlet": ["transit", "tiny", "agrarian", "frontier"],
};

// ---------------------------------------------------------------------------
// Rules & Affinities
// ---------------------------------------------------------------------------

export const SOCIAL_HUB_RULES: readonly {
  trait: SocialHubTrait;
  requiresTraitOf?: readonly SocialHubTrait[];
  excludesTraitOf?: readonly SocialHubTrait[];
}[] = [
  {
    trait: "wealthy",
    excludesTraitOf: ["destitute", "scarcity", "desperate"],
  },
  {
    trait: "destitute",
    excludesTraitOf: ["wealthy", "prosperous", "highborn"],
  },
  {
    trait: "sterile",
    excludesTraitOf: ["decadent", "lawless"],
  },
];

export const SOCIAL_HUB_AFFINITIES: readonly {
  when: SocialHubTrait;
  favour: SocialHubTrait;
  multiplier: number;
}[] = [
  // Highborn & Wealth
  { when: "wealthy", favour: "prosperous", multiplier: 3 },
  { when: "wealthy", favour: "highborn", multiplier: 2.5 },
  { when: "wealthy", favour: "comfortable", multiplier: 2 },

  // Destitute & Poverty
  { when: "destitute", favour: "desperate", multiplier: 3 },
  { when: "destitute", favour: "scarcity", multiplier: 2.5 },
  { when: "destitute", favour: "grim", multiplier: 2 },

  // Clandestine & Crime
  { when: "criminal", favour: "clandestine", multiplier: 2.5 },
  { when: "criminal", favour: "lawless", multiplier: 2 },
  { when: "clandestine", favour: "mysterious", multiplier: 2 },

  // Maritime & Transit
  { when: "maritime", favour: "coastal", multiplier: 3 },
  { when: "maritime", favour: "trade", multiplier: 2 },

  // Academic & Research
  { when: "academic", favour: "research", multiplier: 3 },
  { when: "research", favour: "technology", multiplier: 2 },

  // Military & Frontline
  { when: "military", favour: "frontier", multiplier: 2 },
  { when: "military", favour: "defiant", multiplier: 2 },
];
