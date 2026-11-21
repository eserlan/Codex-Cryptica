import { describe, expect, it } from "vitest";
import { scoreFidelity } from "../../src/adventure-json/conversion-score-fidelity";
import { makeDocument, makeKey } from "./conversion-score-fixtures";

const detail = {
  sourceId: "mill",
  category: "trigger" as const,
  detail: "Pulling the lever floods the cellar",
};
const key = () =>
  makeKey({
    sections: [{ sourceId: "mill", title: "The Mill" }],
    actionableDetails: [detail],
  });

describe("conversion fidelity scoring", () => {
  it("finds a nested detail on a record citing its section", () => {
    const doc = makeDocument({
      scenes: [
        {
          id: "room",
          sourceRef: { anchor: "mill" },
          conditions: [{ description: detail.detail }],
        },
      ],
    });
    expect(scoreFidelity(doc, key())).toEqual({ status: "pass", details: [] });
  });

  it("excludes unresolved records and reports citing records in collection order", () => {
    const doc = makeDocument({
      locations: [{ id: "location", sourceRef: { anchor: "mill" } }],
      scenes: [{ id: "scene", sourceRef: { section: "The Mill" } }],
      unresolved: [
        {
          id: "dropped",
          sourceRef: { anchor: "mill" },
          message: detail.detail,
        },
      ],
    });
    expect(scoreFidelity(doc, key())).toEqual({
      status: "fail",
      details: [
        'missing trigger detail in mill "The Mill" (cited by: location, scene): Pulling the lever floods the cellar',
      ],
    });
  });

  it("does not count text from a different section", () => {
    const doc = makeDocument({
      scenes: [
        {
          id: "elsewhere",
          sourceRef: { anchor: "outside" },
          body: detail.detail,
        },
      ],
    });
    expect(scoreFidelity(doc, key()).details).toEqual([
      'missing trigger detail in mill "The Mill" (no record cites this section): Pulling the lever floods the cellar',
    ]);
  });

  it("does not apply without details and skips details without a keyed section", () => {
    expect(
      scoreFidelity(makeDocument(), makeKey({ actionableDetails: undefined })),
    ).toEqual({ status: "n/a", details: [] });
    expect(
      scoreFidelity(
        makeDocument(),
        makeKey({ actionableDetails: [{ ...detail, sourceId: "unknown" }] }),
      ),
    ).toEqual({ status: "pass", details: [] });
  });
});
