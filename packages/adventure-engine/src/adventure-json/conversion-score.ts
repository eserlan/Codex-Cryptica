import {
  allEntities,
  citesSection,
  ENTITY_COLLECTIONS,
  hasScoredText,
  playerVisibleStrings,
  recordStrings,
  sourceReferenceMatches,
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

function scoreSecrets(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const details: string[] = [];
  const keySecrets = key.secrets.filter((s) => s.gmOnly);
  const docSecrets = (value.secrets ?? []) as Entity[];
  for (const s of keySecrets) {
    const matched = docSecrets.some(
      (d) => d.id === s.id || textFoundIn(s.text, String(d["text"] ?? "")),
    );
    if (!matched) details.push(`missing secret ${s.id}`);
  }
  const pvStrings = playerVisibleStrings(value);
  for (const s of keySecrets) {
    const leak = pvStrings.find((p) => textFoundIn(s.text, p.value));
    if (leak) details.push(`leaked secret ${s.id} in ${leak.field}`);
  }
  return fail(details);
}

type SourceAuthorityCase = NonNullable<
  ConversionAnswerKey["sourceAuthority"]
>[number];

function isAuthorityTarget(entity: Entity, targetSourceId: string): boolean {
  return (
    entity.id === targetSourceId || entity.sourceRef?.anchor === targetSourceId
  );
}

function authorityTitleDetails(
  value: DocLike,
  authority: SourceAuthorityCase,
): string[] {
  return value["title"] === authority.expectedTitle
    ? []
    : [
        `${authority.id}: expected adventure title "${authority.expectedTitle}"`,
      ];
}

function authorityItemCountDetails(
  value: DocLike,
  authority: SourceAuthorityCase,
): string[] {
  if (authority.expectedItemCount === undefined) return [];
  const itemCount = (value["items"] ?? []).length;
  return itemCount === authority.expectedItemCount
    ? []
    : [
        `${authority.id}: expected ${authority.expectedItemCount} item entries, found ${itemCount}`,
      ];
}

function hasExplicitAuthorityClaim(
  entity: Entity,
  expectedText: string,
  expectedTerm: string,
): boolean {
  return (
    entity.epistemicStatus === "explicit" &&
    hasScoredText(entity, expectedText, expectedTerm)
  );
}

function correctedClaimDetails(
  targetEntities: Entity[],
  authority: SourceAuthorityCase,
): string[] {
  const correctedClaims = targetEntities.filter((entity) =>
    hasExplicitAuthorityClaim(
      entity,
      authority.expectedText,
      authority.expectedTerm,
    ),
  );
  if (correctedClaims.length === 0) {
    return [`${authority.id}: missing explicit corrected claim`];
  }
  const citesCorrection = correctedClaims.some((entity) =>
    sourceReferenceMatches(entity.sourceRef, authority.correctionSource),
  );
  return citesCorrection
    ? []
    : [`${authority.id}: corrected claim does not cite the correction source`];
}

function supersededClaimDetails(
  targetEntities: Entity[],
  authority: SourceAuthorityCase,
): string[] {
  const remainsExplicit = targetEntities.some((entity) =>
    hasExplicitAuthorityClaim(
      entity,
      authority.supersededText,
      authority.supersededTerm,
    ),
  );
  return remainsExplicit
    ? [`${authority.id}: superseded claim remains explicit`]
    : [];
}

function scoreSourceAuthority(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const cases = key.sourceAuthority ?? [];
  if (cases.length === 0) return { status: "n/a", details: [] };

  const details: string[] = [];
  const entities = allEntities(value);
  for (const authority of cases) {
    const targetEntities = entities.filter((entity) =>
      isAuthorityTarget(entity, authority.targetSourceId),
    );
    details.push(
      ...authorityTitleDetails(value, authority),
      ...authorityItemCountDetails(value, authority),
      ...correctedClaimDetails(targetEntities, authority),
      ...supersededClaimDetails(targetEntities, authority),
    );
  }
  return fail(details);
}

function scoreConflicts(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const conflicts = key.conflicts ?? [];
  if (conflicts.length === 0) return { status: "n/a", details: [] };

  const details: string[] = [];
  const entities = allEntities(value);
  const unresolved = value.unresolved ?? [];
  for (const conflict of conflicts) {
    const recordedConflict = unresolved.some(
      (entry) =>
        (entry.epistemicStatus === "ambiguous" ||
          entry.epistemicStatus === "unresolved") &&
        conflict.claims.every((claim) =>
          hasScoredText(entry, claim.text, claim.distinguishingTerm),
        ),
    );
    if (!recordedConflict) {
      details.push(`${conflict.id}: missing unresolved record of the conflict`);
    }

    for (const claim of conflict.claims) {
      const matching = entities.filter((entity) =>
        hasScoredText(entity, claim.text, claim.distinguishingTerm),
      );
      if (matching.some((entity) => entity.epistemicStatus === "explicit")) {
        details.push(`${conflict.id}: claim is selected as explicit`);
      }
      const preserved = matching.some(
        (entity) =>
          (entity.epistemicStatus === "ambiguous" ||
            entity.epistemicStatus === "unresolved") &&
          sourceReferenceMatches(entity.sourceRef, claim.sourceRef),
      );
      if (!preserved) {
        details.push(
          `${conflict.id}: missing ambiguous or unresolved claim at its source location (${claim.distinguishingTerm})`,
        );
      }
    }
  }
  return fail(details);
}

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

function scoreAuthoredVsRumour(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const testimonies = key.testimonies ?? [];
  if (testimonies.length === 0) return { status: "n/a", details: [] };
  const details: string[] = [];
  const rumours = (value.rumours ?? []) as Array<{
    text?: string;
    truth?: string;
  }>;
  const docSecrets = (value.secrets ?? []) as Array<{ text?: string }>;
  for (const t of testimonies) {
    const found = rumours.some(
      (r) =>
        typeof r.text === "string" &&
        r.truth === t.truth &&
        textFoundIn(t.claim, r.text),
    );
    if (!found) details.push(`missing testimony ${t.id}`);
    const inSecret = docSecrets.some(
      (s) => typeof s.text === "string" && textFoundIn(t.claim, s.text),
    );
    if (inSecret) details.push(`testimony ${t.id} found in secret`);
  }
  return fail(details);
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
