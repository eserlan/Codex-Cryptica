import { describe, it, expect } from "vitest";
import { isTitleBanned, bannedNamesInstruction } from "./naming-policy";

describe("isTitleBanned", () => {
  it("catches an exact banned name, case-insensitively", () => {
    expect(isTitleBanned("vance", ["Vance"])).toBe(true);
    expect(isTitleBanned("VANCE", ["Vance"])).toBe(true);
  });

  it("catches hyphenated/compound derivatives", () => {
    expect(isTitleBanned("Vane-Smithe", ["Vane"])).toBe(true);
  });

  it("does not flag a substring inside a larger, unrelated word", () => {
    expect(isTitleBanned("Vanessa", ["Vane"])).toBe(false);
  });

  it("returns false for an empty banned list or empty title", () => {
    expect(isTitleBanned("Vance", [])).toBe(false);
    expect(isTitleBanned("", ["Vance"])).toBe(false);
  });
});

describe("bannedNamesInstruction", () => {
  it("returns an empty string when there is nothing to ban", () => {
    expect(bannedNamesInstruction([])).toBe("");
  });

  it("lists every provided name and explains the hyphenated-derivative rule", () => {
    const result = bannedNamesInstruction(["Vance", "Elara"]);
    expect(result).toContain("Vance");
    expect(result).toContain("Elara");
    expect(result).toContain("Vane-Smithe");
    expect(result).toContain("this new entity's own title");
  });
});
