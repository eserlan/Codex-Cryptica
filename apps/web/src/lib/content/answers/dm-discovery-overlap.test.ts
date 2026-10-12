import { describe, expect, it } from "vitest";
import { answers } from "./pages";

describe("Dungeon Master answer discovery metadata", () => {
  it("records its distinct scope from first-game guidance", () => {
    const answer =
      answers["what-are-the-pros-and-cons-of-becoming-a-dungeon-master"];

    expect(answer?.discovery?.acknowledgedOverlap).toContainEqual(
      expect.objectContaining({
        with: "answer-new-dnd-player-first-game",
        reason: expect.any(String),
      }),
    );
  });

  it("links prospective DMs to the player-focused D&D beginner hub", () => {
    const answer =
      answers["what-are-the-pros-and-cons-of-becoming-a-dungeon-master"];

    expect(answer?.relatedTopics).toContainEqual({
      title: "D&D for Beginners",
      href: "/topics/dnd-beginners",
      description:
        "A player-focused learning path through the table conversation, character sheets, dice, and combat turns.",
    });
    expect(answer?.discovery?.relatedIntents).toContain("topic-dnd-beginners");
  });

  it("labels the worked example by its actual preparation contrast", () => {
    const answer =
      answers["what-are-the-pros-and-cons-of-becoming-a-dungeon-master"];
    const example = answer?.sections.find(
      (section) => section.kind === "example",
    );

    expect(example?.kind).toBe("example");
    if (example?.kind !== "example") return;

    expect(example.heading).toBe(
      "Worked example: the same one-shot idea, two preparation approaches",
    );
    expect(example.items?.map((item) => item.term)).toContain(
      "The fixed-sequence approach",
    );
    expect(example.items?.map((item) => item.term)).toContain(
      "The focused situation approach",
    );
  });
});
