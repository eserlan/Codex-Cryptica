const FACILITY_THEME_IDS = new Set([
  "scifi",
  "cyberpunk",
  "lancer",
  "startrek",
  "starwars",
  "fallout",
]);

const LAIR_THEME_IDS = new Set(["apocalyptic", "horror"]);

export type DelveTerm = "Delve" | "Facility" | "Lair" | "Hideout";

function baseThemeId(themeId: string | null | undefined): string {
  return (themeId ?? "").replace(/_(?:dark|light)$/, "");
}

export function getDelveTerm(themeId: string | null | undefined): DelveTerm {
  const normalizedThemeId = baseThemeId(themeId);
  if (FACILITY_THEME_IDS.has(normalizedThemeId)) return "Facility";
  if (LAIR_THEME_IDS.has(normalizedThemeId)) return "Lair";
  if (normalizedThemeId === "pirate") return "Hideout";
  return "Delve";
}

export function getDelveCanvasLabel(
  themeId: string | null | undefined,
): string {
  return `${getDelveTerm(themeId)} Canvas`;
}

export function getDelveLocationTypeLabel(
  themeId: string | null | undefined,
): string {
  return `Location (${getDelveTerm(themeId)})`;
}
