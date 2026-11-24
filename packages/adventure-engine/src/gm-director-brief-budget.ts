import { MAX_OTHER_SCENARIO_IDS } from "./gm-director-brief-contract";
import type {
  DirectorPackageContext,
  DirectorPursuedScenario,
  GMDirectorBrief,
} from "./gm-director-brief-contract";

const PURSUED_SHEDDERS: Array<(entry: DirectorPursuedScenario) => boolean> = [
  (e) => e.potential.nextDevelopmentKinds.pop() !== undefined,
  (e) => e.potential.speculativeCommitments?.pop() !== undefined,
  (e) => e.potential.openUncertainties.pop() !== undefined,
  (e) => e.established.latestConsequentialEvents.shift() !== undefined,
  (e) => e.established.knownPlayerFacts.pop() !== undefined,
  (e) => e.established.actors.pop() !== undefined,
  (e) => {
    if (!e.potential.pressure) return false;
    delete e.potential.pressure;
    return true;
  },
  // Established explanations shed last, before gmTruthRef is ever touched.
  (e) => e.established.committedExplanations?.pop() !== undefined,
];

function shedPursuedDetails(brief: GMDirectorBrief): boolean {
  for (const shed of PURSUED_SHEDDERS) {
    for (let i = brief.pursuedScenarios.length - 1; i >= 0; i -= 1) {
      if (shed(brief.pursuedScenarios[i]!)) return true;
    }
  }
  return false;
}

const PACKAGE_SHEDDERS: Array<(pkg: DirectorPackageContext) => boolean> = [
  (p) => p.openUncertainties.pop() !== undefined,
  (p) => p.latestEvents.shift() !== undefined,
  (p) => p.establishedActors.pop() !== undefined,
  (p) => p.activeRecordIds.pop() !== undefined,
];

function shedPackageExtras(brief: GMDirectorBrief): boolean {
  const pkg = brief.packageContext;
  if (!pkg) return false;
  for (const shed of PACKAGE_SHEDDERS) {
    if (shed(pkg)) return true;
  }
  return false;
}

function shedSecondaryPursued(brief: GMDirectorBrief): boolean {
  if (brief.pursuedScenarios.length <= 1) return false;
  const removed = brief.pursuedScenarios.pop()!;
  brief.otherOpenHeardScenarioIds = [
    removed.scenarioId,
    ...brief.otherOpenHeardScenarioIds,
  ].slice(0, MAX_OTHER_SCENARIO_IDS);
  return true;
}

function shedTopLevelCommittedExplanations(brief: GMDirectorBrief): boolean {
  if (!brief.committedExplanations?.length) return false;
  brief.committedExplanations.pop();
  if (brief.committedExplanations.length === 0) {
    delete brief.committedExplanations;
  }
  return true;
}

const BRIEF_SHEDDERS: Array<(brief: GMDirectorBrief) => boolean> = [
  (b) => {
    if (!b.progression) return false;
    delete b.progression;
    return true;
  },
  shedSecondaryPursued,
  shedPursuedDetails,
  shedTopLevelCommittedExplanations,
  shedPackageExtras,
  (b) => b.otherOpenHeardScenarioIds.pop() !== undefined,
  (b) => {
    if (!b.currentPlace) return false;
    delete b.currentPlace;
    return true;
  },
];

export function enforceBriefBudget(
  brief: GMDirectorBrief,
  limit: number,
): GMDirectorBrief | undefined {
  if (limit <= 0) return undefined;
  while (JSON.stringify(brief).length > limit) {
    const shed = BRIEF_SHEDDERS.some((step) => step(brief));
    if (!shed) return undefined;
  }
  return brief;
}
