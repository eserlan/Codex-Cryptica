/**
 * Public Settlement / Location generator — framework-free, genre-aware.
 *
 * Every generated settlement answers three questions:
 *   1. Why does this place exist? (function, environment, origin)
 *   2. Who really controls it? (authority, hidden vs official power)
 *   3. What is about to go wrong? (dominant tension)
 *
 * Genre is derived from the hub context by the caller; defaults to "Fantasy".
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  pickRandomItems as getRandomItems,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";

function forGenre<T>(record: Record<string, T[]>, genre: string): T[] {
  return record[genre] ?? record["Fantasy"];
}

export const settlementConfig = {
  genres: [
    "Fantasy",
    "Dark Fantasy",
    "Cyberpunk",
    "Sci-Fi",
    "Post-Apocalyptic",
    "Modern",
    "Horror",
    "Western",
    "Steampunk",
    "Space Opera Resistance",
    "Optimistic Exploration Sci-Fi",
  ],

  sizesByGenre: {
    Fantasy: [
      { name: "Hamlet", range: "50–100 inhabitants", pointsOfInterestCount: 1 },
      {
        name: "Village",
        range: "100–500 inhabitants",
        pointsOfInterestCount: 2,
      },
      {
        name: "Town",
        range: "500–5,000 inhabitants",
        pointsOfInterestCount: 3,
      },
      {
        name: "City",
        range: "5,000–20,000 inhabitants",
        pointsOfInterestCount: 4,
      },
    ],
    "Dark Fantasy": [
      {
        name: "Forsaken Village",
        range: "50–300 survivors",
        pointsOfInterestCount: 1,
      },
      {
        name: "Blighted Town",
        range: "300–2,000 inhabitants",
        pointsOfInterestCount: 2,
      },
      {
        name: "Corrupted City",
        range: "2,000–10,000 inhabitants",
        pointsOfInterestCount: 3,
      },
      {
        name: "Ruined Stronghold",
        range: "10,000+ inhabitants",
        pointsOfInterestCount: 4,
      },
    ],
    Cyberpunk: [
      { name: "Block", range: "200–1,000 residents", pointsOfInterestCount: 1 },
      {
        name: "District",
        range: "1,000–10,000 residents",
        pointsOfInterestCount: 2,
      },
      {
        name: "Borough",
        range: "10,000–50,000 residents",
        pointsOfInterestCount: 3,
      },
      { name: "Sector", range: "50,000+ residents", pointsOfInterestCount: 4 },
    ],
    "Sci-Fi": [
      { name: "Outpost", range: "20–200 personnel", pointsOfInterestCount: 1 },
      {
        name: "Station",
        range: "200–2,000 personnel",
        pointsOfInterestCount: 2,
      },
      {
        name: "Colony",
        range: "2,000–20,000 inhabitants",
        pointsOfInterestCount: 3,
      },
      {
        name: "Habitat",
        range: "20,000+ inhabitants",
        pointsOfInterestCount: 4,
      },
    ],
    "Post-Apocalyptic": [
      { name: "Camp", range: "20–100 survivors", pointsOfInterestCount: 1 },
      { name: "Outpost", range: "100–500 survivors", pointsOfInterestCount: 2 },
      {
        name: "Settlement",
        range: "500–3,000 survivors",
        pointsOfInterestCount: 3,
      },
      {
        name: "Stronghold",
        range: "3,000+ survivors",
        pointsOfInterestCount: 4,
      },
    ],
    Modern: [
      { name: "Hamlet", range: "50–200 residents", pointsOfInterestCount: 1 },
      {
        name: "Village",
        range: "200–2,000 residents",
        pointsOfInterestCount: 2,
      },
      {
        name: "Town",
        range: "2,000–20,000 residents",
        pointsOfInterestCount: 3,
      },
      { name: "City", range: "20,000+ residents", pointsOfInterestCount: 4 },
    ],
    Horror: [
      {
        name: "Isolated Community",
        range: "50–300 inhabitants",
        pointsOfInterestCount: 1,
      },
      {
        name: "Village",
        range: "300–1,000 inhabitants",
        pointsOfInterestCount: 2,
      },
      {
        name: "Town",
        range: "1,000–5,000 inhabitants",
        pointsOfInterestCount: 3,
      },
      {
        name: "City Quarter",
        range: "5,000–15,000 inhabitants",
        pointsOfInterestCount: 4,
      },
    ],
    Western: [
      { name: "Homestead", range: "10–50 residents", pointsOfInterestCount: 1 },
      {
        name: "Settlement",
        range: "50–500 residents",
        pointsOfInterestCount: 2,
      },
      { name: "Town", range: "500–3,000 residents", pointsOfInterestCount: 3 },
      {
        name: "Boom Town",
        range: "3,000+ residents",
        pointsOfInterestCount: 4,
      },
    ],
    Steampunk: [
      {
        name: "Village",
        range: "100–500 inhabitants",
        pointsOfInterestCount: 1,
      },
      {
        name: "Mill Town",
        range: "500–5,000 inhabitants",
        pointsOfInterestCount: 2,
      },
      {
        name: "Industrial City",
        range: "5,000–50,000 inhabitants",
        pointsOfInterestCount: 3,
      },
      {
        name: "Metropolis",
        range: "50,000+ inhabitants",
        pointsOfInterestCount: 4,
      },
    ],
    "Space Opera Resistance": [
      { name: "Hidden Base", range: "50–500 rebels", pointsOfInterestCount: 1 },
      {
        name: "Colony",
        range: "500–5,000 inhabitants",
        pointsOfInterestCount: 2,
      },
      {
        name: "Spaceport City",
        range: "5,000–50,000 inhabitants",
        pointsOfInterestCount: 3,
      },
      {
        name: "Imperial Capital",
        range: "50,000+ inhabitants",
        pointsOfInterestCount: 4,
      },
    ],
    "Optimistic Exploration Sci-Fi": [
      { name: "Outpost", range: "20–200 personnel", pointsOfInterestCount: 1 },
      {
        name: "Station",
        range: "200–2,000 personnel",
        pointsOfInterestCount: 2,
      },
      {
        name: "Colony",
        range: "2,000–20,000 inhabitants",
        pointsOfInterestCount: 3,
      },
      {
        name: "Core World City",
        range: "50,000+ inhabitants",
        pointsOfInterestCount: 4,
      },
    ],
  } as Record<
    string,
    { name: string; range: string; pointsOfInterestCount: number }[]
  >,

  environmentsByGenre: {
    Fantasy: [
      "Forest edge",
      "Coastal harbour",
      "River crossing",
      "Mountain pass",
      "Open plains",
      "Desert oasis",
      "Underground cavern",
      "Marshland",
    ],
    "Dark Fantasy": [
      "Blighted forest",
      "Corrupted river valley",
      "Cursed ruins",
      "Ash wastes",
      "Plague-touched coast",
      "Shadowmere swamp",
    ],
    Cyberpunk: [
      "Dense urban sprawl",
      "Corporate arcology district",
      "Underground tunnel network",
      "Rooftop colony",
      "Industrial wasteland",
      "Flooded lower city",
    ],
    "Sci-Fi": [
      "Orbital station",
      "Asteroid mining colony",
      "Terraformed moon surface",
      "Deep space waystation",
      "Generation ship district",
      "Subterranean habitat",
    ],
    "Post-Apocalyptic": [
      "Ruined city centre",
      "Fortified hilltop",
      "Underground bunker complex",
      "Irradiated zone border",
      "Salvage fields",
      "River delta refuge",
    ],
    Modern: [
      "Coastal town",
      "Rural countryside",
      "Urban suburb",
      "Mountain community",
      "Island village",
      "Desert border town",
    ],
    Horror: [
      "Remote valley",
      "Misty moorland",
      "Ancient forest",
      "Coastal cliffs",
      "Underground catacombs",
      "Decaying city district",
    ],
    Western: [
      "Desert plains",
      "Canyon river crossing",
      "Mountain mining territory",
      "Railroad junction",
      "Frontier grassland",
      "Border river town",
    ],
    Steampunk: [
      "Industrial river city",
      "Sky platform",
      "Underground rail hub",
      "Coastal smog district",
      "Mountain factory town",
      "Imperial canal port",
    ],
    "Space Opera Resistance": [
      "Desert wasteland",
      "Ice planet",
      "Jungle moon",
      "Gas giant orbit",
      "Asteroid belt",
      "Volcanic world",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Class M Planet",
      "Asteroid Belt",
      "Gas Giant Atmosphere",
      "Binary Star System",
      "Nebula Edge",
    ],
  } as Record<string, string[]>,

  primaryFunctionsByGenre: {
    Fantasy: [
      "Trade hub",
      "Military fortress",
      "Religious shrine",
      "Mining settlement",
      "Noble seat",
      "Farming community",
      "Border checkpoint",
      "Pilgrimage town",
      "Academic city",
    ],
    "Dark Fantasy": [
      "Cursed stronghold",
      "Plague quarantine zone",
      "Necromancer's base",
      "Warlord garrison",
      "Desperate refuge",
      "Fallen temple settlement",
    ],
    Cyberpunk: [
      "Corporate logistics hub",
      "Black market district",
      "Data brokerage centre",
      "Manufacturing zone",
      "Entertainment district",
      "Gang headquarters",
      "Refugee enclave",
    ],
    "Sci-Fi": [
      "Resource extraction colony",
      "Research station",
      "Military outpost",
      "Trade waystation",
      "Quarantine zone",
      "Administrative hub",
      "Prison colony",
    ],
    "Post-Apocalyptic": [
      "Survivor refuge",
      "Salvage base",
      "Agricultural commune",
      "Trading post",
      "Fortified stronghold",
      "Hidden sanctuary",
      "Cult community",
    ],
    Modern: [
      "Tourist destination",
      "Administrative centre",
      "Industrial town",
      "Fishing community",
      "University town",
      "Border checkpoint",
      "Farming community",
    ],
    Horror: [
      "Isolated village",
      "Hidden blood court",
      "Cult commune",
      "Quarantine zone",
      "Ancient pilgrimage site",
      "Research facility",
      "Crumbling estate settlement",
    ],
    Western: [
      "Railroad depot",
      "Mining claim town",
      "Cattle drive waystation",
      "Border sheriff outpost",
      "Trading post",
      "Outlaw hideout",
    ],
    Steampunk: [
      "Factory and works district",
      "Airship port",
      "Rail junction hub",
      "Inventor's enclave",
      "Imperial administration post",
      "Smuggling harbour",
    ],
    "Space Opera Resistance": [
      "Smuggler haven",
      "Imperial garrison",
      "Moisture farm",
      "Rebel listening post",
      "Scrap yard and salvage",
      "Spice mining facility",
      "Ancient temple ruins",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Scientific Research",
      "Diplomatic Hub",
      "Fleet Resupply",
      "Agricultural Breadbasket",
      "First Contact Staging Area",
    ],
  } as Record<string, string[]>,

  tonesByGenre: {
    Fantasy: [
      "Cosy and welcoming",
      "Grim and weathered",
      "Mysterious and secretive",
      "Heroic and proud",
      "Decadent and corrupt",
      "Frontier and rough",
    ],
    "Dark Fantasy": [
      "Oppressive and doomed",
      "Grimdark and hopeless",
      "Eerie and cursed",
      "Desperate and violent",
      "Cold and ruthless",
    ],
    Cyberpunk: [
      "Oppressive and surveilled",
      "Chaotic and vibrant",
      "Desperate and hungry",
      "Neon-soaked and decadent",
      "Underground and defiant",
    ],
    "Sci-Fi": [
      "Sterile and efficient",
      "Isolated and claustrophobic",
      "Frontier and optimistic",
      "Corporate and controlled",
      "Decaying and neglected",
    ],
    "Post-Apocalyptic": [
      "Grim and survivalist",
      "Hopeful but fragile",
      "Paranoid and militarised",
      "Desperate and fractured",
      "Eerily peaceful",
    ],
    Modern: [
      "Quiet and overlooked",
      "Tense and divided",
      "Prosperous and complacent",
      "Declining and nostalgic",
      "Vibrant and contested",
    ],
    Horror: [
      "Gothic and oppressive",
      "Eerily quiet",
      "Outwardly normal but deeply wrong",
      "Desperate and hunted",
      "Ancient and unknowable",
    ],
    Western: [
      "Lawless and dangerous",
      "Dusty and hardscrabble",
      "Tense standoff",
      "Boom-and-bust optimistic",
      "Frontier lonely",
    ],
    Steampunk: [
      "Industrial and ambitious",
      "Class-divided and smoggy",
      "Clockwork and eccentric",
      "Imperial and bureaucratic",
      "Rebellious and inventive",
    ],
    "Space Opera Resistance": [
      "Oppressive and militarised",
      "Scrappy and defiant",
      "Desolate and lonely",
      "Ancient and mystical",
      "Lawless and chaotic",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Utopian",
      "Curious",
      "Bureaucratic",
      "Pioneering",
      "Tense",
    ],
  } as Record<string, string[]>,

  mainTensionsByGenre: {
    Fantasy: [
      "Succession crisis",
      "Religious schism",
      "Monster threat on the border",
      "Corrupt leadership",
      "Famine or drought",
      "Trade route cut off",
      "Ancient curse awakening",
    ],
    "Dark Fantasy": [
      "Spreading corruption",
      "Warlord conquest",
      "Plague outbreak",
      "Undead rising",
      "Dark pact unravelling",
      "Chosen champion gone wrong",
    ],
    Cyberpunk: [
      "Labour unrest",
      "Corporate hostile takeover",
      "Gang war",
      "Data breach",
      "AI malfunction",
      "Blackout threat",
      "Underground resistance rising",
    ],
    "Sci-Fi": [
      "Life support failure",
      "Communication blackout",
      "Resource depletion",
      "Mutiny",
      "First contact situation",
      "Quarantine breach",
      "Corporate exploitation",
    ],
    "Post-Apocalyptic": [
      "Raider siege incoming",
      "Resource scarcity",
      "Leadership collapse",
      "Contamination spreading",
      "Faction civil war",
      "Hidden betrayal",
      "Cult infiltration",
    ],
    Modern: [
      "Political scandal",
      "Economic collapse",
      "Environmental threat",
      "Crime wave",
      "Cultural conflict",
      "Corporate exploitation",
      "Hidden crime network",
    ],
    Horror: [
      "Supernatural haunting",
      "Cult infiltration",
      "Vampire feeding ring",
      "Ancient entity awakening",
      "Mass disappearances",
      "Forbidden ritual",
      "Hidden monster in plain sight",
    ],
    Western: [
      "Range war",
      "Railroad company pressure",
      "Outlaw gang threat",
      "Sheriff corruption",
      "Water rights dispute",
      "Mining claim fraud",
    ],
    Steampunk: [
      "Labour strike turning violent",
      "Imperial annexation",
      "Saboteur in the works",
      "Inventor's experiment gone wrong",
      "Guild power struggle",
      "Airship piracy",
    ],
    "Space Opera Resistance": [
      "Imperial crackdown imminent",
      "Syndicate gang war",
      "Rebel cell compromised",
      "Ancient weapon discovered",
      "Blockade causing starvation",
      "Bounty hunters searching the streets",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Threat of a border skirmish",
      "A failing planetary life support system",
      "A diplomatic breakdown between two alien delegations",
      "A mysterious viral outbreak in the medical bay",
      "Sabotage of the main warp reactor",
    ],
  } as Record<string, string[]>,

  authorityTypesByGenre: {
    Fantasy: [
      "Feudal lord",
      "Elected council",
      "Merchant guild",
      "Military commander",
      "High priest / priestess",
      "Arcane council",
      "Tribal elders",
    ],
    "Dark Fantasy": [
      "Warlord",
      "Dark sorcerer",
      "Iron council",
      "Despot",
      "Cult master",
      "Undead overlord",
    ],
    Cyberpunk: [
      "Corporate overseer",
      "Gang boss",
      "Elected council",
      "AI system",
      "Military commander",
      "Criminal syndicate",
    ],
    "Sci-Fi": [
      "Station director",
      "Colonial authority",
      "AI administrator",
      "Military command",
      "Corporate board",
      "Elected council",
    ],
    "Post-Apocalyptic": [
      "Warlord",
      "Council of survivors",
      "Cult leader",
      "Military commander",
      "Elected council",
      "AI remnant",
    ],
    Modern: [
      "Elected mayor",
      "Corporate management",
      "Military governor",
      "Criminal boss",
      "Traditional chief",
      "Religious leader",
    ],
    Horror: [
      "Ancient vampire lord",
      "Cult master",
      "Old family council",
      "Hidden entity's puppet",
      "Corrupt official",
      "Religious authority",
    ],
    Western: [
      "Sheriff",
      "Railroad company agent",
      "Cattle baron",
      "Outlaw boss",
      "Town council",
      "Military fort commander",
    ],
    Steampunk: [
      "Guild master",
      "Imperial administrator",
      "Factory owner",
      "Elected alderman",
      "Criminal boss",
      "Inventor-patriarch",
    ],
    "Space Opera Resistance": [
      "Imperial Governor",
      "Syndicate Boss",
      "Rebel General",
      "Corrupt Prefect",
      "Mystic Elder",
      "Frontier Mayor",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Station Commander",
      "Planetary Governor",
      "Science Director",
      "Fleet Admiral",
      "Ambassador",
    ],
  } as Record<string, string[]>,

  notableLocationsByGenre: {
    Fantasy: [
      "The Rusty Anchor Tavern",
      "Temple of the Sun",
      "Grand Archive",
      "Whispering Woods Gate",
      "Vault of Secrets",
      "Alchemist's Greenhouse",
      "Market Bazaar",
      "Ruined Watchtower",
    ],
    "Dark Fantasy": [
      "The Charnel House",
      "Cursed Temple Ruins",
      "Warlord's Palisade",
      "The Black Well",
      "Plague Hospice",
      "Forbidden Library",
    ],
    Cyberpunk: [
      "Neon Noodle Bar",
      "Data Vault",
      "Black Market Alley",
      "Corporate Security Office",
      "Underground Fight Club",
      "Hacker Den",
      "Medtech Clinic",
      "Abandoned Factory Floor",
    ],
    "Sci-Fi": [
      "Docking Bay Alpha",
      "Research Lab",
      "Life Support Centre",
      "Quartermaster's Store",
      "Communications Array",
      "Hydroponics Bay",
      "Armoury",
      "Observation Deck",
    ],
    "Post-Apocalyptic": [
      "The Scrap Yard",
      "Water Purification Plant",
      "Wall Command Post",
      "Underground Cache",
      "Old Hospital",
      "Radio Tower",
      "Fuel Depot",
      "Trade Tent",
    ],
    Modern: [
      "The Local Diner",
      "Town Hall",
      "Police Station",
      "Community Centre",
      "Old Church",
      "Industrial Warehouse",
      "Marina",
      "Local School",
    ],
    Horror: [
      "The Old Manor House",
      "Abandoned Church",
      "Locked Cemetery",
      "Crooked Inn",
      "Forgotten Archive",
      "Hidden Catacombs",
      "Witchwood Gate",
      "Ruined Mill",
    ],
    Western: [
      "The Saloon",
      "Sheriff's Office",
      "General Store",
      "Livery Stable",
      "Bank",
      "The Undertaker's",
      "Railroad Depot",
      "Church",
    ],
    Steampunk: [
      "The Gear and Piston Inn",
      "Factory Floor",
      "Airship Mooring",
      "Guild Hall",
      "Steam Baths",
      "Automaton Repair Shop",
      "Imperial Tax Office",
      "Underground Press",
    ],
    "Space Opera Resistance": [
      "The Cantina",
      "Imperial Garrison Headquarters",
      "Smuggler's Docking Bay",
      "Hidden Mystic Shrine",
      "Jawa-style Scrap Market",
      "Planetary Shield Generator",
      "Rebel Command Center",
      "Bounty Hunter Guildhouse",
    ],
    "Optimistic Exploration Sci-Fi": [
      "The Promenade",
      "Main Engineering",
      "Astrophysics Lab",
      "Diplomatic Quarters",
      "The Arboretum",
      "Shuttlebay",
    ],
  } as Record<string, string[]>,

  factionsByGenre: {
    Fantasy: [
      "The Iron Shield Guard",
      "The Shadow Thieves Guild",
      "The Whispering Monks",
      "The Gilded Merchants",
      "The Arcane Assembly",
    ],
    "Dark Fantasy": [
      "The Iron Legion",
      "The Carrion Cult",
      "The Last Survivors' Council",
      "The Dark Patrons",
      "The Resistance Cell",
    ],
    Cyberpunk: [
      "The Chrome Wolves",
      "Axiom Corporation",
      "The Underground Wire",
      "The Street Docs Collective",
      "Data Liberation Front",
    ],
    "Sci-Fi": [
      "Colonial Authority",
      "The Freighter's Union",
      "Systems Research Division",
      "The Separatist Cell",
      "Station Security Corps",
    ],
    "Post-Apocalyptic": [
      "The Ironclad Raiders",
      "The Water Keepers",
      "The Old World Faithful",
      "The Scavenger Collective",
      "The Wall Guard",
    ],
    Modern: [
      "The Town Council",
      "Local Crime Family",
      "Environmental Activists",
      "The Business Association",
      "Underground Resistance",
    ],
    Horror: [
      "The Old Bloodline",
      "The Hollow Cult",
      "The Watchmen",
      "The Whispering Circle",
      "The Fallen Church",
    ],
    Western: [
      "The Railroad Company",
      "The Cattle Baron's Men",
      "The Outlaw Gang",
      "The Townsfolk's Posse",
      "The Native Nation",
    ],
    Steampunk: [
      "The Gearworkers' Union",
      "The Imperial Oversight Bureau",
      "The Inventor's Guild",
      "The Smoke Brotherhood",
      "The Underground Press",
    ],
    "Space Opera Resistance": [
      "The Imperial Legion",
      "The Rebel Alliance Cell",
      "The Crimson Syndicate",
      "The Mystic Order Vanguard",
      "The Bounty Hunter Guild",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Starfleet equivalent",
      "Romulan equivalent",
      "Klingon equivalent",
      "Maquis equivalent",
      "Section 31 equivalent",
      "Orion Syndicate equivalent",
    ],
  } as Record<string, string[]>,

  namePrefixesByGenre: {
    Fantasy: [
      "Cinderwall",
      "Stonebridge",
      "Coppergate",
      "Ashveil",
      "Saltmarsh",
      "Redthorn",
      "Greywarden",
      "Deepwell",
    ],
    "Dark Fantasy": [
      "Grimfall",
      "Ashmore",
      "Blightwick",
      "Corpsewall",
      "Duskgate",
      "Wraithfen",
      "Blackthorn",
      "Deadmere",
    ],
    Cyberpunk: ["Neo", "Syn", "Grid", "Nex", "Core", "Flux", "Arc", "Vex"],
    "Sci-Fi": [
      "Alpha",
      "Kepler",
      "Proxima",
      "Zeta",
      "Orion",
      "Cygnus",
      "Nova",
      "Delta",
    ],
    "Post-Apocalyptic": [
      "Dustwall",
      "Ashgate",
      "Rusted",
      "Ember",
      "Grim",
      "Lastfall",
      "Broken",
      "Salvage",
    ],
    Modern: [
      "Port",
      "Cedar",
      "Millbrook",
      "Riverside",
      "Clearwater",
      "Ashton",
      "Westfield",
      "Mapleton",
    ],
    Horror: [
      "Blackwood",
      "Grimhaven",
      "Ravensmoor",
      "Duskfall",
      "Ashcroft",
      "Hollowmere",
      "Dunmere",
      "Wraithgate",
    ],
    Western: [
      "Dusty",
      "Rattler",
      "Copper",
      "Red Rock",
      "Dry Gulch",
      "Silver",
      "Broken",
      "Rim",
    ],
    Steampunk: [
      "Coppervale",
      "Ironbridge",
      "Ashport",
      "Gearwick",
      "Coalgate",
      "Brassfall",
      "Sootmere",
      "Forgegate",
    ],
    "Space Opera Resistance": [
      "Mos",
      "Tatoo",
      "Aldera",
      "Kash",
      "Coru",
      "Manda",
      "Danto",
      "Yav",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Astra",
      "Nova",
      "Celestia",
      "Sirius",
      "Orion",
      "Vega",
    ],
  } as Record<string, string[]>,

  nameSuffixesByGenre: {
    Fantasy: [
      " Crossing",
      " Keep",
      " Village",
      " Town",
      " Harbour",
      " Hollow",
      " Falls",
      " Ridge",
    ],
    "Dark Fantasy": [
      " Rot",
      " Fen",
      " Mire",
      " Hollow",
      " Ruin",
      " Pit",
      " Grave",
      " Watch",
    ],
    Cyberpunk: [
      " Zone",
      "-7",
      " Hub",
      " Grid",
      " Node",
      " Quarter",
      " Block",
      " Core",
    ],
    "Sci-Fi": [
      " Station",
      " Prime",
      " Base",
      "-3",
      " Colony",
      " Outpost",
      " Hub",
      " Point",
    ],
    "Post-Apocalyptic": [
      " Refuge",
      " Ruins",
      " Hold",
      " Waste",
      " Haven",
      " Camp",
      " Pit",
      " Base",
    ],
    Modern: [
      " Heights",
      " Park",
      " Creek",
      " Cove",
      " Bay",
      " Falls",
      " Crossing",
      " Glen",
    ],
    Horror: [
      " Hollow",
      " Manor",
      " Court",
      " Gate",
      " Moor",
      " Fen",
      " Falls",
      " Vale",
    ],
    Western: [
      " Creek",
      " Flats",
      " Junction",
      " Gulch",
      " Pass",
      " Bend",
      " Springs",
      " Bluff",
    ],
    Steampunk: [
      " Works",
      " Furnace",
      " Viaduct",
      " Port",
      " Engine",
      " Yard",
      " Forge",
      " Quay",
    ],
    "Space Opera Resistance": [
      " Eisley",
      " Prime",
      " Base",
      " Outpost",
      " Station",
      " Enclave",
      " City",
      " Port",
    ],
    "Optimistic Exploration Sci-Fi": [
      " Station",
      " Base",
      " Prime",
      " Outpost",
      " Colony",
      " Hub",
    ],
  } as Record<string, string[]>,

  // Legacy flat arrays — kept for backwards compatibility; map to Fantasy genre defaults.
  get sizes() {
    return this.sizesByGenre["Fantasy"];
  },
  economies: [
    "Agriculture",
    "Mining",
    "Trade Hub",
    "Fishing",
    "Black Market",
    "Arcane Study",
  ],
  governments: [
    "Council of Elders",
    "Feudal Lord",
    "Merchant Oligarchy",
    "Military Dictatorship",
    "Democracy",
    "Magocracy",
  ],
  notableLocations: [
    "The Rusty Anchor Tavern",
    "Temple of the Sun",
    "Grand Archive",
    "Whispering Woods Gate",
    "Vault of Secrets",
    "Alchemist's Greenhouse",
    "Market Bazaar",
    "Ruined Watchtower",
  ],
  factions: [
    "The Iron Shield Guard",
    "The Shadow Thieves Guild",
    "The Whispering Monks",
    "The Gilded Merchants",
    "The Arcane Assembly",
  ],
};

export interface SettlementGeneratorOptions {
  genre?: string;
  size?: string;
  environment?: string;
  primaryFunction?: string;
  tone?: string;
  mainTension?: string;
  campaignContext?: string;
  /** @deprecated Use primaryFunction instead. Kept for backwards compatibility. */
  economy?: string;
}

interface ResolvedSettlement {
  genre: string;
  size: string;
  population: string;
  pointsOfInterestCount: number;
  environment: string;
  primaryFunction: string;
  tone: string;
  mainTension: string;
  authorityType: string;
  name: string;
}

function resolveSettlement(
  options: SettlementGeneratorOptions,
  rng: Rng,
): ResolvedSettlement {
  const genre = options.genre || "Fantasy";
  const sizes = forGenre(settlementConfig.sizesByGenre, genre);
  const sizeConfig =
    sizes.find((s) => s.name === options.size) || pickFrom(sizes, rng);
  const environment =
    options.environment ||
    pickFrom(forGenre(settlementConfig.environmentsByGenre, genre), rng);

  const primaryFunction =
    options.primaryFunction ||
    options.economy ||
    pickFrom(forGenre(settlementConfig.primaryFunctionsByGenre, genre), rng);
  const tone =
    options.tone ||
    pickFrom(forGenre(settlementConfig.tonesByGenre, genre), rng);
  const mainTension =
    options.mainTension ||
    pickFrom(forGenre(settlementConfig.mainTensionsByGenre, genre), rng);
  const authorityType = pickFrom(
    forGenre(settlementConfig.authorityTypesByGenre, genre),
    rng,
  );
  const prefixes = forGenre(settlementConfig.namePrefixesByGenre, genre);
  const suffixes = forGenre(settlementConfig.nameSuffixesByGenre, genre);
  const name = pickFrom(prefixes, rng) + pickFrom(suffixes, rng);

  return {
    genre,
    size: sizeConfig.name,
    population: sizeConfig.range,
    pointsOfInterestCount: sizeConfig.pointsOfInterestCount,
    environment,
    primaryFunction,
    tone,
    mainTension,
    authorityType,
    name,
  };
}

export interface SettlementPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedSettlement;
}

export function buildSettlementPrompt(
  options: SettlementGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): SettlementPrompt {
  const resolved = resolveSettlement(options, rng);
  const {
    name,
    genre,
    size,
    population,
    pointsOfInterestCount,
    environment,
    primaryFunction,
    tone,
    mainTension,
    authorityType,
  } = resolved;

  const userMessage = `Generate a campaign-ready inhabited place for a tabletop RPG session. Answer these three questions through the output:
1. Why does this place exist? (its function, environment, and origin)
2. Who really controls it? (official authority vs. hidden power)
3. What is about to go wrong? (the dominant tension that makes it adventure-ready)

Parameters:
- Name: ${name}
- Genre / Setting: ${genre}
- Scale: ${size} (${population})
- Environment: ${environment}
- Primary Function: ${primaryFunction}
- Official Authority: ${authorityType}
- Tone: ${tone}
- Dominant Tension: ${mainTension}

Return a valid JSON object matching this structure exactly:
{
  "title": "A single string for the settlement name",
  "summary": "One sentence: what this settlement is and what makes it interesting (e.g. 'A sunbaked salt-mining town built into a dormant volcano, ruled by a cartel of water-merchants.').",
  "content": "Prose description (markdown). Include these sections:\\n## Core Concept\\n[What makes this place distinct — 2–3 sentences answering why it exists]\\n\\n## First Impression\\n[What visitors notice first — sensory, atmospheric, genre-appropriate]\\n\\n## History\\n[How the settlement came to be and what shaped it — 2–3 sentences]",
  "lore": "Structured GM reference (markdown). Use EXACTLY this structure:\\n### GM Reference Information\\n- **Scale**: ${size} (${population})\\n- **Genre / Setting**: ${genre}\\n- **Environment**: ${environment}\\n- **Primary Function**: ${primaryFunction}\\n- **Official Authority**: ${authorityType}\\n- **Tone**: ${tone}\\n\\n### Points of Interest\\n- **📍 Location Name**: one-line purpose or detail (exactly ${pointsOfInterestCount} item${pointsOfInterestCount === 1 ? "" : "s"}, genre-appropriate)\\n\\n### Controlling Factions\\n- **👥 Faction Name**: one-line influence summary (2–3 factions)\\n\\n### Current Tension\\n[2–3 sentences on the dominant tension and what makes it escalate. Name real people or groups involved.]\\n\\n### Adventure Hooks\\n- [Hook tied to the tension]\\n- [Hook tied to the power structure or hidden authority]\\n- [Hook tied to the location or function of the settlement]",
  "labels": ["rpg-location", "imported-draft"]
}
${NAME_BAN_PROMPT}
${sessionContext}
${options.campaignContext?.trim() ? `Campaign context from the user: ${options.campaignContext.trim()}` : ""}
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed, genre-aware RPG campaign elements in JSON format. Match the genre, tone, and setting precisely — a cyberpunk district must feel nothing like a fantasy town.",
    userMessage,
    resolved,
  };
}

export function parseSettlementResponse(
  text: string,
  resolved: ResolvedSettlement,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  return {
    type: "location",
    title: data.title || resolved.name,
    summary: data.summary || "",
    content: data.content || "",
    lore: data.lore || "",
    labels: Array.isArray(data.labels)
      ? data.labels
      : ["rpg-location", "imported-draft"],
    status: "active",
  };
}

const FIRST_IMPRESSION_BY_GENRE: Record<string, string> = {
  Fantasy:
    "The smell of woodsmoke and damp earth greets travellers at the gate. Eyes follow newcomers from doorways and market stalls.",
  "Dark Fantasy":
    "The silence is the first warning. Shuttered windows, empty streets, and the faint smell of rot on the wind.",
  Cyberpunk:
    "Neon bleeds across wet pavement. Drones hum overhead. Surveillance cameras track every face.",
  "Sci-Fi":
    "The hiss of airlocks. Recycled air with a faint tang of ozone. The hum of life support beneath everything.",
  "Post-Apocalyptic":
    "The first thing is the wall. Then the armed sentries. Then the eyes of people who have seen too much loss.",
  Modern:
    "A place that looks ordinary until you stay long enough to notice the cracks in the surface.",
  Horror:
    "Everything looks normal. That is the problem. The smiles are too practiced, the quiet too deliberate.",
  Western:
    "Dust. Heat. The creak of a sign. A town that watches strangers ride in and makes no move to welcome them.",
  Steampunk:
    "Smoke stacks, the clank of pistons, and the acrid smell of coal tar. The city never quite stops moving.",
  "Space Opera Resistance":
    "The roar of a shuttle taking off, the chatter of alien tongues, and the ever-present gaze of imperial stormtroopers on patrol.",
};

const CORE_CONCEPT_VARIANTS = [
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} is a ${size.toLowerCase()} built around ${primaryFunction.toLowerCase()} in a ${environment.toLowerCase()} setting. ${tone} in character, it draws people who need what it offers and repels those who threaten it. Beneath the surface, ${mainTension.toLowerCase()} is shaping everything.`,
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} is a ${size.toLowerCase()} ${environment.toLowerCase()} settlement whose entire identity runs through ${primaryFunction.toLowerCase()}. The ${tone.toLowerCase()} atmosphere is partly genuine and partly maintained — and ${mainTension.toLowerCase()} is testing both.`,
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `A ${size.toLowerCase()} place shaped by ${environment.toLowerCase()} terrain and the demands of ${primaryFunction.toLowerCase()}, ${name} has the ${tone.toLowerCase()} quality of somewhere that knows what it is. What it does not know is how much longer that remains true, given ${mainTension.toLowerCase()}.`,
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `${name} exists because ${primaryFunction.toLowerCase()} required a permanent presence in this ${environment.toLowerCase()} location. It is ${size.toLowerCase()}, ${tone.toLowerCase()}, and quietly under strain: ${mainTension.toLowerCase()} runs through everything here.`,
  (
    name: string,
    size: string,
    environment: string,
    primaryFunction: string,
    tone: string,
    mainTension: string,
  ) =>
    `Everything about ${name} — its ${size.toLowerCase()} scale, its ${environment.toLowerCase()} setting, its ${tone.toLowerCase()} reputation — traces back to ${primaryFunction.toLowerCase()}. And ${mainTension.toLowerCase()} threatens to unravel all of it.`,
] as const;

const CORE_CONCEPT_TEMPLATE = (
  name: string,
  size: string,
  environment: string,
  primaryFunction: string,
  tone: string,
  mainTension: string,
  rng: () => number,
) =>
  CORE_CONCEPT_VARIANTS[Math.floor(rng() * CORE_CONCEPT_VARIANTS.length)](
    name,
    size,
    environment,
    primaryFunction,
    tone,
    mainTension,
  );

export function generateSettlementLocal(
  options: SettlementGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveSettlement(options, rng);
  const {
    genre,
    size,
    population,
    environment,
    primaryFunction,
    tone,
    mainTension,
    authorityType,
    pointsOfInterestCount,
    name,
  } = resolved;

  const locations = getRandomItems(
    forGenre(settlementConfig.notableLocationsByGenre, genre),
    pointsOfInterestCount,
    rng,
  );
  const [faction1, faction2] = getRandomItems(
    forGenre(settlementConfig.factionsByGenre, genre),
    2,
    rng,
  );
  const firstImpression =
    FIRST_IMPRESSION_BY_GENRE[genre] ?? FIRST_IMPRESSION_BY_GENRE["Fantasy"];

  const historyVariants = [
    `${name} was established as a ${primaryFunction.toLowerCase()} and grew to serve that purpose above all else. The ${authorityType.toLowerCase()} has held power long enough for cracks to form. How those cracks spread is the story.`,
    `The original reason for ${name}'s existence was ${primaryFunction.toLowerCase()}. Everything else — the layout, the social order, the current tensions — grew from that. The ${authorityType.toLowerCase()} that governs it inherited a settlement already shaped by decisions made before them.`,
    `${name} predates its current ${authorityType.toLowerCase()} by enough time that the original arrangement and the current reality have diverged in ways nobody officially acknowledges.`,
    `The settlement formed around ${primaryFunction.toLowerCase()} and has never fully outgrown that original purpose. The ${authorityType.toLowerCase()} manages what that purpose attracts — which is both the settlement's strength and its persistent vulnerability.`,
    `Early records describe ${name} as a temporary installation. It became permanent when ${primaryFunction.toLowerCase()} proved too valuable to abandon. The ${authorityType.toLowerCase()} that solidified over time are a later development, and not everyone accepts their legitimacy equally.`,
  ] as const;

  const content = `## Core Concept
${CORE_CONCEPT_TEMPLATE(name, size, environment, primaryFunction, tone, mainTension, rng)}

## First Impression
${firstImpression}

## History
${historyVariants[Math.floor(rng() * historyVariants.length)]}`;

  const lore = `### GM Reference Information
- **Scale**: ${size} (${population})
- **Genre / Setting**: ${genre}
- **Environment**: ${environment}
- **Primary Function**: ${primaryFunction}
- **Official Authority**: ${authorityType}
- **Tone**: ${tone}

### Points of Interest
${locations.map((l) => `- **📍 ${l}**: A key location tied to the settlement's primary function.`).join("\n")}

### Controlling Factions
- **👥 ${faction1}**: Holds influence through proximity to the official authority.
- **👥 ${faction2}**: Operates in the spaces the authority cannot or will not control.

### Current Tension
${mainTension} is the open secret nobody is addressing. The longer it goes unresolved, the worse the outcome for everyone — including the people in power.

### Adventure Hooks
- Someone with information about ${mainTension.toLowerCase()} has gone missing.
- The ${authorityType.toLowerCase()} wants outside help to deal with ${faction2.toLowerCase()} without showing weakness.
- Something tied to the settlement's history as a ${primaryFunction.toLowerCase()} has surfaced — and whoever controls it controls the settlement.`;

  const summary = `A ${tone.toLowerCase()} ${size.toLowerCase()} built around ${primaryFunction.toLowerCase()} in a ${environment.toLowerCase()} setting.`;

  return {
    type: "location",
    title: name,
    summary,
    content,
    lore,
    labels: ["rpg-location", "imported-draft"],
    status: "active",
  };
}
