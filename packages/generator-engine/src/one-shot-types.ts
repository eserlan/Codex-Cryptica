/**
 * One-Shot Adventure Builder — structured result (#4099).
 *
 * A run-ready, single-session adventure. Everything the GM needs is named and
 * cross-referenced by id (scenes, NPCs, clues) so one scene can be regenerated
 * without disturbing the rest, and so the time budget can be checked.
 */

export const ONE_SHOT_DURATIONS = [2, 3, 4, 6] as const;
export type OneShotDurationHours = (typeof ONE_SHOT_DURATIONS)[number];

export const ONE_SHOT_EMPHASES = [
  "Investigation / mystery",
  "Exploration",
  "Action",
  "Intrigue",
  "Survival",
] as const;
export type OneShotEmphasis = (typeof ONE_SHOT_EMPHASES)[number];

export const ONE_SHOT_STRUCTURES = [
  "Five-room adventure",
  "Three-act",
  "Node-based investigation",
  "Flexible / open scenario",
] as const;
export type OneShotStructure = (typeof ONE_SHOT_STRUCTURES)[number];

export type OneShotSceneKind = "opening" | "middle" | "climax";

export interface OneShotNpc {
  id: string;
  name: string;
  role: string;
  motivation: string;
  knows: string;
  reaction: string;
  cues: string;
}

export interface OneShotChallenge {
  type: "combat" | "social" | "exploration" | "puzzle" | "hazard";
  description: string;
  /** What happens when the party fails — the adventure keeps moving. */
  failForward: string;
}

export interface OneShotScene {
  id: string;
  title: string;
  kind: OneShotSceneKind;
  essential: boolean;
  minutes: number;
  purpose: string;
  situation: string;
  location: string;
  npcIds: string[];
  approaches: string[];
  clueIds: string[];
  challenge: OneShotChallenge;
  outcomes: string[];
  /** Ids of scenes this one can lead to. */
  next: string[];
  /** How to shorten this scene when time is short. */
  shorten: string;
  /** How to skip this scene without losing an essential clue. Optional scenes only. */
  skip?: string;
}

export interface OneShotClueRoute {
  sceneId: string;
  method: string;
}

export interface OneShotClue {
  id: string;
  text: string;
  essential: boolean;
  routes: OneShotClueRoute[];
}

export interface OneShotEnding {
  id: string;
  title: string;
  condition: string;
  consequence: string;
}

export interface OneShotAdventure {
  version: 1;
  title: string;
  genre: string;
  /** "System-neutral" unless the user named a system. */
  system: string;
  emphasis: string;
  structure: string;
  tone?: string;
  durationMinutes: number;
  partySize: number;
  /** Optional tier or level, only when a system is selected. */
  partyLevel?: string;
  briefing: {
    premise: string;
    hook: string;
    objective: string;
    secret: string;
    stakes: string;
    prep: string;
  };
  opening: {
    situation: string;
    readAloud?: string;
    firstDecision: string;
    involvement: string[];
  };
  scenes: OneShotScene[];
  npcs: OneShotNpc[];
  clues: OneShotClue[];
  endings: OneShotEnding[];
  epilogueHook?: string;
  timeBudget: {
    bufferMinutes: number;
    /** "We're running late" steps, most painless first. */
    runningLate: string[];
  };
}

export interface OneShotGeneratorOptions {
  genre?: string;
  system?: string;
  durationHours?: number;
  partySize?: number;
  partyLevel?: string;
  emphasis?: string;
  structure?: string;
  tone?: string;
  premise?: string;
  boundaries?: string;
  campaignContext?: string;
}

export interface OneShotIssue {
  severity: "error" | "warning";
  message: string;
}

export interface ResolvedOneShot {
  genre: string;
  system: string;
  durationMinutes: number;
  partySize: number;
  partyLevel?: string;
  emphasis: string;
  structure: string;
  tone?: string;
  premise?: string;
  boundaries?: string;
  campaignContext?: string;
}
