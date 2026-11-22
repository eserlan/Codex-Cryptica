import { describe, expect, it } from "vitest";
import { scoreSourceAuthority } from "../../src/adventure-json/conversion-score-source-authority";
import { makeDocument, makeKey } from "./conversion-score-fixtures";

const authority = {
  id: "correction",
  targetSourceId: "opening",
  expectedText: "The watch opens at noon.",
  expectedTerm: "noon",
  supersededText: "The watch opens at dawn.",
  supersededTerm: "dawn",
  correctionSource: { page: 4, section: "Errata" },
  expectedTitle: "The Watch",
  expectedItemCount: 0,
};
const key = () => makeKey({ sourceAuthority: [authority] });
const document = () =>
  makeDocument({
    title: authority.expectedTitle,
    scenes: [
      {
        id: "opening",
        body: authority.expectedText,
        epistemicStatus: "explicit",
        sourceRef: authority.correctionSource,
      },
    ],
  });

describe("conversion source-authority scoring", () => {
  it("accepts an explicit correction cited by ID or anchor", () => {
    const doc = document();
    expect(scoreSourceAuthority(doc, key())).toEqual({
      status: "pass",
      details: [],
    });
    doc.scenes[0]!.id = "scene";
    doc.scenes[0]!.sourceRef = {
      ...authority.correctionSource,
      anchor: "opening",
    };
    expect(scoreSourceAuthority(doc, key()).status).toBe("pass");
  });

  it("reports title, inventory, correction and supersession failures in order", () => {
    const doc = document();
    doc["title"] = "Wrong title";
    doc.items = [{ id: "extra" }];
    doc.scenes[0]!["body"] = authority.supersededText;
    expect(scoreSourceAuthority(doc, key())).toEqual({
      status: "fail",
      details: [
        'correction: expected adventure title "The Watch"',
        "correction: expected 0 item entries, found 1",
        "correction: missing explicit corrected claim",
        "correction: superseded claim remains explicit",
      ],
    });
  });

  it("requires the correction at the target and every expected source field", () => {
    const doc = document();
    doc.scenes[0]!.id = "unrelated";
    expect(scoreSourceAuthority(doc, key()).details).toEqual([
      "correction: missing explicit corrected claim",
    ]);
    doc.scenes[0]!.id = "opening";
    doc.scenes[0]!.sourceRef = { page: 5, section: "Errata" };
    expect(scoreSourceAuthority(doc, key()).details).toEqual([
      "correction: corrected claim does not cite the correction source",
    ]);
    doc.scenes[0]!.epistemicStatus = "inferred";
    expect(scoreSourceAuthority(doc, key()).details).toEqual([
      "correction: missing explicit corrected claim",
    ]);
  });

  it("skips unspecified inventory checks and absent authority cases", () => {
    const doc = document();
    doc.items = [{ id: "extra" }];
    const withoutCount = { ...authority, expectedItemCount: undefined };
    expect(
      scoreSourceAuthority(doc, makeKey({ sourceAuthority: [withoutCount] }))
        .status,
    ).toBe("pass");
    expect(scoreSourceAuthority(doc, makeKey())).toEqual({
      status: "n/a",
      details: [],
    });
  });
});
