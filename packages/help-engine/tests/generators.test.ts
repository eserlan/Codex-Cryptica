import { describe, expect, it } from "vitest";
import { GENERATOR_IDS } from "../src/actions";
import { GENERATORS } from "../src/registry";

describe("the generated generator list", () => {
  it("lists every generator once, with a plain label and description", () => {
    const ids = GENERATORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(29);
    for (const g of GENERATORS) {
      expect(g.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(g.label.trim().length).toBeGreaterThan(0);
      expect(g.description.trim().length).toBeGreaterThan(10);
    }
  });

  it("includes the generators people ask for by name", () => {
    const ids = GENERATORS.map((g) => g.id);
    for (const wanted of [
      "npc",
      "faction",
      "settlement",
      "dungeon",
      "heist",
      "quest",
    ]) {
      expect(ids, wanted).toContain(wanted);
    }
  });

  it("is what the action catalogue accepts", () => {
    expect([...GENERATOR_IDS]).toEqual(GENERATORS.map((g) => g.id));
  });
});
