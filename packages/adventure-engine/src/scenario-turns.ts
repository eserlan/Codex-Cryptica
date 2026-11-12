import { validateRevealedScenarioLocation } from "./contextual-rumours";
import { allocateId, existingIds, type IdFactory } from "./reducer-ids";
import { error } from "./reducer-result";
import type {
  AdventureSession,
  CommittedAdventureTurn,
  ScenarioElaborationProposal,
  ScenarioElaborationStage,
  ScenarioItem,
} from "./types";

/**
 * Returns a message only when the turn cannot commit (no id could be allocated).
 * A rumour that does not exist, or is not located here, is left unrevealed and
 * recorded in `dropped`: the model's slip never fails the player's turn.
 */
function revealScenarioIfUnheard(
  candidate: AdventureSession,
  scenarioId: string,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
  dropped: string[],
  newlyRevealedScenarioIds?: Set<string>,
): string | null {
  const scenario = candidate.scenarioCollection?.items.find(
    (item) => item.id === scenarioId,
  );
  if (!scenario) {
    dropped.push(`reveal: unknown scenario ${scenarioId}`);
    return null;
  }
  if (scenario.knowledge !== "unheard") return null;
  if (scenario.status !== "open") {
    dropped.push(`reveal: Scenario ${scenarioId} is not open`);
    return null;
  }

  const locationError = validateRevealedScenarioLocation(candidate, scenario);
  if (locationError) {
    dropped.push(`reveal: ${locationError}`);
    return null;
  }

  if (
    !recordScenarioDiscovery(
      candidate,
      scenario,
      scenario.playerVisible.lead,
      turn,
      createId,
    )
  ) {
    return "Unable to record scenario discovery";
  }
  scenario.knowledge = "heard";
  newlyRevealedScenarioIds?.add(scenarioId);
  return null;
}

export function markRevealedScenarios(
  candidate: AdventureSession,
  scenarioIds: string[] | undefined,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
  dropped: string[] = [],
  newlyRevealedScenarioIds?: Set<string>,
): string | null {
  for (const scenarioId of scenarioIds ?? []) {
    const err = revealScenarioIfUnheard(
      candidate,
      scenarioId,
      turn,
      createId,
      dropped,
      newlyRevealedScenarioIds,
    );
    if (err) return err;
  }
  return null;
}

const ELABORATION_LADDER_ORDER: Record<ScenarioElaborationStage, number> = {
  hearsay: 0,
  "actionable-clue": 1,
  "revelation-crisis": 2,
};

type ScenarioElaborationValidation =
  { scenario: ScenarioItem } | { error: ReturnType<typeof error> };

function validateScenarioAvailability(
  candidate: AdventureSession,
  elaboration: ScenarioElaborationProposal,
): ScenarioElaborationValidation {
  const scenario = candidate.scenarioCollection?.items.find(
    (item) => item.id === elaboration.scenarioId,
  );
  if (!scenario) {
    return {
      error: error(
        "unknown-fact",
        `Unknown scenario: ${elaboration.scenarioId}`,
      ),
    };
  }
  if (scenario.status !== "open") {
    return {
      error: error(
        "invalid-transition",
        `Scenario ${elaboration.scenarioId} is not open`,
      ),
    };
  }
  if (scenario.knowledge !== "heard") {
    return {
      error: error(
        "invalid-transition",
        `Scenario ${elaboration.scenarioId} must be heard before it can be elaborated`,
      ),
    };
  }
  return { scenario };
}

function validateElaborationStage(
  scenario: ScenarioItem,
  elaboration: ScenarioElaborationProposal,
): ReturnType<typeof error> | null {
  const currentStage = scenario.stage ?? "hearsay";
  const currentLevel = ELABORATION_LADDER_ORDER[currentStage] ?? 0;
  const targetLevel = ELABORATION_LADDER_ORDER[elaboration.stage] ?? 0;
  if (targetLevel <= currentLevel) {
    return error(
      "invalid-transition",
      `Cannot transition scenario ${elaboration.scenarioId} from ${currentStage} to ${elaboration.stage}`,
    );
  }
  if (targetLevel - currentLevel > 1) {
    return error(
      "invalid-transition",
      `Cannot skip elaboration stages for scenario ${elaboration.scenarioId} from ${currentStage} to ${elaboration.stage}`,
    );
  }
  return null;
}

function recordScenarioElaborationDiscovery(
  scenario: ScenarioItem,
  elaboration: ScenarioElaborationProposal,
  candidate: AdventureSession,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): ReturnType<typeof error> | null {
  const text = elaboration.discovery?.trim();
  if (!text) return null;

  if (!recordScenarioDiscovery(candidate, scenario, text, turn, createId)) {
    return error(
      "id-allocation-failed",
      "Unable to record scenario elaboration discovery",
    );
  }
  return null;
}

type ElaborationCheck = { scenario: ScenarioItem } | { skip: string | null };

/** The scenario to elaborate, or why to skip (null: skip without a record). */
function checkElaboration(
  candidate: AdventureSession,
  elaboration: ScenarioElaborationProposal,
  revealedThisTurn: Set<string>,
  seen: Set<string>,
): ElaborationCheck {
  const id = elaboration.scenarioId;
  if (seen.has(id)) return { skip: `elaborate: ${id} repeated in one turn` };
  seen.add(id);
  const validation = validateScenarioAvailability(candidate, elaboration);
  const failure =
    "error" in validation
      ? validation.error
      : validateElaborationStage(validation.scenario, elaboration);
  if (failure) return { skip: `elaborate: ${failure.errors[0]?.message}` };
  if (revealedThisTurn.has(id)) return { skip: null };
  return "scenario" in validation ? validation : { skip: null };
}

/**
 * Apply the turn's elaborations. An elaboration that is not allowed (unknown or
 * closed scenario, not heard yet, wrong stage, a repeat) is skipped and recorded
 * in `dropped`; only a failure to record the discovery, which would corrupt the
 * scenario's history, fails the turn.
 */
export function applyScenarioElaborations(
  candidate: AdventureSession,
  elaborations: ScenarioElaborationProposal[] | undefined,
  revealedScenarioIds: string[] | undefined,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
  dropped: string[] = [],
): ReturnType<typeof error> | null {
  if (!elaborations || elaborations.length === 0) return null;

  const revealedThisTurn = new Set(revealedScenarioIds ?? []);
  const seen = new Set<string>();

  for (const elaboration of elaborations) {
    const checked = checkElaboration(
      candidate,
      elaboration,
      revealedThisTurn,
      seen,
    );
    if ("skip" in checked) {
      if (checked.skip) dropped.push(checked.skip);
      continue;
    }
    const validation = checked;
    validation.scenario.stage = elaboration.stage;
    const discoveryError = recordScenarioElaborationDiscovery(
      validation.scenario,
      elaboration,
      candidate,
      turn,
      createId,
    );
    if (discoveryError) return discoveryError;
  }

  return null;
}

function recordScenarioDiscovery(
  candidate: AdventureSession,
  scenario: ScenarioItem,
  text: string,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): boolean {
  const id = allocateId(existingIds(candidate), createId);
  if (!id || scenario.events.length >= 100) return false;
  scenario.events.push({
    id,
    kind: "discovery",
    visibility: "player",
    text,
    at: turn.committedAt,
    turnId: turn.id,
  });
  return true;
}
