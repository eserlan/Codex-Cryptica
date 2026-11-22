import { describe, expect, it } from "vitest";
import { scoreAuthoredVsRumour } from "../../src/adventure-json/conversion-score-testimony";
import { makeDocument, makeKey } from "./conversion-score-fixtures";

const testimony = {
  id: "alibi",
  npc: "Maren",
  claim: "Maren saw the bailiff stealing grain.",
  truth: "false" as const,
  canonicalFact: "The bailiff was elsewhere.",
  sourceId: "mill",
};
const key = () => makeKey({ testimonies: [testimony] });

describe("conversion testimony scoring", () => {
  it("accepts a rumour with the keyed truth status", () => {
    const doc = makeDocument({
      rumours: [
        { id: "rumour", text: testimony.claim, truth: testimony.truth },
      ],
    });
    expect(scoreAuthoredVsRumour(doc, key())).toEqual({
      status: "pass",
      details: [],
    });
  });

  it("reports both incorrect truth and testimony promoted to a secret", () => {
    const doc = makeDocument({
      rumours: [{ id: "rumour", text: testimony.claim, truth: "true" }],
      secrets: [{ id: "secret", text: testimony.claim }],
    });
    expect(scoreAuthoredVsRumour(doc, key())).toEqual({
      status: "fail",
      details: ["missing testimony alibi", "testimony alibi found in secret"],
    });
  });

  it("does not apply without testimonies and tolerates records without text", () => {
    expect(scoreAuthoredVsRumour(makeDocument(), makeKey())).toEqual({
      status: "n/a",
      details: [],
    });
    expect(
      scoreAuthoredVsRumour(
        makeDocument({
          rumours: [{ id: "empty" }],
          secrets: [{ id: "empty" }],
        }),
        key(),
      ).details,
    ).toEqual(["missing testimony alibi"]);
  });
});
