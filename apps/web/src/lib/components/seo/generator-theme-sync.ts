type ThemeState = {
  theme?: string;
  genre?: string;
};

export interface GeneratorThemeSyncContext {
  slug: string;
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
  npc: ThemeState;
  faction: ThemeState;
  factionRoster: ThemeState;
  quest: ThemeState;
  personality: ThemeState;
  rumour: ThemeState;
  puzzle: ThemeState;
  encounter: ThemeState;
  councilVote: ThemeState;
  heist: ThemeState;
  holiday: ThemeState;
  secretSociety: ThemeState;
  socialHub: ThemeState;
  nation: ThemeState;
  pantheon: ThemeState;
  language: ThemeState;
  newsSheet: ThemeState;
  world: ThemeState;
  starSystem: ThemeState;
  constellation: ThemeState;
  alienRace: ThemeState;
  dungeon: ThemeState;
  adventure: ThemeState;
  plotTwist: ThemeState;
  villain: ThemeState;
  minorMagicItem: ThemeState;
  artifact: ThemeState;
  creature: ThemeState;
  themeToQuestGenre: Record<string, string | undefined>;
  mapSocialHubGenre: (genre: string) => string;
  mapWorldGenre: (genre: string) => string;
  mapStarSystemGenre: (genre: string) => string;
  mapAlienRaceGenre: (genre: string) => string;
}

/** Keep the visible theme and the active generator form in sync. */
export function syncGeneratorTheme({
  slug,
  activeTheme,
  setActiveTheme,
  npc,
  faction,
  factionRoster,
  quest,
  personality,
  rumour,
  puzzle,
  encounter,
  councilVote,
  heist,
  holiday,
  secretSociety,
  socialHub,
  nation,
  pantheon,
  language,
  newsSheet,
  world,
  starSystem,
  constellation,
  alienRace,
  dungeon,
  adventure,
  plotTwist,
  villain,
  minorMagicItem,
  artifact,
  creature,
  themeToQuestGenre,
  mapSocialHubGenre,
  mapWorldGenre,
  mapStarSystemGenre,
  mapAlienRaceGenre,
}: GeneratorThemeSyncContext): void {
  if (slug === "npc") npc.theme = activeTheme;
  else if (slug === "faction") faction.theme = activeTheme;
  else if (slug === "faction-roster") factionRoster.theme = activeTheme;
  else if (slug === "quest")
    quest.genre = themeToQuestGenre[activeTheme] ?? "Classic Fantasy";
  else if (slug === "rumour") rumour.genre = activeTheme;
  else if (slug === "puzzle") puzzle.genre = activeTheme;
  else if (slug === "encounter") encounter.genre = activeTheme;
  else if (slug === "council-vote") councilVote.genre = activeTheme;
  else if (slug === "heist") heist.genre = activeTheme;
  else if (slug === "holiday") holiday.genre = activeTheme;
  else if (slug === "secret-society") secretSociety.theme = activeTheme;
  else if (slug === "social-hub")
    setActiveTheme(mapSocialHubGenre(socialHub.genre ?? ""));
  else if (slug === "nation")
    setActiveTheme(mapSocialHubGenre(nation.genre ?? ""));
  else if (slug === "pantheon-generator" || slug === "god-generator")
    setActiveTheme(pantheon.genre ?? activeTheme);
  else if (slug === "language-generator")
    setActiveTheme(language.genre ?? activeTheme);
  else if (slug === "news-sheet-generator")
    setActiveTheme(mapSocialHubGenre(newsSheet.genre ?? ""));
  else if (slug === "world") setActiveTheme(mapWorldGenre(world.genre ?? ""));
  else if (slug === "star-system")
    setActiveTheme(mapStarSystemGenre(starSystem.genre ?? ""));
  else if (slug === "constellation") constellation.genre = activeTheme;
  else if (slug === "alien-race")
    setActiveTheme(mapAlienRaceGenre(alienRace.genre ?? ""));
  else if (slug === "dungeon-generator") dungeon.genre = activeTheme;
  else if (
    slug === "adventure-generator" ||
    slug === "adventure-idea-generator"
  )
    adventure.genre = activeTheme;
  else if (slug === "plot-twist-generator") plotTwist.genre = activeTheme;
  else if (slug === "bbeg-generator") villain.genre = activeTheme;
  else if (slug === "minor-magic-item") minorMagicItem.genre = activeTheme;
  else if (slug === "artifact-generator") artifact.genre = activeTheme;
  else if (slug === "creature") creature.genre = activeTheme;
  else if (slug === "personality") personality.genre = activeTheme;
}
