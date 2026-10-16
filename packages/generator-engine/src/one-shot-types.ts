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

/**
 * Where a person or object is at a scene. "free" through "here" mean they can
 * act or be found; "trapped", "captive" and "missing" mean they cannot until
 * someone frees or finds them.
 */
export const ONE_SHOT_STATES = [
  "free",
  "hiding",
  "hostile",
  "here",
  "trapped",
  "captive",
  "missing",
] as const;
export type OneShotState = (typeof ONE_SHOT_STATES)[number];

export interface OneShotWhereabout {
  /** An NPC id, or the name of an important object (a cart, a relic). */
  who: string;
  kind: "npc" | "object";
  state: OneShotState;
  where?: string;
  /** How they came to be in this state, whenever it changed. */
  how?: string;
}

/** One way out of a scene, with what it costs and what it offers. */
export interface OneShotRoute {
  /** A scene id from "next". */
  to: string;
  risk: string;
  find: string;
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
  /** Where each NPC and important object is as this scene begins. */
  whereabouts?: OneShotWhereabout[];
  /** Where each NPC and important object is as this scene ends. */
  exit?: OneShotWhereabout[];
  /** What each route in "next" risks and finds. */
  routes?: OneShotRoute[];
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
  /** Ids of the theories this clue supports or rules out. */
  supports?: string[];
  contradicts?: string[];
}

/** A competing explanation of what happened. Exactly one is true. */
export interface OneShotTheory {
  id: string;
  name: string;
  summary: string;
  isTrue: boolean;
  /** The explanation the players will reach for first. */
  obvious?: boolean;
}

/** A yes-or-no choice the party makes that decides which ending happens. */
export interface OneShotDecision {
  id: string;
  question: string;
  /** Only asked when these earlier decisions were answered this way. */
  when?: Record<string, boolean>;
}

/** What the party spends of a resource in a scene. */
export interface OneShotSpend {
  sceneId: string;
  what: string;
  amount: number;
}

/** A scarce supply (food, light, warmth) counted in boxes the party can spend. */
export interface OneShotResource {
  id: string;
  name: string;
  /** Boxes the party has when play begins. */
  start: number;
  /** What a single box stands for ("a day's food", "an hour of light"). */
  unit?: string;
  spends: OneShotSpend[];
  /** What happens when the last box is gone. */
  whenEmpty: string;
}

export interface OneShotEnding {
  id: string;
  title: string;
  condition: string;
  consequence: string;
  /** Decision id to the answer that leads here. Empty means any other result. */
  requires?: Record<string, boolean>;
}

export interface OneShotQuestion {
  question: string;
  answer: string;
}

/** When the clock moves whatever the party does. */
export const ONE_SHOT_CLOCK_MOMENTS = [
  "start",
  "scene-end",
  "scene-end-after-opening",
  "finale-start",
  "finale-middle",
  "timed",
] as const;
export type OneShotClockMoment = (typeof ONE_SHOT_CLOCK_MOMENTS)[number];

export interface OneShotClock {
  name: string;
  /** What moves the clock on. Written from `schedule` when there is one. */
  advances: string;
  /**
   * The scheduled advances, in order. "scene-end" means the end of every
   * essential scene before the finale, "timed" a moment in the fiction (each
   * sunset) that cannot be counted.
   */
  schedule?: OneShotClockMoment[];
  /** The tick the clock starts on (1 unless the threat began before play). */
  startsAt?: number;
  /** What else moves it on or complicates things: failures, rests, shortcuts. */
  pushes?: string;
  /** In order: what each step triggers. */
  ticks: { trigger: string; effect: string }[];
  /** How the party can slow or stop it. */
  slow: string;
  /** What happens when the last tick lands: the only point of no return. */
  deadline?: string;
  /** What the fiction counts, if anything ("bell rings"); one per tick. */
  counts?: string;
}

/** A promise the adventure makes (a person in danger, a rule, a history) and where it pays off. */
export const ONE_SHOT_THREAD_KINDS = [
  "rescue",
  "rule",
  "history",
  "promise",
  "protect",
] as const;
export type OneShotThreadKind = (typeof ONE_SHOT_THREAD_KINDS)[number];

export interface OneShotThread {
  /** What the promise is about: an NPC id, or an object's name. */
  about?: string;
  kind?: OneShotThreadKind;
  setup: string;
  payoff: string;
  sceneIds: string[];
}

export const ONE_SHOT_REQUIREMENT_KINDS = [
  "clue",
  "action",
  "outcome",
] as const;
/**
 * "clue": information learned before the finale. "action": something the
 * party does or wins, possibly in the finale. "outcome": a result of the
 * finale, not something to find.
 */
export type OneShotRequirementKind =
  (typeof ONE_SHOT_REQUIREMENT_KINDS)[number];

/** Something the finale needs, with its real content and where to find it. */
export interface OneShotRequirement {
  /** Absent on older adventures; treated as "clue". */
  kind?: OneShotRequirementKind;
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
    /** How an unusual place works (air, light, movement, speech). */
    environment?: string;
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
  /** The yes-or-no choices that decide the ending (2–4). */
  decisions?: OneShotDecision[];
  resources?: OneShotResource[];
  /** Competing explanations, for mysteries. */
  theories?: OneShotTheory[];
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
