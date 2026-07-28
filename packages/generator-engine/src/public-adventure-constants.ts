/**
 * Constants, configuration, and derived lookup tables for the Adventure Idea Generator.
 *
 * Per-genre content lives in `adventure/genres/<genre>.ts`, one file per theme.
 * This module assembles those into the genre-keyed records the generator reads,
 * and owns the tables that are genre-independent plus the shared genre resolver.
 */

import { ADVENTURE_GENRE_TABLES, byGenre } from "./adventure/genres";

export { ADVENTURE_GENRE_TABLES };
export type { AdventureGenreTables } from "./adventure/genre-types";

/**
 * Resolve a genre-keyed table for a theme label.
 *
 * Theme labels from the UI carry qualifiers the tables don't ("Classic Fantasy"
 * -> "Fantasy"), so try the label, then its unqualified forms, then the Fantasy
 * default. Mirrors the same logic as the dungeon generator's forGenre().
 */
export function forAdventureGenre<T>(
  record: Record<string, T[]>,
  genre: string,
): T[] {
  return (
    record[genre] ??
    record[genre.replace(/^Classic /, "")] ??
    record[genre.replace(/ \/ .*/, "")] ??
    record["Fantasy"] ??
    record["Classic Fantasy"]
  );
}

/** Resolve the whole table set for a theme label, using the same aliasing. */
export function forAdventureGenreTables(genre: string) {
  return (
    ADVENTURE_GENRE_TABLES[genre] ??
    ADVENTURE_GENRE_TABLES[genre.replace(/^Classic /, "")] ??
    ADVENTURE_GENRE_TABLES[genre.replace(/ \/ .*/, "")] ??
    ADVENTURE_GENRE_TABLES["Fantasy"]
  );
}

/** Sorted union of a field across every genre, so the unions can't drift. */
function unionOf(field: "archetypes" | "tones"): string[] {
  const seen = new Set<string>();
  for (const tables of Object.values(ADVENTURE_GENRE_TABLES)) {
    for (const value of tables[field]) seen.add(value);
  }
  return [...seen];
}

export const adventureConfig = {
  /** Union of every archetype across all genres. Genre-specific subsets live in `archetypesByGenre`. */
  archetypes: unionOf("archetypes"),
  /** Union of every tone across all genres. */
  tones: unionOf("tones"),
  scales: [
    "One-Shot (Single Session)",
    "Short Arc (2-3 Sessions)",
    "Campaign Arc (4-6 Sessions)",
  ],
  /** Which archetypes suit each genre. */
  archetypesByGenre: byGenre("archetypes"),
  /** Which tones suit each genre. */
  tonesByGenre: byGenre("tones"),
};

export const ADVENTURE_GENRE_HINTS: Record<string, string> = Object.fromEntries(
  Object.entries(ADVENTURE_GENRE_TABLES).map(([label, t]) => [label, t.hint]),
);

export const ADVENTURE_SAMPLE_TITLES_BY_GENRE = byGenre("sampleTitles");
export const ADVENTURE_INCITING_ACTORS_BY_GENRE = byGenre("incitingActors");
export const ADVENTURE_OBJECTIVE_TYPES_BY_GENRE = byGenre("objectiveTypes");
export const ADVENTURE_LOCATION_TYPES_BY_GENRE = byGenre("locationTypes");
export const ADVENTURE_NPC_ROLES_BY_GENRE = byGenre("npcRoles");
export const ADVENTURE_THREAT_TYPES_BY_GENRE = byGenre("threatTypes");
export const ADVENTURE_DISCOVERY_TYPES_BY_GENRE = byGenre("discoveryTypes");
export const ADVENTURE_COMPLICATION_TYPES_BY_GENRE =
  byGenre("complicationTypes");
export const ADVENTURE_REWARD_TYPES_BY_GENRE = byGenre("rewardTypes");
export const ADVENTURE_OUTCOME_TYPES_BY_GENRE = byGenre("outcomeTypes");
export const ADVENTURE_HOOKS_BY_GENRE = byGenre("hooks");

/**
 * Generic, theme-agnostic NPC motivations — used as seed material for the AI
 * to author specific characters from. Abstract enough to hold up for any genre.
 */
export const NPC_MOTIVATIONS: string[] = [
  "Survival",
  "Revenge",
  "Loyalty",
  "Greed",
  "Fear",
  "Duty",
  "Love",
  "Knowledge",
  "Power",
  "Freedom",
];

/**
 * Generic pressure types that give the adventure a ticking clock.
 * Genre-agnostic so they apply across all themes.
 */
export const PRESSURE_TYPES: string[] = [
  "a closing time window before the threat acts",
  "a rival faction racing for the same objective",
  "a resource running out before the job is done",
  "a coverup already in motion",
  "a chain reaction begun by the inciting event",
  "an authority moving to shut down the situation — and the party — before they finish",
];
