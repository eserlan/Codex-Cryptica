import type {
  CausalCommitment,
  CommittedAdventureTurn,
  ScenarioItem,
} from "../src/types";
import {
  emptyHiddenPatch,
  emptyVisiblePatch,
  now,
  scenario,
} from "./reducer-fixtures";

export function heardScenario(
  id = "bell",
  overrides: Partial<ScenarioItem> = {},
): ScenarioItem {
  return {
    ...scenario(),
    id,
    knowledge: "heard",
    playerVisible: {
      rumour: "A bronze bell rings at midnight",
      lead: "Old Bell Tower",
    },
    secretBindings: {
      truth: `truth-${id}`,
      ifInvestigated: `investigated-${id}`,
      eventIds: {},
    },
    ...overrides,
  };
}

export function directorTurn(
  sequence: number,
  playerAction = "Ask about the bell",
  narration = "The witness has nothing further to say.",
): CommittedAdventureTurn {
  return {
    id: `turn-${sequence}`,
    sequence,
    inputId: `input-${sequence}`,
    playerAction,
    narration,
    visiblePatch: emptyVisiblePatch(),
    hiddenPatch: emptyHiddenPatch(),
    revealedSecretIds: [],
    sourceRecordIds: [],
    provisionalFactIds: [],
    committedAt: now,
  };
}

export function commitment(
  id: string,
  overrides: Partial<CausalCommitment> = {},
): CausalCommitment {
  return {
    id,
    kind: "mechanism",
    commitmentClass: "supporting-explanation",
    subject: "The bell",
    summary: "The bell is rung by hand.",
    status: "committed",
    sourceTurnId: "turn-1",
    sourceRevision: 1,
    ...overrides,
  };
}
