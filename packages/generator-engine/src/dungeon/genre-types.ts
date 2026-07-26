/**
 * Shape of one genre's dungeon content.
 *
 * Every genre offered by the theme selector needs one of these. Grouping by
 * genre (rather than by table) means adding a theme is a single new file, and
 * makes it obvious at a glance when a genre is missing content — the failure
 * mode this structure replaced was seven themes silently falling back to
 * Fantasy across seventeen separate tables.
 */
export interface DungeonGenreTables {
  /** Steering sentence for the AI prompt. */
  hint: string;
  /** Original purposes offered for this genre, from dungeonConfig.purposes. */
  purposes: string[];
  /** Current states offered for this genre, from dungeonConfig.currentStates. */
  currentStates: string[];
  sampleTitles: string[];
  /** Who raised the delve. Composed with originalUses into the history line. */
  builders: string[];
  /** Fallback "built as X" clause, used only for custom user-entered purposes. */
  originalUses: string[];
  /**
   * Optional per-purpose override of the shared ORIGINAL_USE_BY_PURPOSE text.
   *
   * The shared table keeps history coherent with the selected purpose, but its
   * wording carries a tone that suits most genres and clashes with a few — a
   * hopeful exploration setting shouldn't describe its archive as holding
   * "research that was officially destroyed". Override only the purposes where
   * the shared phrasing actually jars; anything absent falls through.
   */
  originalUsesByPurpose?: Record<string, string[]>;
  entrances: string[];
  compositions: string[];
  /** Fallback condition, used only for custom user-entered current states. */
  conditions: string[];
  causes: string[];
  sectors: Array<{ name: string; description: string }>;
  inhabitants: string[];
  factionNames: string[];
  secrets: string[];
  hazards: string[];
  treasures: string[];
  hooks: string[];
  signatureFeatures: string[];
}
