// Pure lookup tables and functions for reconciling a hub genre/theme (from
// the URL or localStorage) with the per-generator theme/genre state used
// across the SEO generator pages.

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
  "nomad-clan",
  "names",
  "fantasy-names",
  "dnd-npc",
  "pantheon-generator",
  "god-generator",
  "ship-generator",
  "language-generator",
  "news-sheet-generator",
]);

export function shouldSyncGeneratorTheme(s: string) {
  return GENERATOR_SLUGS_WITH_THEME.has(s);
}

export const HUB_THEME_TO_GENERATOR_GENRE: Record<string, string> = {
  fantasy: "Fantasy",
  pirate: "Pirate",
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

export function resolveHubGeneratorGenre(theme: string | null): string | null {
  if (!theme) return null;
  return HUB_THEME_TO_GENERATOR_GENRE[theme] ?? null;
}

export const HUB_LABELS: Record<string, string> = {
  fantasy: "Fantasy Hub",
  pirate: "Pirate Hub",
  cyberpunk: "Cyberpunk Hub",
  "sci-fi": "Sci-Fi Hub",
  "post-apocalyptic": "Post-Apocalyptic Hub",
  modern: "Modern Hub",
  vampire: "Vampire Hub",
  western: "Western Hub",
  steampunk: "Steampunk Hub",
  lancer: "Lancer Hub",
  "optimistic-exploration-sci-fi": "Optimistic Exploration Sci-Fi Hub",
};

export const SOCIAL_HUB_GENRE_TO_THEME: Record<string, string> = {
  Fantasy: "Classic Fantasy",
  "Dark Fantasy": "Vampire / Gothic Noir",
  Pirate: "Pirate",
  Cyberpunk: "Cyberpunk / Corporate",
  "Sci-Fi": "Sci-Fi / Space Opera",
  Modern: "Modern Conspiracy",
  Horror: "Vampire / Gothic Noir",
  "Post-Apocalyptic": "Post-Apocalyptic",
  Western: "Western / Frontier",
  Steampunk: "Steampunk",
  Lancer: "Lancer",
  "Space Opera Resistance": "Space Opera Resistance",
  "Optimistic Exploration Sci-Fi": "Optimistic Exploration Sci-Fi",
};

// Maps hub URL slugs to stored theme IDs (hub slugs differ from theme ids
// in several cases, e.g. "sci-fi" → "scifi", "vampire" → "horror").
export const HUB_SLUG_TO_THEME_ID: Record<string, string> = {
  fantasy: "fantasy",
  pirate: "pirate",
  cyberpunk: "cyberpunk",
  "sci-fi": "scifi",
  "post-apocalyptic": "apocalyptic",
  modern: "modern",
  vampire: "horror",
  western: "western",
  steampunk: "steampunk",
  lancer: "lancer",
  "optimistic-exploration-sci-fi": "startrek",
};

export const SLUGS_USING_STORED_THEME = new Set([
  "npc",
  "faction",
  "quest",
  "settlement",
  "magic-item",
  "item",
  "names",
]);

// Maps a resolved hub genre to the nearest ship-generator genre (the ship
// generator's genre list doesn't line up 1:1 with the hub genre labels).
export function mapHubGenreToShipGenre(hubGenre: string): string {
  if (hubGenre === "Pirate") return "Pirate / Age of Sail";
  if (hubGenre === "Cyberpunk") return "Cyberpunk";
  if (hubGenre === "Post-Apocalyptic") return "Post-Apocalyptic";
  if (hubGenre === "Lancer") return "Lancer";
  if (hubGenre === "Space Opera Resistance") return "Space Opera Resistance";
  if (hubGenre === "Optimistic Exploration Sci-Fi")
    return "Optimistic Exploration Sci-Fi";
  if (hubGenre === "Space Opera") return "Space Opera";
  if (hubGenre === "Fantasy") return "Fantasy";
  if (hubGenre === "Dark Fantasy") return "Dark Fantasy";
  if (hubGenre === "Steampunk") return "Steampunk";
  if (hubGenre === "Western") return "Western (River & Rail)";
  if (hubGenre === "Horror") return "Dark Fantasy";
  return "Sci-Fi";
}
