import type { DirectorPursuedScenario } from "./gm-director-brief-contract";
import { appendUniqueClipped, clipText } from "./gm-director-brief-text";
import {
  collectCommittedExplanations,
  collectSpeculativeCommitments,
} from "./gm-director-commitments";
import type { RankedCandidate } from "./gm-director-scenario-ranking";
import type {
  AdventureSession,
  ScenarioElaborationStage,
  ScenarioItem,
} from "./types";

function collectScenarioActors(
  scenario: ScenarioItem,
  session: AdventureSession,
): string[] {
  const actors: string[] = [];
  const add = (name: string | undefined) => {
    appendUniqueClipped(actors, name ?? "", 80);
  };

  add(scenario.playerVisible.source);
  for (const record of session.sourceRecords) {
    const isOrigin = record.recordId === scenario.origin.sourceRecordId;
    const isActiveAnchor =
      scenario.anchorRefs.includes(record.recordId) &&
      session.visibleState.activeCharacters.some(
        (c) => c.sourceRecordId === record.recordId,
      );
    if (record.recordType === "character" && (isOrigin || isActiveAnchor)) {
      add(record.displayName);
    }
  }
  return actors.slice(0, 4);
}

function collectKnownPlayerFacts(
  scenario: ScenarioItem,
  session: AdventureSession,
): string[] {
  const facts: string[] = [];
  const push = (text: string) => {
    appendUniqueClipped(facts, text, 180);
  };

  push(scenario.playerVisible.rumour);
  push(
    scenario.playerVisible.source
      ? `Lead: ${scenario.playerVisible.lead} (source: ${scenario.playerVisible.source})`
      : `Lead: ${scenario.playerVisible.lead}`,
  );
  for (const fact of session.provisionalFacts) {
    if (
      fact.visibility === "player-visible" &&
      fact.scenarioId === scenario.id
    ) {
      push(`${fact.name}: ${fact.summary}`);
    }
  }
  return facts.slice(0, 4);
}

const STAGE_UNCERTAINTY: Record<ScenarioElaborationStage, string> = {
  hearsay: "Still hearsay; concrete witness or physical clue is open.",
  "actionable-clue":
    "Actionable clue stage; core truth or confrontation awaits.",
  "revelation-crisis":
    "Revelation-crisis stage; resolution or aftermath remains open.",
};

function collectOpenUncertainties(
  scenario: ScenarioItem,
  truthRevealed: boolean,
): string[] {
  const items: string[] = [];
  if (!truthRevealed) {
    items.push(
      `Core truth (${scenario.secretBindings.truth}) not yet revealed in play.`,
    );
  }
  const invId = scenario.secretBindings.ifInvestigated;
  if (
    scenario.gmOnly.ifInvestigated &&
    invId &&
    !scenario.revealedSecretIds.includes(invId)
  ) {
    items.push(`Investigative detail (${invId}) remains unrevealed.`);
  }
  items.push(STAGE_UNCERTAINTY[scenario.stage]);
  if (scenario.pressure && scenario.pressure.triggeredAtMinute === undefined) {
    items.push(
      `Pending off-screen pressure (${clipText(scenario.pressure.actor, 60)}) untriggered.`,
    );
  }
  return items.slice(0, 3);
}

const NEXT_DEVELOPMENT_KINDS: Record<ScenarioElaborationStage, string[]> = {
  hearsay: [
    "surface-witness-or-clue",
    "verify-hearsay",
    "ordinary-life-or-ignore",
  ],
  "actionable-clue": [
    "follow-concrete-trail",
    "reveal-truth-on-discovery",
    "confront-or-test-claim",
  ],
  "revelation-crisis": [
    "resolve-dilemma",
    "play-out-consequence",
    "leave-aftermath-open",
  ],
};

function nextDevelopmentKindsFor(scenario: ScenarioItem): string[] {
  const kinds = [...NEXT_DEVELOPMENT_KINDS[scenario.stage]];
  if (scenario.pressure && scenario.pressure.triggeredAtMinute === undefined) {
    kinds.push("advance-offscreen-pressure-if-time-passes");
  }
  return kinds.slice(0, 4);
}

function buildScenarioTruthRef(
  item: ScenarioItem,
  truthRevealed: boolean,
): DirectorPursuedScenario["gmTruthRef"] {
  return {
    secretId: item.secretBindings.truth,
    truth: clipText(item.gmOnly.truth, 220),
    truthRevealed,
    ...(item.gmOnly.ifInvestigated && item.secretBindings.ifInvestigated
      ? {
          ifInvestigatedSecretId: item.secretBindings.ifInvestigated,
          ifInvestigated: clipText(item.gmOnly.ifInvestigated, 180),
        }
      : {}),
  };
}

function buildEstablishedScenario(
  item: ScenarioItem,
  session: AdventureSession,
): DirectorPursuedScenario["established"] {
  const latestConsequentialEvents = item.events.slice(-3).map((event) => ({
    id: event.id,
    kind: event.kind,
    visibility: event.visibility,
    text: clipText(event.text, 180),
  }));
  const committedExplanations = collectCommittedExplanations(session, item.id);
  return {
    knownPlayerFacts: collectKnownPlayerFacts(item, session),
    latestConsequentialEvents,
    actors: collectScenarioActors(item, session),
    ...(committedExplanations.length > 0 ? { committedExplanations } : {}),
  };
}

function summarizeScenarioPressure(
  pressure: NonNullable<ScenarioItem["pressure"]>,
): NonNullable<DirectorPursuedScenario["potential"]["pressure"]> {
  return {
    actor: clipText(pressure.actor, 80),
    goal: clipText(pressure.goal, 140),
    currentStance: clipText(pressure.currentStance, 80),
    trigger: clipText(pressure.trigger, 140),
    expectedConsequence: clipText(pressure.expectedConsequence, 160),
    ...(pressure.triggeredAtMinute !== undefined
      ? { triggeredAtMinute: pressure.triggeredAtMinute }
      : {}),
  };
}

function buildPotentialScenario(
  item: ScenarioItem,
  session: AdventureSession,
  truthRevealed: boolean,
): DirectorPursuedScenario["potential"] {
  const speculativeCommitments = collectSpeculativeCommitments(
    session,
    item.id,
  );
  return {
    openUncertainties: collectOpenUncertainties(item, truthRevealed),
    ...(speculativeCommitments.length > 0 ? { speculativeCommitments } : {}),
    ...(item.pressure
      ? { pressure: summarizeScenarioPressure(item.pressure) }
      : {}),
    nextDevelopmentKinds: nextDevelopmentKindsFor(item),
  };
}

export function buildPursuedScenario(
  candidate: RankedCandidate,
  session: AdventureSession,
): DirectorPursuedScenario {
  const { item } = candidate;
  const truthRevealed = item.revealedSecretIds.includes(
    item.secretBindings.truth,
  );
  return {
    scenarioId: item.id,
    provenance: candidate.provenance,
    confidence: candidate.confidence,
    stage: item.stage,
    gmTruthRef: buildScenarioTruthRef(item, truthRevealed),
    established: buildEstablishedScenario(item, session),
    potential: buildPotentialScenario(item, session, truthRevealed),
  };
}
