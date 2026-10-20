import type { StagedProgress, StagedProgressStep } from "./staged-progress";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { Rng } from "./random-utils";

export type TomeStageId = "provenance" | "revelations" | "hooks";

export interface TomeStagedDeps {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
  /** Caller-supplied context placed before every stage. */
  contextPrefix?: string;
  /** Live step list for the page. */
  onProgress?: (steps: StagedProgressStep[]) => void;
  /** Called once when a run finishes or gives up (not on abort). */
  onStats?: (stats: TomeStagedStats) => void;
  now?: () => number;
}

export interface TomeStagedStats {
  outcome: "staged" | "fell-back";
  stoppedAt?: TomeStageId | "assembly";
  aiCalls: number;
  elapsedMs: number;
  repairedStages: TomeStageId[];
  coherenceRepaired: boolean;
  reviewIssues: string[];
  reviewSkipped: boolean;
  remainingIssues: string[];
}

export interface TomeStagedResult {
  output: PublicGeneratorOutput;
  stats: TomeStagedStats;
}

export function tomeStatsLog(stats: TomeStagedStats) {
  return {
    outcome: stats.outcome,
    stoppedAt: stats.stoppedAt,
    aiCalls: stats.aiCalls,
    elapsedMs: stats.elapsedMs,
    repairedStageCount: stats.repairedStages.length,
    coherenceRepaired: stats.coherenceRepaired,
    reviewIssueCount: stats.reviewIssues.length,
    remainingIssueCount: stats.remainingIssues.length,
  };
}

export interface TomeRunState {
  stats: TomeStagedStats;
  progress: StagedProgress<TomeStageId>;
  system: string;
}
