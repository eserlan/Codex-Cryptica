import type { StagedProgress, StagedProgressStep } from "./staged-progress";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { Rng } from "./random-utils";
import type { ConceptSeed } from "./concept-seed";

export type HeistStageId = "objective" | "security" | "response" | "coherence";

export interface HeistStagedDeps {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
  /** Caller-supplied context placed before every stage. */
  contextPrefix?: string;
  /** An optional concept seed rolled before writing, anchoring premise and stake. */
  seed?: ConceptSeed | null;
  /** Live step list for the page. */
  onProgress?: (steps: StagedProgressStep[]) => void;
  /** Called once when a run finishes or gives up (not on abort). */
  onStats?: (stats: HeistStagedStats) => void;
  now?: () => number;
}

export interface HeistStagedStats {
  outcome: "staged" | "fell-back";
  stoppedAt?: HeistStageId | "assembly";
  aiCalls: number;
  elapsedMs: number;
  repairedStages: HeistStageId[];
  coherenceRepaired: boolean;
  reviewIssues: string[];
  reviewSkipped: boolean;
  remainingIssues: string[];
}

export interface HeistStagedResult {
  output: PublicGeneratorOutput;
  stats: HeistStagedStats;
}

export function heistStatsLog(stats: HeistStagedStats) {
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

export interface HeistRunState {
  stats: HeistStagedStats;
  progress: StagedProgress<HeistStageId>;
  system: string;
}
