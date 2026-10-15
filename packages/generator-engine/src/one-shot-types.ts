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
  /** Why they are doing this. Required for the antagonist. */
  backstory?: string;
  /** How they act or fight when opposed. Required for the antagonist. */
  tactics?: string;
  /** What would persuade them to stop. Required for the antagonist. */
  stopIf?: string;
  /** What they cannot or will not do; later scenes must respect it. */
  limits?: string;
}

export interface OneShotChallenge {
  type: "combat" | "social" | "exploration" | "puzzle" | "hazard";
  description: string;
  /** What the party must actually do or say to succeed, answer included. */
  success?: string;
  /** How force, deception, magic or an unexpected plan plays out. */
  otherApproaches?: string[];
  /** Fights and hazards: who or what opposes, their tactics, what changes mid-scene. */
  opposition?: string;
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
  /** Short name used in the clue list and cheat sheet. */
  label?: string;
  /** The actual fact the party learns. */
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

export interface OneShotQuestion {
  question: string;
  answer: string;
}

export interface OneShotClock {
  name: string;
  /** What moves the clock on. */
  advances: string;
  /** In order: what each step triggers. */
  ticks: { trigger: string; effect: string }[];
  /** How the party can slow or stop it. */
  slow: string;
  /** What happens when the last tick lands: the only point of no return. */
  deadline?: string;
}

/** A promise the adventure makes (a person in danger, a rule, a history) and where it pays off. */
export interface OneShotThread {
  setup: string;
  payoff: string;
  sceneIds: string[];
}

/** Something the finale needs, with its real content and where to find it. */
export interface OneShotRequirement {
  what: string;
  /** The actual names, words or objects, not a reference to them. */
  detail: string;
  sceneIds: string[];
}

/** How the finale is actually resolved, so the GM can adjudicate it. */
export interface OneShotSolution {
  summary: string;
  requirements: OneShotRequirement[];
  steps: string[];
  alternatives: string[];
  /** What each kind of mistake costs. */
  mistakes: string[];
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
    /** The concrete event that set this off now. */
    trigger?: string;
    stakes: string;
    prep: string;
    /** The obvious questions players will ask, answered. */
    questions?: OneShotQuestion[];
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
  /** Id of the NPC driving the threat. */
  antagonistId?: string;
  threads?: OneShotThread[];
  solution?: OneShotSolution;
  clock?: OneShotClock;
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

/** Something a GM would have to invent at the table to run the adventure. */
export interface OneShotGap {
  area: "briefing" | "solution" | "clock" | "scene" | "npc" | "clue";
  id?: string;
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
