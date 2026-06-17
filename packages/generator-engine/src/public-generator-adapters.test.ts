import { describe, it, expect } from "vitest";
import {
  adaptNPC,
  adaptFaction,
  adaptSettlement,
  adaptMagicItem,
  adaptEvent,
  adaptVampire,
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

  it("adaptEvent maps to the event vault category", () => {
    const result = adaptEvent();
    expect(result.type).toBe("event");
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("adaptVampire generates a faction under the gothic theme", () => {
    const result = adaptVampire();
    expect(result.type).toBe("faction");
    expect(result.title.length).toBeGreaterThan(0);
    expect(() => adaptVampire({}, "vampire-gothic-noir")).not.toThrow();
  });

  it("content carries the rich body, never the empty string, for every adapter", () => {
    for (const adapt of [
      adaptNPC,
      adaptFaction,
      adaptSettlement,
      adaptMagicItem,
      adaptEvent,
      adaptVampire,
    ]) {
      const result = adapt();
      // content falls back to lore (then summary) and must never be blank
      expect(result.content.length).toBeGreaterThan(0);
    }
  });
});
