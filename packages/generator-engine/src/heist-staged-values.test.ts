import { describe, expect, it } from "vitest";
import { arr, detailText, rec, text } from "./heist-staged-values";

describe("stage value normalisation", () => {
  it("trims strings and joins only string array entries", () => {
    expect(text("  guard shift  ")).toBe("guard shift");
    expect(text([" guard", 3, null, "shift "])).toBe("guard shift");
    const list = ["guard"];
    const object = { title: "Score" };
    expect(arr(list)).toBe(list);
    expect(rec(object)).toBe(object);
  });

  it("uses empty values for incompatible input shapes", () => {
    for (const value of [undefined, null, 4, true, {}]) {
      expect(text(value)).toBe("");
      expect(arr(value)).toEqual([]);
    }
    for (const value of [undefined, null, 4, "title", []]) {
      expect(rec(value)).toEqual({});
    }
  });

  it("normalises detail fields with the authored text fallback", () => {
    expect(detailText({ detail: " Detail ", text: "Fallback" })).toBe("Detail");
    expect(detailText({ detail: "", text: " Fallback " })).toBe("Fallback");
    expect(detailText({ detail: 42 })).toBe("42");
    expect(detailText({})).toBe("");
  });
});
