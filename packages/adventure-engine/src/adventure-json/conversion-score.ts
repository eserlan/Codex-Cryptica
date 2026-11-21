import type { ConversionAnswerKey } from "./conversion-answer-key";
import { scoreBranches } from "./conversion-score-branches";
import { scoreConflicts } from "./conversion-score-conflicts";
import {
  scoreCoverage,
  scoreCitations,
  scoreTruncation,
} from "./conversion-score-coverage";
import { allEntities, type DocLike } from "./conversion-score-document";
import { scoreFidelity } from "./conversion-score-fidelity";
import {
  finish,
  pass,
  schemaFailedDims,
  validationDetails,
  type ConversionScoreDimensionResult,
  type ConversionScoreResult,
} from "./conversion-score-result";
import { scoreSecrets } from "./conversion-score-secrets";
import { scoreSourceAuthority } from "./conversion-score-source-authority";
import { scoreAuthoredVsRumour } from "./conversion-score-testimony";
import { validateAdventureJson } from "./validator";

export {
  ACTIONABLE_DETAIL_CATEGORIES,
  ActionableDetailSchema,
  ConversionAnswerKeySchema,
  type ActionableDetail,
  type ConversionAnswerKey,
} from "./conversion-answer-key";
export {
  CONVERSION_SCORE_DIMENSIONS,
  type ConversionScoreDimension,
  type ConversionScoreDimensionResult,
  type ConversionScoreResult,
} from "./conversion-score-result";
export { textFoundIn } from "./conversion-score-text";

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
