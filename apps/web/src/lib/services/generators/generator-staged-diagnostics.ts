import type { DungeonStagedStats } from "generator-engine";

/** Log counts only: generated campaign issue text must stay out of diagnostics. */
export function logDungeonStagedStats(stats: DungeonStagedStats): void {
  if (import.meta.env.DEV) {
    console.debug("[Generator] staged dungeon run", {
      outcome: stats.outcome,
      stoppedAt: stats.stoppedAt,
      aiCalls: stats.aiCalls,
      repairedStageCount: stats.repairedStages.length,
      reviewIssueCount: stats.reviewIssues.length,
      reviewSkipped: stats.reviewSkipped,
      coherenceRepaired: stats.coherenceRepaired,
      remainingIssueCount: stats.remainingIssues.length,
    });
  }
}
