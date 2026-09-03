import { z } from "zod";

export const SilhouetteGenreSchema = z.enum([
  "fantasy",
  "gothic",
  "scifi",
  "cyberpunk",
  "western",
  "modern",
  "cosmic-horror",
  "steampunk",
]);

export type SilhouetteGenre = z.infer<typeof SilhouetteGenreSchema>;

export const SilhouetteArchetypeSchema = z.enum([
  "warrior",
  "caster",
  "rogue",
  "scientist",
  "noble",
  "inquisitor",
  "outlaw",
  "pilot",
  "hacker",
  "beast",
  "dragon",
  "horror",
  "construct",
  "relic",
  "structure",
  "insignia",
  "generic",
]);

export type SilhouetteArchetype = z.infer<typeof SilhouetteArchetypeSchema>;

export const SilhouetteCategorySchema = z.enum([
  "character",
  "creature",
  "location",
  "item",
  "faction",
  "event",
  "note",
]);

export type SilhouetteCategory = z.infer<typeof SilhouetteCategorySchema>;

export const SilhouetteDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: SilhouetteCategorySchema,
  genres: z.array(SilhouetteGenreSchema).min(1),
  archetype: SilhouetteArchetypeSchema,
  gender: z.enum(["female", "male", "neutral", "androgynous"]).optional(),
  tags: z.array(z.string().min(1)).default([]),
  /**
   * Key of the artwork in the `codex-cryptica-statics` R2 bucket. The SVG
   * itself is never inlined here: the catalogue carries only what the matching
   * heuristic reads, and the artwork is fetched from R2 on demand.
   */
  r2Path: z.string().min(1),
});

export type SilhouetteDefinition = z.infer<typeof SilhouetteDefinitionSchema>;

/**
 * Curated library of crisp vector silhouettes for all entity types across multiple genres.
 * Designed with a normalized 100x100 viewport and fill="currentColor" for dynamic theme tinting.
 */
export const SILHOUETTES: SilhouetteDefinition[] = [
  // ==========================================
  // FANTASY & HISTORICAL CHARACTERS
  // ==========================================
  {
    id: "fantasy-warrior-male",
    name: "Fantasy Warrior (M)",
    category: "character",
    genres: ["fantasy", "gothic"],
    archetype: "warrior",
    gender: "male",
    tags: [
      "knight",
      "plate",
      "sword",
      "soldier",
      "guard",
      "fighter",
      "champion",
      "armor",
      "paladin",
      "blade",
    ],
    r2Path: "silhouettes/character/fantasy/warrior-male.svg",
  },
  {
    id: "fantasy-warrior-female",
    name: "Fantasy Warrior (F)",
    category: "character",
    genres: ["fantasy", "gothic"],
    archetype: "warrior",
    gender: "female",
    tags: [
      "shieldmaiden",
      "valkyrie",
      "knight",
      "mercenary",
      "sword",
      "warrior",
      "fighter",
      "heroine",
      "armor",
    ],
    r2Path: "silhouettes/character/fantasy/warrior-female.svg",
  },
  {
    id: "fantasy-caster-male",
    name: "Mage / Wizard (M)",
    category: "character",
    genres: ["fantasy"],
    archetype: "caster",
    gender: "male",
    tags: [
      "wizard",
      "mage",
      "staff",
      "robe",
      "archmage",
      "spellcaster",
      "magic",
      "sorcerer",
      "enchanter",
      "scholar",
    ],
    r2Path: "silhouettes/character/fantasy/caster-male.svg",
  },
  {
    id: "fantasy-caster-female",
    name: "Sorceress / Witch (F)",
    category: "character",
    genres: ["fantasy", "gothic"],
    archetype: "caster",
    gender: "female",
    tags: [
      "witch",
      "sorceress",
      "magic",
      "mystic",
      "spellcaster",
      "enchantress",
      "occult",
      "caster",
      "priestess",
    ],
    r2Path: "silhouettes/character/fantasy/caster-female.svg",
  },
  {
    id: "fantasy-rogue-male",
    name: "Rogue / Assassin (M)",
    category: "character",
    genres: ["fantasy", "gothic"],
    archetype: "rogue",
    gender: "male",
    tags: [
      "rogue",
      "thief",
      "dagger",
      "hooded",
      "assassin",
      "shadow",
      "stealth",
      "stalker",
      "ninja",
      "scoundrel",
    ],
    r2Path: "silhouettes/character/fantasy/rogue-male.svg",
  },
  {
    id: "fantasy-rogue-female",
    name: "Ranger / Duelist (F)",
    category: "character",
    genres: ["fantasy", "western"],
    archetype: "rogue",
    gender: "female",
    tags: [
      "scout",
      "ranger",
      "duelist",
      "archer",
      "huntress",
      "bow",
      "agile",
      "cloak",
      "blade",
    ],
    r2Path: "silhouettes/character/fantasy/rogue-female.svg",
  },
  {
    id: "fantasy-paladin",
    name: "Paladin / Templar",
    category: "character",
    genres: ["fantasy", "gothic"],
    archetype: "warrior",
    gender: "neutral",
    tags: [
      "paladin",
      "templar",
      "crusader",
      "holy",
      "divine",
      "warhammer",
      "sun",
      "cleric",
      "shield",
      "order",
    ],
    r2Path: "silhouettes/character/fantasy/paladin.svg",
  },

  // ==========================================
  // GOTHIC & OCCULT
  // ==========================================
  {
    id: "gothic-vampire-male",
    name: "Vampire Lord (M)",
    category: "character",
    genres: ["gothic", "fantasy"],
    archetype: "noble",
    gender: "male",
    tags: [
      "vampire",
      "count",
      "fangs",
      "aristocrat",
      "blood",
      "lord",
      "gothic",
      "dracula",
      "cape",
      "undead",
    ],
    r2Path: "silhouettes/character/gothic/vampire-male.svg",
  },
  {
    id: "gothic-vampire-female",
    name: "Vampire Countess (F)",
    category: "character",
    genres: ["gothic", "fantasy"],
    archetype: "noble",
    gender: "female",
    tags: [
      "vampire",
      "countess",
      "vampireess",
      "gown",
      "gothic",
      "blood",
      "aristocrat",
      "undead",
      "lady",
      "corset",
    ],
    r2Path: "silhouettes/character/gothic/vampire-female.svg",
  },
  {
    id: "gothic-inquisitor",
    name: "Inquisitor / Witch Hunter",
    category: "character",
    genres: ["gothic", "fantasy", "western"],
    archetype: "inquisitor",
    gender: "neutral",
    tags: [
      "inquisitor",
      "witchhunter",
      "hunter",
      "hat",
      "coat",
      "stake",
      "zealot",
      "fanatic",
      "church",
      "purge",
    ],
    r2Path: "silhouettes/character/gothic/inquisitor.svg",
  },

  // ==========================================
  // SCI-FI & CYBERPUNK
  // ==========================================
  {
    id: "scifi-scientist-alien",
    name: "Alien Scientist",
    category: "character",
    genres: ["scifi", "cosmic-horror"],
    archetype: "scientist",
    gender: "neutral",
    tags: [
      "alien",
      "scientist",
      "researcher",
      "scholar",
      "tech",
      "lab",
      "extraterrestrial",
      "doctor",
      "intellect",
    ],
    r2Path: "silhouettes/character/scifi/scientist-alien.svg",
  },
  {
    id: "scifi-pilot-explorer",
    name: "Star Pilot / Astronaut",
    category: "character",
    genres: ["scifi"],
    archetype: "pilot",
    gender: "neutral",
    tags: [
      "pilot",
      "astronaut",
      "explorer",
      "helmet",
      "spacesuit",
      "starship",
      "navigator",
      "captain",
      "scout",
    ],
    r2Path: "silhouettes/character/scifi/pilot-explorer.svg",
  },
  {
    id: "cyberpunk-hacker-female",
    name: "Netrunner / Hacker (F)",
    category: "character",
    genres: ["cyberpunk", "scifi"],
    archetype: "hacker",
    gender: "female",
    tags: [
      "hacker",
      "netrunner",
      "cyber",
      "visor",
      "jacked-in",
      "neural",
      "deck",
      "technomancer",
      "punk",
    ],
    r2Path: "silhouettes/character/cyberpunk/hacker-female.svg",
  },
  {
    id: "cyberpunk-enforcer-male",
    name: "Cyber Enforcer / Merc",
    category: "character",
    genres: ["cyberpunk", "scifi"],
    archetype: "warrior",
    gender: "male",
    tags: [
      "enforcer",
      "cyborg",
      "merc",
      "gunner",
      "armored",
      "cyberware",
      "bionic",
      "street",
      "soldier",
    ],
    r2Path: "silhouettes/character/cyberpunk/enforcer-male.svg",
  },
  {
    id: "scifi-captain-commander",
    name: "Starship Captain / Commander",
    category: "character",
    genres: ["scifi"],
    archetype: "noble",
    gender: "neutral",
    tags: [
      "captain",
      "commander",
      "officer",
      "fleet",
      "admiral",
      "starship",
      "bridge",
      "naval",
      "command",
      "skipper",
    ],
    r2Path: "silhouettes/character/scifi/captain-commander.svg",
  },
  {
    id: "scifi-marine-soldier",
    name: "Heavy Armored Marine",
    category: "character",
    genres: ["scifi"],
    archetype: "warrior",
    gender: "neutral",
    tags: [
      "marine",
      "soldier",
      "trooper",
      "armor",
      "exo-suit",
      "infantry",
      "commando",
      "heavy",
      "combat",
      "rifle",
    ],
    r2Path: "silhouettes/character/scifi/marine-soldier.svg",
  },
  {
    id: "scifi-engineer-mechanic",
    name: "Starship Engineer / Mechanic",
    category: "character",
    genres: ["scifi", "cyberpunk"],
    archetype: "scientist",
    gender: "neutral",
    tags: [
      "engineer",
      "mechanic",
      "technician",
      "welder",
      "repair",
      "jumpsuit",
      "torch",
      "tools",
      "systems",
      "maintenance",
    ],
    r2Path: "silhouettes/character/scifi/engineer-mechanic.svg",
  },
  {
    id: "scifi-field-medic",
    name: "Cyber-Medic / Field Surgeon",
    category: "character",
    genres: ["scifi", "cyberpunk"],
    archetype: "scientist",
    gender: "neutral",
    tags: [
      "medic",
      "doctor",
      "surgeon",
      "healer",
      "triage",
      "scanner",
      "clinic",
      "cyber-doc",
      "medical",
      "physician",
    ],
    r2Path: "silhouettes/character/scifi/field-medic.svg",
  },
  {
    id: "scifi-android-synth",
    name: "Synthetic Android / AI Host",
    category: "character",
    genres: ["scifi", "cyberpunk"],
    archetype: "construct",
    gender: "neutral",
    tags: [
      "android",
      "synth",
      "synthetic",
      "robot",
      "cyborg",
      "automaton",
      "artificial",
      "chassis",
      "replica",
      "golem",
    ],
    r2Path: "silhouettes/character/scifi/android-synth.svg",
  },
  {
    id: "scifi-psionic-operative",
    name: "Psionic / Biotic Operative",
    category: "character",
    genres: ["scifi"],
    archetype: "caster",
    gender: "neutral",
    tags: [
      "psionic",
      "psychic",
      "esper",
      "biotic",
      "telekinetic",
      "telepath",
      "mind",
      "mystic",
      "mentalist",
      "aura",
    ],
    r2Path: "silhouettes/character/scifi/psionic-operative.svg",
  },
  {
    id: "scifi-trader-smuggler",
    name: "Space Trader / Privateer",
    category: "character",
    genres: ["scifi", "western"],
    archetype: "outlaw",
    gender: "neutral",
    tags: [
      "trader",
      "merchant",
      "smuggler",
      "scoundrel",
      "spacer",
      "privateer",
      "rogue",
      "freighter",
      "cargo",
      "pilot",
    ],
    r2Path: "silhouettes/character/scifi/trader-smuggler.svg",
  },

  // ==========================================
  // WESTERN & FRONTIER
  // ==========================================
  {
    id: "western-gunslinger-male",
    name: "Gunslinger (M)",
    category: "character",
    genres: ["western"],
    archetype: "outlaw",
    gender: "male",
    tags: [
      "gunslinger",
      "cowboy",
      "sheriff",
      "revolver",
      "duster",
      "western",
      "bandit",
      "bounty-hunter",
      "stetson",
      "drifter",
    ],
    r2Path: "silhouettes/character/western/gunslinger-male.svg",
  },
  {
    id: "western-outlaw-female",
    name: "Outlaw / Bounty Hunter (F)",
    category: "character",
    genres: ["western"],
    archetype: "outlaw",
    gender: "female",
    tags: [
      "outlaw",
      "cowgirl",
      "hunter",
      "bounty",
      "western",
      "revolver",
      "duster",
      "sheriff",
      "rogue",
    ],
    r2Path: "silhouettes/character/western/outlaw-female.svg",
  },

  // ==========================================
  // CREATURES & MONSTERS
  // ==========================================
  {
    id: "creature-beast-quadruped",
    name: "Dire Beast / Wolf",
    category: "creature",
    genres: ["fantasy", "gothic"],
    archetype: "beast",
    tags: [
      "wolf",
      "beast",
      "hound",
      "predator",
      "monster",
      "direwolf",
      "fang",
      "claw",
      "creature",
      "animal",
    ],
    r2Path: "silhouettes/creature/fantasy/beast-wolf.svg",
  },
  {
    id: "creature-dragon-winged",
    name: "Dragon / Wyvern",
    category: "creature",
    genres: ["fantasy"],
    archetype: "dragon",
    tags: [
      "dragon",
      "wyvern",
      "drake",
      "reptile",
      "fire",
      "wings",
      "serpent",
      "leviathan",
      "boss",
      "legendary",
    ],
    r2Path: "silhouettes/creature/fantasy/dragon-winged.svg",
  },
  {
    id: "creature-horror-aberrant",
    name: "Eldritch Aberration",
    category: "creature",
    genres: ["cosmic-horror", "gothic"],
    archetype: "horror",
    tags: [
      "aberration",
      "eldritch",
      "tentacle",
      "horror",
      "alien",
      "cthulhu",
      "void",
      "monster",
      "mutant",
    ],
    r2Path: "silhouettes/creature/cosmic-horror/aberration.svg",
  },
  {
    id: "creature-golem-construct",
    name: "Stone Golem / Construct",
    category: "creature",
    genres: ["fantasy", "scifi"],
    archetype: "construct",
    tags: [
      "golem",
      "construct",
      "automaton",
      "mech",
      "elemental",
      "stone",
      "iron",
      "robot",
      "colossus",
    ],
    r2Path: "silhouettes/creature/fantasy/golem-construct.svg",
  },

  // ==========================================
  // ITEMS & ARTIFACTS
  // ==========================================
  {
    id: "item-relic-blade",
    name: "Relic Blade / Sword",
    category: "item",
    genres: ["fantasy", "gothic"],
    archetype: "relic",
    tags: [
      "sword",
      "blade",
      "relic",
      "weapon",
      "artifact",
      "holy",
      "excalibur",
      "dagger",
      "magic-item",
    ],
    r2Path: "silhouettes/item/fantasy/relic-blade.svg",
  },
  {
    id: "item-arcane-tome",
    name: "Arcane Tome / Grimoire",
    category: "item",
    genres: ["fantasy", "gothic"],
    archetype: "relic",
    tags: [
      "book",
      "tome",
      "grimoire",
      "scroll",
      "spells",
      "magic",
      "arcane",
      "library",
      "lore",
      "journal",
    ],
    r2Path: "silhouettes/item/fantasy/arcane-tome.svg",
  },

  // ==========================================
  // LOCATIONS & STRUCTURES
  // ==========================================
  {
    id: "location-citadel-castle",
    name: "Citadel / Castle",
    category: "location",
    genres: ["fantasy", "gothic"],
    archetype: "structure",
    tags: [
      "castle",
      "citadel",
      "fortress",
      "keep",
      "tower",
      "city",
      "palace",
      "stronghold",
      "kingdom",
    ],
    r2Path: "silhouettes/location/fantasy/citadel-castle.svg",
  },
  {
    id: "location-scifi-megacity",
    name: "Sci-Fi Megacity",
    category: "location",
    genres: ["scifi", "cyberpunk"],
    archetype: "structure",
    tags: [
      "city",
      "metropolis",
      "megacity",
      "cyberpunk",
      "spire",
      "skyline",
      "arcology",
      "station",
      "scifi",
    ],
    r2Path: "silhouettes/location/scifi/megacity-skyline.svg",
  },
  {
    id: "location-fantasy-village",
    name: "Fantasy Village",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "village",
      "hamlet",
      "cottage",
      "settlement",
      "rural",
      "countryside",
      "farm",
      "medieval",
    ],
    r2Path: "silhouettes/location/fantasy/village.svg",
  },
  {
    id: "location-fantasy-town",
    name: "Fortified Town",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "town",
      "borough",
      "city",
      "walled-town",
      "settlement",
      "capital",
      "medieval",
    ],
    r2Path: "silhouettes/location/fantasy/town.svg",
  },
  {
    id: "location-inn-tavern",
    name: "Inn & Tavern",
    category: "location",
    genres: ["fantasy", "western"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "inn",
      "tavern",
      "pub",
      "alehouse",
      "saloon",
      "bar",
      "drinking",
      "lodging",
      "medieval",
    ],
    r2Path: "silhouettes/location/fantasy/inn-tavern.svg",
  },
  {
    id: "location-wizard-tower",
    name: "Wizard Tower / Spire",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "tower",
      "spire",
      "observatory",
      "wizard-tower",
      "arcane-spire",
      "high-tower",
    ],
    r2Path: "silhouettes/location/fantasy/wizard-tower.svg",
  },
  {
    id: "location-dungeon-crypt",
    name: "Dungeon & Crypt",
    category: "location",
    genres: ["fantasy", "gothic", "cosmic-horror"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "dungeon",
      "crypt",
      "catacomb",
      "tomb",
      "underdark",
      "vault",
      "lair",
      "ruins",
      "horror",
    ],
    r2Path: "silhouettes/location/fantasy/dungeon-crypt.svg",
  },
  {
    id: "location-port-harbor",
    name: "Port & Harbor",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "port",
      "harbor",
      "dock",
      "docks",
      "pier",
      "quay",
      "wharf",
      "marina",
      "bay",
      "pirate",
      "nautical",
    ],
    r2Path: "silhouettes/location/fantasy/port-harbor.svg",
  },
  {
    id: "location-temple-shrine",
    name: "Temple & Shrine",
    category: "location",
    genres: ["fantasy", "gothic"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "temple",
      "shrine",
      "sanctuary",
      "cathedral",
      "monastery",
      "chapel",
      "altar",
      "mythology",
    ],
    r2Path: "silhouettes/location/fantasy/temple-shrine.svg",
  },

  {
    id: "location-market-square",
    name: "Market Square / Bazaar",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "market",
      "bazaar",
      "square",
      "stalls",
      "plaza",
      "marketplace",
      "commerce",
      "traders",
      "merchants",
      "fountain",
    ],
    r2Path: "silhouettes/location/fantasy/market-square.svg",
  },
  {
    id: "location-blacksmith-forge",
    name: "Blacksmith Forge & Armory",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "forge",
      "blacksmith",
      "armory",
      "smithy",
      "anvil",
      "weaponsmith",
      "furnace",
      "hearth",
      "metalwork",
    ],
    r2Path: "silhouettes/location/fantasy/blacksmith-forge.svg",
  },
  {
    id: "location-city-gate",
    name: "City Gate & Portcullis",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "gate",
      "city-gate",
      "portcullis",
      "drawbridge",
      "gatehouse",
      "ramparts",
      "walls",
      "entrance",
      "checkpoint",
      "fortified",
    ],
    r2Path: "silhouettes/location/fantasy/city-gate.svg",
  },
  {
    id: "location-guardhouse-jail",
    name: "Guardhouse & Jail",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "guardhouse",
      "jail",
      "prison",
      "dungeon",
      "watchpost",
      "barracks",
      "cells",
      "constabulary",
      "stocks",
      "pillory",
    ],
    r2Path: "silhouettes/location/fantasy/guardhouse-jail.svg",
  },
  {
    id: "location-town-hall",
    name: "Town Hall / Guildhall",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "townhall",
      "guildhall",
      "civic",
      "city-hall",
      "manor",
      "court",
      "council",
      "chancery",
      "assembly",
      "clocktower",
    ],
    r2Path: "silhouettes/location/fantasy/town-hall.svg",
  },
  {
    id: "location-slums-alley",
    name: "Thieves' Alley / Slums",
    category: "location",
    genres: ["fantasy", "gothic"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "alley",
      "slums",
      "thieves",
      "tenements",
      "gutters",
      "underworld",
      "shanties",
      "backstreet",
      "dark-alley",
    ],
    r2Path: "silhouettes/location/fantasy/slums-alley.svg",
  },
  {
    id: "location-river-bridge",
    name: "Stone River Bridge",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "bridge",
      "river",
      "crossing",
      "tollhouse",
      "stone-bridge",
      "waterway",
      "causeway",
      "aqueduct",
      "span",
    ],
    r2Path: "silhouettes/location/fantasy/river-bridge.svg",
  },
  {
    id: "location-windmill",
    name: "Windmill & Granary",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "windmill",
      "mill",
      "granary",
      "silo",
      "grindstone",
      "flour-mill",
      "farm",
      "countryside",
      "rural",
      "harvest",
    ],
    r2Path: "silhouettes/location/fantasy/windmill.svg",
  },
  {
    id: "location-apothecary-shop",
    name: "Apothecary & Herb Shop",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "apothecary",
      "alchemist-shop",
      "potions",
      "herbs",
      "healer",
      "pharmacy",
      "elixirs",
      "tinctures",
    ],
    r2Path: "silhouettes/location/fantasy/apothecary-shop.svg",
  },
  {
    id: "location-noble-manor",
    name: "Noble Manor & Estate",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "manor",
      "estate",
      "villa",
      "mansion",
      "palace",
      "chateau",
      "noble-house",
      "courtyard",
      "grounds",
    ],
    r2Path: "silhouettes/location/fantasy/noble-manor.svg",
  },
  {
    id: "location-fighting-arena",
    name: "Arena & Fighting Pit",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "arena",
      "colosseum",
      "amphitheater",
      "fighting-pit",
      "dueling-ground",
      "stands",
      "gladiator",
      "stadium",
    ],
    r2Path: "silhouettes/location/fantasy/fighting-arena.svg",
  },
  {
    id: "location-grand-library",
    name: "Grand Archives & Library",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "library",
      "archives",
      "scriptorium",
      "books",
      "scrolls",
      "tomes",
      "records",
      "athenaeum",
      "knowledge",
    ],
    r2Path: "silhouettes/location/fantasy/grand-library.svg",
  },
  {
    id: "location-bathhouse",
    name: "Bathhouse & Thermal Springs",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "bathhouse",
      "baths",
      "thermae",
      "spa",
      "steam",
      "pool",
      "hot-springs",
      "springs",
      "relaxation",
    ],
    r2Path: "silhouettes/location/fantasy/bathhouse.svg",
  },
  {
    id: "location-city-sewers",
    name: "City Sewers & Undercity",
    category: "location",
    genres: ["fantasy", "gothic"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "sewers",
      "undercity",
      "subterranean",
      "drains",
      "culvert",
      "tunnels",
      "sluice",
      "canals",
      "underground-city",
    ],
    r2Path: "silhouettes/location/fantasy/city-sewers.svg",
  },
  {
    id: "location-waterfront-docks",
    name: "Waterfront Docks",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "docks",
      "pier",
      "wharf",
      "quay",
      "waterfront",
      "fishery",
      "boardwalk",
      "shipyard",
      "marina",
    ],
    r2Path: "silhouettes/location/fantasy/waterfront-docks.svg",
  },
  {
    id: "location-churchyard-cemetery",
    name: "Churchyard & Parish Chapel",
    category: "location",
    genres: ["fantasy", "gothic"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "churchyard",
      "chapel",
      "parish",
      "cemetery",
      "graves",
      "church",
      "belfry",
      "sanctuary",
    ],
    r2Path: "silhouettes/location/fantasy/churchyard-cemetery.svg",
  },
  {
    id: "location-ancient-ruins",
    name: "Ancient Ruins & Fortress",
    category: "location",
    genres: ["fantasy", "gothic"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "ruins",
      "ancient-ruins",
      "fallen-kingdom",
      "monoliths",
      "crumbled-walls",
      "pillars",
      "relics",
      "forgotten",
    ],
    r2Path: "silhouettes/location/fantasy/ancient-ruins.svg",
  },
  {
    id: "location-enchanted-forest",
    name: "Enchanted Forest",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "forest",
      "woods",
      "enchanted-forest",
      "grove",
      "canopy",
      "ancient-trees",
      "mushrooms",
      "woodland",
      "sylvan",
    ],
    r2Path: "silhouettes/location/fantasy/enchanted-forest.svg",
  },
  {
    id: "location-cavern-cave",
    name: "Subterranean Cavern & Cave",
    category: "location",
    genres: ["fantasy", "cosmic-horror"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "cavern",
      "cave",
      "grotto",
      "subterranean",
      "stalactites",
      "stalagmites",
      "underdark",
      "chasm",
      "hollow",
    ],
    r2Path: "silhouettes/location/fantasy/cavern-cave.svg",
  },
  {
    id: "location-mountain-peak",
    name: "Mountain Peak & Eyrie",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "mountain",
      "peak",
      "cliffs",
      "crags",
      "precipice",
      "ridge",
      "highland",
      "summit",
      "eyrie",
      "pass",
    ],
    r2Path: "silhouettes/location/fantasy/mountain-peak.svg",
  },
  {
    id: "location-swamp-bog",
    name: "Murky Swamp & Bog",
    category: "location",
    genres: ["fantasy", "gothic"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "swamp",
      "bog",
      "marsh",
      "wetlands",
      "mire",
      "quagmire",
      "mangrove",
      "bayou",
      "fen",
    ],
    r2Path: "silhouettes/location/fantasy/swamp-bog.svg",
  },
  {
    id: "location-mage-academy",
    name: "Mage Academy & Observatory",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "academy",
      "university",
      "observatory",
      "astrology",
      "mage-tower",
      "arcane-college",
      "spires",
      "sanctum",
    ],
    r2Path: "silhouettes/location/fantasy/mage-academy.svg",
  },
  {
    id: "location-graveyard-necropolis",
    name: "Haunted Graveyard & Necropolis",
    category: "location",
    genres: ["gothic", "fantasy", "cosmic-horror"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "graveyard",
      "necropolis",
      "mausoleum",
      "tombs",
      "cemetery",
      "crypts",
      "headstones",
      "undead",
      "haunted",
    ],
    r2Path: "silhouettes/location/gothic/graveyard-necropolis.svg",
  },
  {
    id: "location-desert-oasis",
    name: "Desert Oasis & Ruins",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "oasis",
      "desert",
      "dunes",
      "palms",
      "spring",
      "pyramid",
      "sandstone",
      "wasteland",
      "caravan-stop",
    ],
    r2Path: "silhouettes/location/fantasy/desert-oasis.svg",
  },
  {
    id: "location-volcano-caldera",
    name: "Volcanic Caldera & Forge",
    category: "location",
    genres: ["fantasy"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "volcano",
      "caldera",
      "lava",
      "magma",
      "infernal",
      "crater",
      "basalt",
      "chasm",
      "forge",
    ],
    r2Path: "silhouettes/location/fantasy/volcano-caldera.svg",
  },
  {
    id: "location-frontier-outpost",
    name: "Frontier Outpost & Fort",
    category: "location",
    genres: ["fantasy", "western"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "outpost",
      "fort",
      "palisade",
      "watchtower",
      "stockade",
      "frontier",
      "border-post",
      "bastion",
      "stronghold",
    ],
    r2Path: "silhouettes/location/fantasy/frontier-outpost.svg",
  },

  // ==========================================
  // FACTIONS & INSIGNIAS
  // ==========================================
  {
    id: "faction-insignia-crest",
    name: "Noble Crest / Guild",
    category: "faction",
    genres: ["fantasy", "gothic"],
    archetype: "insignia",
    tags: [
      "faction",
      "crest",
      "shield",
      "guild",
      "noble",
      "house",
      "order",
      "kingdom",
      "heraldry",
      "clan",
    ],
    r2Path: "silhouettes/faction/fantasy/heraldic-crest.svg",
  },
  {
    id: "faction-insignia-cyber",
    name: "Cyber Syndicate Hex",
    category: "faction",
    genres: ["cyberpunk", "scifi"],
    archetype: "insignia",
    tags: [
      "syndicate",
      "corp",
      "megacorp",
      "faction",
      "cyber",
      "emblem",
      "insignia",
      "tech",
      "network",
      "cyberpunk",
    ],
    r2Path: "silhouettes/faction/cyberpunk/cyber-hex.svg",
  },

  // ==========================================
  // FANTASY NPC ROSTER
  // ==========================================
  {
    id: "character-npc-innkeeper",
    name: "Innkeeper / Barkeep",
    category: "character",
    genres: ["fantasy"],
    archetype: "generic",
    gender: "male",
    tags: [
      "innkeeper",
      "barkeep",
      "tavernkeeper",
      "host",
      "pub",
      "tavern",
      "ale",
      "flagon",
    ],
    r2Path: "silhouettes/character/fantasy/npc-innkeeper.svg",
  },
  {
    id: "character-npc-barmaid",
    name: "Tavern Server / Barmaid",
    category: "character",
    genres: ["fantasy"],
    archetype: "generic",
    gender: "female",
    tags: [
      "barmaid",
      "server",
      "wench",
      "tavern",
      "waitress",
      "inn",
      "maid",
      "alehouse",
    ],
    r2Path: "silhouettes/character/fantasy/npc-barmaid.svg",
  },
  {
    id: "character-npc-bard",
    name: "Bard / Minstrel",
    category: "character",
    genres: ["fantasy"],
    archetype: "generic",
    gender: "neutral",
    tags: [
      "bard",
      "minstrel",
      "musician",
      "troubadour",
      "poet",
      "performer",
      "lute",
      "singer",
    ],
    r2Path: "silhouettes/character/fantasy/npc-bard.svg",
  },
  {
    id: "character-npc-noble-male",
    name: "Noble Lord / Magistrate",
    category: "character",
    genres: ["fantasy"],
    archetype: "noble",
    gender: "male",
    tags: [
      "noble",
      "lord",
      "magistrate",
      "baron",
      "duke",
      "aristocrat",
      "mayor",
      "chancellor",
    ],
    r2Path: "silhouettes/character/fantasy/npc-noble-male.svg",
  },
  {
    id: "character-npc-noble-female",
    name: "Noble Lady / Aristocrat",
    category: "character",
    genres: ["fantasy"],
    archetype: "noble",
    gender: "female",
    tags: [
      "noble",
      "lady",
      "countess",
      "duchess",
      "baroness",
      "aristocrat",
      "matron",
    ],
    r2Path: "silhouettes/character/fantasy/npc-noble-female.svg",
  },
  {
    id: "character-npc-guard",
    name: "Town Guard / Sentry",
    category: "character",
    genres: ["fantasy"],
    archetype: "warrior",
    gender: "neutral",
    tags: [
      "guard",
      "sentry",
      "watchman",
      "soldier",
      "constable",
      "patrol",
      "halberdier",
      "watch",
    ],
    r2Path: "silhouettes/character/fantasy/npc-guard.svg",
  },
  {
    id: "character-npc-blacksmith",
    name: "Blacksmith / Armorer",
    category: "character",
    genres: ["fantasy"],
    archetype: "generic",
    gender: "male",
    tags: [
      "blacksmith",
      "smith",
      "armorer",
      "weaponsmith",
      "forge",
      "anvil",
      "metalworker",
    ],
    r2Path: "silhouettes/character/fantasy/npc-blacksmith.svg",
  },
  {
    id: "character-npc-merchant",
    name: "Traveling Merchant",
    category: "character",
    genres: ["fantasy"],
    archetype: "generic",
    gender: "neutral",
    tags: [
      "merchant",
      "trader",
      "peddler",
      "shopkeeper",
      "caravan",
      "dealer",
      "vendor",
    ],
    r2Path: "silhouettes/character/fantasy/npc-merchant.svg",
  },
  {
    id: "character-npc-alchemist",
    name: "Alchemist / Apothecary",
    category: "character",
    genres: ["fantasy"],
    archetype: "scientist",
    gender: "neutral",
    tags: [
      "alchemist",
      "apothecary",
      "herbalist",
      "potionmaker",
      "chemist",
      "potions",
    ],
    r2Path: "silhouettes/character/fantasy/npc-alchemist.svg",
  },
  {
    id: "character-npc-priest",
    name: "Village Priest / Friar",
    category: "character",
    genres: ["fantasy"],
    archetype: "caster",
    gender: "male",
    tags: [
      "priest",
      "friar",
      "cleric",
      "monk",
      "curate",
      "pastor",
      "preacher",
      "holy",
    ],
    r2Path: "silhouettes/character/fantasy/npc-priest.svg",
  },
  {
    id: "character-npc-scholar",
    name: "Scholar / Scribe",
    category: "character",
    genres: ["fantasy"],
    archetype: "scientist",
    gender: "neutral",
    tags: [
      "scholar",
      "scribe",
      "librarian",
      "clerk",
      "chronicler",
      "sage",
      "historian",
    ],
    r2Path: "silhouettes/character/fantasy/npc-scholar.svg",
  },
  {
    id: "character-npc-farmer",
    name: "Peasant Farmer",
    category: "character",
    genres: ["fantasy"],
    archetype: "generic",
    gender: "neutral",
    tags: [
      "farmer",
      "peasant",
      "villager",
      "commoner",
      "rustic",
      "laborer",
      "crofter",
    ],
    r2Path: "silhouettes/character/fantasy/npc-farmer.svg",
  },
  {
    id: "character-npc-urchin",
    name: "Street Urchin / Pickpocket",
    category: "character",
    genres: ["fantasy"],
    archetype: "rogue",
    gender: "neutral",
    tags: [
      "urchin",
      "pickpocket",
      "thief",
      "beggar",
      "orphan",
      "scamp",
      "streetkid",
    ],
    r2Path: "silhouettes/character/fantasy/npc-urchin.svg",
  },
  {
    id: "character-npc-elder",
    name: "Village Elder",
    category: "character",
    genres: ["fantasy"],
    archetype: "generic",
    gender: "neutral",
    tags: [
      "elder",
      "matriarch",
      "patriarch",
      "village-elder",
      "ancestor",
      "chieftain",
    ],
    r2Path: "silhouettes/character/fantasy/npc-elder.svg",
  },

  // ==========================================
  // GENERIC FALLBACK
  // ==========================================
  {
    id: "generic-humanoid-unknown",
    name: "Mysterious Wanderer",
    category: "character",
    genres: ["fantasy", "gothic", "scifi", "western", "modern"],
    archetype: "generic",
    gender: "neutral",
    tags: [
      "person",
      "human",
      "wanderer",
      "stranger",
      "unknown",
      "traveler",
      "silhouette",
      "mysterious",
    ],
    r2Path: "silhouettes/character/generic/humanoid-unknown.svg",
  },
  {
    id: "scifi-ship-freighter",
    name: "Scout Ship / Light Freighter",
    category: "location",
    genres: ["scifi", "western"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "freighter",
      "starship",
      "ship",
      "cargo",
      "vessel",
      "transport",
      "smuggler",
      "trader",
      "scout",
      "shuttle",
    ],
    r2Path: "silhouettes/location/scifi/ship-freighter.svg",
  },
  {
    id: "scifi-ship-fighter",
    name: "Starfighter / Interceptor",
    category: "item",
    genres: ["scifi"],
    archetype: "construct",
    gender: "neutral",
    tags: [
      "starfighter",
      "fighter",
      "interceptor",
      "cockpit",
      "spaceship",
      "pilot",
      "dogfight",
      "delta",
      "combat",
      "wing",
    ],
    r2Path: "silhouettes/item/scifi/ship-fighter.svg",
  },
  {
    id: "scifi-ship-dreadnought",
    name: "Fleet Dreadnought / Capital Warship",
    category: "location",
    genres: ["scifi"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "dreadnought",
      "battleship",
      "warship",
      "capital-ship",
      "cruiser",
      "fleet",
      "flagship",
      "destroyer",
      "carrier",
      "armored",
    ],
    r2Path: "silhouettes/location/scifi/ship-dreadnought.svg",
  },
  {
    id: "scifi-ship-dropship",
    name: "Tactical Dropship / Shuttle",
    category: "location",
    genres: ["scifi"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "dropship",
      "shuttle",
      "transport",
      "landing-craft",
      "vtol",
      "troop-carrier",
      "evac",
      "flight",
      "deployment",
      "assault",
    ],
    r2Path: "silhouettes/location/scifi/ship-dropship.svg",
  },
  {
    id: "scifi-vehicle-mech",
    name: "Combat Mech / Battle Walker",
    category: "item",
    genres: ["scifi", "cyberpunk"],
    archetype: "construct",
    gender: "neutral",
    tags: [
      "mech",
      "mecha",
      "walker",
      "bipedal",
      "chassis",
      "robot",
      "exoskeleton",
      "warrior",
      "cannon",
      "armor",
    ],
    r2Path: "silhouettes/item/scifi/vehicle-mech.svg",
  },
  {
    id: "scifi-vehicle-rover",
    name: "Planetary Rover / Surface Buggy",
    category: "item",
    genres: ["scifi"],
    archetype: "construct",
    gender: "neutral",
    tags: [
      "rover",
      "buggy",
      "vehicle",
      "crawler",
      "all-terrain",
      "exploration",
      "planetary",
      "wheels",
      "surface",
      "expedition",
    ],
    r2Path: "silhouettes/item/scifi/vehicle-rover.svg",
  },
  {
    id: "scifi-location-space-station",
    name: "Orbital Space Station",
    category: "location",
    genres: ["scifi", "cyberpunk"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "station",
      "space-station",
      "orbital",
      "outpost",
      "dock",
      "torus",
      "ring",
      "habitat",
      "satellite",
      "colony",
    ],
    r2Path: "silhouettes/location/scifi/space-station.svg",
  },
  {
    id: "scifi-location-asteroid-base",
    name: "Asteroid Mining Outpost",
    category: "location",
    genres: ["scifi"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "asteroid",
      "mining",
      "outpost",
      "quarry",
      "ore",
      "rock",
      "excavation",
      "refinery",
      "mineral",
      "belter",
    ],
    r2Path: "silhouettes/location/scifi/asteroid-base.svg",
  },
  {
    id: "scifi-location-colony-dome",
    name: "Planetary Colony Biodome",
    category: "location",
    genres: ["scifi"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "biodome",
      "dome",
      "colony",
      "settlement",
      "biosphere",
      "habitat",
      "greenhouse",
      "planetary",
      "arcology",
      "city",
    ],
    r2Path: "silhouettes/location/scifi/colony-dome.svg",
  },
  {
    id: "scifi-location-derelict-hulk",
    name: "Derelict Space Hulk / Starship Wreck",
    category: "location",
    genres: ["scifi", "cosmic-horror"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "derelict",
      "wreck",
      "wreckage",
      "hulk",
      "abandoned",
      "ghost-ship",
      "ruin",
      "debris",
      "salvage",
      "space-hulk",
    ],
    r2Path: "silhouettes/location/scifi/derelict-hulk.svg",
  },
  {
    id: "scifi-location-starport-bay",
    name: "Starport / Hangar Docking Bay",
    category: "location",
    genres: ["scifi", "cyberpunk"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "starport",
      "hangar",
      "docking-bay",
      "bay",
      "landing-bay",
      "airlock",
      "dock",
      "terminal",
      "runway",
      "gantry",
    ],
    r2Path: "silhouettes/location/scifi/starport-bay.svg",
  },
  {
    id: "scifi-location-stasis-chamber",
    name: "Cryo-Stasis Chamber / Pods",
    category: "location",
    genres: ["scifi", "cyberpunk", "cosmic-horror"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "stasis",
      "cryo",
      "cryo-pod",
      "hibernation",
      "sleep",
      "capsule",
      "chamber",
      "laboratory",
      "medical",
      "vault",
    ],
    r2Path: "silhouettes/location/scifi/stasis-chamber.svg",
  },
  {
    id: "scifi-location-reactor-core",
    name: "Fusion / Warp Reactor Core",
    category: "location",
    genres: ["scifi", "cyberpunk"],
    archetype: "structure",
    gender: "neutral",
    tags: [
      "reactor",
      "core",
      "fusion",
      "warp-core",
      "power-plant",
      "generator",
      "plasma",
      "engineering",
      "containment",
      "conduit",
    ],
    r2Path: "silhouettes/location/scifi/reactor-core.svg",
  },
];

/** Quick index of silhouettes by ID */
export const SILHOUETTE_MAP = new Map<string, SilhouetteDefinition>(
  SILHOUETTES.map((s) => [s.id, s]),
);

/**
 * Normalises input strings for fast keyword matching.
 */
function tokenize(text?: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export interface SilhouetteInferenceInput {
  silhouette?: string;
  type?: string;
  title?: string;
  labels?: string[];
  kind?: string;
  content?: string;
  lore?: string;
}

export interface SilhouetteInferenceOptions {
  worldTheme?: string; // e.g. "dark-fantasy", "cyberpunk", "space-western", "gothic"
}

/**
 * Deterministically resolves the best silhouette for an entity.
 * If entity.silhouette is set and valid, returns it immediately.
 * Otherwise scores candidates across category, genre, labels, title, and keywords.
 */
export function resolveEntitySilhouette(
  entity: SilhouetteInferenceInput,
  options?: SilhouetteInferenceOptions,
): SilhouetteDefinition {
  // 1. Explicit selection
  if (entity.silhouette) {
    const direct = SILHOUETTE_MAP.get(entity.silhouette);
    if (direct) return direct;
  }

  // 2. Identify target category
  const rawType = (entity.type || "note").toLowerCase();
  let targetCategory: SilhouetteCategory = "character";
  if (
    rawType.includes("creature") ||
    rawType.includes("monster") ||
    rawType.includes("beast")
  ) {
    targetCategory = "creature";
  } else if (
    rawType.includes("location") ||
    rawType.includes("place") ||
    rawType.includes("settlement")
  ) {
    targetCategory = "location";
  } else if (
    rawType.includes("item") ||
    rawType.includes("relic") ||
    rawType.includes("artifact") ||
    rawType.includes("weapon")
  ) {
    targetCategory = "item";
  } else if (
    rawType.includes("faction") ||
    rawType.includes("guild") ||
    rawType.includes("organization") ||
    rawType.includes("corp")
  ) {
    targetCategory = "faction";
  } else if (
    rawType.includes("character") ||
    rawType.includes("person") ||
    rawType.includes("npc")
  ) {
    targetCategory = "character";
  }

  // 3. World genre context
  const themeContext = (options?.worldTheme || "").toLowerCase();
  let preferredGenre: SilhouetteGenre = "fantasy";
  if (
    themeContext.includes("cyberpunk") ||
    themeContext.includes("neon") ||
    themeContext.includes("tech")
  ) {
    preferredGenre = "cyberpunk";
  } else if (
    themeContext.includes("scifi") ||
    themeContext.includes("space") ||
    themeContext.includes("solar")
  ) {
    preferredGenre = "scifi";
  } else if (
    themeContext.includes("gothic") ||
    themeContext.includes("horror") ||
    themeContext.includes("vampire") ||
    themeContext.includes("victorian")
  ) {
    preferredGenre = "gothic";
  } else if (
    themeContext.includes("western") ||
    themeContext.includes("frontier") ||
    themeContext.includes("dust")
  ) {
    preferredGenre = "western";
  } else if (
    themeContext.includes("cosmic") ||
    themeContext.includes("cthulhu") ||
    themeContext.includes("eldritch")
  ) {
    preferredGenre = "cosmic-horror";
  }

  // 4. Extract token pools
  const titleTokens = new Set(tokenize(entity.title));
  const labelTokens = new Set(
    (entity.labels || []).flatMap((l) => tokenize(l)),
  );
  const kindTokens = new Set(tokenize(entity.kind));
  const contentSnippet =
    (entity.content || "").slice(0, 1000) +
    " " +
    (entity.lore || "").slice(0, 500);
  const contentTokens = new Set(tokenize(contentSnippet));

  // 5. Score candidates
  let bestSilhouette: SilhouetteDefinition = SILHOUETTE_MAP.get(
    "generic-humanoid-unknown",
  )!;
  let highestScore = -1;

  for (const s of SILHOUETTES) {
    let score = 0;

    // Category match
    if (s.category === targetCategory) {
      score += 10;
    }

    // Genre affinity
    if (s.genres.includes(preferredGenre)) {
      score += 6;
    }

    // Tag matches against metadata tokens
    for (const tag of s.tags) {
      const lowerTag = tag.toLowerCase();
      if (labelTokens.has(lowerTag)) score += 8;
      if (kindTokens.has(lowerTag)) score += 6;
      if (titleTokens.has(lowerTag)) score += 5;
      if (contentTokens.has(lowerTag)) score += 2;
    }

    // Extra gender / archetype heuristic boost
    if (s.gender === "female") {
      if (
        titleTokens.has("female") ||
        titleTokens.has("lady") ||
        titleTokens.has("countess") ||
        titleTokens.has("witch") ||
        labelTokens.has("female")
      ) {
        score += 7;
      }
    } else if (s.gender === "male") {
      if (
        titleTokens.has("male") ||
        titleTokens.has("lord") ||
        titleTokens.has("count") ||
        titleTokens.has("wizard") ||
        titleTokens.has("sir") ||
        labelTokens.has("male")
      ) {
        score += 7;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestSilhouette = s;
    }
  }

  return bestSilhouette;
}

/** Where the silhouette artwork lives. */
export const SILHOUETTE_ASSET_BASE = "https://assets.codexcryptica.com/";

/** Fallback tint for callers with no theme to hand. */
export const DEFAULT_SILHOUETTE_FILL = "#d4af37";

/**
 * Cache generation for the artwork URLs.
 *
 * The CDN in front of the bucket does not vary its cache on `Origin`, so one
 * request made without that header — a crawler, a `curl`, an `<img>` — caches a
 * response carrying no `Access-Control-Allow-Origin`, and every browser `fetch`
 * for that URL then fails CORS until the entry expires. That is what left a
 * scattered handful of silhouettes blank while their neighbours loaded.
 *
 * Requesting a generation-stamped URL sidesteps any such entry, and gives us a
 * way to force a refetch when artwork is republished. Bump it when the assets
 * in R2 change.
 */
export const SILHOUETTE_ASSET_VERSION = "2";

/**
 * URL the app fetches a silhouette from. `bare` gives the plain address for
 * showing or sharing (the public gallery's "copy CDN link"), without the
 * cache generation.
 */
export function getSilhouetteUrl(
  silhouette: Pick<SilhouetteDefinition, "r2Path">,
  base = SILHOUETTE_ASSET_BASE,
  { bare = false }: { bare?: boolean } = {},
): string {
  const url = `${base}${silhouette.r2Path}`;
  return bare ? url : `${url}?v=${SILHOUETTE_ASSET_VERSION}`;
}

/**
 * Recolours a silhouette. Every asset paints with `currentColor`, which an SVG
 * loaded as an image cannot inherit from the page — so the colour is
 * substituted into the markup before it is handed to an `<img>` or a canvas.
 */
export function tintSilhouetteSvg(svg: string, fillColor: string): string {
  return svg.replace(/currentColor/g, fillColor);
}

/** Turns SVG markup into a data URI usable as a canvas or CSS background. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface SilhouetteFetchOptions {
  /** Injectable for tests and non-browser callers. */
  fetch?: typeof globalThis.fetch;
  base?: string;
}

/**
 * In-flight and completed fetches, keyed by URL. Silhouettes are immutable
 * artwork, so one fetch per URL per session is enough, and concurrent callers
 * (a graph full of nodes, a picker full of tiles) share it. Failures are not
 * cached, so going offline and back does not poison the catalogue.
 */
const svgCache = new Map<string, Promise<string>>();

/** Drops the session cache. Test seam; also useful after a failed load. */
export function clearSilhouetteCache(): void {
  svgCache.clear();
}

/**
 * Fetches a silhouette's markup from R2, or null when it cannot be reached —
 * the artwork is decorative, so callers degrade to no glyph rather than to an
 * error state.
 */
export async function loadSilhouetteSvg(
  silhouette: Pick<SilhouetteDefinition, "r2Path">,
  options: SilhouetteFetchOptions = {},
): Promise<string | null> {
  const url = getSilhouetteUrl(
    silhouette,
    options.base ?? SILHOUETTE_ASSET_BASE,
  );
  const cached = svgCache.get(url);
  if (cached) return cached.catch(() => null);

  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) return null;

  const pending = (async () => {
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Silhouette ${url} responded ${response.status}`);
    }
    return await response.text();
  })();

  svgCache.set(url, pending);

  try {
    return await pending;
  } catch {
    svgCache.delete(url);
    return null;
  }
}

/**
 * Fetches a silhouette and returns it tinted, as a data URI ready for a
 * cytoscape node background or a CSS background-image. Null when the artwork
 * could not be fetched.
 */
export async function loadSilhouetteDataUri(
  silhouette: Pick<SilhouetteDefinition, "r2Path">,
  fillColor = DEFAULT_SILHOUETTE_FILL,
  options: SilhouetteFetchOptions = {},
): Promise<string | null> {
  const svg = await loadSilhouetteSvg(silhouette, options);
  return svg === null ? null : svgToDataUri(tintSilhouetteSvg(svg, fillColor));
}
