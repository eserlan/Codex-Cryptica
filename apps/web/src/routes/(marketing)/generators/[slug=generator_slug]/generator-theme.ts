const GENERATOR_SLUGS = new Set([
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
]);

const HUB_THEME_TO_GENERATOR_GENRE: Record<string, string> = {
  fantasy: "Fantasy",
  cyberpunk: "Cyberpunk",
  "sci-fi": "Sci-Fi",
  "post-apocalyptic": "Post-Apocalyptic",
  modern: "Modern",
  vampire: "Horror",
  western: "Western",
  steampunk: "Steampunk",
};

export function shouldSyncGeneratorTheme(slug: string) {
  return GENERATOR_SLUGS.has(slug);
}

export function resolveHubGeneratorGenre(theme: string | null): string | null {
  if (!theme) return null;
  return HUB_THEME_TO_GENERATOR_GENRE[theme] ?? null;
}
