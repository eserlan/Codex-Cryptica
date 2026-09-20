import { describe, expect, it } from "vitest";
import { parseDevelopmentResponse } from "./parse";

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
    generatorSuggestions: [{ generatorKey: "settlement", reason: "The town." }],
    ...overrides,
  };
}

const json = (value: unknown) => JSON.stringify(value);

describe("parseDevelopmentResponse", () => {
  it("accepts a valid response", () => {
    const result = parseDevelopmentResponse(json(valid()), { turnIndex: 0 });
    expect(result.kind).toBe("development");
    if (result.kind === "development") {
      expect(result.development.centralQuestion).toBe(
        "Where do the parts come from?",
      );
      expect(result.development.generatorSuggestions).toHaveLength(1);
    }
  });

  it("accepts a response wrapped in a code fence", () => {
    const result = parseDevelopmentResponse(
      "```json\n" + json(valid()) + "\n```",
      { turnIndex: 0 },
    );
    expect(result.kind).toBe("development");
  });

  it("records the mode it was asked for", () => {
    const result = parseDevelopmentResponse(json(valid()), {
      turnIndex: 0,
      mode: "assess",
    });
    if (result.kind === "development") {
      expect(result.development.mode).toBe("assess");
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseDevelopmentResponse("{not json", { turnIndex: 0 });
    expect(result.kind).toBe("invalid");
  });

  it("rejects text that is not an object", () => {
    expect(parseDevelopmentResponse("[]", { turnIndex: 0 }).kind).toBe(
      "invalid",
    );
    expect(parseDevelopmentResponse('"hi"', { turnIndex: 0 }).kind).toBe(
      "invalid",
    );
  });

  it.each(["score", "rating", "grade"])(
    "rejects a response with a %s key, even nested",
    (key) => {
      const top = parseDevelopmentResponse(json(valid({ [key]: 7 })), {
        turnIndex: 0,
      });
      expect(top.kind).toBe("invalid");
      const nested = parseDevelopmentResponse(
        json(
          valid({
            playerDirections: [
              { title: "A", description: "x", [key]: 3 },
              { title: "B", description: "y" },
            ],
          }),
        ),
        { turnIndex: 0 },
      );
      expect(nested.kind).toBe("invalid");
    },
  );

  it.each([
    "This idea is a 7/10.",
    "Rated 8 out of 10 for playability.",
    "It earns a score of 9.",
    "Overall rating: 4",
  ])("rejects rating-shaped text: %s", (line) => {
    const result = parseDevelopmentResponse(
      json(valid({ alreadyInteresting: line })),
      { turnIndex: 0 },
    );
    expect(result.kind).toBe("invalid");
  });

  it("allows ordinary numbers that are not ratings", () => {
    const result = parseDevelopmentResponse(
      json(
        valid({
          consequences: "About 30% of the town leaves within 3 weeks.",
        }),
      ),
      { turnIndex: 0 },
    );
    expect(result.kind).toBe("development");
  });

  it("rejects a response with a missing section", () => {
    const { consequences: _drop, ...rest } = valid();
    expect(parseDevelopmentResponse(json(rest), { turnIndex: 0 }).kind).toBe(
      "invalid",
    );
  });

  it("returns the needsRpgIdea variant unchanged", () => {
    const result = parseDevelopmentResponse(
      json({ needsRpgIdea: true, message: "Tell me about a game idea." }),
      { turnIndex: 0 },
    );
    expect(result).toEqual({
      kind: "needs-rpg-idea",
      message: "Tell me about a game idea.",
    });
  });

  it("requires whatChanged after the first turn", () => {
    expect(parseDevelopmentResponse(json(valid()), { turnIndex: 2 }).kind).toBe(
      "invalid",
    );
    expect(
      parseDevelopmentResponse(
        json(valid({ whatChanged: "Sharper rivals." })),
        {
          turnIndex: 2,
        },
      ).kind,
    ).toBe("development");
  });

  it("drops nothing else silently: unknown suggestion keys survive parsing", () => {
    const result = parseDevelopmentResponse(
      json(
        valid({ generatorSuggestions: [{ generatorKey: "zzz", reason: "r" }] }),
      ),
      { turnIndex: 0 },
    );
    if (result.kind === "development") {
      expect(result.development.generatorSuggestions).toEqual([
        { generatorKey: "zzz", reason: "r" },
      ]);
    } else {
      throw new Error("expected a development");
    }
  });

  it("rejects an empty whatChanged after the first turn", () => {
    expect(
      parseDevelopmentResponse(json(valid({ whatChanged: "   " })), {
        turnIndex: 3,
      }).kind,
    ).toBe("invalid");
  });

  it("ignores whatChanged on the first turn", () => {
    const result = parseDevelopmentResponse(
      json(valid({ whatChanged: "Should not appear." })),
      { turnIndex: 0 },
    );
    if (result.kind !== "development")
      throw new Error("expected a development");
    expect(result.development.whatChanged).toBeUndefined();
  });

  it("allows an ordinary field called rank, such as a title in an organisation", () => {
    const withRank = valid({
      peopleWhoCare: [
        { ...person(1), rank: "Captain" },
        { ...person(2), rank: "Lieutenant" },
      ],
    });
    expect(
      parseDevelopmentResponse(json(withRank), { turnIndex: 0 }).kind,
    ).toBe("development");
  });

  it("does not mistake counts in the story for a rating", () => {
    for (const line of [
      "Three out of five villagers have left.",
      "About 3 out of 100 households still keep a dragon-bone door.",
      "They arrive at 5/2 in the old calendar.",
    ]) {
      const result = parseDevelopmentResponse(
        json(valid({ consequences: line })),
        { turnIndex: 0 },
      );
      expect(result.kind, line).toBe("development");
    }
  });

  it("finds the JSON when the model wraps it in a sentence", () => {
    const wrapped =
      "Here is the development:\n" + json(valid()) + "\nHope that helps.";
    expect(parseDevelopmentResponse(wrapped, { turnIndex: 0 }).kind).toBe(
      "development",
    );
  });

  it("still rejects text that has no JSON at all", () => {
    expect(
      parseDevelopmentResponse("Sorry, I can't do that.", { turnIndex: 0 })
        .kind,
    ).toBe("invalid");
  });
});
