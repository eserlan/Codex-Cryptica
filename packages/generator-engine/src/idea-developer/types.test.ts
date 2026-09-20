import { describe, expect, it } from "vitest";
import {
  CREATOR_QUESTIONS_MAX,
  CREATOR_QUESTIONS_MIN,
  PEOPLE_WHO_CARE_MAX,
  PEOPLE_WHO_CARE_MIN,
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

  it.each([[PEOPLE_WHO_CARE_MIN - 1], [PEOPLE_WHO_CARE_MAX + 1]])(
    "rejects %i people who care",
    (count) => {
      const people = Array.from({ length: count }, (_, i) => person(i));
      const result = validateDevelopmentShape(
        valid({ peopleWhoCare: people }),
        {
          turnIndex: 0,
        },
      );
      expect(result.ok).toBe(false);
    },
  );

  it("rejects a person whose conflict is empty", () => {
    const people = [person(1), { ...person(2), conflictsWith: "" }];
    const result = validateDevelopmentShape(valid({ peopleWhoCare: people }), {
      turnIndex: 0,
    });
    expect(result.ok).toBe(false);
  });

  it.each([[CREATOR_QUESTIONS_MIN - 1], [CREATOR_QUESTIONS_MAX + 1]])(
    "rejects %i creator questions",
    (count) => {
      const questions = Array.from(
        { length: count },
        (_, i) => `Question ${i}?`,
      );
      const result = validateDevelopmentShape(
        valid({ creatorQuestions: questions }),
        { turnIndex: 0 },
      );
      expect(result.ok).toBe(false);
    },
  );

  it("rejects fewer than two player directions", () => {
    const result = validateDevelopmentShape(
      valid({ playerDirections: [{ title: "Only one", description: "x" }] }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects two directions with the same title, trimmed and case-insensitive", () => {
    const result = validateDevelopmentShape(
      valid({
        playerDirections: [
          { title: "Follow it", description: "a" },
          { title: "  follow IT ", description: "b" },
        ],
      }),
      { turnIndex: 0 },
    );
    expect(result.ok).toBe(false);
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
