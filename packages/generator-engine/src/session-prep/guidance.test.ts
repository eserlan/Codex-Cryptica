import { describe, expect, it } from "vitest";
import {
  describeSessionPrepStep,
  guidancePrompt,
  rememberTurnedDown,
  SESSION_PREP_TURNED_DOWN_LIMIT,
} from "./guidance";
import { createEmptySessionPrep } from "./model";

describe("describeSessionPrepStep", () => {
  it("describes a step's content as one line", () => {
    const prep = createEmptySessionPrep("hook");
    prep.people = [
      {
        id: "p",
        name: "Callan",
        wants: "the ledger burned",
        doesNext: "sends men",
        source: "ai",
      },
    ];
    prep.consequences.failure = "The courier dies";
    expect(describeSessionPrepStep(prep, "people")).toBe(
      "Callan, wants the ledger burned, sends men",
    );
    expect(describeSessionPrepStep(prep, "consequences")).toBe(
      "failure: The courier dies",
    );
  });

  it("returns nothing for an empty step", () => {
    expect(describeSessionPrepStep(createEmptySessionPrep(), "places")).toBe(
      "",
    );
  });
});

describe("rememberTurnedDown", () => {
  it("adds ideas newest last, moving repeats to the end and skipping blanks", () => {
    const list = rememberTurnedDown(
      [{ step: "start", text: "A brawl" }],
      [
        { step: "pressure", text: "A storm" },
        { step: "start", text: "  " },
        { step: "start", text: "A brawl" },
      ],
    );
    expect(list).toEqual([
      { step: "pressure", text: "A storm" },
      { step: "start", text: "A brawl" },
    ]);
  });

  it("keeps only the most recent ideas", () => {
    const ideas = Array.from(
      { length: SESSION_PREP_TURNED_DOWN_LIMIT + 3 },
      (_, i) => ({ step: "reserve" as const, text: `Idea ${i}` }),
    );
    const list = rememberTurnedDown([], ideas);
    expect(list).toHaveLength(SESSION_PREP_TURNED_DOWN_LIMIT);
    expect(list[0].text).toBe("Idea 3");
  });
});

describe("guidancePrompt", () => {
  it("is empty without guidance", () => {
    expect(guidancePrompt(undefined)).toBe("");
    expect(guidancePrompt({ steers: { people: " " } })).toBe("");
  });
});
