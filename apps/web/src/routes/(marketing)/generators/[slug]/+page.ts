import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

const validSlugs = new Set(["npc", "settlement", "magic-item"]);

export const load: PageLoad = ({ params }) => {
  if (!validSlugs.has(params.slug)) {
    error(404, "Generator not found");
  }
  return {
    slug: params.slug as "npc" | "settlement" | "magic-item",
  };
};

export const entries: EntryGenerator = () => {
  return [{ slug: "npc" }, { slug: "settlement" }, { slug: "magic-item" }];
};
