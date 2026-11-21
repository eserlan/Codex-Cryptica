import { describe, expect, it } from "vitest";
import { scoreConflicts } from "../../src/adventure-json/conversion-score-conflicts";
import { makeDocument, makeKey } from "./conversion-score-fixtures";

const conflict = {
  id: "bridge",
  claims: [
    {
      text: "The bridge is made of timber.",
      distinguishingTerm: "timber",
      sourceRef: { page: 5 },
    },
    {
      text: "The bridge is made of stone.",
      distinguishingTerm: "stone",
      sourceRef: { page: 6 },
    },
  ],
};
const key = () => makeKey({ conflicts: [conflict] });
const document = () =>
  makeDocument({
    locations: conflict.claims.map((claim, i) => ({
      id: `location-${i}`,
      summary: claim.text,
      epistemicStatus: i === 0 ? "ambiguous" : "unresolved",
      sourceRef: claim.sourceRef,
    })),
    unresolved: [
      {
        id: "contradiction",
        message: conflict.claims.map((claim) => claim.text).join(" "),
        epistemicStatus: "ambiguous",
      },
    ],
  });

describe("conversion conflict scoring", () => {
  it("preserves both source claims and an unresolved conflict record", () => {
    expect(scoreConflicts(document(), key())).toEqual({
      status: "pass",
      details: [],
    });
  });

  it("reports the missing record, explicit selection and missing source claims in order", () => {
    const doc = document();
    doc.unresolved = [];
    doc.locations[0]!.epistemicStatus = "explicit";
    doc.locations[1]!.sourceRef = { page: 7 };
    expect(scoreConflicts(doc, key())).toEqual({
      status: "fail",
      details: [
        "bridge: missing unresolved record of the conflict",
        "bridge: claim is selected as explicit",
        "bridge: missing ambiguous or unresolved claim at its source location (timber)",
        "bridge: missing ambiguous or unresolved claim at its source location (stone)",
      ],
    });
  });

  it("requires both claims in one uncertain record", () => {
    const doc = document();
    doc.unresolved[0]!["message"] = conflict.claims[0]!.text;
    expect(scoreConflicts(doc, key()).details).toContain(
      "bridge: missing unresolved record of the conflict",
    );
    doc.unresolved[0]!["message"] = conflict.claims
      .map((claim) => claim.text)
      .join(" ");
    doc.unresolved[0]!.epistemicStatus = "inferred";
    expect(scoreConflicts(doc, key()).details).toContain(
      "bridge: missing unresolved record of the conflict",
    );
  });

  it("does not apply without keyed conflicts", () => {
    expect(scoreConflicts(document(), makeKey())).toEqual({
      status: "n/a",
      details: [],
    });
  });
});
