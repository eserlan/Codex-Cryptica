import { describe, expect, it } from "vitest";
import { text, textList, presenceOf } from "./dungeon-stage-data";

describe("stage reply fields", () => {
  it("trims strings and joins only string fragments", () => {
    expect(text("  lore  ")).toBe("lore");
    expect(text([" brass", 4, "idol "])).toBe("brass idol");
    expect(textList([" a ", ["b", "c"], null, 5, " "])).toEqual(["a", "b c"]);
    expect(text({ name: "ignored" })).toBe("");
    expect(textList("not a list")).toEqual([]);
  });

  it("keeps the first complete presence entry per sector", () => {
    expect(
      presenceOf({
        presence: [
          null,
          { sectorId: "sector-1", detail: " " },
          { sectorId: " sector-1 ", detail: [" First", "camp. "] },
          { sectorId: "sector-1", detail: "Duplicate." },
          { detail: "No sector." },
        ],
      }),
    ).toEqual([{ sectorId: "sector-1", detail: "First camp." }]);
    expect(presenceOf({})).toEqual([]);
  });
});
