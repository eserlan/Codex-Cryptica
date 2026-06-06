import { describe, expect, it } from "vitest";
import {
  getBeginMeaning,
  getEndMeaning,
  getMeanings,
  MEANING_SETS,
} from "../src";

describe("meaning sets", () => {
  it("provides type-specific meanings and universal custom anchors", () => {
    expect(getMeanings("character").map((meaning) => meaning.id)).toEqual(
      expect.arrayContaining([
        "born",
        "died",
        "activePeriod",
        "reign",
        "majorAppearance",
        "custom",
      ]),
    );
    expect(getMeanings("faction").map((meaning) => meaning.id)).toEqual(
      expect.arrayContaining([
        "founded",
        "dissolved",
        "schism",
        "merger",
        "custom",
      ]),
    );
  });

  it("defines one primary meaning per explicit entity type", () => {
    for (const meanings of Object.values(MEANING_SETS)) {
      expect(
        meanings.filter((meaning) => meaning.role === "primary"),
      ).toHaveLength(1);
    }
  });

  it("resolves begin and end meanings with a generic fallback", () => {
    expect(getBeginMeaning("character").id).toBe("born");
    expect(getEndMeaning("character")?.id).toBe("died");
    expect(getBeginMeaning("creature").id).toBe("date");
    expect(getEndMeaning("creature")?.id).toBe("end_date");
  });
});
