const themeIdToLabelBase: Record<string, string> = {
  fantasy: "Classic Fantasy",
  fantasy_dark: "Classic Fantasy",
  pirate: "Pirate",
  pirate_dark: "Pirate",
  cyberpunk: "Cyberpunk / Corporate",
  cyberpunk_light: "Cyberpunk / Corporate",
  horror: "Vampire / Gothic Noir",
  horror_light: "Vampire / Gothic Noir",
  cosmic_horror: "Cosmic Horror",
  cosmic_horror_light: "Cosmic Horror",
  scifi: "Sci-Fi / Space Opera",
  scifi_light: "Sci-Fi / Space Opera",
  modern: "Modern Conspiracy",
  modern_dark: "Modern Conspiracy",
  apocalyptic: "Post-Apocalyptic",
  apocalyptic_light: "Post-Apocalyptic",
  western: "Western / Frontier",
  western_dark: "Western / Frontier",
  steampunk: "Steampunk",
  steampunk_dark: "Steampunk",
  lancer: "Lancer",
  lancer_light: "Lancer",
  startrek: "Optimistic Exploration Sci-Fi",
  startrek_light: "Optimistic Exploration Sci-Fi",
  "optimistic-exploration-sci-fi": "Optimistic Exploration Sci-Fi",
  "optimistic-exploration-sci-fi_dark": "Optimistic Exploration Sci-Fi",
  "space-western": "Space Western",
  "space-western_light": "Space Western",
  superhero: "Superhero / Comic Book",
  superhero_dark: "Superhero / Comic Book",
  starwars: "Sci-Fi / Space Opera",
  starwars_light: "Sci-Fi / Space Opera",
  "space-opera-resistance": "Sci-Fi / Space Opera",
  "space-opera-resistance_dark": "Sci-Fi / Space Opera",
  fallout: "Post-Apocalyptic",
  fallout_light: "Post-Apocalyptic",
};

/** Resolve theme IDs with optional light/dark suffixes to their genre label. */
export const themeIdToLabel: Record<string, string> = Object.fromEntries(
  Object.entries(themeIdToLabelBase).flatMap(([id, label]) => {
    const base = id.replace(/_(light|dark)$/, "");
    return [base, `${base}_light`, `${base}_dark`].map((key) => [key, label]);
  }),
);
