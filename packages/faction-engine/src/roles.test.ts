import { describe, expect, it } from "vitest";
import type { Entity } from "schema";
import { resolveRole, isRoleMapped, missingRoles } from "./roles";

function faction(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "faction-black-eagles",
    type: "faction",
    title: "Black Eagles",
    labels: [],
    aliases: [],
    connections: [],
    content: "",
    status: "active",
    statSheet: {
      fields: [
        { id: "fld_sway", label: "Political Reach", type: "number", value: 6 },
        {
          id: "fld_grit",
          label: "Morale",
          type: "number",
          value: 4,
          min: 0,
          max: 10,
        },
      ],
    },
    factionTurn: {
      enabled: true,
      statRoles: { influence: "fld_sway", stability: "fld_grit" },
      history: [],
    },
    ...overrides,
  } as Entity;
}

describe("resolveRole", () => {
  it("returns the mapped field with its label and value", () => {
    const result = resolveRole(faction(), "influence");
    expect(result.mapped).toBe(true);
    if (!result.mapped) return;
    expect(result.fieldId).toBe("fld_sway");
    expect(result.label).toBe("Political Reach");
    expect(result.value).toBe(6);
  });

  it("survives the stat being renamed, because roles map to ids not labels", () => {
    // The whole point of mapping by field id (FR-004a): a GM renaming their
    // stat to fit their setting must not silently break resolution.
    const renamed = faction({
      statSheet: {
        fields: [
          { id: "fld_sway", label: "Fleet Command", type: "number", value: 6 },
        ],
      },
    });
    const result = resolveRole(renamed, "influence");
    expect(result.mapped).toBe(true);
    if (!result.mapped) return;
    expect(result.label).toBe("Fleet Command");
    expect(result.value).toBe(6);
  });

  it("reads as unmapped when the mapping points at a deleted field", () => {
    const deleted = faction({
      statSheet: {
        fields: [{ id: "fld_other", label: "Other", type: "number", value: 1 }],
      },
    });
    const result = resolveRole(deleted, "influence");
    expect(result.mapped).toBe(false);
  });

  it("does not throw when the mapping points at a deleted field", () => {
    const deleted = faction({ statSheet: { fields: [] } });
    expect(() => resolveRole(deleted, "influence")).not.toThrow();
  });

  it("reads as unmapped when the role was never mapped", () => {
    expect(resolveRole(faction(), "power").mapped).toBe(false);
  });

  it("reads as unmapped when the faction never opted in", () => {
    const plain = faction({ factionTurn: undefined });
    expect(resolveRole(plain, "influence").mapped).toBe(false);
  });

  it("reads as unmapped when the faction has no stat sheet at all", () => {
    const noSheet = faction({ statSheet: undefined });
    expect(resolveRole(noSheet, "influence").mapped).toBe(false);
  });

  it("treats a non-numeric field value as unmapped rather than coercing it", () => {
    // Coercing "" or a text field to 0 would silently resolve turns against a
    // stat the GM never scored, producing outcomes they cannot explain.
    const text = faction({
      statSheet: {
        fields: [
          { id: "fld_sway", label: "Notes", type: "text", value: "high" },
        ],
      },
    });
    expect(resolveRole(text, "influence").mapped).toBe(false);
  });

  it("carries the field bounds through, for clamping at commit (FR-034)", () => {
    const result = resolveRole(faction(), "stability");
    expect(result.mapped).toBe(true);
    if (!result.mapped) return;
    expect(result.min).toBe(0);
    expect(result.max).toBe(10);
  });
});

describe("isRoleMapped / missingRoles", () => {
  it("reports which required roles are missing (FR-005)", () => {
    expect(missingRoles(faction(), ["influence", "power"])).toEqual(["power"]);
  });

  it("reports nothing missing when every required role resolves", () => {
    expect(missingRoles(faction(), ["influence", "stability"])).toEqual([]);
  });

  it("ignores roles the action does not require (FR-005)", () => {
    // Influence needs only `influence`; requiring all four would block a GM who
    // never modelled military power.
    expect(missingRoles(faction(), ["influence"])).toEqual([]);
  });

  it("agrees with resolveRole", () => {
    expect(isRoleMapped(faction(), "influence")).toBe(true);
    expect(isRoleMapped(faction(), "resources")).toBe(false);
  });
});
