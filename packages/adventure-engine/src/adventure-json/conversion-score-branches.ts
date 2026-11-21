import type { ConversionAnswerKey } from "./conversion-answer-key";
import {
  citesSection,
  type DocLike,
  type Entity,
} from "./conversion-score-document";
import {
  fail,
  type ConversionScoreDimensionResult,
} from "./conversion-score-result";

type SceneLike = {
  id: string;
  optional?: boolean;
  branches?: Array<{ targetSceneId?: string; optional?: boolean }>;
  sourceRef?: { anchor?: string; section?: string };
};

type EncounterLike = {
  id: string;
  sceneId?: string;
  alternativeSolutions?: Array<{ socialBypassOfCombat?: boolean }>;
  sourceRef?: { anchor?: string; section?: string };
};

function hasOptionalIncomingBranch(
  scenes: SceneLike[],
  targets: SceneLike[],
): boolean {
  return scenes.some((scene) =>
    (scene.branches ?? []).some(
      (branch) =>
        branch.optional === true &&
        targets.some((target) => target.id === branch.targetSceneId),
    ),
  );
}

function optionalPathDetails(
  scenes: SceneLike[],
  key: ConversionAnswerKey,
): string[] {
  const branchSection = key.sections.find(
    (s) => s.sourceId === key.branch.sourceId,
  );
  const citingScenes = branchSection
    ? scenes.filter((sc) => citesSection(sc as Entity, branchSection))
    : [];
  const optionalScene = citingScenes.some((sc) => sc.optional === true);
  const optionalTarget = hasOptionalIncomingBranch(scenes, citingScenes);
  return optionalScene || optionalTarget
    ? []
    : [`missing optional path ${key.branch.sourceId}`];
}

function encounterCitesSection(
  encounter: EncounterLike,
  sceneById: Map<string, SceneLike>,
  section: ConversionAnswerKey["sections"][number],
): boolean {
  if (citesSection(encounter as Entity, section)) return true;
  const scene = encounter.sceneId
    ? sceneById.get(encounter.sceneId)
    : undefined;
  return scene ? citesSection(scene as Entity, section) : false;
}

function findObstacleEncounter(
  encounters: EncounterLike[],
  scenes: SceneLike[],
  key: ConversionAnswerKey,
): EncounterLike | undefined {
  const section = key.sections.find(
    (s) => s.sourceId === key.alternativeSolution.obstacleSourceId,
  );
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
  return section
    ? encounters.find((encounter) =>
        encounterCitesSection(encounter, sceneById, section),
      )
    : undefined;
}

function encounterSolutionDetails(
  encounter: EncounterLike,
  requiresSocialBypass: boolean,
): string[] {
  const solutions = encounter.alternativeSolutions ?? [];
  if (requiresSocialBypass) {
    return solutions.some((solution) => solution.socialBypassOfCombat === true)
      ? []
      : [`missing social bypass for encounter ${encounter.id}`];
  }
  return solutions.length >= 2
    ? []
    : [`missing second alternative solution for encounter ${encounter.id}`];
}

function alternativeSolutionDetails(
  value: DocLike,
  scenes: SceneLike[],
  key: ConversionAnswerKey,
): string[] {
  const encounters = (value.encounters ?? []) as EncounterLike[];
  const obstacleEncounter = findObstacleEncounter(encounters, scenes, key);
  return obstacleEncounter
    ? encounterSolutionDetails(
        obstacleEncounter,
        key.alternativeSolution.socialBypassOfCombat,
      )
    : [
        `missing alternative solution encounter ${key.alternativeSolution.obstacleSourceId}`,
      ];
}

export function scoreBranches(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const scenes = (value.scenes ?? []) as SceneLike[];
  return fail([
    ...optionalPathDetails(scenes, key),
    ...alternativeSolutionDetails(value, scenes, key),
  ]);
}
