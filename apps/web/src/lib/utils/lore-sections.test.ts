import { describe, it, expect } from "vitest";
import {
  normaliseHeading,
  parseLoreSections,
  diffLoreSections,
  restoreLoreSections,
  formatSectionList,
  buildLoreMergePlan,
  composeLore,
} from "./lore-sections";

/**
 * Regression cover for #2588: an AI revision replaces the whole lore string, so
 * sections it does not return are destroyed.
 */

const LORE = `Some opening prose about the character.

## Personality & Voice

Gruff, but fair.

## Hooks

- Owes money to the Assize.

## Relationships

Estranged from his sister.`;

describe("normaliseHeading", () => {
  it("treats punctuation and casing variants as one heading", () => {
    // Otherwise every revision reports a phantom removal.
    expect(normaliseHeading("Personality & Voice")).toBe(
      normaliseHeading("personality and voice"),
    );
    expect(normaliseHeading("Personality  &  Voice")).toBe(
      normaliseHeading("Personality & Voice"),
    );
  });

  it("does not collapse genuinely different headings", () => {
    expect(normaliseHeading("Hooks")).not.toBe(
      normaliseHeading("Relationships"),
    );
  });
});

describe("parseLoreSections", () => {
  it("splits preamble and sections in document order", () => {
    const parsed = parseLoreSections(LORE);
    expect(parsed.preamble).toBe("Some opening prose about the character.");
    expect(parsed.sections.map((s) => s.heading)).toEqual([
      "Personality & Voice",
      "Hooks",
      "Relationships",
    ]);
    expect(parsed.sections[1].body).toBe("- Owes money to the Assize.");
  });

  it("handles lore with no headings at all", () => {
    const parsed = parseLoreSections("Just free-form notes.");
    expect(parsed.sections).toEqual([]);
    expect(parsed.preamble).toBe("Just free-form notes.");
  });

  it("handles empty and undefined-ish input without throwing", () => {
    expect(parseLoreSections("").sections).toEqual([]);
    expect(parseLoreSections(undefined as unknown as string).sections).toEqual(
      [],
    );
  });

  it("treats deeper headings as sections too", () => {
    expect(parseLoreSections("### Deep\n\nbody").sections[0].heading).toBe(
      "Deep",
    );
  });

  it("does not treat a lone # or a mid-line hash as a heading", () => {
    const parsed = parseLoreSections("# Title\n\nsomething # not a heading");
    expect(parsed.sections).toEqual([]);
  });
});

describe("diffLoreSections", () => {
  it("reports sections the revision drops", () => {
    // The actual bug: "focus on personality" returns only that section.
    const revised = "## Personality & Voice\n\nWarmer than he lets on.";
    const diff = diffLoreSections(LORE, revised);
    expect(diff.removed.map((s) => s.heading)).toEqual([
      "Hooks",
      "Relationships",
    ]);
    expect(diff.kept).toEqual(["Personality & Voice"]);
  });

  it("reports nothing when every section survives a rewrite", () => {
    const revised = LORE.replace("Gruff, but fair.", "Warmer than he lets on.");
    const diff = diffLoreSections(LORE, revised);
    expect(diff.removed).toEqual([]);
    expect(diff.uncertain).toBe(false);
  });

  it("does not report a removal when only the heading's punctuation changed", () => {
    const revised = LORE.replace(
      "## Personality & Voice",
      "## personality and voice",
    );
    expect(diffLoreSections(LORE, revised).removed).toEqual([]);
  });

  it("reports an added section", () => {
    const diff = diffLoreSections(
      LORE,
      `${LORE}\n\n## Secrets\n\nHe was there.`,
    );
    expect(diff.added).toEqual(["Secrets"]);
    expect(diff.removed).toEqual([]);
  });

  it("flags unheaded lore replaced by different unheaded lore as uncertain", () => {
    // No headings to compare — a rewrite and a deletion look identical, so ask.
    const diff = diffLoreSections(
      "Free-form notes.",
      "Something else entirely.",
    );
    expect(diff.uncertain).toBe(true);
  });

  it("does not flag unheaded lore that is unchanged", () => {
    expect(diffLoreSections("Same notes.", "Same notes.").uncertain).toBe(
      false,
    );
  });

  it("does not flag unheaded lore that gains structure", () => {
    const diff = diffLoreSections("Free-form.", "## Overview\n\nFree-form.");
    expect(diff.uncertain).toBe(false);
  });

  it("reports no removals when the entity had no lore", () => {
    const diff = diffLoreSections("", "## Anything\n\nbody");
    expect(diff.removed).toEqual([]);
    expect(diff.uncertain).toBe(false);
  });
});

describe("restoreLoreSections", () => {
  it("appends kept sections after the revision", () => {
    const parsed = parseLoreSections(LORE);
    const hooks = parsed.sections.find((s) => s.heading === "Hooks")!;
    const restored = restoreLoreSections("## Personality & Voice\n\nWarmer.", [
      hooks,
    ]);
    expect(restored).toContain("## Personality & Voice");
    expect(restored).toContain("## Hooks");
    expect(restored).toContain("- Owes money to the Assize.");
  });

  it("does not duplicate a section the revision already returned", () => {
    // The caller only ever passes sections the diff marked removed, so a
    // rewritten section is never restored on top of its own rewrite.
    const revised = LORE.replace("Gruff, but fair.", "Warmer.");
    const diff = diffLoreSections(LORE, revised);
    const restored = restoreLoreSections(revised, diff.removed);
    expect(restored.match(/## Personality & Voice/g)).toHaveLength(1);
  });

  it("returns the revision untouched when nothing was removed", () => {
    expect(restoreLoreSections("## A\n\nbody", [])).toBe("## A\n\nbody");
  });

  it("handles a section with an empty body", () => {
    const restored = restoreLoreSections("## A\n\nbody", [
      { heading: "Empty", key: "empty", body: "" },
    ]);
    expect(restored).toContain("## Empty");
  });

  it("restores into empty proposed lore without leading blank lines", () => {
    const restored = restoreLoreSections("", [
      { heading: "Hooks", key: "hooks", body: "x" },
    ]);
    expect(restored.startsWith("## Hooks")).toBe(true);
  });
});

describe("formatSectionList", () => {
  const s = (heading: string) => ({ heading, key: heading, body: "" });

  it("reads naturally for one, two and three sections", () => {
    expect(formatSectionList([s("Hooks")])).toBe("Hooks");
    expect(formatSectionList([s("Hooks"), s("Ties")])).toBe("Hooks and Ties");
    expect(formatSectionList([s("A"), s("B"), s("C")])).toBe("A, B and C");
  });

  it("returns an empty string for no sections", () => {
    expect(formatSectionList([])).toBe("");
  });
});

describe("buildLoreMergePlan", () => {
  const LORE = [
    "Opening prose.",
    "",
    "## Personality & Voice",
    "",
    "Gruff, but fair.",
    "",
    "## Hooks",
    "",
    "- Owes money.",
  ].join("\n");

  it("classifies every section as unchanged, modified, removed or added", () => {
    const revised = [
      "Opening prose.",
      "",
      "## Personality & Voice",
      "",
      "Warmer than he lets on.",
      "",
      "## Secrets",
      "",
      "He was there.",
    ].join("\n");

    const plan = buildLoreMergePlan(LORE, revised);
    const byHeading = Object.fromEntries(
      plan.entries.map((e) => [e.heading || "(preamble)", e.status]),
    );
    expect(byHeading).toEqual({
      "(preamble)": "unchanged",
      "Personality & Voice": "modified",
      Secrets: "added",
      Hooks: "removed",
    });
    expect(plan.hasChanges).toBe(true);
    expect(plan.hasRemovals).toBe(true);
  });

  it("reports no changes for an identical revision", () => {
    const plan = buildLoreMergePlan(LORE, LORE);
    expect(plan.hasChanges).toBe(false);
    expect(plan.hasRemovals).toBe(false);
  });

  it("defaults a dropped section to being kept", () => {
    // The safe default: nothing is destroyed without an explicit choice.
    const plan = buildLoreMergePlan(LORE, "## Personality & Voice\n\nWarmer.");
    const hooks = plan.entries.find((e) => e.heading === "Hooks");
    expect(hooks?.defaultChoice).toBe("current");
  });

  it("defaults a rewritten section to the revision", () => {
    const plan = buildLoreMergePlan(
      LORE,
      LORE.replace("Gruff, but fair.", "Warmer."),
    );
    const personality = plan.entries.find(
      (e) => e.heading === "Personality & Voice",
    );
    expect(personality?.defaultChoice).toBe("proposed");
  });

  it("keeps the revision's ordering and appends dropped sections", () => {
    const revised = "## Secrets\n\nNew.\n\n## Personality & Voice\n\nWarmer.";
    const plan = buildLoreMergePlan(LORE, revised);
    expect(plan.entries.map((e) => e.heading)).toEqual([
      "", // preamble, removed by the revision
      "Secrets",
      "Personality & Voice",
      "Hooks",
    ]);
  });

  it("treats the unheaded preamble as a reviewable entry", () => {
    const plan = buildLoreMergePlan("Just prose.", "## A\n\nbody");
    const preamble = plan.entries.find((e) => e.key === "");
    expect(preamble?.status).toBe("removed");
    expect(preamble?.defaultChoice).toBe("current");
  });
});

describe("composeLore", () => {
  const LORE = "## A\n\nold a\n\n## B\n\nold b";
  const REVISED = "## A\n\nnew a";

  it("uses the safe defaults when no choices are supplied", () => {
    const plan = buildLoreMergePlan(LORE, REVISED);
    const composed = composeLore(plan);
    expect(composed).toContain("new a");
    expect(composed).toContain("## B");
    expect(composed).toContain("old b");
  });

  it("honours an explicit choice of the current version", () => {
    const plan = buildLoreMergePlan(LORE, REVISED);
    const composed = composeLore(plan, { a: "current", b: "current" });
    expect(composed).toContain("old a");
    expect(composed).not.toContain("new a");
  });

  it("combines both versions when asked", () => {
    const plan = buildLoreMergePlan(LORE, REVISED);
    const composed = composeLore(plan, { a: "both" });
    expect(composed).toContain("new a");
    expect(composed).toContain("old a");
    // One heading, both bodies — not two competing sections.
    expect(composed.match(/## A/g)).toHaveLength(1);
  });

  it("omits a section the reader dropped", () => {
    const plan = buildLoreMergePlan(LORE, REVISED);
    const composed = composeLore(plan, { b: "omit" });
    expect(composed).not.toContain("## B");
  });

  it("never emits a duplicate heading", () => {
    const plan = buildLoreMergePlan(LORE, "## A\n\nnew a\n\n## B\n\nnew b");
    const composed = composeLore(plan, { a: "both", b: "both" });
    expect(composed.match(/## A/g)).toHaveLength(1);
    expect(composed.match(/## B/g)).toHaveLength(1);
  });

  it("falls back to the available side when the chosen one does not exist", () => {
    // "current" on an added section has nothing to fall back to but the new text.
    const plan = buildLoreMergePlan(
      "## A\n\nold",
      "## A\n\nnew\n\n## C\n\nfresh",
    );
    const composed = composeLore(plan, { c: "current" });
    expect(composed).toContain("fresh");
  });

  it("renders the preamble without a heading", () => {
    const plan = buildLoreMergePlan(
      "Prose.\n\n## A\n\nbody",
      "Prose.\n\n## A\n\nbody",
    );
    expect(composeLore(plan).startsWith("Prose.")).toBe(true);
  });
});
