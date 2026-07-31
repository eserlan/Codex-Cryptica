export function mapThemeToGenre(themeId: string): string {
  const rawId = (themeId || "").toLowerCase();
  if (
    [
      "scifi",
      "starwars",
      "startrek",
      "lancer",
      "space-opera-resistance",
    ].includes(rawId)
  ) {
    return "scifi";
  }
  if (["cyberpunk", "modern"].includes(rawId)) return "cyberpunk";
  if (["apocalyptic", "fallout"].includes(rawId)) return "apocalyptic";
  if (["horror"].includes(rawId)) return "horror";
  if (["steampunk", "western"].includes(rawId)) return "steampunk";
  return "fantasy";
}
