import type { ParamMatcher } from "@sveltejs/kit";

export const VALID_HUB_THEMES = new Set([
  "fantasy",
  "cyberpunk",
  "sci-fi",
  "post-apocalyptic",
  "modern",
  "vampire",
]);

export const match: ParamMatcher = (param) => VALID_HUB_THEMES.has(param);
