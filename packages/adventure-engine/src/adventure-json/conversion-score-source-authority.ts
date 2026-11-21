import type { ConversionAnswerKey } from "./conversion-answer-key";
import {
  fail,
  type ConversionScoreDimensionResult,
} from "./conversion-score-result";
import {
  allEntities,
  citesSourceId,
  hasScoredText,
  sourceReferenceMatches,
  type DocLike,
  type Entity,
} from "./conversion-score-document";
import { notApplicable } from "./conversion-score-result";

type SourceAuthorityCase = NonNullable<
  ConversionAnswerKey["sourceAuthority"]
>[number];

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

export function scoreSourceAuthority(
  value: DocLike,
  key: ConversionAnswerKey,
): ConversionScoreDimensionResult {
  const cases = key.sourceAuthority ?? [];
  if (cases.length === 0) return notApplicable();

  const details: string[] = [];
  const entities = allEntities(value);
  for (const authority of cases) {
    const targetEntities = entities.filter((entity) =>
      citesSourceId(entity, authority.targetSourceId),
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
