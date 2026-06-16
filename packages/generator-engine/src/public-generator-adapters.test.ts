import { describe, it, expect } from "vitest";
import {
  adaptNPC,
  adaptFaction,
  adaptSettlement,
  adaptMagicItem,
} from "./public-generator-adapters";

describe("public generator adapters (T052)", () => {
  it("adaptNPC returns PublicGeneratorOutput shape", () => {
    const result = adaptNPC();
    expect(typeof result.type).toBe("string");
    expect(typeof result.title).toBe("string");
    expect(typeof result.content).toBe("string");
    expect(typeof result.lore).toBe("string");
    expect(Array.isArray(result.labels)).toBe(true);
    expect(result.title).toBeTruthy();
    expect(result.type).toBe("character");
  });

  it("adaptFaction returns PublicGeneratorOutput shape", () => {
    const result = adaptFaction();
    expect(result.type).toBe("faction");
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.lore.length).toBeGreaterThan(0);
  });

  it("adaptSettlement returns PublicGeneratorOutput shape", () => {
    const result = adaptSettlement();
    expect(result.type).toBe("location");
    expect(result.title.length).toBeGreaterThan(0);
  });

  it("adaptMagicItem returns PublicGeneratorOutput shape", () => {
    const result = adaptMagicItem();
    expect(result.type).toBe("item");
    expect(result.title.length).toBeGreaterThan(0);
  });

  it("accepts themeId and produces output without throwing", () => {
    expect(() => adaptNPC({}, "fantasy")).not.toThrow();
    expect(() => adaptSettlement({}, "cyberpunk")).not.toThrow();
    expect(() => adaptFaction({}, "horror")).not.toThrow();
  });

  it("unknown themeId falls back gracefully", () => {
    expect(() => adaptNPC({}, "gothic")).not.toThrow();
  });
});
