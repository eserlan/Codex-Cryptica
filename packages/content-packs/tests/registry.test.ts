import { describe, it, expect } from "vitest";
import { listPacks, getPack } from "../src/creature-pack-registry.js";

describe("creature-pack-registry", () => {
  it("listPacks returns at least one pack", () => {
    expect(listPacks().length).toBeGreaterThan(0);
  });

  it("listPacks pack ids are unique", () => {
    const ids = listPacks().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getPack returns the fantasy-bestiary pack", () => {
    const pack = getPack("fantasy-bestiary");
    expect(pack).toBeDefined();
    expect(pack!.id).toBe("fantasy-bestiary");
  });

  it("getPack returns undefined for unknown id", () => {
    expect(getPack("nonexistent-pack")).toBeUndefined();
  });
});
