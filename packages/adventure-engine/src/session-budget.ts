import type { AdventureSession } from "./types";

// Hot prompt-state projection cap. See #5183 / #5203 / #5204 for bounded
// active-memory compaction; durable persistence uses MAX_DURABLE_STATE_CHARS.
export const MAX_SERIALIZED_STATE_CHARS = 48_000;
export const MAX_DURABLE_STATE_CHARS = 256_000;
export const STATE_BUDGET_WARNING_RATIO = 0.8;
export const MAX_GENERATION_INPUT_CHARS = 96_000;

export type StateBudgetSectionKey =
  | "visibleState"
  | "hiddenState"
  | "provisionalFacts"
  | "dismissedProvisionalFactIds"
  | "scenarioCollection"
  | "worldEntry"
  | "historicalAnchor"
  | "worldTime"
  | "places"
  | "storySoFar";

export interface StateBudgetBreakdown {
  sections: Record<StateBudgetSectionKey, number>;
  totalChars: number;
  hotBudgetChars: number;
  durableBudgetChars: number;
  hotUtilization: number;
  warning: boolean;
  exceedsHotBudget: boolean;
  exceedsDurableBudget: boolean;
}

function budgetedStatePayload(session: AdventureSession) {
  return {
    visibleState: session.visibleState,
    hiddenState: session.hiddenState,
    provisionalFacts: session.provisionalFacts,
    dismissedProvisionalFactIds: session.dismissedProvisionalFactIds,
    scenarioCollection: session.scenarioCollection,
    worldEntry: session.worldEntry,
    historicalAnchor: session.historicalAnchor,
    worldTime: session.worldTime,
    places: session.places,
    storySoFar: session.storySoFar,
  };
}

function serializedSectionLength(value: unknown): number {
  return value === undefined ? 0 : JSON.stringify(value).length;
}

export function measureStateBudget(
  session: AdventureSession,
): StateBudgetBreakdown {
  const payload = budgetedStatePayload(session);
  const totalChars = JSON.stringify(payload).length;
  const sections: Record<StateBudgetSectionKey, number> = {
    visibleState: serializedSectionLength(payload.visibleState),
    hiddenState: serializedSectionLength(payload.hiddenState),
    provisionalFacts: serializedSectionLength(payload.provisionalFacts),
    dismissedProvisionalFactIds: serializedSectionLength(
      payload.dismissedProvisionalFactIds,
    ),
    scenarioCollection: serializedSectionLength(payload.scenarioCollection),
    worldEntry: serializedSectionLength(payload.worldEntry),
    historicalAnchor: serializedSectionLength(payload.historicalAnchor),
    worldTime: serializedSectionLength(payload.worldTime),
    places: serializedSectionLength(payload.places),
    storySoFar: serializedSectionLength(payload.storySoFar),
  };
  return {
    sections,
    totalChars,
    hotBudgetChars: MAX_SERIALIZED_STATE_CHARS,
    durableBudgetChars: MAX_DURABLE_STATE_CHARS,
    hotUtilization: Number(
      (totalChars / MAX_SERIALIZED_STATE_CHARS).toFixed(4),
    ),
    warning:
      totalChars >=
      Math.floor(MAX_SERIALIZED_STATE_CHARS * STATE_BUDGET_WARNING_RATIO),
    exceedsHotBudget: totalChars > MAX_SERIALIZED_STATE_CHARS,
    exceedsDurableBudget: totalChars > MAX_DURABLE_STATE_CHARS,
  };
}

export function validateStateBudget(session: AdventureSession): boolean {
  return (
    JSON.stringify(budgetedStatePayload(session)).length <=
    MAX_SERIALIZED_STATE_CHARS
  );
}

export function validateDurableStateBudget(session: AdventureSession): boolean {
  return (
    JSON.stringify(budgetedStatePayload(session)).length <=
    MAX_DURABLE_STATE_CHARS
  );
}

export function validateGenerationBudget(input: string): boolean {
  return input.length <= MAX_GENERATION_INPUT_CHARS;
}
