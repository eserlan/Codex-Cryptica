import { describe, expect, it } from "bun:test";
import { visiblePatchSchema } from "../src/schemas";

describe("NPC visual cues", () => {
  const patch = (cues: string[]) => {
    const empty = { add: [], update: [], removeIds: [] };
    return {
      objectives: empty,
      activeCharacters: {
        ...empty,
        add: [{ text: "An official", source: "provisional", cues }],
      },
      knownFacts: empty,
      relationships: empty,
    };
  };

  it("preserves eight descriptive cues and rejects a ninth", () => {
    const cues = [
      "human",
      "official",
      "uniform",
      "silver hair",
      "scar",
      "tall",
      "stern",
      "space-station",
    ];
    const result = visiblePatchSchema.parse(patch(cues));
    expect(result.activeCharacters.add[0]?.cues).toEqual(cues);
    expect(
      visiblePatchSchema.safeParse(patch([...cues, "boots"])).success,
    ).toBe(false);
  });
});
