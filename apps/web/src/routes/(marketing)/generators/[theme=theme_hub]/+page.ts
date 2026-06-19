import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";
import { VALID_HUB_THEMES } from "../../../../params/theme_hub";

export const prerender = true;

export type ThemeSlug =
  | "fantasy"
  | "cyberpunk"
  | "sci-fi"
  | "post-apocalyptic"
  | "modern"
  | "vampire"
  | "western"
  | "steampunk"
  | "lancer";
export const load: PageLoad = ({ params }) => {
  if (!VALID_HUB_THEMES.has(params.theme)) {
    throw error(404, "Theme not found");
  }
  return { theme: params.theme as ThemeSlug };
};

export const entries: EntryGenerator = () => [
  { theme: "fantasy" },
  { theme: "cyberpunk" },
  { theme: "sci-fi" },
  { theme: "post-apocalyptic" },
  { theme: "modern" },
  { theme: "vampire" },
  { theme: "western" },
  { theme: "steampunk" },
  { theme: "lancer" },
];
