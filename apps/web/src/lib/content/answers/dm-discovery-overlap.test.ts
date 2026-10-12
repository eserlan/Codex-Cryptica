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
});
