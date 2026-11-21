import { describe, expect, it } from "vitest";
import {
  CONVERSION_SCORE_DIMENSIONS,
  fail,
  finish,
  pass,
  notApplicable,
  schemaFailedDims,
  validationDetails,
  type ConversionScoreResult,
} from "../../src/adventure-json/conversion-score-result";

const passingDimensions = () =>
  Object.fromEntries(
    CONVERSION_SCORE_DIMENSIONS.map((dimension) => [dimension, pass()]),
  ) as ConversionScoreResult["dimensions"];

describe("conversion score results", () => {
  it("passes with no findings and fails while preserving finding order", () => {
    expect(pass()).toEqual({ status: "pass", details: [] });
    expect(notApplicable()).toEqual({ status: "n/a", details: [] });
    expect(fail([])).toEqual(pass());
    expect(fail(["first", "second"])).toEqual({
      status: "fail",
      details: ["first", "second"],
    });
  });

  it("aggregates optional and failing dimensions and preserves repair counts", () => {
    const dimensions = passingDimensions();
    dimensions.fidelity = { status: "n/a", details: [] };
    expect(finish(dimensions, 3)).toEqual({
      overall: "pass",
      repairIterations: 3,
      dimensions,
    });
    dimensions.references = fail(["broken reference"]);
    expect(finish(dimensions, null).overall).toBe("fail");
  });

  it("formats paths consistently and blocks every dimension after schema failure", () => {
    const errors = [
      { code: "SCHEMA_INVALID", path: "title" },
      { code: "UNRESOLVED_REFERENCE", path: "scenes[0]" },
      { code: "SELF_REFERENCE" },
    ];
    expect(validationDetails(errors)).toEqual([
      "SCHEMA_INVALID at title",
      "UNRESOLVED_REFERENCE at scenes[0]",
      "SELF_REFERENCE",
    ]);
    const dimensions = schemaFailedDims({ errors });
    expect(dimensions.references).toEqual({
      status: "fail",
      details: ["UNRESOLVED_REFERENCE at scenes[0]", "SELF_REFERENCE"],
    });
    for (const [name, result] of Object.entries(dimensions)) {
      expect(result.status).toBe("fail");
      if (name !== "references")
        expect(result.details).toEqual(["not checked: schema invalid"]);
    }
    dimensions.secrets.details.push("extra");
    expect(dimensions.coverage.details).toEqual([
      "not checked: schema invalid",
    ]);
    expect(schemaFailedDims({ errors: [] }).references.details).toEqual([
      "not checked: schema invalid",
    ]);
  });
});
