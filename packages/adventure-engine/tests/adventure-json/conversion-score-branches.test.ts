import { describe, expect, it } from "vitest";
import { scoreBranches } from "../../src/adventure-json/conversion-score-branches";
import { makeDocument, makeKey } from "./conversion-score-fixtures";

const key = () => {
  const value = makeKey();
  return makeKey({
    sections: [
      { sourceId: "side", title: "Side Room" },
      { sourceId: "obstacle", title: "Gate" },
    ],
    branch: { ...value.branch, sourceId: "side" },
    alternativeSolution: {
      ...value.alternativeSolution,
      obstacleSourceId: "obstacle",
      socialBypassOfCombat: true,
    },
  });
};
const document = () =>
  makeDocument({
    scenes: [
      { id: "side-scene", optional: true, sourceRef: { anchor: "side" } },
      { id: "gate-scene", sourceRef: { section: "Gate" } },
    ],
    encounters: [
      {
        id: "gate",
        sceneId: "gate-scene",
        alternativeSolutions: [{ socialBypassOfCombat: true }],
      },
    ],
  });

describe("conversion branch scoring", () => {
  it("accepts an optional scene and an encounter citing its obstacle through a scene", () => {
    expect(scoreBranches(document(), key())).toEqual({
      status: "pass",
      details: [],
    });
  });

  it("accepts an optional incoming branch and a directly cited encounter", () => {
    const doc = document();
    doc.scenes[0]!["optional"] = false;
    doc.scenes[1]!["branches"] = [
      { targetSceneId: "side-scene", optional: true },
    ];
    doc.encounters[0]!["sceneId"] = "absent";
    doc.encounters[0]!.sourceRef = { anchor: "obstacle" };
    expect(scoreBranches(doc, key()).status).toBe("pass");
  });

  it("reports missing optional paths before absent obstacle encounters", () => {
    expect(scoreBranches(makeDocument(), key())).toEqual({
      status: "fail",
      details: [
        "missing optional path side",
        "missing alternative solution encounter obstacle",
      ],
    });
    const doc = document();
    doc.encounters[0]!["sceneId"] = "absent";
    expect(scoreBranches(doc, key()).details).toEqual([
      "missing alternative solution encounter obstacle",
    ]);
  });

  it("requires a social bypass or two solutions according to the key", () => {
    const doc = document();
    doc.encounters[0]!["alternativeSolutions"] = [
      { socialBypassOfCombat: false },
    ];
    expect(scoreBranches(doc, key()).details).toEqual([
      "missing social bypass for encounter gate",
    ]);
    const multipleSolutions = key();
    multipleSolutions.alternativeSolution.socialBypassOfCombat = false;
    expect(scoreBranches(doc, multipleSolutions).details).toEqual([
      "missing second alternative solution for encounter gate",
    ]);
    doc.encounters[0]!["alternativeSolutions"] = [{}, {}];
    expect(scoreBranches(doc, multipleSolutions).status).toBe("pass");
  });

  it("requires keyed source sections and scores only the first matching encounter", () => {
    const doc = document();
    doc.encounters.unshift({ id: "first", sourceRef: { anchor: "obstacle" } });
    expect(scoreBranches(doc, key()).details).toEqual([
      "missing social bypass for encounter first",
    ]);
    const withoutSections = key();
    withoutSections.sections = [];
    expect(scoreBranches(doc, withoutSections).details).toEqual([
      "missing optional path side",
      "missing alternative solution encounter obstacle",
    ]);
  });
});
