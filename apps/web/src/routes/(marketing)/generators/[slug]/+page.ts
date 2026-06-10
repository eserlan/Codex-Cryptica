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
      | "dnd-npc",
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
  ];
};
