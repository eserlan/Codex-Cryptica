import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export type ThemeSlug =
  | "fantasy"
  | "cyberpunk"
  | "sci-fi"
  | "post-apocalyptic"
  | "modern"
  | "vampire";

const validThemes = new Set<ThemeSlug>([
  "fantasy",
  "cyberpunk",
  "sci-fi",
  "post-apocalyptic",
  "modern",
  "vampire",
]);

export const load: PageLoad = ({ params }) => {
  if (!validThemes.has(params.theme as ThemeSlug)) {
    error(404, "Theme not found");
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
];
