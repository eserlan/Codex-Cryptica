/** Contracts shared by the dungeon stages and their runner. */
import type { DungeonJson } from "./public-dungeon";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { Rng } from "./random-utils";
import type { DraftCheck } from "./staged-runtime";
import type { StagedProgress, StagedProgressStep } from "./staged-progress";

export type DungeonStageId = "foundation" | "sectors" | "factions";

export interface DungeonStagedDeps {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
  /** Caller-supplied context (vault, naming, instructions) placed before every stage. */
  contextPrefix?: string;
  /** Live step list for the page, in the same shape as the one-shot generator's. */
  onProgress?: (steps: StagedProgressStep[]) => void;
  /**
   * Called once when a run finishes or gives up (not on abort), so a dev build
   * can log which route ran and what it cost.
   */
  onStats?: (stats: DungeonStagedStats) => void;
}

/** What a run cost and where it needed help, for comparing against the one-pass route. */
export interface DungeonStagedStats {
  /** "fell-back" means the caller ran the one-pass route instead. */
  outcome: "staged" | "fell-back";
  /** The step that gave up, when `outcome` is "fell-back". */
  stoppedAt?: DungeonStageId | "assembly";
  aiCalls: number;
  repairedStages: DungeonStageId[];
  /** What the model review found in the assembled delve, before any repair. */
  reviewIssues: string[];
  /** The model review did not answer or could not be read. */
  reviewSkipped: boolean;
  coherenceRepaired: boolean;
  /** Problems the final document still has after every repair. */
  remainingIssues: string[];
}

export interface DungeonStagedResult {
  output: PublicGeneratorOutput;
  structured: DungeonJson;
  stats: DungeonStagedStats;
}

export type StageCheck = DraftCheck;

export type Inventory = Pick<
  DungeonJson,
  | "title"
  | "history"
  | "currentState"
  | "signatureFeature"
  | "secret"
  | "hazards"
  | "treasures"
  | "sectors"
>;
export interface FactionLike {
  name: string;
  goal: string;
  obstacle: string;
  relationship: string;
  strength: string;
  origin: string;
  belief: string;
  territorySectorIds: string[];
  /** What it has done to the sectors it holds, if written. */
  presence?: string[];
}

export type ProgressId = DungeonStageId | "coherence";

export interface RunState {
  stats: DungeonStagedStats;
  progress: StagedProgress<ProgressId>;
}
