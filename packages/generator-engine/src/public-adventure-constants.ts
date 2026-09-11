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
  "Countdown / Deadline (A known event will occur at a specific time unless the party acts: execution, ritual, invasion, gate closure, auction, eclipse)",
  "Rival Race (Another actor is pursuing the same or a conflicting objective and progresses independently)",
  "Dwindling Resource (Something finite is being consumed: food, air, medicine, money, political capital, ammunition, magical stability)",
  "Active Pursuit / Hunt (The party, objective, or ally is being actively tracked, searched for, or hunted)",
  "Cover-Up / Evidence Decay (Evidence, witnesses, records, or traces are being destroyed, altered, silenced, or disappearing)",
  "Escalating Crisis (The situation worsens through stages regardless of party action: flooding, plague, riot, magical corruption, structural collapse)",
  "Institutional Crackdown (An organisation progressively restricts movement, rights, access, or options: curfew, martial law, quarantine, audit, purge, lockdown)",
  "Fragile Relationship (Trust, legitimacy, alliances, negotiations, or public support can deteriorate through mishandling)",
  "Opportunity Window (A favourable condition exists only temporarily: low tide, festival crowds, guard rotation, diplomatic immunity, rare celestial event)",
  "Accumulating Consequences (No immediate deadline, but unattended problems create worsening political, social, or environmental world consequences over time)",
];
