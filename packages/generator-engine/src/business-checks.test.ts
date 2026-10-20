import { describe, expect, it } from "vitest";
import {
  checkBusiness,
  findUnintroducedNames,
  repairBusiness,
  sizeStaffProblem,
} from "./business-checks";
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

describe("size and staff agree", () => {
  it.each([
    [
      "claims regular staff with none listed",
      "One building, a handful of regular staff, and a few part-timers in busy seasons.",
      0,
      true,
    ],
    [
      "claims a permanent crew with none listed",
      "A single premises, the owner, and a small permanent crew.",
      0,
      true,
    ],
    [
      "casual labour with none listed",
      "One cramped premises, the owner, and casual help when work comes in.",
      0,
      false,
    ],
    [
      "part-timers only with none listed",
      "The owner and a few part-timers.",
      0,
      false,
    ],
    [
      "regular staff with staff listed",
      "One building, a couple of regular staff.",
      2,
      false,
    ],
    [
      "says no staff but staff are listed",
      "A sole proprietor with no regular staff.",
      2,
      true,
    ],
    [
      "says no staff with none listed",
      "A sole proprietor with no regular staff.",
      0,
      false,
    ],
  ])("%s", (_label, size, count, flagged) => {
    expect(sizeStaffProblem(size, count) !== null).toBe(flagged);
  });

  it("reports a contradictory document and repairs only the size line", () => {
    const doc = base();
    doc.options.scale = "tiny";
    doc.staff = [];
    doc.operations.size =
      "One building, a handful of regular staff, and a few part-timers in busy seasons.";
    const issues = checkBusiness(doc);
    expect(issues).toContainEqual(
      expect.objectContaining({ section: "operations", code: "size-staff" }),
    );
    const repaired = repairBusiness(doc, issues, seeded(4));
    expect(checkBusiness(repaired)).toEqual([]);
    expect(repaired.operations.provides).toBe(doc.operations.provides);
    expect(repaired.operations.size).not.toBe(doc.operations.size);
  });

  it("never produces a size that contradicts the staff, across industries, scales and seeds", () => {
    const types = [
      "Tavern",
      "Blacksmith",
      "Moneylender",
      "Smuggling operation",
      "Temple-run hospice",
    ];
    for (const businessType of types) {
      for (const scale of [
        "tiny",
        "small",
        "established",
        "regional",
        "major",
      ] as const) {
        for (let seed = 1; seed <= 20; seed++) {
          const doc = generateBusinessLocal(
            { genre: "Classic Fantasy", businessType, scale },
            seeded(seed),
          );
          expect(
            checkBusiness(doc),
            `${businessType} ${scale} ${seed}`,
          ).toEqual([]);
        }
      }
    }
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

  it("fixes a wrong relationship label without replacing the party", () => {
    const doc = base();
    doc.relationships = [
      {
        id: "rel-1",
        name: "The Reedknife Circle",
        kind: "criminal",
        label: "located in",
        reason: "Runs contraband through the back door.",
        partyKind: "organisation",
      },
    ];
    const repaired = repairBusiness(doc, checkBusiness(doc), seeded(5));
    expect(repaired.relationships).toHaveLength(1);
    expect(repaired.relationships[0].name).toBe("The Reedknife Circle");
    expect(repaired.relationships[0].label).not.toBe("located in");
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

describe("relationship labels", () => {
  it("flags a label that does not describe its kind of party", () => {
    const doc = base();
    doc.relationships = [
      {
        id: "rel-1",
        name: "The Reedknife Circle",
        kind: "criminal",
        label: "located in",
        reason:
          "A smuggling network testing the business with illicit requests.",
        partyKind: "organisation",
      },
    ];
    expect(checkBusiness(doc)).toContainEqual(
      expect.objectContaining({
        section: "relationships",
        code: "relationship-label",
      }),
    );
  });

  it.each([
    ["criminal", "owes"],
    ["criminal", "protected by"],
    ["neighbour", "competes with"],
    ["competitor", "competes with"],
    ["supplier", "supplied by"],
    ["regulator", "regulated by"],
    ["patron", "contracted by"],
  ] as const)("accepts %s as %s", (kind, label) => {
    const doc = base();
    doc.relationships = [
      {
        id: "rel-1",
        name: "The Reedknife Circle",
        kind,
        label,
        reason: "Rival.",
        partyKind: "organisation",
      },
    ];
    expect(
      checkBusiness(doc).filter((i) => i.code === "relationship-label"),
    ).toEqual([]);
  });

  it("does not describe a neighbour as the place the business is located in", () => {
    const doc = base();
    doc.relationships = [
      {
        id: "rel-1",
        name: "The Lantern Court",
        kind: "neighbour",
        label: "located in",
        reason: "Shares the lane.",
        partyKind: "organisation",
      },
    ];
    expect(checkBusiness(doc)).toContainEqual(
      expect.objectContaining({ code: "relationship-label" }),
    );
  });
});

describe("operations profile", () => {
  it("reports a missing way of earning, size or position", () => {
    const doc = base();
    doc.operations.model = "";
    doc.operations.size = "";
    doc.operations.position = "";
    const missing = checkBusiness(doc).filter(
      (i) => i.section === "operations" && i.code === "missing",
    );
    expect(missing).toHaveLength(3);
  });

  it("gives every local business a specific way of earning, size and position", () => {
    const op = base().operations;
    expect(op.model.length).toBeGreaterThan(10);
    expect(op.size.length).toBeGreaterThan(10);
    expect(op.position.length).toBeGreaterThan(10);
  });
});

describe("findUnintroducedNames", () => {
  function named(
    texts: Partial<Record<"pressure" | "secret", string>> & {
      hooks?: string[];
    },
  ): BusinessDocument {
    const doc = base();
    doc.identity.name = "The Silver Mill";
    doc.leadership.name = "Iska Venn";
    doc.staff = [
      {
        id: "staff-1",
        name: "Corwin Doran",
        role: "apprentice",
        goal: "g",
        trait: "t",
      },
    ];
    doc.relationships = [
      {
        id: "rel-1",
        name: "The Crown Dispatch Company",
        kind: "competitor",
        label: "competes with",
        reason: "Rival.",
        partyKind: "organisation",
      },
    ];
    doc.pressure = texts.pressure ?? "The bridge is down.";
    doc.secret = texts.secret ?? "A buried report.";
    doc.hooks = texts.hooks ?? ["Iska Venn asks for help."];
    return doc;
  }

  it("flags people who act in the text but were never introduced", () => {
    const doc = named({
      pressure: "Edran Pell holds the keys and Nima Quill keeps the ledgers.",
    });
    expect(findUnintroducedNames(doc)).toEqual(
      expect.arrayContaining(["Edran Pell", "Nima Quill"]),
    );
  });

  it("flags a second business name that keeps recurring", () => {
    const doc = named({
      pressure: "The carters have left Brindlemark.",
      secret: "The report was hidden from Brindlemark.",
    });
    expect(findUnintroducedNames(doc)).toContain("Brindlemark");
  });

  it.each([
    [
      "a name recombined from two introduced people",
      "Corwin Venn has the keys.",
    ],
    ["an accented name", "Zoë Quill holds the ledger."],
    ["an accented name at the start", "Élodie Marrow holds the ledger."],
    [
      "a place, a known false positive the notice words as possibly a place",
      "The cart stops at River Road.",
    ],
  ])("flags %s", (_label, text) => {
    expect(findUnintroducedNames(named({ pressure: text })).length).toBe(1);
  });

  it.each([
    ["a known person by first name", "Iska is worried about the roof."],
    [
      "a known person by full name and a possessive",
      "Iska Venn's ledger is missing.",
    ],
    ["a known staff member", "Corwin Doran covers the night shift."],
    ["the business", "The Silver Mill is short of cash."],
    ["a known party", "The Crown Dispatch Company wants the contract."],
    ["a sentence starter", "Without a bridge, the carts stop."],
    ["an imperative hook", "Find the missing runner before dawn."],
    [
      "a lone capitalised first word",
      "Deliveries slow down. Customers complain.",
    ],
    ["an abbreviation used twice", "Ask the GM, then the GM again."],
    ["a known name with a title", "Mayor Corwin Doran covers the night shift."],
    [
      "an unknown word that appears only once",
      "A cousin lives in Brindlemark.",
    ],
  ])("does not flag %s", (_label, text) => {
    expect(findUnintroducedNames(named({ pressure: text }))).toEqual([]);
  });

  it("finds nothing unintroduced in any local business", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const doc = generateBusinessLocal(
        {
          genre: [
            "Classic Fantasy",
            "Cyberpunk / Corporate",
            "Weird West / Frontier",
          ][seed % 3],
          playersOwn: seed % 2 === 0,
        },
        seeded(seed),
      );
      expect(findUnintroducedNames(doc), `seed ${seed}`).toEqual([]);
    }
  });
});
