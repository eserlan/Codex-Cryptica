/**
 * Shape of one genre's adventure content.
 *
 * Every genre offered by the theme selector needs one of these. Grouping by
 * genre (rather than by table) means adding a theme is a single new file, and
 * makes it obvious at a glance when a genre is missing content.
 */
export interface AdventureGenreTables {
  /** Steering sentence for the AI prompt. */
  hint: string;
  /** Adventure archetypes / types offered for this genre. */
  archetypes: string[];
  /** Tones offered for this genre. */
  tones: string[];
  sampleTitles: string[];
  /** Who or what triggers the initial situation. */
  incitingActors: string[];
  /** What the primary pressure / objective is about. */
  objectiveTypes: string[];
  /** Key locations central to adventures of this genre. */
  locationTypes: string[];
  /** NPC / faction roles that typically appear. */
  npcRoles: string[];
  /** Types of threats / antagonists. */
  threatTypes: string[];
  /** Clues, secrets, or discoveries to uncover. */
  discoveryTypes: string[];
  /** Complication or escalating pressure types. */
  complicationTypes: string[];
  /** What players can gain — rewards and stakes. */
  rewardTypes: string[];
  /** Possible resolution / outcome types. */
  outcomeTypes: string[];
  /** Hooks — why players engage. */
  hooks: string[];
}
