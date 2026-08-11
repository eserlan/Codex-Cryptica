/**
 * The theme hubs served at /generators/[theme].
 *
 * Single source of truth for which hubs exist and what they are called, so the
 * route matcher, the hub page and anything linking to a hub (such as the
 * /for/[slug] landing pages) cannot drift apart.
 */
export const HUB_THEME_LABELS = {
  fantasy: "Fantasy",
  pirate: "Pirate",
  cyberpunk: "Cyberpunk",
  "sci-fi": "Sci-Fi",
  "post-apocalyptic": "Post-Apocalyptic",
  modern: "Modern",
  vampire: "Vampire",
  "cosmic-horror": "Cosmic Horror",
  western: "Western",
  steampunk: "Steampunk",
  lancer: "Lancer",
  "space-opera-resistance": "Space Opera Resistance",
  "optimistic-exploration-sci-fi": "Optimistic Exploration Sci-Fi",
} as const;

export type HubThemeSlug = keyof typeof HUB_THEME_LABELS;

export const HUB_THEME_SLUGS = Object.keys(HUB_THEME_LABELS) as HubThemeSlug[];

export const isHubThemeSlug = (value: string): value is HubThemeSlug =>
  Object.prototype.hasOwnProperty.call(HUB_THEME_LABELS, value);

export const hubThemeLabel = (slug: HubThemeSlug): string =>
  HUB_THEME_LABELS[slug];
