import type { DungeonGenreTables } from "../genre-types";
import { fantasyTables } from "./fantasy";
import { darkFantasyTables } from "./dark-fantasy";
import { sciFiTables } from "./sci-fi";
import { cyberpunkTables } from "./cyberpunk";
import { postApocalypticTables } from "./post-apocalyptic";
import { vampireTables } from "./vampire";
import { pirateTables } from "./pirate";
import { westernTables } from "./western";
import { steampunkTables } from "./steampunk";
import { modernConspiracyTables } from "./modern-conspiracy";
import { lancerTables } from "./lancer";
import { spaceOperaResistanceTables } from "./space-opera-resistance";
import { optimisticSciFiTables } from "./optimistic-scifi";
import { cosmicHorrorTables } from "./cosmic-horror";
import { spaceWesternDungeonTables } from "./space-western";

/**
 * Every genre the dungeon generator can produce content for, keyed by the theme
 * label used at runtime.
 *
 * Keys must stay in step with `factionConfig.themes` — the theme selector offers
 * those labels, and any label missing here silently falls back to Fantasy.
 * `dungeon-genre-coverage.test.ts` enforces that.
 */
export const DUNGEON_GENRE_TABLES: Record<string, DungeonGenreTables> = {
  Fantasy: fantasyTables,
  "Dark Fantasy": darkFantasyTables,
  "Sci-Fi / Space Opera": sciFiTables,
  "Cyberpunk / Corporate": cyberpunkTables,
  "Post-Apocalyptic": postApocalypticTables,
  "Vampire / Gothic Noir": vampireTables,
  Pirate: pirateTables,
  "Western / Frontier": westernTables,
  Steampunk: steampunkTables,
  "Modern Conspiracy": modernConspiracyTables,
  Lancer: lancerTables,
  "Space Opera Resistance": spaceOperaResistanceTables,
  "Optimistic Exploration Sci-Fi": optimisticSciFiTables,
  "Space Western": spaceWesternDungeonTables,
  "Cosmic Horror": cosmicHorrorTables,
};

/** Build a genre-keyed lookup table for one field, as the old *_BY_GENRE records. */
export function byGenre<K extends keyof DungeonGenreTables>(
  field: K,
): Record<string, DungeonGenreTables[K]> {
  const out: Record<string, DungeonGenreTables[K]> = {};
  for (const [label, tables] of Object.entries(DUNGEON_GENRE_TABLES)) {
    out[label] = tables[field];
  }
  return out;
}
