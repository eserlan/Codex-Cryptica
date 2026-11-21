import type { ConversionAnswerKey } from "./conversion-answer-key";
import {
  fail,
  notApplicable,
  type ConversionScoreDimensionResult,
} from "./conversion-score-result";
import {
  allEntities,
  hasScoredText,
  sourceReferenceMatches,
  type DocLike,
  type Entity,
} from "./conversion-score-document";

type Conflict = NonNullable<ConversionAnswerKey["conflicts"]>[number];
type Claim = Conflict["claims"][number];

function isUncertain(entity: Entity): boolean {
  return (
    entity.epistemicStatus === "ambiguous" ||
    entity.epistemicStatus === "unresolved"
  );
}

function conflictRecordDetails(
  unresolved: Entity[],
  conflict: Conflict,
): string[] {
  const recordedConflict = unresolved.some(
    (entry) =>
      isUncertain(entry) &&
      conflict.claims.every((claim) =>
        hasScoredText(entry, claim.text, claim.distinguishingTerm),
      ),
  );
  return recordedConflict
    ? []
    : [`${conflict.id}: missing unresolved record of the conflict`];
}

function claimDetails(
  entities: Entity[],
  conflictId: string,
  claim: Claim,
): string[] {
  const matching = entities.filter((entity) =>
    hasScoredText(entity, claim.text, claim.distinguishingTerm),
  );
  const details: string[] = [];
  if (matching.some((entity) => entity.epistemicStatus === "explicit")) {
    details.push(`${conflictId}: claim is selected as explicit`);
  }
  const preserved = matching.some(
    (entity) =>
      isUncertain(entity) &&
      sourceReferenceMatches(entity.sourceRef, claim.sourceRef),
  );
  if (!preserved) {
    details.push(
      `${conflictId}: missing ambiguous or unresolved claim at its source location (${claim.distinguishingTerm})`,
    );
  }
  return details;
}

export function scoreConflicts(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const conflicts = key.conflicts ?? [];
  if (conflicts.length === 0) return notApplicable();
  const entities = allEntities(value);
  const unresolved = value.unresolved ?? [];
  return fail(
    conflicts.flatMap((conflict) => [
      ...conflictRecordDetails(unresolved, conflict),
      ...conflict.claims.flatMap((claim) =>
        claimDetails(entities, conflict.id, claim),
      ),
    ]),
  );
}
