import type { AdventureSession } from "./types";

export const MAX_SERIALIZED_STATE_CHARS = 32_000;
export const MAX_GENERATION_INPUT_CHARS = 96_000;

export function validateStateBudget(session: AdventureSession): boolean {
  return (
    JSON.stringify({
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
    }).length <= MAX_SERIALIZED_STATE_CHARS
  );
}

export function validateGenerationBudget(input: string): boolean {
  return input.length <= MAX_GENERATION_INPUT_CHARS;
}
