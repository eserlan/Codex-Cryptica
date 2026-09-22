import { describe, expect, it } from "vitest";
import { changedSections } from "./diff";
import type { Development } from "./types";

const base: Development = {
  mode: "develop",
  alreadyInteresting: "Everything is made from dragon parts.",
  centralQuestion: "Where do the parts come from?",
  makeItMove: "The last shipment is late.",
  peopleWhoCare: [
    { name: "Mara", role: "Smith", wants: "Scales", conflictsWith: "Warden" },
    { name: "Warden", role: "Guard", wants: "Peace", conflictsWith: "Mara" },
  ],
  playerDirections: [
    { title: "Follow it", description: "Trace it." },
    { title: "Search it", description: "Find it." },
  ],
  consequences: "The town runs dry.",
  creatorQuestions: ["Who built it?", "Why now?"],
  generatorSuggestions: [],
};

describe("changedSections", () => {
  it("reports nothing when the two are the same", () => {
    expect(changedSections(base, { ...base })).toEqual([]);
  });

  it("reports a changed text section", () => {
    expect(
      changedSections(base, {
        ...base,
        centralQuestion: "Who wants them back?",
      }),
    ).toEqual(["centralQuestion"]);
  });

  it("reports several changed sections, in the order they are shown", () => {
    const next = {
      ...base,
      consequences: "The Warden takes over.",
      alreadyInteresting: "The parts are running out.",
    };
    expect(changedSections(base, next)).toEqual([
      "alreadyInteresting",
      "consequences",
    ]);
  });

  it("notices a change inside a list", () => {
    const next = {
      ...base,
      peopleWhoCare: [
        { ...base.peopleWhoCare[0], wants: "Peace" },
        base.peopleWhoCare[1],
      ],
    };
    expect(changedSections(base, next)).toEqual(["peopleWhoCare"]);
    expect(
      changedSections(base, {
        ...base,
        creatorQuestions: ["Who built it?", "Who paid?"],
      }),
    ).toEqual(["creatorQuestions"]);
    expect(
      changedSections(base, {
        ...base,
        playerDirections: [
          base.playerDirections[0],
          { title: "Wait", description: "See." },
        ],
      }),
    ).toEqual(["playerDirections"]);
  });

  it("ignores spacing and letter case, so a reworded-only-by-whitespace section is unchanged", () => {
    expect(
      changedSections(base, {
        ...base,
        makeItMove: "  the last SHIPMENT is late.  ",
      }),
    ).toEqual([]);
  });

  it("does not count the mode, the what-changed line or the generator links", () => {
    expect(
      changedSections(base, {
        ...base,
        mode: "assess",
        whatChanged: "Looked at it another way.",
        generatorSuggestions: [{ generatorKey: "npc", reason: "A person." }],
      }),
    ).toEqual([]);
  });

  it("treats a first result, with nothing before it, as having no changes to show", () => {
    expect(changedSections(null, base)).toEqual([]);
    expect(changedSections(undefined, base)).toEqual([]);
  });
});
