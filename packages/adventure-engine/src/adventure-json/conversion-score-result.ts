export const CONVERSION_SCORE_DIMENSIONS = [
  "schema",
  "references",
  "secrets",
  "sourceAuthority",
  "conflicts",
  "coverage",
  "authoredVsRumour",
  "branches",
  "citations",
  "truncation",
  "fidelity",
] as const;

export type ConversionScoreDimension =
  (typeof CONVERSION_SCORE_DIMENSIONS)[number];

export interface ConversionScoreDimensionResult {
  status: "pass" | "fail" | "n/a";
  details: string[];
}

export interface ConversionScoreResult {
  overall: "pass" | "fail";
  repairIterations: number | null;
  dimensions: Record<ConversionScoreDimension, ConversionScoreDimensionResult>;
}

const NOT_CHECKED = "not checked: schema invalid";

export function pass(): ConversionScoreDimensionResult {
  return { status: "pass", details: [] };
}

export function notApplicable(): ConversionScoreDimensionResult {
  return { status: "n/a", details: [] };
}

export function fail(details: string[]): ConversionScoreDimensionResult {
  return { status: details.length === 0 ? "pass" : "fail", details };
}

export function finish(
  dims: Record<ConversionScoreDimension, ConversionScoreDimensionResult>,
  repairIterations: number | null,
): ConversionScoreResult {
  const overall = CONVERSION_SCORE_DIMENSIONS.every(
    (name) => dims[name]!.status === "pass" || dims[name]!.status === "n/a",
  )
    ? "pass"
    : "fail";
  return { overall, repairIterations, dimensions: dims };
}

type ValidationError = { code: string; path?: string };

export function validationDetails(errors: ValidationError[]): string[] {
  return errors.map((error) =>
    error.path ? `${error.code} at ${error.path}` : error.code,
  );
}

function schemaBlockedResult(): ConversionScoreDimensionResult {
  return { status: "fail", details: [NOT_CHECKED] };
}

export function schemaFailedDims(validation: {
  errors: ValidationError[];
}): Omit<ConversionScoreResult["dimensions"], "schema"> {
  const refErrors = validation.errors.filter(
    (error) =>
      error.code === "UNRESOLVED_REFERENCE" || error.code === "SELF_REFERENCE",
  );
  return {
    references:
      refErrors.length > 0
        ? fail(validationDetails(refErrors))
        : schemaBlockedResult(),
    secrets: schemaBlockedResult(),
    sourceAuthority: schemaBlockedResult(),
    conflicts: schemaBlockedResult(),
    coverage: schemaBlockedResult(),
    authoredVsRumour: schemaBlockedResult(),
    branches: schemaBlockedResult(),
    citations: schemaBlockedResult(),
    truncation: schemaBlockedResult(),
    fidelity: schemaBlockedResult(),
  };
}
