import type { AdventureGenreTables } from "../genre-types";
import { fantasyAdventureTables } from "./fantasy";
import { darkFantasyAdventureTables } from "./dark-fantasy";
import { sciFiAdventureTables } from "./sci-fi";
import { cyberpunkAdventureTables } from "./cyberpunk";
import { postApocAdventureTables } from "./post-apoc";
import { gothicHorrorAdventureTables } from "./gothic-horror";
import { vampireAdventureTables } from "./vampire";
import { pirateAdventureTables } from "./pirate";
import { westernAdventureTables } from "./western";
import { steampunkAdventureTables } from "./steampunk";
import { modernConspiracyAdventureTables } from "./modern-conspiracy";
import { lancerAdventureTables } from "./lancer";
import { spaceOperaResistanceAdventureTables } from "./space-opera-resistance";
import { optimisticSciFiAdventureTables } from "./optimistic-scifi";
import { cosmicHorrorAdventureTables } from "./cosmic-horror";

/**
 * Every genre the adventure generator can produce content for, keyed by the theme
 * label used at runtime.
 *
 * Keys must stay in step with `factionConfig.themes` - the theme selector offers
 * those labels, and any label missing here silently falls back to Fantasy.
 */
export const ADVENTURE_GENRE_TABLES: Record<string, AdventureGenreTables> = {
  Fantasy: fantasyAdventureTables,
  "Dark Fantasy": darkFantasyAdventureTables,
  "Sci-Fi / Space Opera": sciFiAdventureTables,
  "Cyberpunk / Corporate": cyberpunkAdventureTables,
  "Post-Apocalyptic": postApocAdventureTables,
  "Vampire / Gothic Noir": vampireAdventureTables,
  Pirate: pirateAdventureTables,
  "Western / Frontier": westernAdventureTables,
  Steampunk: steampunkAdventureTables,
  "Modern Conspiracy": modernConspiracyAdventureTables,
  Lancer: lancerAdventureTables,
  "Space Opera Resistance": spaceOperaResistanceAdventureTables,
  "Optimistic Exploration Sci-Fi": optimisticSciFiAdventureTables,
  // Gothic Horror maps to the Vampire/Gothic Noir table for dungeon parity.
  "Gothic Horror": gothicHorrorAdventureTables,
  "Cosmic Horror": cosmicHorrorAdventureTables,
};

/** Build a genre-keyed lookup table for one field, as the *_BY_GENRE records. */
export function byGenre<K extends keyof AdventureGenreTables>(
  field: K,
): Record<string, AdventureGenreTables[K]> {
  const out: Record<string, AdventureGenreTables[K]> = {};
  for (const [label, tables] of Object.entries(ADVENTURE_GENRE_TABLES)) {
    out[label] = tables[field];
  }
  return out;
}
