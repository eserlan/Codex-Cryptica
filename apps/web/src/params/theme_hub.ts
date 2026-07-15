import type { ParamMatcher } from "@sveltejs/kit";

export const VALID_HUB_THEMES = new Set([
  "fantasy",
  "pirate",
  "cyberpunk",
  "sci-fi",
  "post-apocalyptic",
  "modern",
  "vampire",
  "western",
  "steampunk",
  "lancer",
  "space-opera-resistance",
  "optimistic-exploration-sci-fi",
]);

export const match: ParamMatcher = (param) => VALID_HUB_THEMES.has(param);
