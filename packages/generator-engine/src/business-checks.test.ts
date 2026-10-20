import { describe, expect, it } from "vitest";
import { checkBusiness, repairBusiness } from "./business-checks";
import { generateBusinessLocal } from "./business-local";
import type { BusinessDocument } from "./business-state";

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function base(): BusinessDocument {
  return generateBusinessLocal(
    { genre: "Classic Fantasy", businessType: "Blacksmith" },
    seeded(42),
  );
}

describe("checkBusiness", () => {
  it("passes a complete, consistent local document", () => {
    expect(checkBusiness(base())).toEqual([]);
  });

  it("reports a missing required field", () => {
    const doc = base();
    doc.pressure = "";
    expect(checkBusiness(doc)).toContainEqual(
      expect.objectContaining({ section: "pressure", code: "missing" }),
    );
  });

  it("reports a hook that names nothing established in the business", () => {
    const doc = base();
    doc.hooks = [
      "Go somewhere far away and do something unrelated to anything here.",
    ];
    expect(checkBusiness(doc)).toContainEqual(
      expect.objectContaining({ section: "hooks", code: "hook-unanchored" }),
    );
  });

  it("reports a criminal secret on a fully legitimate business", () => {
    const doc = base();
    doc.options.legitimacy = "legitimate";
    doc.secret = "The owner runs a smuggling ring out of the back room.";
    expect(checkBusiness(doc)).toContainEqual(
      expect.objectContaining({
        section: "secret",
        code: "legit-secret-criminal",
      }),
    );
  });

  it("allows a criminal secret on a criminal front", () => {
    const doc = base();
    doc.options.legitimacy = "front";
    doc.secret = "The owner runs a smuggling ring out of the back room.";
    expect(
      checkBusiness(doc).filter((i) => i.code === "legit-secret-criminal"),
    ).toEqual([]);
  });

  it("reports staff outside the range for the scale", () => {
    const doc = base();
    doc.options.scale = "tiny";
    doc.staff = [
      { id: "staff-1", name: "A", role: "x", goal: "g", trait: "t" },
      { id: "staff-2", name: "B", role: "x", goal: "g", trait: "t" },
      { id: "staff-3", name: "C", role: "x", goal: "g", trait: "t" },
    ];
    expect(checkBusiness(doc)).toContainEqual(
      expect.objectContaining({
        section: "staff:staff-1",
        code: "staff-count",
      }),
    );
  });

  it("reports a price in a section", () => {
    const doc = base();
    doc.operations.mainIncome = "About 40 gp per month from repairs.";
    expect(checkBusiness(doc)).toContainEqual(
      expect.objectContaining({
        section: "operations",
        code: "inventory-list",
      }),
    );
  });

  it("reports management that does not match the players-own setting", () => {
    const doc = base();
    doc.management = {
      strengths: ["a"],
      liabilities: ["b"],
      upgrades: ["c"],
      obligations: ["d"],
      successAttracts: ["e"],
    };
    expect(checkBusiness(doc)).toContainEqual(
      expect.objectContaining({
        section: "management",
        code: "management-mismatch",
      }),
    );
  });
});

describe("repairBusiness", () => {
  it("returns a document with no remaining issues", () => {
    const doc = base();
    doc.pressure = "";
    doc.hooks = ["Something unrelated to anything here at all."];
    doc.operations.mainIncome = "About 40 gp a month.";
    const repaired = repairBusiness(doc, checkBusiness(doc), seeded(7));
    expect(checkBusiness(repaired)).toEqual([]);
  });

  it("changes only the sections that failed, and the hooks that depend on them", () => {
    const doc = base();
    doc.pressure = "";
    const repaired = repairBusiness(doc, checkBusiness(doc), seeded(8));
    expect(repaired.identity).toEqual(doc.identity);
    expect(repaired.operations).toEqual(doc.operations);
    expect(repaired.leadership).toEqual(doc.leadership);
    expect(repaired.pressure).not.toBe("");
  });

  it("trims extra staff when the count is too high for the scale", () => {
    const doc = base();
    doc.options.scale = "tiny";
    doc.staff = [1, 2, 3].map((n) => ({
      id: `staff-${n}`,
      name: `P${n}`,
      role: "r",
      goal: "g",
      trait: "t",
    }));
    const repaired = repairBusiness(doc, checkBusiness(doc), seeded(9));
    expect(repaired.staff.length).toBeLessThanOrEqual(1);
    expect(checkBusiness(repaired)).toEqual([]);
  });
});
