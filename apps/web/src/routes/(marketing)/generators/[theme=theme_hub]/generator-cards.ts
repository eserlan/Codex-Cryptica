export type GeneratorCard = {
  slug: string;
  label: string;
  summary: string;
  icon: string;
};

export const sharedCards = (
  settlementLabel: string,
  settlementSummary: string,
): GeneratorCard[] => [
  {
    slug: "holiday",
    label: "Holiday & Festival Generator",
    summary:
      "Create observances shaped by a culture's history, climate, beliefs, and conflicts.",
    icon: "icon-[lucide--calendar-heart]",
  },
  {
    slug: "npc",
    label: "NPC Generator",
    summary:
      "Generate fully realised NPCs with ancestry, role, personality, secrets, and plot hooks.",
    icon: "icon-[lucide--user-round-plus]",
  },
  {
    slug: "personality",
    label: "Personality Generator",
    summary:
      "Generate a coherent, playable personality -- drives, virtue and flaw, a real contradiction, and how they act under pressure -- ready to roleplay.",
    icon: "icon-[lucide--drama]",
  },
  {
    slug: "faction",
    label: "Faction Generator",
    summary:
      "Build organisations with agendas, internal conflicts, notable members, and power structures.",
    icon: "icon-[lucide--flag]",
  },
  {
    slug: "faction-roster",
    label: "Faction Roster Generator",
    summary:
      "Turn a faction into 3-6 named members, each with a motive, a stance, and a connection to another member.",
    icon: "icon-[lucide--users-round]",
  },
  {
    slug: "quest",
    label: "Quest Generator",
    summary:
      "Create adventure hooks with goals, complications, rewards, and dramatic twists.",
    icon: "icon-[lucide--scroll]",
  },
  {
    slug: "mystery-investigation",
    label: "Mystery & Investigation Generator",
    summary:
      "Create a fixed-truth case with testable clues, multiple independent leads, and fair outcomes.",
    icon: "icon-[lucide--search]",
  },
  {
    slug: "rumour",
    label: "Rumour Generator",
    summary:
      "Generate a d6 table of six local rumours -- each with a concrete lead and a source -- lighter than a full quest hook.",
    icon: "icon-[lucide--ear]",
  },
  {
    slug: "encounter",
    label: "Encounter Generator",
    summary:
      "Generate a playable combat, social, exploration, environmental, or mixed encounter with participants, environment, a complication, and outcomes.",
    icon: "icon-[lucide--swords]",
  },
  {
    slug: "puzzle",
    label: "Puzzle Generator",
    summary:
      "Create flexible encounter puzzles with layered clues, alternate solutions, and fail-forward consequences.",
    icon: "icon-[lucide--puzzle]",
  },
  {
    slug: "plot-twist-generator",
    label: "Plot Twist & Complication Generator",
    summary:
      "Turn an established situation into a coherent twist with fair foreshadowing, consequences, and new player choices.",
    icon: "icon-[lucide--shuffle]",
  },
  {
    slug: "bbeg-generator",
    label: "BBEG / Campaign Villain Generator",
    summary:
      "Create a campaign-scale antagonist with a concrete goal, methods, lieutenants, and an escalating plan the party can discover and disrupt.",
    icon: "icon-[lucide--skull]",
  },
  {
    slug: "heist",
    label: "Heist Generator",
    summary:
      "Generate a playable score: a prize with a practical catch, three layered security rings, an escalating alarm track, and a getaway whose original plan has already failed.",
    icon: "icon-[lucide--key-round]",
  },
  {
    slug: "council-vote",
    label: "Council Vote Generator",
    summary:
      "Generate a political vote quest: a named council of voters with distinct agendas that the party must sway before a deadline decision.",
    icon: "icon-[lucide--gavel]",
  },
  {
    slug: "secret-society",
    label: "Secret Society Generator",
    summary:
      "Create cults, sects, conspiracies, and hidden orders with doctrine, rituals, a public face, and adventure hooks.",
    icon: "icon-[lucide--eye]",
  },
  {
    slug: "names",
    label: "Name Generator",
    summary:
      "Generate character, place, faction, and item names tuned to your genre and cultural style.",
    icon: "icon-[lucide--pen-line]",
  },
  {
    slug: "settlement",
    label: settlementLabel,
    summary: settlementSummary,
    icon: "icon-[lucide--building-2]",
  },
  {
    slug: "dungeon-generator",
    label: "Dungeon & Delve Generator",
    summary:
      "Generate multi-layered dungeons, ancient ruins, subterranean vaults, alien complexes, or cybernetic facilities.",
    icon: "icon-[lucide--layers]",
  },
  {
    slug: "adventure-generator",
    label: "Adventure Idea Generator",
    summary:
      "Generate campaign-ready adventure concepts with initial situation, primary pressure, key locations, threats, and non-linear outcomes.",
    icon: "icon-[lucide--map]",
  },
  {
    slug: "one-shot-adventure-generator",
    label: "One-Shot Adventure Builder",
    summary:
      "Build a run-ready, timed one-shot with scenes, NPCs, clues, endings and a GM cheat sheet.",
    icon: "icon-[lucide--hourglass]",
  },
  {
    slug: "point-crawl",
    label: "Point Crawl Generator",
    summary:
      "Generate an interconnected network of named locations, travel routes, loops, and secret paths.",
    icon: "icon-[lucide--waypoints]",
  },
  {
    slug: "business",
    label: "Business Generator",
    summary:
      "Create one commercial organisation with its people, dependencies, rivals, pressure and adventure hooks.",
    icon: "icon-[lucide--store]",
  },
  {
    slug: "minor-magic-item",
    label: "Minor Magic Item Generator",
    summary:
      "Generate small-scale charms, consumable potions, single-use devices, and curiosities with clear limits and quirks.",
    icon: "icon-[lucide--sparkles]",
  },
  {
    slug: "creature",
    label: "Creature Generator",
    summary:
      "Generate monsters, beasts, alien fauna, and undead with ecology, signs, combat tactics, and adventure hooks.",
    icon: "icon-[lucide--paw-print]",
  },
  {
    slug: "artifact-generator",
    label: "Artifact & Relic Generator",
    summary:
      "Generate unique, named major artifacts and ancient relics with multi-tier powers, curses, pursuing factions, and destruction conditions.",
    icon: "icon-[lucide--gem]",
  },
  {
    slug: "tome",
    label: "Tome & Forbidden Book Generator",
    summary:
      "Generate sinister grimoires, occult field logs, and heretical treatises with binding details, readable excerpts, research hazards, and hooks.",
    icon: "icon-[lucide--book-marked]",
  },
  {
    slug: "constellation",
    label: "Constellation Generator",
    summary:
      "Generate a culturally meaningful constellation: a star pattern, an origin myth, seasonal visibility, practical use, cultural meaning, and an adventure hook.",
    icon: "icon-[lucide--stars]",
  },
];

export const surpriseMeCard: GeneratorCard = {
  slug: "random",
  label: "Surprise Me",
  summary:
    "Not sure what to generate? Spin the machine: a random idea tuned to your active theme.",
  icon: "icon-[lucide--dices]",
};

export const nationCard: GeneratorCard = {
  slug: "nation",
  label: "Nation Generator",
  summary:
    "Build nations and power blocs with government, economy, military, and foreign relations.",
  icon: "icon-[lucide--globe]",
};

export const shipCard: GeneratorCard = {
  slug: "ship-generator",
  label: "Ship Generator",
  summary:
    "Generate a campaign-ready vessel: freighter, warship, scout, derelict, or colony ship, with crew, complication, secret, and hooks.",
  icon: "icon-[lucide--rocket]",
};

export const worldCard: GeneratorCard = {
  slug: "world",
  label: "Sci-Fi World Generator",
  summary:
    "Generate a planet, moon, or artificial world shaped by its environment, societies, conflicts, and adventure hooks.",
  icon: "icon-[lucide--earth]",
};

export const starSystemCard: GeneratorCard = {
  slug: "star-system",
  label: "Star System Generator",
  summary:
    "Generate a coherent star system: star(s), major bodies, factions, resources, hazards, and a system-wide conflict or mystery.",
  icon: "icon-[lucide--orbit]",
};

export const alienRaceCard: GeneratorCard = {
  slug: "alien-race",
  label: "Alien Race Generator",
  summary:
    "Generate a coherent alien species whose biology, homeworld, culture, and technology all follow from each other.",
  icon: "icon-[lucide--dna]",
};

export const pirateShipCard: GeneratorCard = {
  slug: "ship-generator",
  label: "Pirate Ship Generator",
  summary:
    "Create a pirate vessel with a captain, crew culture, shipboard tension, prize-worthy complications, and secrets hidden below deck.",
  icon: "icon-[lucide--ship-wheel]",
};

// One generator, many mastheads: each hub links to the news sheet
// generator under the name that genre actually uses for the format.
export const newsSheetCard = (
  label: string,
  summary: string,
): GeneratorCard => ({
  slug: "news-sheet-generator",
  label,
  summary,
  icon: "icon-[lucide--newspaper]",
});

export const languageCard: GeneratorCard = {
  slug: "language-generator",
  label: "Language Generator",
  summary:
    "Design a fictional language profile: pronunciation, naming rules, example names, and a starter glossary tuned to your genre.",
  icon: "icon-[lucide--languages]",
};

export const tavernCard: GeneratorCard = {
  slug: "tavern",
  label: "Tavern Generator",
  summary:
    "Generate a fantasy tavern or inn with owner, patrons, rumours, and a hidden problem.",
  icon: "icon-[lucide--beer]",
};

export const socialHubCard: GeneratorCard = {
  slug: "social-hub",
  label: "Social Hub Generator",
  summary:
    "Generate a social venue for your genre: dive bars, cantinas, nightclubs, or underground markets.",
  icon: "icon-[lucide--map-pin]",
};

export const vampireClanCard: GeneratorCard = {
  slug: "vampire-clan",
  label: "Vampire Clan Generator",
  summary:
    "Create vampire clans and bloodlines with hierarchy, feeding grounds, internal politics, and dark secrets.",
  icon: "icon-[lucide--moon]",
};

export const nomadClanCard: GeneratorCard = {
  slug: "nomad-clan",
  label: "Nomad Clan Generator",
  summary:
    "Build cyberpunk nomad convoys with territory routes, clan codes, corporate enemies, and road-ready hooks.",
  icon: "icon-[lucide--truck]",
};

export const darkFantasyFactionCard: GeneratorCard = {
  slug: "dark-fantasy-faction",
  label: "Dark Fantasy Faction Generator",
  summary:
    "Create fallen orders, cursed noble houses, plague cults, witch-hunters, and corpse guilds with morally sharp agendas and hooks.",
  icon: "icon-[lucide--skull]",
};

export const fantasyOnlyCards: GeneratorCard[] = [
  {
    slug: "dnd-npc",
    label: "D&D NPC Generator",
    summary:
      "Create a D&D-ready NPC with ancestry, role, personality, secret, faction tie, and plot hook.",
    icon: "icon-[lucide--shield]",
  },
  {
    slug: "magic-item",
    label: "Magic Item Generator",
    summary:
      "Forge unique artefacts, cursed relics, and legendary weapons with lore and mechanics.",
    icon: "icon-[lucide--wand-sparkles]",
  },
  {
    slug: "kingdom",
    label: "Kingdom Generator",
    summary:
      "Construct realms with rulers, noble houses, military strength, and political intrigue.",
    icon: "icon-[lucide--crown]",
  },
  {
    slug: "pantheon-generator",
    label: "Pantheon Generator",
    summary:
      "Build a pantheon with alliances, rivalries, cosmic conflicts, and member deities.",
    icon: "icon-[lucide--sun]",
  },
];

export const superheroOriginCard: GeneratorCard = {
  slug: "origin-generator",
  label: "Superhero Origin Generator",
  summary:
    "Generate a superhero origin: power catalyst, secret toll, signature abilities, iconic quirks, and lingering backstory hooks.",
  icon: "icon-[lucide--zap]",
};

export const villainSchemeCard: GeneratorCard = {
  slug: "villain-scheme-generator",
  label: "Villain Scheme Generator",
  summary:
    "Generate a comic book villain mastermind scheme: grand objective, public facade, escalating 4-stage plan, clues, and countermeasures.",
  icon: "icon-[lucide--target]",
};

export const comicBookEventCard: GeneratorCard = {
  slug: "comic-book-event-generator",
  label: "Comic Book Event Generator",
  summary:
    "Generate a campaign-scale crossover crisis with staged escalations, collateral damage, and lasting status-quo shifts.",
  icon: "icon-[lucide--zap]",
};
