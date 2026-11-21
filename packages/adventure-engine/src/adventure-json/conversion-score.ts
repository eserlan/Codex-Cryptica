import { scoreSecrets } from "./conversion-score-secrets";
import { scoreSourceAuthority } from "./conversion-score-source-authority";
import { scoreConflicts } from "./conversion-score-conflicts";
import { scoreAuthoredVsRumour } from "./conversion-score-testimony";
import {
  allEntities,
  citesSection,
  ENTITY_COLLECTIONS,
  recordStrings,
  type DocLike,
  type Entity,
} from "./conversion-score-document";
import { normaliseText, textFoundIn } from "./conversion-score-text";
import {
  fail,
  finish,
  pass,
  schemaFailedDims,
  validationDetails,
  type ConversionScoreDimensionResult,
  type ConversionScoreResult,
} from "./conversion-score-result";

export { textFoundIn } from "./conversion-score-text";
export {
  CONVERSION_SCORE_DIMENSIONS,
  type ConversionScoreDimension,
  type ConversionScoreDimensionResult,
  type ConversionScoreResult,
} from "./conversion-score-result";

import { validateAdventureJson } from "./validator";
import type { ConversionAnswerKey } from "./conversion-answer-key";

export {
  ACTIONABLE_DETAIL_CATEGORIES,
  ActionableDetailSchema,
  ConversionAnswerKeySchema,
  type ActionableDetail,
  type ConversionAnswerKey,
} from "./conversion-answer-key";

function sectionCoverage(
  entities: Entity[],
  key: ConversionAnswerKey,
): string[] {
  const entityIds = new Set(entities.map((entity) => entity.id));
  const anchors = new Set(
    entities
      .map((entity) => entity.sourceRef?.anchor)
      .filter((anchor): anchor is string => typeof anchor === "string"),
  );
  const sectionTitles = new Set(
    entities
      .map((entity) => entity.sourceRef?.section)
      .filter((section): section is string => typeof section === "string")
      .map(normaliseText),
  );
  const details: string[] = [];
  for (const s of key.sections.filter((s) => !s.container)) {
    if (
      !entityIds.has(s.sourceId) &&
      !anchors.has(s.sourceId) &&
      !sectionTitles.has(normaliseText(s.title))
    ) {
      details.push(`missing section ${s.sourceId}`);
    }
  }
  return details;
}

function npcCoverage(value: DocLike, key: ConversionAnswerKey): string[] {
  const actors = (value.actors ?? []) as Array<{ name?: string }>;
  const details: string[] = [];
  for (const npc of key.npcs) {
    const found = actors.some(
      (a) => a.name?.toLowerCase() === npc.name.toLowerCase(),
    );
    if (!found) details.push(`missing npc ${npc.name}`);
  }
  return details;
}

function endingCoverage(value: DocLike, key: ConversionAnswerKey): string[] {
  const docEndings = (value.endings ?? []) as Entity[];
  const details: string[] = [];
  for (const ending of key.endings) {
    const section = key.sections.find((s) => s.sourceId === ending.sourceId);
    const found = docEndings.some((e) => e.id === ending.id);
    const cited = section
      ? docEndings.some((e) => citesSection(e, section))
      : docEndings.some((e) => e.sourceRef?.anchor === ending.sourceId);
    if (!found && !cited) details.push(`missing ending ${ending.id}`);
  }
  return details;
}

function clueCoverage(value: DocLike, key: ConversionAnswerKey): string[] {
  const docClues = (value.clues ?? []) as Array<{ text?: string }>;
  const keyClues: string[] = [
    key.missableClue.clue,
    ...(key.conclusions ?? []).flatMap((c) => c.clues.map((cl) => cl.text)),
  ];
  const details: string[] = [];
  for (const clue of keyClues) {
    const found = docClues.some(
      (c) => typeof c.text === "string" && textFoundIn(clue, c.text),
    );
    if (!found) details.push(`missing clue ${clue}`);
  }
  return details;
}

function scoreCoverage(
  value: DocLike,
  entities: Entity[],
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  return fail([
    ...sectionCoverage(entities, key),
    ...npcCoverage(value, key),
    ...endingCoverage(value, key),
    ...clueCoverage(value, key),
  ]);
}

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
  const optionalTarget = scenes.some((sc) =>
    (sc.branches ?? []).some(
      (b) =>
        b.optional === true &&
        citingScenes.some((c) => c.id === b.targetSceneId),
    ),
  );
  return optionalScene || optionalTarget
    ? []
    : [`missing optional path ${key.branch.sourceId}`];
}

function alternativeSolutionDetails(
  value: DocLike,
  scenes: SceneLike[],
  key: ConversionAnswerKey,
): string[] {
  const encounters = (value.encounters ?? []) as EncounterLike[];
  const obstacleSection = key.sections.find(
    (s) => s.sourceId === key.alternativeSolution.obstacleSourceId,
  );
  const sceneById = new Map(scenes.map((sc) => [sc.id, sc]));
  const obstacleEncounter = obstacleSection
    ? encounters.find((enc) => {
        if (citesSection(enc as Entity, obstacleSection)) return true;
        const scene = enc.sceneId ? sceneById.get(enc.sceneId) : undefined;
        return scene ? citesSection(scene as Entity, obstacleSection) : false;
      })
    : undefined;
  if (!obstacleEncounter) {
    return [
      `missing alternative solution encounter ${key.alternativeSolution.obstacleSourceId}`,
    ];
  }
  const solutions = obstacleEncounter.alternativeSolutions ?? [];
  if (key.alternativeSolution.socialBypassOfCombat) {
    return solutions.some((s) => s.socialBypassOfCombat === true)
      ? []
      : [`missing social bypass for encounter ${obstacleEncounter.id}`];
  }
  return solutions.length >= 2
    ? []
    : [
        `missing second alternative solution for encounter ${obstacleEncounter.id}`,
      ];
}

function scoreBranches(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const scenes = (value.scenes ?? []) as SceneLike[];
  return fail([
    ...optionalPathDetails(scenes, key),
    ...alternativeSolutionDetails(value, scenes, key),
  ]);
}

function scoreCitations(
  entities: Entity[],
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details: string[] = [];
  const validAnchors = new Set(key.sections.map((s) => s.sourceId));
  const anchors = entities
    .map((e) => e.sourceRef?.anchor)
    .filter((a): a is string => typeof a === "string");
  if (anchors.length === 0)
    details.push("no sourceRef.anchor found in document");
  for (const anchor of anchors) {
    if (!validAnchors.has(anchor)) details.push(`unknown anchor ${anchor}`);
  }
  return fail(details);
}

function scoreTruncation(
  entities: Entity[],
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const nonContainer = key.sections.filter((s) => !s.container);
  const trailing: string[] = [];
  for (let i = nonContainer.length - 1; i >= 0; i -= 1) {
    const section = nonContainer[i]!;
    if (entities.some((e) => citesSection(e, section))) break;
    trailing.unshift(`uncited trailing section ${section.sourceId}`);
  }
  return fail(trailing);
}

function recordHasText(rec: Entity, detail: string): boolean {
  let found = false;
  recordStrings("", rec, (_field, value) => {
    if (typeof value === "string" && textFoundIn(detail, value)) found = true;
  });
  return found;
}

/**
 * Each key detail must appear in at least one string field of a record that
 * cites its section. `unresolved` records never count, so a note that a detail
 * was dropped cannot hide the omission.
 */
function scoreFidelity(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details = key.actionableDetails ?? [];
  if (details.length === 0) return { status: "n/a", details: [] };
  const records = ENTITY_COLLECTIONS.filter(
    (name) => name !== "unresolved",
  ).flatMap((name) => value[name] ?? []);
  const findings: string[] = [];
  for (const d of details) {
    const section = key.sections.find((s) => s.sourceId === d.sourceId);
    if (!section) continue;
    const citing = records.filter((r) => citesSection(r, section));
    if (citing.some((r) => recordHasText(r, d.detail))) continue;
    const cited =
      citing.length > 0
        ? `cited by: ${citing.map((r) => r.id).join(", ")}`
        : "no record cites this section";
    findings.push(
      `missing ${d.category} detail in ${section.sourceId} "${section.title}" (${cited}): ${d.detail}`,
    );
  }
  return fail(findings);
}

export function scoreAdventureConversion(
  doc: unknown,
  key: ConversionAnswerKey,
  options?: { repairIterations?: number },
): ConversionScoreResult {
  const repairIterations = options?.repairIterations ?? null;
  const validation = validateAdventureJson(doc);
  const schema: ConversionScoreDimensionResult = validation.ok
    ? pass()
    : {
        status: "fail",
        details: validationDetails(validation.errors),
      };
  if (!validation.ok) {
    return finish(
      { schema, ...schemaFailedDims(validation) },
      repairIterations,
    );
  }
  const value = validation.value as unknown as DocLike;
  const entities = allEntities(value);
  return finish(
    {
      schema,
      // references: a fully valid document has no reference errors
      references: pass(),
      secrets: scoreSecrets(value, key),
      sourceAuthority: scoreSourceAuthority(value, key),
      conflicts: scoreConflicts(value, key),
      coverage: scoreCoverage(value, entities, key),
      authoredVsRumour: scoreAuthoredVsRumour(value, key),
      branches: scoreBranches(value, key),
      citations: scoreCitations(entities, key),
      truncation: scoreTruncation(entities, key),
      fidelity: scoreFidelity(value, key),
    },
    repairIterations,
  );
}
