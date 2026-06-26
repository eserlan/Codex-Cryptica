// Inlined from [slug=generator_slug]/generator-theme.ts
export const GENERATOR_SLUGS_WITH_THEME = new Set([
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
  "ship-generator",
]);

export const HUB_THEME_TO_GENERATOR_GENRE: Record<string, string> = {
  fantasy: "Fantasy",
  cyberpunk: "Cyberpunk",
  "sci-fi": "Sci-Fi",
  "post-apocalyptic": "Post-Apocalyptic",
  modern: "Modern",
  vampire: "Horror",
  western: "Western",
  steampunk: "Steampunk",
  lancer: "Lancer",
  "optimistic-exploration-sci-fi": "Optimistic Exploration Sci-Fi",
};

// Genres not supported by the settlement generator are mapped to the nearest equivalent.
export const SETTLEMENT_GENRE_FOR_HUB: Record<string, string> = {
  Lancer: "Sci-Fi",
};

export function shouldSyncGeneratorTheme(s: string) {
  return GENERATOR_SLUGS_WITH_THEME.has(s);
}

export function resolveHubGeneratorGenre(theme: string | null): string | null {
  if (!theme) return null;
  return HUB_THEME_TO_GENERATOR_GENRE[theme] ?? null;
}

export type ValidSlug =
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
  | "ship-generator";
