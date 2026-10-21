import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { Rng } from "./random-utils";
import type { StagedProgress, StagedProgressStep } from "./staged-progress";
import type { JsonObject } from "./staged-runtime";
import type { VillainAxes } from "./villain-diversity";

export type VillainStageId =
  "concept" | "organisation" | "plan" | "ending" | "coherence";

export interface VillainStagedDeps {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
  /** Caller-supplied context placed before every stage. */
  contextPrefix?: string;
  /** Existing titles and banned names the villain and its allies must not reuse. */
  avoidNames?: string[];
  /** Recent-inputs note for this session, placed before every stage. */
  sessionContext?: string;
  /** Conflict domains recent villains used, most recent first. */
  recentDomains?: readonly string[];
  /** Live step list for the page. */
  onProgress?: (steps: StagedProgressStep[]) => void;
  /** Called once when a run finishes or gives up (not on abort). */
  onStats?: (stats: VillainStagedStats) => void;
  now?: () => number;
}

export interface VillainStagedStats {
  outcome: "staged" | "fell-back";
  stoppedAt?: VillainStageId | "assembly";
  /** The kinds of rule the stopping stage's last attempt broke, never the text. */
  stoppedProblems?: string[];
  aiCalls: number;
  elapsedMs: number;
  repairedStages: VillainStageId[];
  coherenceRepaired: boolean;
  reviewIssues: string[];
  reviewSkipped: boolean;
  remainingIssues: string[];
}

export interface VillainStagedResult {
  output: PublicGeneratorOutput;
  stats: VillainStagedStats;
}

/** Counts only: generated text never goes to a log. */
export function villainStatsLog(stats: VillainStagedStats) {
  return {
    outcome: stats.outcome,
    stoppedAt: stats.stoppedAt,
    stoppedProblems: stats.stoppedProblems,
    aiCalls: stats.aiCalls,
    elapsedMs: stats.elapsedMs,
    repairedStageCount: stats.repairedStages.length,
    coherenceRepaired: stats.coherenceRepaired,
    reviewIssueCount: stats.reviewIssues.length,
    remainingIssueCount: stats.remainingIssues.length,
  };
}

export interface VillainRunState {
  stats: VillainStagedStats;
  progress: StagedProgress<VillainStageId>;
  system: string;
}

/** The validated output of each stage, keyed by the stage that wrote it. */
export interface VillainDrafts {
  concept: JsonObject;
  organisation: JsonObject;
  plan: JsonObject;
  ending: JsonObject;
}

export interface VillainPlan {
  axes: VillainAxes;
  /** Names the model must not use as the villain's or an ally's name. */
  avoid: string[];
}
