import { validateRevealedScenarioLocation } from "./contextual-rumours";
import { scenarioEventSecretId } from "./hidden-state";
import { allocateId, existingIds, type IdFactory } from "./reducer-ids";
import { error } from "./reducer-result";
import type {
  AdventureSession,
  CommittedAdventureTurn,
  ScenarioElaborationProposal,
  ScenarioElaborationStage,
  ScenarioItem,
} from "./types";

function revealScenarioIfUnheard(
  candidate: AdventureSession,
  scenarioId: string,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): string | null {
  const scenario = candidate.scenarioCollection?.items.find(
    (item) => item.id === scenarioId,
  );
  if (!scenario) return `Unknown scenario: ${scenarioId}`;
  if (scenario.knowledge !== "unheard") return null;

  const locationError = validateRevealedScenarioLocation(candidate, scenario);
  if (locationError) return locationError;

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
  return null;
}

export function markRevealedScenarios(
  candidate: AdventureSession,
  scenarioIds: string[] | undefined,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): string | null {
  for (const scenarioId of scenarioIds ?? []) {
    const err = revealScenarioIfUnheard(candidate, scenarioId, turn, createId);
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
  revealedThisTurn: Set<string>,
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
  if (revealedThisTurn.has(elaboration.scenarioId)) {
    return {
      error: error(
        "invalid-transition",
        `Cannot elaborate scenario ${elaboration.scenarioId} in the same turn it is discovered`,
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
  if (!text) {
    const id = allocateId(existingIds(candidate), createId);
    if (!id || scenario.events.length >= 100) {
      return error(
        "id-allocation-failed",
        "Unable to record scenario stage transition",
      );
    }
    scenario.events.push({
      id,
      kind: "stage-change",
      visibility: "gm",
      text: `Scenario advanced to ${elaboration.stage}`,
      at: turn.committedAt,
      turnId: turn.id,
    });
    scenario.secretBindings.eventIds[id] = scenarioEventSecretId(id);
    return null;
  }

  if (!recordScenarioDiscovery(candidate, scenario, text, turn, createId)) {
    return error(
      "id-allocation-failed",
      "Unable to record scenario elaboration discovery",
    );
  }
  return null;
}

function hasDuplicateScenarioElaborations(
  elaborations: ScenarioElaborationProposal[],
): boolean {
  const scenarioIds = new Set<string>();
  for (const elaboration of elaborations) {
    if (scenarioIds.has(elaboration.scenarioId)) return true;
    scenarioIds.add(elaboration.scenarioId);
  }
  return false;
}

export function applyScenarioElaborations(
  candidate: AdventureSession,
  elaborations: ScenarioElaborationProposal[] | undefined,
  revealedScenarioIds: string[] | undefined,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): ReturnType<typeof error> | null {
  if (!elaborations || elaborations.length === 0) return null;

  if (hasDuplicateScenarioElaborations(elaborations)) {
    return error(
      "invalid-transition",
      "A scenario can only be elaborated once per turn",
    );
  }

  const revealedThisTurn = new Set(revealedScenarioIds ?? []);

  for (const elaboration of elaborations) {
    const validation = validateScenarioAvailability(
      candidate,
      elaboration,
      revealedThisTurn,
    );
    if ("error" in validation) return validation.error;
    const stageError = validateElaborationStage(
      validation.scenario,
      elaboration,
    );
    if (stageError) return stageError;

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
