import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

const validSlugs = new Set([
  "npc",
  "settlement",
  "magic-item",
  "faction",
  "quest",
  "item",
  "tavern",
  "social-hub",
  "kingdom",
  "nation",
  "vampire-clan",
  "names",
  "fantasy-names",
  "dnd-npc",
  "pantheon-generator",
  "god-generator",
  "cyberpunk-megacorp",
  "fantasy-guild",
  "sci-fi-faction",
  "wasteland-faction",
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
      | "faction"
      | "quest"
      | "item"
      | "tavern"
      | "social-hub"
      | "kingdom"
      | "nation"
      | "vampire-clan"
      | "names"
      | "fantasy-names"
      | "dnd-npc"
      | "pantheon-generator"
      | "god-generator"
      | "cyberpunk-megacorp"
      | "fantasy-guild"
      | "sci-fi-faction"
      | "wasteland-faction",
  };
};

export const entries: EntryGenerator = () => {
  return [
    { slug: "npc" },
    { slug: "settlement" },
    { slug: "magic-item" },
    { slug: "faction" },
    { slug: "quest" },
    { slug: "item" },
    { slug: "tavern" },
    { slug: "social-hub" },
    { slug: "kingdom" },
    { slug: "nation" },
    { slug: "vampire-clan" },
    { slug: "names" },
    { slug: "fantasy-names" },
    { slug: "dnd-npc" },
    { slug: "pantheon-generator" },
    { slug: "god-generator" },
    { slug: "cyberpunk-megacorp" },
    { slug: "fantasy-guild" },
    { slug: "sci-fi-faction" },
    { slug: "wasteland-faction" },
  ];
};
