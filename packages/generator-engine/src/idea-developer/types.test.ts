import { describe, expect, it } from "vitest";
import {
  CREATOR_QUESTIONS_MAX,
  PEOPLE_WHO_CARE_MAX,
  validateDevelopmentShape,
} from "./types";

const person = (n: number) => ({
  name: `Person ${n}`,
  role: "Role",
  wants: "Something",
  conflictsWith: "Someone else",
});

function valid(overrides: Record<string, unknown> = {}) {
  return {
    alreadyInteresting: "Everything is made from dragon parts.",
    centralQuestion: "Where do the parts come from?",
    makeItMove: "The last shipment is late.",
    peopleWhoCare: [person(1), person(2)],
    playerDirections: [
      { title: "Follow the shipment", description: "Trace it." },
      { title: "Search the cellars", description: "Find the source." },
    ],
    consequences: "The town runs out of parts.",
    creatorQuestions: ["Who built it?", "Are dragons extinct?"],
    generatorSuggestions: [],
    ...overrides,
  };
}

describe("validateDevelopmentShape", () => {
  it("accepts a valid first-turn development without whatChanged", () => {
    const result = validateDevelopmentShape(valid(), { turnIndex: 0 });
    expect(result.ok).toBe(true);
  });

  it("rejects a missing section", () => {
    const { centralQuestion: _drop, ...rest } = valid();
    const result = validateDevelopmentShape(rest, { turnIndex: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty section", () => {
    const result = validateDevelopmentShape(valid({ consequences: "  " }), {
      turnIndex: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects too few people who care", () => {
    const result = validateDevelopmentShape(
      valid({ peopleWhoCare: [person(1)] }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(false);
  });

  it("trims extra people to the maximum instead of rejecting a good answer", () => {
    const people = Array.from({ length: PEOPLE_WHO_CARE_MAX + 2 }, (_, i) =>
      person(i),
    );
    const result = validateDevelopmentShape(valid({ peopleWhoCare: people }), {
      turnIndex: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.peopleWhoCare).toHaveLength(PEOPLE_WHO_CARE_MAX);
      expect(result.value.peopleWhoCare[0].name).toBe("Person 0");
    }
  });

  it("rejects a person whose conflict is empty", () => {
    const people = [person(1), { ...person(2), conflictsWith: "" }];
    const result = validateDevelopmentShape(valid({ peopleWhoCare: people }), {
      turnIndex: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects too few creator questions", () => {
    const result = validateDevelopmentShape(
      valid({ creatorQuestions: ["Only one?"] }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(false);
  });

  it("trims extra creator questions to the maximum", () => {
    const questions = Array.from(
      { length: CREATOR_QUESTIONS_MAX + 3 },
      (_, i) => `Question ${i}?`,
    );
    const result = validateDevelopmentShape(
      valid({ creatorQuestions: questions }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.creatorQuestions).toHaveLength(CREATOR_QUESTIONS_MAX);
    }
  });

  it("rejects fewer than two player directions", () => {
    const result = validateDevelopmentShape(
      valid({ playerDirections: [{ title: "Only one", description: "x" }] }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(false);
  });

  it("drops a repeated direction and keeps the rest when enough remain", () => {
    const result = validateDevelopmentShape(
      valid({
        playerDirections: [
          { title: "Follow it", description: "a" },
          { title: "  follow IT ", description: "b" },
          { title: "Search it", description: "c" },
        ],
      }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.playerDirections.map((d) => d.title)).toEqual([
        "Follow it",
        "Search it",
      ]);
    }
  });

  it("rejects when repeated directions leave fewer than two", () => {
    const result = validateDevelopmentShape(
      valid({
        playerDirections: [
          { title: "Follow it", description: "a" },
          { title: "follow it", description: "b" },
        ],
      }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(false);
  });

  it("accepts a list of strings where a sentence was expected", () => {
    const result = validateDevelopmentShape(
      valid({
        peopleWhoCare: [
          { ...person(1), wants: ["Scales", "Peace"] },
          { ...person(2), conflictsWith: ["Mara", "The Warden"] },
        ],
      }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.peopleWhoCare[0].wants).toBe("Scales; Peace");
    }
  });

  it("requires whatChanged after the first turn and rejects it when empty", () => {
    expect(validateDevelopmentShape(valid(), { turnIndex: 1 }).ok).toBe(false);
    expect(
      validateDevelopmentShape(valid({ whatChanged: " " }), { turnIndex: 1 })
        .ok,
    ).toBe(false);
    expect(
      validateDevelopmentShape(
        valid({ whatChanged: "Sharpened the rivals." }),
        {
          turnIndex: 1,
        },
      ).ok,
    ).toBe(true);
  });

  it("ignores whatChanged on the first turn", () => {
    const result = validateDevelopmentShape(valid({ whatChanged: "x" }), {
      turnIndex: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.whatChanged).toBeUndefined();
  });

  it("rejects a non-object", () => {
    expect(validateDevelopmentShape(null, { turnIndex: 0 }).ok).toBe(false);
    expect(validateDevelopmentShape("text", { turnIndex: 0 }).ok).toBe(false);
  });
});
