import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";
import { VALID_HUB_THEMES } from "../../../../../params/theme_hub";

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
  "nomad-clan",
  "names",
  "fantasy-names",
  "dnd-npc",
  "pantheon-generator",
  "god-generator",
  "ship-generator",
  "language-generator",
  "screamsheet-generator",
]);

export const load: PageLoad = ({ params }) => {
  if (!VALID_HUB_THEMES.has(params.theme)) {
    throw error(404, "Theme not found");
  }
  if (!validSlugs.has(params.slug)) {
    throw error(404, "Generator not found");
  }
  return {
    theme: params.theme,
    slug: params.slug,
  };
};

export const entries: EntryGenerator = () => {
  const themes = Array.from(VALID_HUB_THEMES);
  const slugs = Array.from(validSlugs);
  return themes.flatMap((theme) => slugs.map((slug) => ({ theme, slug })));
};
