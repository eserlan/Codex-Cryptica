import { describe, expect, it } from "bun:test";
import { allocatePromptBudget } from "../src/context-budget";

describe("allocatePromptBudget", () => {
  it("keeps GM-only lore separate and within its own retrieval budget", () => {
    const result = allocatePromptBudget({
      behavior: "GM",
      state: "{}",
      input: "{}",
      transcript: "[]",
      anchors: [],
      relevant: [
        {
          recordId: "bridge-1",
          displayName: "Flooded Bridge",
          content: "public fact",
          lore: "s".repeat(6_001),
          role: "turn-source",
        },
      ],
    });

    expect(result.relevant[0]).toEqual(
      expect.objectContaining({
        content: "public fact",
        lore: expect.stringMatching(/^s+…$/),
      }),
    );
    expect(JSON.parse(result.serialized).relevant[0].lore).toHaveLength(6_000);
  });
});
