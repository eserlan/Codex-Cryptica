import {
  personalityConfig,
  businessConfig,
  rumourConfig,
  puzzleConfig,
} from "#lib/services/seo/generator-config.js";
import {
  mapShipGenreToTheme,
  mapWorldGenreToTheme,
  mapStarSystemGenreToTheme,
  mapAlienRaceGenreToTheme,
} from "./generator-theme-maps";

export type SetActiveTheme = (theme: string) => void;

export function createKnownGenreThemeChangeHandler(
  setActiveTheme: SetActiveTheme,
  knownGenres: readonly string[],
): (genre: string) => void {
  return (genre) => {
    if (knownGenres.includes(genre)) {
      setActiveTheme(genre);
    }
  };
}

export function createMappedThemeChangeHandler(
  setActiveTheme: SetActiveTheme,
  mapTheme: (genre: string) => string | null | undefined,
): (genre: string) => void {
  return (genre) => {
    const theme = mapTheme(genre);
    if (theme) {
      setActiveTheme(theme);
    }
  };
}

/** Genre-change callbacks shared by the public page's form bindings. */
export function createPageGenreChangeHandlers(setActiveTheme: SetActiveTheme) {
  return {
    personality: createKnownGenreThemeChangeHandler(
      setActiveTheme,
      personalityConfig.genres,
    ),
    business: createKnownGenreThemeChangeHandler(
      setActiveTheme,
      businessConfig.genres,
    ),
    rumour: createKnownGenreThemeChangeHandler(
      setActiveTheme,
      rumourConfig.genres,
    ),
    puzzle: createKnownGenreThemeChangeHandler(
      setActiveTheme,
      puzzleConfig.genres,
    ),
    ship: createMappedThemeChangeHandler(setActiveTheme, mapShipGenreToTheme),
    world: createMappedThemeChangeHandler(setActiveTheme, mapWorldGenreToTheme),
    starSystem: createMappedThemeChangeHandler(
      setActiveTheme,
      mapStarSystemGenreToTheme,
    ),
    alienRace: createMappedThemeChangeHandler(
      setActiveTheme,
      mapAlienRaceGenreToTheme,
    ),
    creature: createMappedThemeChangeHandler(setActiveTheme, (genre) => genre),
  };
}
