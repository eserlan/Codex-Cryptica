import { describe, expect, it } from "vitest";
import {
  HEIST_WORD_BUDGET,
  needsRepair,
  heistWordCount,
  splitHeistSections,
  validateHeist,
  type HeistDraftFields,
} from "./heist-validation";
import { buildHeistPrompt, generateHeistLocal } from "./public-heist";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function draft(heistType = "Theft"): HeistDraftFields {
  const out = generateHeistLocal({ heistType }, seededRng(4));
  return { heistType, content: out.content ?? "", lore: out.lore ?? "" };
}

const kinds = (d: HeistDraftFields) => validateHeist(d).map((f) => f.kind);

describe("splitHeistSections", () => {
  it("splits headings from their bodies and ignores a preamble", () => {
    expect(splitHeistSections("intro\n### A\none\n\n### B\ntwo")).toEqual([
      { heading: "A", body: "one\n\n" },
      { heading: "B", body: "two\n" },
    ]);
  });
});

describe("validateHeist", () => {
  it("passes the generator's own output for every heist type", () => {
    for (const heistType of [
      "Theft",
      "Assassination",
      "Rescue",
      "Extraction",
      "Sabotage",
      "Information",
      "Plant Evidence",
    ]) {
      expect(validateHeist(draft(heistType)), heistType).toEqual([]);
    }
  });

  it("catches a duplicated section", () => {
    const d = draft();
    d.lore += "\n\n### Security Rings\n- **Perimeter**: again";
    expect(kinds(d)).toContain("duplicate-section");
  });

  it("catches an empty section and a missing one", () => {
    const d = draft();
    d.lore = d.lore.replace(/### Flashback Opportunities[\s\S]*$/, "");
    d.lore += "\n\n### Aftermath\n";
    expect(kinds(d)).toContain("missing-section");
    expect(kinds(d)).toContain("empty-section");
  });

  it("catches theft terminology on a job that steals nothing", () => {
    const d = draft("Sabotage");
    d.lore = d.lore.replace(
      "### When the Sabotage Is Committed",
      "### When the Prize Is Taken",
    );
    expect(kinds(d)).toContain("theft-terminology");
    expect(kinds(d)).toContain("moment-heading");
  });

  it("catches a banned placeholder name", () => {
    const d = draft();
    d.content = d.content.replace("The Score", "The Score of Elara");
    expect(kinds(d)).toContain("banned-name");
  });

  it("catches one game system's mechanics", () => {
    const d = draft();
    d.lore += "\n\nThe ward holds them for one round.";
    expect(kinds(d)).toContain("system-mechanics");
  });

  it("catches a missing alarm level and a stray default marker", () => {
    const d = draft();
    d.lore = d.lore.replace(/- \*\*3 — Lockdown\*\*.*\n/, "");
    d.lore += "\n- **Another (default)**: second marker";
    expect(kinds(d)).toContain("alarm-level");
    expect(kinds(d)).toContain("default-marker");
  });

  it("catches a document that blows the word budget", () => {
    const d = draft();
    d.lore += `\n\n### Notes\n${"filler ".repeat(HEIST_WORD_BUDGET)}`;
    expect(kinds(d)).toContain("over-budget");
  });

  it("phrases every finding as an instruction the repair pass can act on", () => {
    const d = draft();
    d.lore += "\n\n### Security Rings\n- **Perimeter**: again";
    for (const finding of validateHeist(d)) {
      expect(finding.message.length).toBeGreaterThan(20);
      expect(finding.message).toMatch(/\.$/);
    }
  });
});

describe("era-appropriate titles", () => {
  it("catches a modern job title in a pre-industrial setting", () => {
    const d = { ...draft(), genre: "Classic Fantasy" };
    d.lore = d.lore.replace("A rival crew", "Chief Operator Magrida Pell");
    d.lore += "\n\nChief Operator Magrida Pell signs the ledger nightly.";
    const findings = validateHeist(d);
    expect(findings.map((f) => f.kind)).toContain("anachronistic-title");
  });

  it("leaves the same title alone where it belongs", () => {
    const d = { ...draft(), genre: "Cyberpunk / Corporate" };
    d.lore += "\n\nChief Operator Magrida Pell signs the ledger nightly.";
    expect(validateHeist(d).map((f) => f.kind)).not.toContain(
      "anachronistic-title",
    );
  });

  it("is skipped entirely when no genre is supplied", () => {
    const d = draft();
    d.lore += "\n\nThe Operator signs the ledger nightly.";
    expect(validateHeist(d).map((f) => f.kind)).not.toContain(
      "anachronistic-title",
    );
  });
});

describe("needsRepair", () => {
  it("does not spend a model call on length alone", () => {
    const d = draft();
    d.lore += `\n\n### Notes\n${"filler ".repeat(HEIST_WORD_BUDGET)}`;
    const findings = validateHeist(d);
    expect(findings.map((f) => f.kind)).toEqual(["over-budget"]);
    expect(needsRepair(findings)).toBe(false);
  });

  it("spends one on a structural break, and carries the advisory along", () => {
    const d = draft();
    d.lore += `\n\n### Security Rings\n- **Perimeter**: again`;
    d.lore += `\n\n### Notes\n${"filler ".repeat(HEIST_WORD_BUDGET)}`;
    const findings = validateHeist(d);
    expect(needsRepair(findings)).toBe(true);
    expect(findings.map((f) => f.kind)).toContain("duplicate-section");
    expect(findings.map((f) => f.kind)).toContain("over-budget");
  });

  it("is false for a clean draft", () => {
    expect(needsRepair(validateHeist(draft()))).toBe(false);
  });
});

describe("heistWordCount", () => {
  it("counts both fields together", () => {
    expect(
      heistWordCount({ heistType: "Theft", content: "a b", lore: "c d" }),
    ).toBe(4);
  });
});

describe("buildHeistPrompt resolved options feed the repair pass", () => {
  it("exposes what the repair prompt needs to restate", () => {
    const { resolved } = buildHeistPrompt(
      { heistType: "Plant Evidence" },
      "",
      seededRng(1),
    );
    expect(resolved.objectiveHeading).toBe("The Package");
    expect(resolved.momentHeading).toBe("When the Evidence Is Planted");
    expect(resolved.objectiveStartsWith).toContain("already has the package");
  });
});
