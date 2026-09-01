import type { ParamMatcher } from "@sveltejs/kit";

/**
 * Every generator slug the route serves.
 *
 * Exported so the discovery intent registry's governed-route list is derived
 * from the same source the router uses, rather than a copy that silently stops
 * matching when a generator is added.
 */
export const GENERATOR_SLUGS = [
  "npc",
  "settlement",
  "magic-item",
  "minor-magic-item",
  "artifact-generator",
  "faction",
  "quest",
  "puzzle",
  "item",
  "tavern",
  "social-hub",
  "kingdom",
  "nation",
  "vampire-clan",
  "nomad-clan",
  "dark-fantasy-faction",
  "names",
  "fantasy-names",
  "dnd-npc",
  "pantheon-generator",
  "god-generator",
  "ship-generator",
  "language-generator",
  "news-sheet-generator",
  "dungeon-generator",
  "adventure-generator",
  "adventure-idea-generator",
  "plot-twist-generator",
  "bbeg-generator",
  "world",
  "council-vote",
  "secret-society",
  "star-system",
  "alien-race",
  "creature",
  "encounter",
  "random",
] as const;

const validSlugs = new Set<string>(GENERATOR_SLUGS);

export const match: ParamMatcher = (param) => validSlugs.has(param);
