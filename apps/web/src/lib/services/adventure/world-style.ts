import { THEMES } from "schema";
import type { AdventureWorldStyle } from "@codex/adventure-engine";

// Keep the semantic generator labels independent of display names in THEMES.
// This small mapping avoids importing the generator registry on the app entry path.
const THEME_GENRE_LABELS: Record<string, string> = {
  fantasy: "Classic Fantasy",
  pirate: "Pirate",
  cyberpunk: "Cyberpunk / Corporate",
  horror: "Vampire / Gothic Noir",
  cosmic_horror: "Cosmic Horror",
  scifi: "Sci-Fi / Space Opera",
  modern: "Modern Conspiracy",
  apocalyptic: "Post-Apocalyptic",
  western: "Western / Frontier",
  steampunk: "Steampunk",
  lancer: "Lancer",
  startrek: "Optimistic Exploration Sci-Fi",
  "optimistic-exploration-sci-fi": "Optimistic Exploration Sci-Fi",
  "space-western": "Space Western",
  superhero: "Superhero / Comic Book",
  starwars: "Sci-Fi / Space Opera",
  "space-opera-resistance": "Sci-Fi / Space Opera",
  fallout: "Post-Apocalyptic",
};

/**
 * The Vault's world theme as a genre hint for the GM. The neutral workspace
 * theme and unknown ids carry no genre, so they return undefined.
 */
export function worldStyleForTheme(
  themeId: string | null | undefined,
): AdventureWorldStyle | undefined {
  if (!themeId) return undefined;
  const id = themeId.replace(/_(light|dark)$/, "");
  if (id === "workspace" || !Object.hasOwn(THEMES, id)) return undefined;
  const theme = THEMES[id as keyof typeof THEMES];
  if (!theme.name || !theme.description) return undefined;
  return { name: theme.name, description: theme.description };
}

/** Generator genre label for the Vault's theme, or undefined when neutral. */
export function genreForTheme(
  themeId: string | null | undefined,
): string | undefined {
  if (!themeId) return undefined;
  const id = themeId.replace(/_(light|dark)$/, "");
  if (id === "workspace" || !Object.hasOwn(THEMES, id)) {
    return undefined;
  }
  return THEME_GENRE_LABELS[id];
}
