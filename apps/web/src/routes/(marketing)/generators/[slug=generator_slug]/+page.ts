import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

const validSlugs = new Set([
  "npc",
  "settlement",
  "magic-item",
  "minor-magic-item",
  "artifact-generator",
  "faction",
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
  "plot-twist-generator",
  "bbeg-generator",
  "world",
  "council-vote",
  "secret-society",
  "star-system",
  "alien-race",
  "creature",
  "encounter",
  "heist",
]);

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
      | "world"
      | "council-vote"
      | "secret-society"
      | "star-system"
      | "alien-race"
      | "creature"
      | "encounter"
      | "heist",
  };
};

export const entries: EntryGenerator = () => {
  return [
    { slug: "npc" },
    { slug: "settlement" },
    { slug: "magic-item" },
    { slug: "minor-magic-item" },
    { slug: "artifact-generator" },
    { slug: "faction" },
    { slug: "quest" },
    { slug: "rumour" },
    { slug: "puzzle" },
    { slug: "item" },
    { slug: "tavern" },
    { slug: "social-hub" },
    { slug: "kingdom" },
    { slug: "nation" },
    { slug: "vampire-clan" },
    { slug: "nomad-clan" },
    { slug: "dark-fantasy-faction" },
    { slug: "names" },
    { slug: "fantasy-names" },
    { slug: "dnd-npc" },
    { slug: "pantheon-generator" },
    { slug: "god-generator" },
    { slug: "ship-generator" },
    { slug: "language-generator" },
    { slug: "news-sheet-generator" },
    { slug: "dungeon-generator" },
    { slug: "adventure-generator" },
    { slug: "adventure-idea-generator" },
    { slug: "plot-twist-generator" },
    { slug: "bbeg-generator" },
    { slug: "world" },
    { slug: "council-vote" },
    { slug: "secret-society" },
    { slug: "star-system" },
    { slug: "alien-race" },
    { slug: "creature" },
    { slug: "encounter" },
    { slug: "heist" },
  ];
};
