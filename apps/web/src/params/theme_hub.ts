import type { ParamMatcher } from "@sveltejs/kit";

const validThemes = new Set([
  "fantasy",
  "cyberpunk",
  "sci-fi",
  "post-apocalyptic",
  "modern",
  "vampire",
]);

export const match: ParamMatcher = (param) => validThemes.has(param);
