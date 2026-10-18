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
