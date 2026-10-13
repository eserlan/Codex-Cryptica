import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";
import { GENERATOR_SLUGS } from "../../../../params/generator_slug";

export const prerender = true;

const validSlugs = new Set<string>(
  GENERATOR_SLUGS.filter((slug) => slug !== "random"),
);

export const load: PageLoad = ({ params }) => {
  if (!validSlugs.has(params.slug)) {
    error(404, "Generator not found");
  }
  return {
    slug: params.slug as
      | "npc"
      | "settlement"
      | "magic-item"
      | "minor-magic-item"
      | "artifact-generator"
      | "faction"
      | "faction-roster"
      | "quest"
      | "rumour"
      | "puzzle"
      | "item"
      | "tavern"
      | "social-hub"
      | "kingdom"
      | "nation"
      | "vampire-clan"
      | "nomad-clan"
      | "dark-fantasy-faction"
      | "names"
      | "fantasy-names"
      | "dnd-npc"
      | "pantheon-generator"
      | "god-generator"
      | "ship-generator"
      | "language-generator"
      | "news-sheet-generator"
      | "dungeon-generator"
      | "adventure-generator"
      | "adventure-idea-generator"
      | "plot-twist-generator"
      | "bbeg-generator"
      | "comic-book-event-generator"
      | "origin-generator"
      | "villain-scheme-generator"
      | "world"
      | "council-vote"
      | "secret-society"
      | "star-system"
      | "constellation"
      | "alien-race"
      | "creature"
      | "encounter"
      | "heist"
      | "holiday"
      | "personality"
      | "tome",
  };
};

export const entries: EntryGenerator = () => {
  return GENERATOR_SLUGS.filter((slug) => slug !== "random").map((slug) => ({
    slug,
  }));
};
