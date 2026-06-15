import { describe, it, expect } from "vitest";
import { extractJsonObject } from "./ai-generator-gateway";

describe("extractJsonObject", () => {
  it("returns a clean object unchanged", () => {
    const s = '{"title":"A","lore":"b"}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ title: "A", lore: "b" });
  });

  it("salvages an object with a degenerate trailing run of braces", () => {
    const s = '{"title":"A","lore":"b"}\n}\n}\n}\n}\n}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ title: "A", lore: "b" });
  });

  it("strips code fences", () => {
    const s = '```json\n{"title":"A"}\n```';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ title: "A" });
  });

  it("ignores leading prose before the object", () => {
    const s = 'Here is your JSON:\n{"title":"A"}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ title: "A" });
  });

  it("does not get confused by braces inside string values", () => {
    const s = '{"lore":"a } b { c","title":"X"} trailing }}}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({
      lore: "a } b { c",
      title: "X",
    });
  });

  it("handles escaped quotes inside strings", () => {
    const s = '{"lore":"she said \\"hi\\""}}}}';
    expect(JSON.parse(extractJsonObject(s))).toEqual({ lore: 'she said "hi"' });
  });
});
