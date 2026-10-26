/**
 * The public generator catalogue: every generator with its own canonical page,
 * filed under one category.
 *
 * Single source of truth for how generators are grouped and described, so the
 * /generators index, the generator switcher menu, the related links on each
 * generator page and the in-app generator picker cannot drift apart. Adding a generator means adding one entry
 * here; a test fails if a served, self-canonical slug is missing.
 */
import type { GeneratorId } from "generator-engine";
import type { ValidSlug } from "#lib/components/seo/generator-page-meta.js";

export const GENERATOR_CATEGORIES = [
  {
    id: "characters",
    label: "Characters, Villains & Names",
    description: "NPCs, personalities, villains and the names to give them.",
  },
  {
    id: "factions",
    label: "Factions & Organisations",
    description: "Guilds, clans, cults and businesses with agendas and hooks.",
  },
  {
    id: "culture",
    label: "Culture, Myth & Language",
    description: "Gods, festivals, star lore and the languages people speak.",
  },
  {
    id: "places",
    label: "Places & Settlements",
    description: "Towns, venues, dungeons, travel networks and vessels.",
  },
  {
    id: "realms",
    label: "Realms, Worlds & Creatures",
    description: "Kingdoms, nations, planets and the species that live there.",
  },
  {
    id: "adventures",
    label: "Adventures & Scenarios",
    description: "Ready-to-run adventures, quests, mysteries and heists.",
  },
  {
    id: "complications",
    label: "Encounters & Complications",
    description: "Scenes, twists, schemes and roll tables to drop into play.",
  },
  {
    id: "items",
    label: "Items & Lore",
    description: "Magic items, relics, loot and forbidden books.",
  },
] as const;

export type GeneratorCategoryId = (typeof GENERATOR_CATEGORIES)[number]["id"];

export type GeneratorCatalogueEntry = {
  slug: Exclude<ValidSlug, "adventure-idea-generator">;
  label: string;
  summary: string;
  icon: string;
  category: GeneratorCategoryId;
  /** The in-app campaign generator this page fronts, when there is one. */
  generatorId?: GeneratorId;
};

export const GENERATOR_CATALOGUE: readonly GeneratorCatalogueEntry[] = [
  // Characters, Villains & Names
  {
    slug: "dnd-npc",
    label: "D&D NPC Generator",
    summary:
      "Create a fantasy NPC with ancestry, role, personality, secret, faction tie, and plot hook.",
    icon: "icon-[lucide--user-round-plus]",
    category: "characters",
  },
  {
    slug: "npc",
    label: "RPG NPC Generator",
    summary:
      "Generate NPCs across six genres: fantasy, cyberpunk, gothic, sci-fi, modern, and post-apocalyptic.",
    icon: "icon-[lucide--users]",
    category: "characters",
    generatorId: "npc",
  },
  {
    slug: "personality",
    label: "Personality Generator",
    summary:
      "Generate a coherent, playable personality: drives, a connected virtue and flaw, a believable contradiction, and roleplaying cues.",
    icon: "icon-[lucide--drama]",
    category: "characters",
  },
  {
    slug: "origin-generator",
    label: "Superhero Origin Generator",
    summary:
      "Generate a superhero origin with a concrete origin event, a GM-usable campaign hook, and an ongoing consequence the backstory doesn't resolve.",
    icon: "icon-[lucide--zap]",
    category: "characters",
  },
  {
    slug: "bbeg-generator",
    label: "BBEG / Campaign Villain Generator",
    summary:
      "Create a campaign-scale antagonist with a concrete goal, methods, lieutenants, and an escalating plan the party can discover and disrupt.",
    icon: "icon-[lucide--skull]",
    category: "characters",
    generatorId: "villain",
  },

  {
    slug: "names",
    label: "RPG Name Generator",
    summary:
      "Generate character, place, faction, and item names for any genre and cultural style.",
    icon: "icon-[lucide--pen-line]",
    category: "characters",
  },
  {
    slug: "fantasy-names",
    label: "Fantasy Name Generator",
    summary:
      "Generate fantasy names across ten cultural styles: elven, dwarven, orcish, Norse, and more.",
    icon: "icon-[lucide--feather]",
    category: "characters",
  },

  // Factions & Organisations
  {
    slug: "faction",
    label: "Faction Generator",
    summary:
      "Build guilds, megacorps, vampire clans, and rebel cells with agendas, conflicts, and NPCs.",
    icon: "icon-[lucide--flag]",
    category: "factions",
    generatorId: "faction",
  },
  {
    slug: "faction-roster",
    label: "Faction Roster Generator",
    summary:
      "Turn a faction into 3-6 named members, each with a motive, a stance, and a connection to another member.",
    icon: "icon-[lucide--users-round]",
    category: "factions",
    generatorId: "faction-roster",
  },
  {
    slug: "secret-society",
    label: "Secret Society Generator",
    summary:
      "Create cults, sects, conspiracies, and hidden orders with doctrine, rituals, a public face, and adventure hooks.",
    icon: "icon-[lucide--eye]",
    category: "factions",
    generatorId: "secret-society",
  },
  {
    slug: "business",
    label: "Business Generator",
    summary:
      "Create one commercial organisation with its people, dependencies, rivals, pressure and adventure hooks.",
    icon: "icon-[lucide--store]",
    category: "factions",
    generatorId: "business",
  },
  {
    slug: "dark-fantasy-faction",
    label: "Dark Fantasy Faction Generator",
    summary:
      "Create fallen orders, cursed noble houses, plague cults, witch-hunters, and corpse guilds with morally sharp agendas and hooks.",
    icon: "icon-[lucide--skull]",
    category: "factions",
  },
  {
    slug: "vampire-clan",
    label: "Vampire Clan Generator",
    summary:
      "Create vampire clans, bloodlines, covens, and secret societies with dark agendas and plot hooks.",
    icon: "icon-[lucide--moon]",
    category: "factions",
  },
  {
    slug: "nomad-clan",
    label: "Nomad Clan Generator",
    summary:
      "Build cyberpunk nomad convoys with territory routes, clan codes, corporate enemies, and road-ready hooks.",
    icon: "icon-[lucide--truck]",
    category: "factions",
  },

  // Culture, Myth & Language
  {
    slug: "pantheon-generator",
    label: "Pantheon Generator",
    summary:
      "Build a small pantheon with alliances, rivalries, cosmic conflicts, and member deities.",
    icon: "icon-[lucide--sun]",
    category: "culture",
  },
  {
    slug: "god-generator",
    label: "God & Deity Generator",
    summary:
      "Design a single deity, spirit, or abstract force with domains, taboos, symbols, and hooks.",
    icon: "icon-[lucide--star]",
    category: "culture",
  },
  {
    slug: "holiday",
    label: "Holiday & Festival Generator",
    summary:
      "Create culturally grounded holidays, memorials, festivals, or a coherent calendar shaped by a society's history and beliefs.",
    icon: "icon-[lucide--calendar-heart]",
    category: "culture",
    generatorId: "holiday",
  },
  {
    slug: "constellation",
    label: "Constellation Generator",
    summary:
      "Generate a culturally meaningful constellation: a star pattern, an origin myth, seasonal visibility, practical use, cultural meaning, and an adventure hook.",
    icon: "icon-[lucide--stars]",
    category: "culture",
    generatorId: "constellation",
  },
  {
    slug: "language-generator",
    label: "Fictional Language Generator",
    summary:
      "Generate a conlang profile with pronunciation, naming rules, example names, and a starter glossary.",
    icon: "icon-[lucide--languages]",
    category: "culture",
    generatorId: "language",
  },

  // Places & Settlements
  {
    slug: "settlement",
    label: "Settlement Generator",
    summary:
      "Draft towns and villages with economy, government, notable locations, and factions.",
    icon: "icon-[lucide--landmark]",
    category: "places",
    generatorId: "settlement",
  },
  {
    slug: "tavern",
    label: "Tavern Generator",
    summary:
      "Generate a fantasy tavern or inn with owner, patrons, rumours, and a hidden problem.",
    icon: "icon-[lucide--beer]",
    category: "places",
  },
  {
    slug: "social-hub",
    label: "Social Hub Generator",
    summary:
      "Generate a social venue for any genre: cyberpunk dive bars, western saloons, sci-fi cantinas.",
    icon: "icon-[lucide--map-pin]",
    category: "places",
  },
  {
    slug: "dungeon-generator",
    label: "Dungeon & Delve Generator",
    summary:
      "Generate multi-layered dungeons, ancient ruins, subterranean vaults, alien complexes, or cybernetic facilities.",
    icon: "icon-[lucide--layers]",
    category: "places",
    generatorId: "dungeon",
  },
  {
    slug: "point-crawl",
    label: "Point Crawl Generator",
    summary:
      "Build an interconnected network of named locations and travel routes with loops, secret paths, locked gates, and SVG/PNG diagram export.",
    icon: "icon-[lucide--waypoints]",
    category: "places",
    generatorId: "point-crawl",
  },
  {
    slug: "ship-generator",
    label: "Ship Generator",
    summary:
      "Generate a ship for any genre: starships, galleons, pirate sloops, or airships, each with a crew, a problem, and a secret.",
    icon: "icon-[lucide--ship]",
    category: "places",
    generatorId: "ship",
  },

  // Realms, Worlds & Creatures
  {
    slug: "kingdom",
    label: "Kingdom Generator",
    summary:
      "Generate a fantasy kingdom with ruler, factions, geography, conflict level, and adventure hooks.",
    icon: "icon-[lucide--crown]",
    category: "realms",
  },
  {
    slug: "nation",
    label: "Nation Generator",
    summary:
      "Generate a political entity for any genre: fantasy empires, cyberpunk megacorp-states, sci-fi federations.",
    icon: "icon-[lucide--globe]",
    category: "realms",
  },
  {
    slug: "world",
    label: "Sci-Fi World Generator",
    summary:
      "Generate a planet, moon, or artificial world with its environment, society, conflicts, notable locations, and hooks.",
    icon: "icon-[lucide--earth]",
    category: "realms",
    generatorId: "world",
  },
  {
    slug: "star-system",
    label: "Star System Generator",
    summary:
      "Generate a coherent sci-fi star system: star(s), major bodies, factions, resources, hazards, and a system-wide conflict or mystery.",
    icon: "icon-[lucide--orbit]",
    category: "realms",
    generatorId: "star-system",
  },
  {
    slug: "alien-race",
    label: "Alien Race Generator",
    summary:
      "Generate a coherent alien species: biology, homeworld, senses, culture, technology, and weaknesses that all follow from each other.",
    icon: "icon-[lucide--dna]",
    category: "realms",
    generatorId: "alien-race",
  },
  {
    slug: "creature",
    label: "Creature Generator",
    summary:
      "Generate memorable monsters, beasts, alien fauna, and undead with ecology, sensory signs, combat tactics, and adventure hooks.",
    icon: "icon-[lucide--paw-print]",
    category: "realms",
    generatorId: "creature",
  },

  // Adventures & Scenarios
  {
    slug: "adventure-generator",
    label: "Adventure Idea Generator",
    summary:
      "Create campaign-ready adventure concepts with initial situation, primary pressure, key locations, threats, and non-linear outcomes.",
    icon: "icon-[lucide--map]",
    category: "adventures",
    generatorId: "adventure",
  },
  {
    slug: "one-shot-adventure-generator",
    label: "One-Shot Adventure Builder",
    summary:
      "Build a run-ready, timed one-shot: scenes with minute budgets, NPCs, clues with multiple routes, endings and a one-page GM cheat sheet.",
    icon: "icon-[lucide--hourglass]",
    category: "adventures",
  },
  {
    slug: "quest",
    label: "Quest Hook Generator",
    summary:
      "Create a GM-ready adventure seed with a complication, key NPC, twist, and reward.",
    icon: "icon-[lucide--scroll-text]",
    category: "adventures",
    generatorId: "quest",
  },
  {
    slug: "mystery-investigation",
    label: "Mystery & Investigation Generator",
    summary:
      "Build a fair case with a fixed GM truth, distinct suspects, testable clues, multiple independent leads, pressure, and several outcomes.",
    icon: "icon-[lucide--search]",
    category: "adventures",
    generatorId: "mystery-investigation",
  },
  {
    slug: "heist",
    label: "Heist Generator",
    summary:
      "Generate a playable score: a prize with a practical catch, three layered security rings, an escalating alarm track, and a getaway whose original plan has already failed.",
    icon: "icon-[lucide--key-round]",
    category: "adventures",
    generatorId: "heist",
  },
  {
    slug: "council-vote",
    label: "Council Vote Generator",
    summary:
      "Generate a political vote quest: a named council of voters with distinct agendas that the party must sway before a deadline decision.",
    icon: "icon-[lucide--gavel]",
    category: "adventures",
    generatorId: "council-vote",
  },
  {
    slug: "rumour",
    label: "Rumour Generator",
    summary:
      "Generate a d6 table of six local rumours, each with a concrete lead and a source, lighter than a full quest hook.",
    icon: "icon-[lucide--ear]",
    category: "adventures",
    generatorId: "rumour",
  },
  {
    slug: "news-sheet-generator",
    label: "News Sheet Generator",
    summary:
      "Generate an in-world news sheet for any genre: cyberpunk screamsheets, fantasy broadsheets, station newsfeeds, with rumours, classifieds, propaganda, and GM-only hooks.",
    icon: "icon-[lucide--newspaper]",
    category: "adventures",
    generatorId: "news-sheet",
  },

  // Encounters & Complications
  {
    slug: "encounter",
    label: "Encounter Generator",
    summary:
      "Generate a playable combat, social, exploration, environmental, or mixed encounter with participants, environment, a complication, and outcomes.",
    icon: "icon-[lucide--swords]",
    category: "complications",
    generatorId: "encounter",
  },
  {
    slug: "puzzle",
    label: "Puzzle Generator",
    summary:
      "Create encounter puzzles with layered clues, multiple approaches, and consequences that keep the adventure moving.",
    icon: "icon-[lucide--puzzle]",
    category: "complications",
    generatorId: "puzzle",
  },
  {
    slug: "plot-twist-generator",
    label: "Plot Twist & Complication Generator",
    summary:
      "Turn an established situation into a coherent twist with fair foreshadowing, consequences, and new player choices.",
    icon: "icon-[lucide--shuffle]",
    category: "complications",
    generatorId: "plot-twist",
  },
  {
    slug: "villain-scheme-generator",
    label: "Villain Scheme Generator",
    summary:
      "Generate a superhero villain scheme: objective, motivation, resources, escalating discoverable stages, complications, and consequences if nobody intervenes.",
    icon: "icon-[lucide--target]",
    category: "complications",
  },
  {
    slug: "comic-book-event-generator",
    label: "Comic Book Event Generator",
    summary:
      "Generate a campaign-scale superhero event, such as an alien invasion or hero civil war, with a staged escalation and concrete, lasting consequences.",
    icon: "icon-[lucide--zap]",
    category: "complications",
  },

  // Items & Lore
  {
    slug: "magic-item",
    label: "Magic Item Generator",
    summary:
      "Generate items with rarity, properties, history, and GM-facing lore.",
    icon: "icon-[lucide--sparkles]",
    category: "items",
    generatorId: "magic-item",
  },
  {
    slug: "minor-magic-item",
    label: "Minor Magic Item & Trinket Generator",
    summary:
      "Create low-impact, consumable charms, potions, talismans, and disposable tools with quirks and limited charges.",
    icon: "icon-[lucide--sparkles]",
    category: "items",
    generatorId: "minor-magic-item",
  },
  {
    slug: "artifact-generator",
    label: "Artifact & Relic Generator",
    summary:
      "Generate unique, named major artifacts and ancient relics with multi-tier powers, curses, pursuing factions, and destruction conditions.",
    icon: "icon-[lucide--gem]",
    category: "items",
    generatorId: "artifact",
  },
  {
    slug: "item",
    label: "RPG Item & Loot Generator",
    summary:
      "Design loot, weapons, and gear with customisable rarity, properties, and a backstory.",
    icon: "icon-[lucide--backpack]",
    category: "items",
  },
  {
    slug: "tome",
    label: "Tome & Forbidden Book Generator",
    summary:
      "Generate grimoires, occult field logs, and heretical treatises with binding details, readable excerpts, research hazards, and hooks.",
    icon: "icon-[lucide--book-marked]",
    category: "items",
    generatorId: "tome",
  },
];

export const generatorPath = (slug: string): string => `/generators/${slug}`;

export type GeneratorCategoryGroup = {
  id: GeneratorCategoryId;
  label: string;
  description: string;
  items: GeneratorCatalogueEntry[];
};

/** Catalogue entries grouped by category, in category order. */
export function groupGeneratorCatalogue(
  catalogue: readonly GeneratorCatalogueEntry[] = GENERATOR_CATALOGUE,
): GeneratorCategoryGroup[] {
  return GENERATOR_CATEGORIES.map((category) => ({
    ...category,
    items: catalogue.filter((entry) => entry.category === category.id),
  })).filter((group) => group.items.length > 0);
}

type RelatedLink = { href: string; label: string };

/**
 * A generator page's related links: its hand-picked links first, then
 * same-category siblings from the catalogue so no page is a dead end.
 */
export function withCategoryRelatedLinks(
  slug: string,
  explicit: readonly RelatedLink[] = [],
  maxSiblings = 4,
): RelatedLink[] {
  const ownPath = generatorPath(slug);
  const self = GENERATOR_CATALOGUE.find((entry) => entry.slug === slug);
  const links = explicit.filter((link) => link.href !== ownPath);
  if (!self) return links;

  const seen = new Set(links.map((link) => link.href));
  seen.add(ownPath);
  let added = 0;
  for (const entry of GENERATOR_CATALOGUE) {
    if (added >= maxSiblings) break;
    if (entry.category !== self.category) continue;
    const href = generatorPath(entry.slug);
    if (seen.has(href)) continue;
    seen.add(href);
    links.push({ href, label: entry.label });
    added++;
  }
  return links;
}
