// Pure derivations of a generator page's analytics/theming identity from its
// props (`theme`, `canonicalPath`, `eyebrow`). Kept separate from
// SEOGeneratorLayout.svelte so these lookups can be unit tested without a
// component harness.
import { themeIdToLabel } from "generator-engine";

export const THEME_TO_WORLD_ID: Record<string, string> = {
  "Classic Fantasy": "fantasy",
  Pirate: "pirate",
  "Cyberpunk / Corporate": "cyberpunk",
  "Vampire / Gothic Noir": "horror",
  "Cosmic Horror": "cosmic_horror",
  "Sci-Fi / Space Opera": "scifi",
  "Star Wars": "starwars",
  "Modern Conspiracy": "modern",
  "Post-Apocalyptic": "apocalyptic",
  "Western / Frontier": "western",
  Steampunk: "steampunk",
  Lancer: "lancer",
  "Optimistic Exploration Sci-Fi": "startrek",
};

export function resolveWorldThemeId(theme: string): string {
  return THEME_TO_WORLD_ID[theme] || "workspace";
}

/**
 * Share snapshots historically stored the display label, while the theme
 * registry uses IDs. Accept both forms so old and new snapshots restore the
 * same generator theme without accepting arbitrary public metadata.
 */
export function resolveGeneratorShareTheme(
  theme: string | undefined,
): string | undefined {
  if (!theme) return undefined;
  return (
    themeIdToLabel[theme] ??
    (Object.values(themeIdToLabel).includes(theme) ? theme : undefined)
  );
}

// Stable per-page generator identifier for analytics (#1796) — derived from
// the page's own canonical path (or the eyebrow label as a fallback) so it's
// available immediately, before any generation happens, unlike
// generatedData.type which only exists after a successful generate() call.
export function resolveGeneratorType(
  canonicalPath: string | undefined,
  eyebrow: string,
): string {
  if (canonicalPath) {
    const segments = canonicalPath.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return last;
  }
  const slug = eyebrow
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "unknown";
}

export function resolveGeneratedNoun(eyebrow: string): string {
  const lower = eyebrow.toLowerCase();
  if (lower.includes("name")) return "fantasy names";
  if (lower.includes("rpg npc")) return "RPG NPCs";
  if (lower.includes("npc")) return "D&D NPCs";
  if (lower.includes("faction")) return "RPG factions";
  if (lower.includes("quest")) return "quest hooks";
  if (lower.includes("settlement")) return "settlements";
  if (lower.includes("item")) return "magic items";
  if (lower.includes("pantheon")) return "pantheons";
  if (lower.includes("deity") || lower.includes("god")) return "deities";
  return "RPG elements";
}

export function resolveGeneratedSingular(eyebrow: string): string {
  return eyebrow.replace(/\s*Generator\s*/i, "").trim() || "Draft";
}
