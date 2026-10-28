import type { ThemeSlug } from "./+page";
import {
  type GeneratorCard,
  sharedCards,
  surpriseMeCard,
  nationCard,
  shipCard,
  worldCard,
  starSystemCard,
  alienRaceCard,
  pirateShipCard,
  newsSheetCard,
  languageCard,
  tavernCard,
  socialHubCard,
  vampireClanCard,
  nomadClanCard,
  darkFantasyFactionCard,
  fantasyOnlyCards,
  superheroOriginCard,
  villainSchemeCard,
  comicBookEventCard,
} from "./generator-cards";

export type ThemeConfig = {
  label: string;
  localStorageId: string;
  eyebrow: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  cards: GeneratorCard[];
};

export const themeConfig: Record<ThemeSlug, ThemeConfig> = {
  fantasy: {
    label: "Fantasy",
    localStorageId: "fantasy",
    eyebrow: "Swords, Sorcery & Myth",
    intro:
      "Build the high-fantasy worlds your players will never forget. From legendary kingdoms and divine pantheons to morally ambiguous guilds and cursed artefacts, every generator is tuned for classic fantasy campaigns.",
    metaTitle:
      "Fantasy RPG Generators — NPC, Faction, Kingdom & More | Codex Cryptica",
    metaDescription:
      "Free fantasy RPG generators for tabletop GMs. Create NPCs, factions, kingdoms, magic items, pantheons, quests, and names for your fantasy campaign. No login required.",
    cards: [
      ...sharedCards(
        "Settlement Generator",
        "Draft villages, towns, and cities with guilds, power factions, notable locations, and hooks.",
      ),
      tavernCard,
      shipCard,
      nationCard,
      darkFantasyFactionCard,
      ...fantasyOnlyCards,
      newsSheetCard(
        "Broadsheet Generator",
        "Generate a town-crier broadsheet: headlines, guild notices, market rumours, and classifieds, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  pirate: {
    label: "Pirate",
    localStorageId: "pirate",
    eyebrow: "Charts, Storms & Free Companies",
    intro:
      "Build mature nautical adventures across charted waters, storm-dark harbours, privateer courts, and strange seas. Generate crews, factions, settlements, ships, and the rumours that travel fastest by lantern light.",
    metaTitle:
      "Pirate RPG Generators — Crews, Ships, Factions & More | Codex Cryptica",
    metaDescription:
      "Free pirate RPG generators for tabletop GMs. Create crews, ships, factions, settlements, quest hooks, and names for nautical campaigns. No login required.",
    cards: [
      ...sharedCards(
        "Port Generator",
        "Build harbours, island settlements, and hidden coves with factions, trade routes, notable locations, and hooks.",
      ),
      pirateShipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Broadside Generator",
        "Generate a shipboard broadside: harbour notices, prize claims, naval reports, and dockside rumours, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  cyberpunk: {
    label: "Cyberpunk",
    localStorageId: "cyberpunk",
    eyebrow: "Neon, Megacorps & Chrome",
    intro:
      "Neon-drenched streets, corporate warfare, and augmented outlaws. Generate megacorp factions, street-level fixers, and underground settlements for your cyberpunk campaign, all pre-tuned to the genre.",
    metaTitle:
      "Cyberpunk RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
    metaDescription:
      "Free cyberpunk RPG generators for tabletop GMs. Create fixers, megacorp factions, settlements, quest hooks, and names for your cyberpunk campaign. No login required.",
    cards: [
      ...sharedCards(
        "District Generator",
        "Build megacity districts with corps, gangs, fixers, black markets, and street-level tension.",
      ),
      nomadClanCard,
      starSystemCard,
      alienRaceCard,
      worldCard,
      shipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Screamsheet Generator",
        "Generate a street screamsheet: corporate spin, gang violence, fixer rumours, and product ads, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  "sci-fi": {
    label: "Sci-Fi",
    localStorageId: "scifi",
    eyebrow: "Space Opera & the Stars",
    intro:
      "Explore the galaxy with generators built for space opera and hard sci-fi. Draft alien factions, starfaring NPCs, frontier settlements, and interstellar political blocs for your campaign.",
    metaTitle:
      "Sci-Fi RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
    metaDescription:
      "Free sci-fi RPG generators for tabletop GMs. Create alien NPCs, space factions, frontier settlements, quest hooks, and names for your sci-fi campaign. No login required.",
    cards: [
      ...sharedCards(
        "Colony Generator",
        "Build space stations, frontier colonies, and alien outposts with factions, resources, and threats.",
      ),
      starSystemCard,
      alienRaceCard,
      worldCard,
      shipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Newsfeed Generator",
        "Generate a station newsfeed: pirate alerts, megacorp claims, distress notices, and trade rumours, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  "post-apocalyptic": {
    label: "Post-Apocalyptic",
    localStorageId: "apocalyptic",
    eyebrow: "Ruins, Wastes & Survivors",
    intro:
      "The world ended. Now build what came after. Generate survivor factions, wasteland settlements, desperate NPCs, and brutal quest hooks for your post-apocalyptic campaign.",
    metaTitle:
      "Post-Apocalyptic RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
    metaDescription:
      "Free post-apocalyptic RPG generators for tabletop GMs. Create survivor factions, wasteland settlements, scavenger NPCs, and quest hooks. No login required.",
    cards: [
      ...sharedCards(
        "Enclave Generator",
        "Build survivor settlements with scarcity, faction rivalries, desperate NPCs, and brutal hooks.",
      ),
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Wasteland Bulletin Generator",
        "Generate a bunker bulletin: trade warnings, raider reports, ration notices, and salvage rumours, with GM-only hooks.",
      ),
      alienRaceCard,
      languageCard,
      surpriseMeCard,
    ],
  },
  modern: {
    label: "Modern",
    localStorageId: "modern",
    eyebrow: "Conspiracies & City Streets",
    intro:
      "Secret societies, government cover-ups, and shadowy organisations lurk beneath the surface. Generate modern-era NPCs, conspiracy factions, urban settlements, and investigation hooks.",
    metaTitle:
      "Modern RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
    metaDescription:
      "Free modern RPG generators for tabletop GMs. Create conspiracy factions, urban settlements, modern NPCs, and investigation hooks. No login required.",
    cards: [
      ...sharedCards(
        "Neighbourhood Generator",
        "Generate urban areas with power dynamics, local factions, points of interest, and hidden conflicts.",
      ),
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Tabloid Generator",
        "Generate a local tabloid: cover-ups, conspiracies, missing persons, and strange classifieds, with GM-only hooks.",
      ),
      alienRaceCard,
      languageCard,
      surpriseMeCard,
    ],
  },
  lancer: {
    label: "Lancer",
    localStorageId: "lancer",
    eyebrow: "Mechs, Pilots & the Long Rim",
    intro:
      "Bleed runs hot and the Long Rim doesn't wait. Build Union operatives, heterodox mech corps, frontier outpost factions, and NHP-adjacent NPCs for your Lancer campaign; every generator is tuned to the cockpit-terminal aesthetic and the weight of post-scarcity warfare.",
    metaTitle:
      "Lancer RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
    metaDescription:
      "Free Lancer RPG generators for tabletop GMs. Create mech pilots, Union factions, frontier outpost settlements, quest hooks, and names for your Lancer campaign. No login required.",
    cards: [
      ...sharedCards(
        "Settlement Generator",
        "Build frontier outposts, Union administrative hubs, and contested colony sites with mech bays, bleed zones, and factional tension.",
      ),
      starSystemCard,
      alienRaceCard,
      worldCard,
      shipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Comms Digest Generator",
        "Generate an outpost comms digest: Union bulletins, contractor notices, pilot rumours, and frontier alerts, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  steampunk: {
    label: "Steampunk",
    localStorageId: "steampunk",
    eyebrow: "Brass, Aether & Empire",
    intro:
      "Gears grind, furnaces roar, and empires expand on the backs of the engine-workers. Build airship consortiums, guild conspiracies, aetheric laboratories, and desperate underclass rebels for your steampunk campaign; every generator is tuned to the smoke and brass of the industrial age.",
    metaTitle:
      "Steampunk RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
    metaDescription:
      "Free steampunk RPG generators for tabletop GMs. Create artificers, guild factions, airship settlements, quest hooks, and names for your steampunk campaign. No login required.",
    cards: [
      ...sharedCards(
        "Settlement Generator",
        "Build industrial boroughs, sky-dock towns, and smog-shrouded districts with guild factions, aetheric hazards, and working-class tension.",
      ),
      shipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Penny Broadsheet Generator",
        "Generate a penny broadsheet: guild scandals, patent disputes, sky-dock notices, and agitator rumours, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  vampire: {
    label: "Vampire",
    localStorageId: "horror",
    eyebrow: "Gothic Noir & the Eternal Night",
    intro:
      "Ancient bloodlines, forbidden pacts, and courts of the undead. Generate vampire clans, gothic factions, shadowy NPCs, and dark quest hooks for your vampire or gothic horror campaign.",
    metaTitle:
      "Vampire RPG Generators — NPC, Clan, Quest & More | Codex Cryptica",
    metaDescription:
      "Free vampire RPG generators for tabletop GMs. Create vampire clans, gothic factions, undead NPCs, and dark quest hooks for your horror campaign. No login required.",
    cards: [
      vampireClanCard,
      ...sharedCards(
        "Domain Generator",
        "Build vampire domains, gothic districts, and Elysiums with power brokers, hunting grounds, and dark secrets.",
      ),
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Occult Tabloid Generator",
        "Generate an occult tabloid: supernatural cover-ups, disappearances, ominous notices, and weird classifieds, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  "cosmic-horror": {
    label: "Cosmic Horror",
    localStorageId: "cosmic_horror",
    eyebrow: "The Unknown Beneath & Beyond",
    intro:
      "Build investigations shaped by impossible environments, forgotten expeditions, strange archaeology, and discoveries too large to explain away. These generators favour original eldritch mysteries, fragile certainty, and alien scale, not vampire courts or gothic-noir intrigue.",
    metaTitle:
      "Cosmic Horror RPG Generators — Investigators, Mysteries & More | Codex Cryptica",
    metaDescription:
      "Free cosmic-horror RPG generators for tabletop GMs. Create investigators, secret societies, remote outposts, impossible ruins, and unsettling adventure hooks. No login required.",
    cards: [
      ...sharedCards(
        "Outpost Generator",
        "Build remote stations, weather-beaten towns, and expedition camps with uneasy locals, evidence, and impossible surroundings.",
      ),
      socialHubCard,
      newsSheetCard(
        "Field Report Generator",
        "Generate a field report: missing expeditions, astronomical anomalies, restricted notices, and unsettling leads, with GM-only hooks.",
      ),
      alienRaceCard,
      languageCard,
      surpriseMeCard,
    ],
  },
  western: {
    label: "Western",
    localStorageId: "western",
    eyebrow: "Six-Guns, Trails & Dust",
    intro:
      "Dusty borderlands, rowdy saloons, and dangerous outlaws. Generate frontier settlements, bounty quests, gunslinger NPCs, and rail-baron factions for your Western campaign, all pre-tuned to the genre.",
    metaTitle:
      "Western RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
    metaDescription:
      "Free Western RPG generators for tabletop GMs. Create gunslinger NPCs, outlaws, saloons, settlements, quest hooks, and names for your frontier campaign. No login required.",
    cards: [
      ...sharedCards(
        "Settlement Generator",
        "Build frontier outposts and ghost towns with sheriff departments, outlaw camps, and gold claims.",
      ),
      shipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Frontier Newspaper Generator",
        "Generate a frontier weekly: telegraph dispatches, outlaw sightings, wanted notices, and saloon rumours, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  "space-opera-resistance": {
    label: "Space Opera Resistance",
    localStorageId: "space-opera-resistance",
    eyebrow: "Rebellion & Imperial Might",
    intro:
      "Fight the empire or maintain order in the galaxy. Generate hidden rebel bases, imperial capital cities, oppressive factions, and thrilling space opera quests for your campaign.",
    metaTitle:
      "Space Opera Resistance RPG Generators — Faction, Settlement, Quest & More | Codex Cryptica",
    metaDescription:
      "Free Space Opera Resistance RPG generators for tabletop GMs. Create rebel bases, imperial capitals, smuggling factions, and quest hooks. No login required.",
    cards: [
      ...sharedCards(
        "Settlement Generator",
        "Build hidden rebel bases, imperial capital cities, and smuggling spaceports with factions, points of interest, and rising tension.",
      ),
      starSystemCard,
      alienRaceCard,
      worldCard,
      shipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Underground Broadcast Generator",
        "Generate a resistance broadcast: imperial propaganda, smuggler notices, sector alerts, and rebel rumours, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  "optimistic-exploration-sci-fi": {
    label: "Optimistic Sci-Fi",
    localStorageId: "startrek",
    eyebrow: "Diplomacy, Discovery & the Stars",
    intro:
      "Draft diplomatic starships, scientific missions, federated worlds, first-contact stories, academy-trained officers, and conflicts where ideals are tested rather than discarded.",
    metaTitle:
      "Optimistic Sci-Fi RPG Generators — NPC, Faction, Quest & More | Codex Cryptica",
    metaDescription:
      "Free optimistic sci-fi RPG generators for tabletop GMs. Create diplomatic officers, scientific factions, space station hubs, quest hooks, and names for your campaign. No login required.",
    cards: [
      ...sharedCards(
        "Settlement Generator",
        "Build research outposts, orbital stations, and core world cities with science directors, fleet admirals, and planetary governors.",
      ),
      starSystemCard,
      alienRaceCard,
      worldCard,
      shipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Station Newsfeed Generator",
        "Generate a station promenade daily: survey reports, diplomatic notices, academy news, and dockside rumours, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  "space-western": {
    label: "Space Western",
    localStorageId: "space-western",
    eyebrow: "Frontier Scoundrels & Asteroid Rigs",
    intro:
      "Battered freighters, lawless asteroid boomtowns, mining syndicates, and high-stakes smuggling runs. Generate frontier settlements, scoundrel NPCs, rust-bucket starships, and bounty contracts for your space western campaign, all free and pre-tuned.",
    metaTitle:
      "Space Western RPG Generators — NPC, Ship, Faction & More | Codex Cryptica",
    metaDescription:
      "Free Space Western and Scoundrel RPG generators for tabletop GMs. Create scoundrel NPCs, smuggling factions, asteroid boomtowns, rust-bucket freighters, and bounty quests. No login required.",
    cards: [
      ...sharedCards(
        "Frontier Outpost Generator",
        "Build asteroid claims, dusty planetary depots, and hollow-rock cantinas with mining councils, marshals, and corporate enforcers.",
      ),
      starSystemCard,
      alienRaceCard,
      worldCard,
      shipCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Rim-World Gazette Generator",
        "Generate a frontier news bulletin: bounty warrants, mining claim disputes, customs warnings, and cantina rumours, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
  superhero: {
    label: "Superhero",
    localStorageId: "superhero",
    eyebrow: "Vigilantes, Nemeses & City Crises",
    intro:
      "Four-colour heroics, street-level vigilantes, and cosmic crises. Build hero origins, mastermind villain schemes, crossover events, and metahuman factions for your superhero campaign, all pre-tuned to the genre.",
    metaTitle:
      "Superhero RPG Generators — Origin, Villain Scheme, Events & More | Codex Cryptica",
    metaDescription:
      "Free superhero RPG generators for tabletop GMs. Create hero origins, mastermind villain schemes, city crises, hero teams, and metahuman factions. No login required.",
    cards: [
      superheroOriginCard,
      villainSchemeCard,
      comicBookEventCard,
      ...sharedCards(
        "City District Generator",
        "Draft sprawling city districts, corporate towers, waterfront docks, and tenement alleys where street-level action happens.",
      ),
      alienRaceCard,
      socialHubCard,
      nationCard,
      newsSheetCard(
        "Daily Gazette Generator",
        "Generate city broadsheet headlines, police blotters, metahuman sightings, and investigative exposes, with GM-only hooks.",
      ),
      languageCard,
      surpriseMeCard,
    ],
  },
};
