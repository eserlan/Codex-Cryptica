/**
 * The generators the Idea Developer may suggest (#3228, FR-013).
 *
 * A fixed list, so the model can only pick real pages and never invents a
 * link. Only generators that read Session Hub drafts as context belong here,
 * because that is how the user's idea reaches them (FR-014). The adventure
 * generator does not, so it is left out until it does.
 *
 * Keys equal the generator route slugs; a test in `apps/web` checks each slug
 * against the routes that exist.
 */
export interface GeneratorCatalogueEntry {
  key: string;
  slug: string;
  label: string;
  description: string;
}

export const GENERATOR_CATALOGUE: GeneratorCatalogueEntry[] = [
  {
    key: "settlement",
    slug: "settlement",
    label: "Settlement generator",
    description: "Towns, villages and cities with their own tensions.",
  },
  {
    key: "npc",
    slug: "npc",
    label: "NPC generator",
    description: "People with goals, flaws and something to hide.",
  },
  {
    key: "faction",
    slug: "faction",
    label: "Faction generator",
    description: "Groups with opposing goals and ways of getting them.",
  },
  {
    key: "rumour",
    slug: "rumour",
    label: "Rumour generator",
    description: "What people are saying, some of it true.",
  },
  {
    key: "secret-society",
    slug: "secret-society",
    label: "Secret society generator",
    description: "Hidden groups with a purpose and a price for joining.",
  },
  {
    key: "quest",
    slug: "quest",
    label: "Quest generator",
    description: "Hooks the players can act on.",
  },
];

/** Offered when nothing fits, and used to top up a short list. */
export const DEFAULT_GENERATOR_KEYS = ["settlement", "npc", "faction"];

export function getCatalogueEntry(
  key: string,
): GeneratorCatalogueEntry | undefined {
  return GENERATOR_CATALOGUE.find((entry) => entry.key === key);
}
