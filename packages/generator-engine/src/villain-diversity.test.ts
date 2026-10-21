import { describe, expect, it } from "vitest";
import {
  COMPLICATION_KINDS,
  FATAL_FLAW_KINDS,
  ORGANISATION_FORMS,
  VULNERABILITY_KINDS,
  dependencyChainProblems,
  genericFlawProblem,
  lieutenantTemplateProblem,
  masterObjectProblem,
  overusedNameProblems,
  planVillainAxes,
  powerVacuumProblem,
  sharedSurnameFindings,
  sharesTerm,
} from "./villain-diversity";

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const plans = (archetype: string, genre: string, n = 300) =>
  Array.from({ length: n }, (_, i) =>
    planVillainAxes(archetype, genre, lcg(i + 1)),
  );

describe("planVillainAxes", () => {
  it("is deterministic for a seeded rng", () => {
    expect(planVillainAxes("Mastermind", "Classic Fantasy", lcg(5))).toEqual(
      planVillainAxes("Mastermind", "Classic Fantasy", lcg(5)),
    );
  });

  it("gives three different functions, relationships and levels of awareness", () => {
    for (const axes of plans("Dark Lord", "Classic Fantasy", 100)) {
      const { lieutenants } = axes;
      expect(lieutenants).toHaveLength(3);
      expect(new Set(lieutenants.map((l) => l.function)).size).toBe(3);
      expect(new Set(lieutenants.map((l) => l.relation)).size).toBe(3);
      expect(new Set(lieutenants.map((l) => l.awareness)).size).toBe(3);
    }
  });

  it("draws the organisation from what the archetype's power rests on", () => {
    const allowed = new Set(["cult", "court", "ideological"]);
    for (const axes of plans("Cult Leader", "Classic Fantasy", 100)) {
      expect(allowed.has(axes.organisation.id)).toBe(true);
    }
  });

  it("keeps machine hierarchies to tech genres and the AI archetype", () => {
    const machine = (a: string, g: string) =>
      plans(a, g).some((p) => p.organisation.id === "machine");
    expect(machine("Mastermind", "Classic Fantasy")).toBe(false);
    expect(machine("Artificial Intelligence", "Classic Fantasy")).toBe(true);
    expect(machine("Artificial Intelligence", "Sci-Fi")).toBe(true);
  });

  it("does not let cellular networks dominate, even for an archetype that allows them", () => {
    const cellular = plans("Crime Lord", "Classic Fantasy").filter(
      (p) => p.organisation.id === "cellular",
    ).length;
    expect(cellular).toBeGreaterThan(0);
    expect(cellular / 300).toBeLessThan(0.4);
  });

  it("uses a wide spread of flaws, weak points and complications", () => {
    const all = plans("Mastermind", "Classic Fantasy", 600);
    const seen = (pick: (a: (typeof all)[number]) => string) =>
      new Set(all.map(pick)).size;
    expect(seen((a) => a.flaw.id)).toBe(FATAL_FLAW_KINDS.length);
    expect(seen((a) => a.vulnerability.id)).toBe(VULNERABILITY_KINDS.length);
    expect(seen((a) => a.complication.id)).toBe(COMPLICATION_KINDS.length);
  });

  it("falls back to every form for an archetype it does not know", () => {
    const ids = new Set(
      plans("Something New", "Sci-Fi", 600).map((p) => p.organisation.id),
    );
    expect(ids.size).toBe(ORGANISATION_FORMS.length);
  });

  it("offers no default power-vacuum complication", () => {
    for (const kind of COMPLICATION_KINDS) {
      expect(powerVacuumProblem(kind.guidance)).toBeNull();
    }
  });
});

describe("genericFlawProblem", () => {
  it.each([
    "He cannot predict unpredictable emotional human behaviour.",
    "Her hyper-rational mind is unable to account for irrational people.",
    "They can't understand human feelings and plan around them.",
  ])("flags: %s", (flaw) => {
    expect(genericFlawProblem(flaw)).not.toBeNull();
  });

  it.each([
    "She cannot let a debt stay unpaid, even when forgiving it would save her.",
    "He needs a crowd, and plays to it at the wrong moment.",
    "She is calm, and her emotions are never the problem. Her pride is.",
    "They cannot tolerate compromise, however sensible.",
  ])("does not flag: %s", (flaw) => {
    expect(genericFlawProblem(flaw)).toBeNull();
  });
});

describe("masterObjectProblem", () => {
  it.each([
    "Everything depends on one master ledger in the strongroom.",
    "The single server holds every record, a single point of failure.",
    "Destroy the only keycard and the whole network locks.",
  ])("flags: %s", (weakness) => {
    expect(masterObjectProblem(weakness)).not.toBeNull();
  });

  it.each([
    "The guild masters follow her only while the pensions are paid.",
    "Her legitimacy rests on a story the party can disprove.",
    "Two of her ledgers disagree, which is her real problem.",
  ])("does not flag: %s", (weakness) => {
    expect(masterObjectProblem(weakness)).toBeNull();
  });
});

describe("powerVacuumProblem", () => {
  it.each([
    "Removing her creates a power vacuum.",
    "Her fall will cause a gang war in the lower city.",
    "Expect a contested succession.",
  ])("flags: %s", (text) => {
    expect(powerVacuumProblem(text)).not.toBeNull();
  });

  it.each([
    "The dredging crews go unpaid until new money is found.",
    "Stopping her hands the harbour to someone worse.",
  ])("does not flag: %s", (text) => {
    expect(powerVacuumProblem(text)).toBeNull();
  });
});

describe("lieutenantTemplateProblem", () => {
  it("flags the specialist, enforcer and insider trio", () => {
    expect(
      lieutenantTemplateProblem([
        "Technical specialist and hacker",
        "Violent enforcer",
        "Compromised accountant",
      ]),
    ).not.toBeNull();
  });

  it("does not flag two of the three, or different functions", () => {
    expect(
      lieutenantTemplateProblem(["Hacker", "Enforcer", "Public spokesperson"]),
    ).toBeNull();
    expect(
      lieutenantTemplateProblem(["Recruiter", "Field commander", "Financier"]),
    ).toBeNull();
  });
});

describe("overusedNameProblems", () => {
  it("flags the names that kept recurring, as whole words only", () => {
    expect(overusedNameProblems(["Silas Chen", "The Ledger"])).toHaveLength(2);
    expect(overusedNameProblems(["Chenille Ward", "Ledgerwood Hall"])).toEqual(
      [],
    );
  });
});

describe("sharedSurnameFindings", () => {
  it("flags unrelated people who share a surname", () => {
    expect(
      sharedSurnameFindings([
        { name: "Ana Holt", relationship: "a rival" },
        { name: "Bram Holt", relationship: "a believer" },
      ]),
    ).toHaveLength(1);
  });

  it("allows a shared surname when they are family", () => {
    expect(
      sharedSurnameFindings([
        { name: "Ana Holt", relationship: "a rival" },
        { name: "Bram Holt", relationship: "her brother" },
      ]),
    ).toEqual([]);
  });
});

describe("sharesTerm", () => {
  it("is true when two passages share a distinctive word", () => {
    expect(
      sharesTerm("Every harbour toll is hers.", "The harbour office."),
    ).toBe(true);
  });

  it("treats a plural and its singular as the same word", () => {
    expect(sharesTerm("Every toll is hers.", "The harbour tolls rose.")).toBe(
      true,
    );
    expect(sharesTerm("The licence lapsed.", "Licences were withdrawn.")).toBe(
      true,
    );
  });

  it("does not match unrelated words that merely share an ending", () => {
    expect(sharesTerm("The class is open.", "A glass of water.")).toBe(false);
  });

  it("ignores short words and stop words", () => {
    expect(
      sharesTerm("They will never stop.", "When this ends, they win."),
    ).toBe(false);
    expect(sharesTerm("", "anything at all here")).toBe(false);
  });
});

describe("dependencyChainProblems", () => {
  it("accepts one distinct step per stage", () => {
    expect(dependencyChainProblems(["a", "b", "c", "d", "e"], 5)).toEqual([]);
  });

  it("flags a count mismatch and repeated steps", () => {
    expect(dependencyChainProblems(["a", "b", "c"], 5)).toHaveLength(1);
    expect(dependencyChainProblems(["a", "a", "b", "c", "d"], 5)).toHaveLength(
      1,
    );
  });
});
