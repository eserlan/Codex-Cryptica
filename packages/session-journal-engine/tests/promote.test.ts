import { describe, it, expect } from "vitest";
import {
  buildPromotion,
  entryTypeLabel,
  PROMOTION_ERRORS,
  type PromotionScope,
} from "../src/promote";
import type { JournalEntry, SessionJournal } from "../src/types";

const formatTime = (t: number) => `T${t}`;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value as object).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const entry = (
  id: string,
  timestamp: number,
  content: string,
  extra: Partial<JournalEntry> = {},
): JournalEntry => ({
  id,
  timestamp,
  type: "manual-note",
  content,
  ...extra,
});

const journal = (over: Partial<SessionJournal> = {}): SessionJournal =>
  deepFreeze({
    id: "j1",
    vaultId: "v1",
    title: "Session 26/09/2026",
    status: "active",
    startedAt: 1,
    sections: [
      { id: "s1", name: "The Ambush" },
      { id: "s2", name: "Aftermath" },
    ],
    entries: [
      entry("e1", 10, "The party arrives"),
      entry("e2", 20, "Goblins attack", { sectionId: "s1" }),
      entry("e3", 30, "Rolled 2d6+3: 9", {
        type: "dice-roll",
        sectionId: "s1",
      }),
      entry("e4", 40, "They count the loot", { sectionId: "s2" }),
      entry("e5", 50, "A quiet night"),
    ],
    ...over,
  });

const build = (scope: PromotionScope, j = journal()) =>
  buildPromotion(j, scope, { formatTime });

describe("entryTypeLabel", () => {
  it("has no label for a typed note and a label for automatic ones", () => {
    expect(entryTypeLabel("manual-note")).toBeUndefined();
    expect(entryTypeLabel("dice-roll")).toBe("Dice roll");
    expect(entryTypeLabel("card-draw")).toBe("Card draw");
    expect(entryTypeLabel("table-result")).toBe("Table result");
    expect(entryTypeLabel("generator-output")).toBe("Automatic entry");
  });
});

describe("buildPromotion — entry", () => {
  it("gives a typed note's content as the body", () => {
    const r = build({ kind: "entry", entryId: "e1" });
    expect(r).toMatchObject({
      ok: true,
      content: "The party arrives",
      title: "The party arrives",
      entryCount: 1,
      source: "journal:j1:entry:e1",
    });
  });

  it("prefixes an automatic entry with its label", () => {
    const r = build({ kind: "entry", entryId: "e3" });
    expect(r.ok && r.content).toBe("Dice roll — Rolled 2d6+3: 9");
  });

  it("names it from the content only, never the label", () => {
    const r = build({ kind: "entry", entryId: "e3" });
    expect(r.ok && r.title).toBe("Rolled 2d6+3: 9");
  });

  it("keeps short first lines whole and uses only the first non-blank line", () => {
    const j = journal({
      entries: [entry("e1", 1, "\n\n  Opening line  \nsecond line")],
    });
    const r = build({ kind: "entry", entryId: "e1" }, j);
    expect(r.ok && r.title).toBe("Opening line");
  });

  it("cuts a long first line at a word boundary with an ellipsis", () => {
    const long =
      "The wandering merchant sold us a map that was clearly forged by someone";
    const r = build(
      { kind: "entry", entryId: "e1" },
      journal({ entries: [entry("e1", 1, long)] }),
    );
    expect(r.ok && r.title).toBe(
      "The wandering merchant sold us a map that was clearly…",
    );
    expect(r.ok && r.title.length).toBeLessThanOrEqual(61);
  });

  it("cuts at 60 characters when there is no space from character 30 on", () => {
    const r = build(
      { kind: "entry", entryId: "e1" },
      journal({ entries: [entry("e1", 1, "a".repeat(80))] }),
    );
    expect(r.ok && r.title).toBe("a".repeat(60) + "…");
  });

  it("refuses an entry with no text, since there is nothing to make (negative)", () => {
    const r = build(
      { kind: "entry", entryId: "e1" },
      journal({ entries: [entry("e1", 1, "   ")] }),
    );
    // Nothing to turn into an entity: a blank entry has no text.
    expect(r.ok).toBe(false);
  });

  it("keeps a multi-line body as written", () => {
    const r = build(
      { kind: "entry", entryId: "e1" },
      journal({ entries: [entry("e1", 1, "line one\nline two")] }),
    );
    expect(r.ok && r.content).toBe("line one\nline two");
  });

  it("refuses an unknown entry (negative)", () => {
    expect(build({ kind: "entry", entryId: "nope" })).toEqual({
      ok: false,
      error: PROMOTION_ERRORS.missing,
    });
  });
});

describe("buildPromotion — section", () => {
  it("lists the section's entries in order with times, no title heading", () => {
    const r = build({ kind: "section", sectionId: "s1" });
    expect(r).toMatchObject({
      ok: true,
      title: "The Ambush",
      entryCount: 2,
      source: "journal:j1:section:s1",
    });
    expect(r.ok && r.content).toBe(
      "- T20 — Goblins attack\n- T30 — Dice roll — Rolled 2d6+3: 9",
    );
  });

  it("refuses an empty section (negative)", () => {
    const j = journal({ entries: [entry("e1", 1, "x")] });
    expect(build({ kind: "section", sectionId: "s1" }, j)).toEqual({
      ok: false,
      error: PROMOTION_ERRORS.nothing,
    });
  });

  it("refuses an unknown section (negative)", () => {
    expect(build({ kind: "section", sectionId: "zzz" })).toEqual({
      ok: false,
      error: PROMOTION_ERRORS.missing,
    });
  });
});

describe("buildPromotion — whole journal", () => {
  it("writes the title, then entries with headings where the section changes", () => {
    const r = build({ kind: "journal" });
    expect(r).toMatchObject({
      ok: true,
      title: "Session 26/09/2026",
      entryCount: 5,
      source: "journal:j1",
    });
    expect(r.ok && r.content).toBe(
      [
        "# Session 26/09/2026",
        "",
        "- T10 — The party arrives",
        "",
        "## The Ambush",
        "",
        "- T20 — Goblins attack",
        "- T30 — Dice roll — Rolled 2d6+3: 9",
        "",
        "## Aftermath",
        "",
        "- T40 — They count the loot",
        "",
        "## No section",
        "",
        "- T50 — A quiet night",
      ].join("\n"),
    );
  });

  it("has no headings for a journal without sections", () => {
    const j = journal({
      sections: [],
      entries: [entry("e1", 1, "one"), entry("e2", 2, "two")],
    });
    const r = build({ kind: "journal" }, j);
    expect(r.ok && r.content).toBe(
      "# Session 26/09/2026\n\n- T1 — one\n- T2 — two",
    );
  });

  it("gives a sectioned first entry its heading and an unsectioned one none", () => {
    const j = journal({
      entries: [entry("e1", 1, "first", { sectionId: "s1" })],
    });
    const r = build({ kind: "journal" }, j);
    expect(r.ok && r.content).toContain("## The Ambush");

    const k = journal({ entries: [entry("e1", 1, "first")] });
    const r2 = build({ kind: "journal" }, k);
    expect(r2.ok && r2.content).not.toContain("##");
  });

  it("indents continuation lines of a multi-line entry", () => {
    const j = journal({
      sections: [],
      entries: [entry("e1", 1, "line one\nline two")],
    });
    const r = build({ kind: "journal" }, j);
    expect(r.ok && r.content).toContain("- T1 — line one\n  line two");
  });

  it("refuses an empty journal (negative)", () => {
    expect(build({ kind: "journal" }, journal({ entries: [] }))).toEqual({
      ok: false,
      error: PROMOTION_ERRORS.nothing,
    });
  });
});

describe("buildPromotion — selection", () => {
  it("combines chosen entries and sections once each, in journal order, without a title line", () => {
    const r = build({
      kind: "selection",
      entryIds: ["e5", "e2"],
      sectionIds: ["s1"],
    });
    expect(r).toMatchObject({
      ok: true,
      title: "Session 26/09/2026 — selection",
      entryCount: 3,
      source: "journal:j1:selection",
    });
    expect(r.ok && r.content).toBe(
      [
        "## The Ambush",
        "",
        "- T20 — Goblins attack",
        "- T30 — Dice roll — Rolled 2d6+3: 9",
        "",
        "## No section",
        "",
        "- T50 — A quiet night",
      ].join("\n"),
    );
  });

  it("does not repeat an entry chosen on its own and through its section", () => {
    const r = build({
      kind: "selection",
      entryIds: ["e2"],
      sectionIds: ["s1"],
    });
    expect(r.ok && r.entryCount).toBe(2);
    expect(r.ok && (r.content.match(/Goblins attack/g) ?? []).length).toBe(1);
  });

  it("refuses an empty selection (negative)", () => {
    expect(build({ kind: "selection", entryIds: [], sectionIds: [] })).toEqual({
      ok: false,
      error: PROMOTION_ERRORS.nothing,
    });
  });

  it("refuses a selection naming something that is gone (negative)", () => {
    expect(
      build({ kind: "selection", entryIds: ["nope"], sectionIds: [] }),
    ).toEqual({ ok: false, error: PROMOTION_ERRORS.missing });
    expect(
      build({ kind: "selection", entryIds: [], sectionIds: ["nope"] }),
    ).toEqual({ ok: false, error: PROMOTION_ERRORS.missing });
  });

  it("refuses a selection of only empty sections (negative)", () => {
    const j = journal({ entries: [entry("e1", 1, "x")] });
    expect(
      build({ kind: "selection", entryIds: [], sectionIds: ["s2"] }, j),
    ).toEqual({ ok: false, error: PROMOTION_ERRORS.nothing });
  });
});

describe("buildPromotion — guarantees", () => {
  it("never changes the journal it is given (frozen input would throw)", () => {
    const j = journal();
    const before = JSON.stringify(j);
    for (const scope of [
      { kind: "entry", entryId: "e1" },
      { kind: "section", sectionId: "s1" },
      { kind: "journal" },
      { kind: "selection", entryIds: ["e1"], sectionIds: ["s2"] },
    ] as PromotionScope[]) {
      expect(() => build(scope, j)).not.toThrow();
    }
    expect(JSON.stringify(j)).toBe(before);
  });

  it("gives identical output for identical input", () => {
    expect(build({ kind: "journal" })).toEqual(build({ kind: "journal" }));
  });

  it("uses only the entry's content, never its sourceRef", () => {
    const j = journal({
      sections: [],
      entries: [
        entry("e1", 1, "Rolled 1d20: 5", {
          type: "dice-roll",
          sourceRef: { formula: "1d20", secret: "do-not-use" },
        }),
      ],
    });
    const r = build({ kind: "journal" }, j);
    expect(r.ok && r.content).not.toContain("do-not-use");
  });

  it("falls back to a default title for a journal with no title", () => {
    const r = build({ kind: "journal" }, journal({ title: "  " }));
    expect(r.ok && r.title).toBe("Session journal");
  });
});
