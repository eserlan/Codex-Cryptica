import type { AdventureSession } from "@codex/adventure-engine";

/** #5110 TurnProgressKind values that count as observable advancement. */
const MEANINGFUL_PROGRESS_CATEGORIES = new Set([
  "scenario-stage-or-status-change",
  "actionable-discovery",
  "obstacle-advanced-or-resolved",
  "causal-state-change",
  "consequential-player-choice",
  "useful-negative-finding",
]);

/**
 * Bounded #5112 generation roll-up for the GM-only diagnostic summary.
 * Counts and categories only; legacy turns without metadata count as
 * `unknown`, never a guessed classification. Scenario IDs are GM-only.
 */
type GenerationTally = {
  transportCounts: { interaction: number; stateless: number; unknown: number };
  threadModeCounts: {
    new: number;
    continued: number;
    reset: number;
    unknown: number;
  };
  progressCategoryCounts: Record<string, number>;
  directorDeliveryCounts: {
    included: number;
    truncated: number;
    omitted: number;
    retained: number;
    unknown: number;
  };
  actionOutcomeCounts: {
    resolved: number;
    "roll-required": number;
    "credible-blocked": number;
    clarification: number;
    unresolved: number;
    unknown: number;
  };
  actionValidationCounts: {
    accepted: number;
    corrected: number;
    rejected: number;
    unknown: number;
  };
  turnsWithGeneration: number;
  lastResetReason: string | null;
  lastRevisionMismatchCause: string | null;
  resetWithoutReason: boolean;
  lastProgressCategory: string | null;
  recentProgressCategories: string[];
};

function recordReset(
  tally: GenerationTally,
  generation: NonNullable<AdventureSession["turns"][number]["generation"]>,
): void {
  if (generation.threadMode !== "reset") return;
  if (generation.resetReason) tally.lastResetReason = generation.resetReason;
  else tally.resetWithoutReason = true;
  if (generation.revisionMismatchCause) {
    tally.lastRevisionMismatchCause = generation.revisionMismatchCause;
  }
}

function recordTurnActionAndDelivery(
  tally: GenerationTally,
  generation: NonNullable<AdventureSession["turns"][number]["generation"]>,
): void {
  tally.directorDeliveryCounts[
    generation.directorDelivery?.status ?? "unknown"
  ] += 1;
  tally.actionOutcomeCounts[
    generation.actionResolution?.outcome ?? "unknown"
  ] += 1;
  tally.actionValidationCounts[
    generation.actionResolution?.validation ?? "unknown"
  ] += 1;
}

function recordTurnGeneration(
  tally: GenerationTally,
  generation:
    NonNullable<AdventureSession["turns"][number]["generation"]> | undefined,
): void {
  if (!generation) {
    tally.transportCounts.unknown += 1;
    tally.threadModeCounts.unknown += 1;
    tally.directorDeliveryCounts.unknown += 1;
    tally.actionOutcomeCounts.unknown += 1;
    tally.actionValidationCounts.unknown += 1;
    return;
  }
  tally.turnsWithGeneration += 1;
  tally.transportCounts[generation.transport ?? "unknown"] += 1;
  tally.threadModeCounts[generation.threadMode ?? "unknown"] += 1;
  recordTurnActionAndDelivery(tally, generation);
  recordReset(tally, generation);
  if (generation.progressCategory)
    recordProgress(tally, generation.progressCategory);
}

function createGenerationTally(): GenerationTally {
  return {
    transportCounts: { interaction: 0, stateless: 0, unknown: 0 },
    threadModeCounts: { new: 0, continued: 0, reset: 0, unknown: 0 },
    progressCategoryCounts: {},
    directorDeliveryCounts: {
      included: 0,
      truncated: 0,
      omitted: 0,
      retained: 0,
      unknown: 0,
    },
    actionOutcomeCounts: {
      resolved: 0,
      "roll-required": 0,
      "credible-blocked": 0,
      clarification: 0,
      unresolved: 0,
      unknown: 0,
    },
    actionValidationCounts: {
      accepted: 0,
      corrected: 0,
      rejected: 0,
      unknown: 0,
    },
    turnsWithGeneration: 0,
    lastResetReason: null,
    lastRevisionMismatchCause: null,
    resetWithoutReason: false,
    lastProgressCategory: null,
    recentProgressCategories: [],
  };
}

function tallyGeneration(session: AdventureSession): GenerationTally {
  const tally = createGenerationTally();
  for (const turn of session.turns) {
    recordTurnGeneration(tally, turn.generation);
  }
  return tally;
}

function recordProgress(tally: GenerationTally, category: string): void {
  tally.progressCategoryCounts[category] =
    (tally.progressCategoryCounts[category] ?? 0) + 1;
  tally.lastProgressCategory = category;
  tally.recentProgressCategories.push(category);
  if (tally.recentProgressCategories.length > 5)
    tally.recentProgressCategories.shift();
}

function lastScenarioIdsFrom(session: AdventureSession): string[] {
  for (let i = session.turns.length - 1; i >= 0; i -= 1) {
    const ids = session.turns[i]?.generation?.scenarioIds;
    if (ids?.length) return ids;
  }
  return [];
}

export function generationSummary(session: AdventureSession) {
  const tally = tallyGeneration(session);
  const items = session.scenarioCollection?.items ?? [];
  const lastScenarioIds = lastScenarioIdsFrom(session);
  const recentMeaningful = tally.recentProgressCategories.filter((category) =>
    MEANINGFUL_PROGRESS_CATEGORIES.has(category),
  ).length;

  return {
    turnsWithGeneration: tally.turnsWithGeneration,
    turnsWithoutGeneration: session.turns.length - tally.turnsWithGeneration,
    transportCounts: tally.transportCounts,
    threadModeCounts: tally.threadModeCounts,
    threadReuseTurns: tally.threadModeCounts.continued,
    resets: tally.threadModeCounts.reset,
    // Null when no reset was recorded; "unknown" when a reset was recorded
    // without a reason. Never guesses a reason.
    lastResetReason:
      tally.lastResetReason ?? (tally.resetWithoutReason ? "unknown" : null),
    ...(tally.lastRevisionMismatchCause
      ? { lastRevisionMismatchCause: tally.lastRevisionMismatchCause }
      : {}),
    focusedScenarioId: session.scenarioCollection?.focusedScenarioId ?? null,
    activeScenarioIds: items
      .filter((item) => item.status === "open")
      .map((item) => item.id),
    lastScenarioIds,
    progressCategoryCounts: tally.progressCategoryCounts,
    directorDelivery: tally.directorDeliveryCounts,
    actionOutcome: tally.actionOutcomeCounts,
    actionValidation: tally.actionValidationCounts,
    ...(session.pendingRoll
      ? {
          pendingRollActionResolution: {
            outcome: "roll-required" as const,
            validation: "accepted" as const,
            evidenceCategory: "roll-pending" as const,
          },
        }
      : {}),
    lastProgressCategory: tally.lastProgressCategory,
    recentProgressCategories: tally.recentProgressCategories,
    recentMeaningfulProgressTurns: recentMeaningful,
  };
}
