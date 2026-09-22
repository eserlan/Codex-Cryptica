import { describe, expect, it } from "vitest";
import {
  MODES,
  emphasisFor,
  getMode,
  isModeId,
  listModes,
  type ModeDefinition,
} from "./modes";

describe("modes table", () => {
  it("defines exactly Assess and Develop", () => {
    expect(Object.keys(MODES).sort()).toEqual(["assess", "develop"]);
    expect(listModes().map((m) => m.id)).toEqual(["assess", "develop"]);
  });

  it("gives each mode a label, a description and an emphasis", () => {
    for (const mode of listModes()) {
      expect(mode.label.length).toBeGreaterThan(0);
      expect(mode.description.length).toBeGreaterThan(0);
      expect(mode.emphasis.length).toBeGreaterThan(0);
    }
  });

  it("rejects an unknown id", () => {
    expect(isModeId("assess")).toBe(true);
    expect(isModeId("challenge")).toBe(false);
    expect(isModeId(undefined)).toBe(false);
    expect(getMode("challenge")).toBeUndefined();
  });

  it("makes a new mode selectable by adding one table entry", () => {
    const extra: ModeDefinition = {
      id: "challenge" as never,
      label: "Challenge it",
      description: "Look for weak assumptions.",
      emphasis: "Challenge the idea.",
    };
    const table = { ...MODES, challenge: extra } as never;
    expect(listModes(table).map((m) => m.id)).toContain("challenge");
  });

  it("does not offer modes that are not defined", () => {
    const ids = listModes().map((m) => m.id as string);
    for (const later of ["explore", "playable", "challenge"]) {
      expect(ids).not.toContain(later);
    }
  });

  it("gives Assess an emphasis that forbids inventing new factions", () => {
    expect(emphasisFor("assess")).toMatch(/do not invent new factions/i);
  });

  it("gives Develop an emphasis on pressure and incompatible interests", () => {
    expect(emphasisFor("develop")).toMatch(/pressure/i);
    expect(emphasisFor("develop")).toMatch(/incompatible interests/i);
  });
});
