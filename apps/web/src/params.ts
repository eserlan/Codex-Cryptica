import { defineParams } from "@sveltejs/kit/params";
import { HUB_THEME_SLUGS } from "./lib/content/hub-themes.ts";

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
  "faction-roster",
  "quest",
  "rumour",
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
  "one-shot-adventure-generator",
  "plot-twist-generator",
  "bbeg-generator",
  "comic-book-event-generator",
  "origin-generator",
  "villain-scheme-generator",
  "world",
  "council-vote",
  "secret-society",
  "star-system",
  "constellation",
  "alien-race",
  "creature",
  "encounter",
  "heist",
  "holiday",
  "personality",
  "tome",
  "point-crawl",
  "business",
  "mystery-investigation",
  "random",
] as const;

export const VALID_HUB_THEMES = new Set<string>(HUB_THEME_SLUGS);

const validSlugs = new Set<string>(GENERATOR_SLUGS);

export const matchGenerator_slug = (param: string) => validSlugs.has(param);
export const matchTheme_hub = (param: string) => VALID_HUB_THEMES.has(param);

export const params = defineParams({
  generator_slug: (param: string): string | undefined =>
    matchGenerator_slug(param) ? param : undefined,
  theme_hub: (param: string): string | undefined =>
    matchTheme_hub(param) ? param : undefined,
});
