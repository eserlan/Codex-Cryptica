import { businessConfig } from "generator-engine";

/**
 * When the genre changes, a business type from the old genre's list is reset
 * to the new genre's first type. A custom type (on neither list) is kept.
 */
export function businessTypeAfterGenreChange(
  previousGenre: string,
  nextGenre: string,
  currentType: string,
): string {
  const previous = businessConfig.typesFor(previousGenre);
  const next = businessConfig.typesFor(nextGenre);
  if (previous.includes(currentType) && !next.includes(currentType)) {
    return next[0];
  }
  return currentType;
}
