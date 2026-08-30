import { describe, it, expect } from "vitest";
import {
  normaliseHeading,
  parseLoreSections,
  diffLoreSections,
  restoreLoreSections,
  formatSectionList,
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
