import { describe, expect, it } from "vitest";
import {
  type AdventureParts,
  MAX_REVISION_LENGTH,
  MAX_REVISIONS,
  adventureVocabulary,
  applyConsistencyRevisions,
  consistencyTask,
  readConsistencyReview,
} from "./adventure-consistency";

const PARTS: AdventureParts = {
  situation: {
    title: "The Tithe of Lantern Ford",
    summary: "A toll-house holds proof that a guild poisoned the ford.",
    throughline: "Oren Pell fouled the ford to seize the toll.",
    initialSituation:
      "The assay is split between the Weir Mill and the toll-house.",
    primaryObjective: "Recover the assay before the audit at dawn.",
  },
  cast: {
    keyLocations: [
      {
        name: "Weir Mill",
        description: "Wet stone.",
        dilemma: "Speed or stealth.",
      },
    ],
    npcs: [{ name: "Oren Pell", role: "Guildmaster", goal: "Keep the toll" }],
  },
  consequences: {
    threats: [
      {
        title: "Guild Bravos",
        text: "Thugs at dawn.",
        involves: ["Oren Pell"],
      },
    ],
    outcomes: [
      {
        title: "Guild Broken",
        text: "The guild falls.",
        involves: ["Oren Pell"],
      },
      {
        title: "Guild Triumphant",
        text: "The toll stays.",
        involves: ["Oren Pell"],
      },
    ],
  },
};

const VOCAB = adventureVocabulary(PARTS);

const failing = (...ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, { ok: false, problem: "broken" }]));

const review = (
  revisions: unknown[],
  checks: Record<string, unknown> = failing("timeline", "resolution"),
) => readConsistencyReview({ checks, revisions }, PARTS, VOCAB);

describe("readConsistencyReview", () => {
  it("keeps a revision that fixes a failed check", () => {
    const r = review([
      {
        fixes: "timeline",
        target: "primaryObjective",
        text: "Recover the assay before the audit, three days from now.",
      },
      {
        fixes: "resolution",
        target: "outcomes[1]",
        text: "Oren Pell keeps the toll by bribing the audit.",
      },
      {
        fixes: "resolution",
        target: "npcs[0].goal",
        text: "Keep the toll until the audit passes",
      },
    ]);
    expect(r.flagged).toEqual(["resolution", "timeline"]);
    expect(r.revisions.map((x) => x.target)).toEqual([
      "primaryObjective",
      "outcomes[1]",
      "npcs[0].goal",
    ]);
    expect(r.dropped).toEqual([]);
  });

  it("finds nothing to do when every check passes", () => {
    const r = review([], {
      antagonist: { ok: true },
      timeline: { ok: true },
    });
    expect(r.flagged).toEqual([]);
    expect(r.revisions).toEqual([]);
  });

  it("drops a revision for a check that passed", () => {
    const r = review(
      [{ fixes: "agency", target: "summary", text: "A different summary." }],
      failing("timeline"),
    );
    expect(r.revisions).toEqual([]);
    expect(r.dropped[0]).toContain("does not fix a failed check");
  });

  it("drops revisions to locked or missing fields", () => {
    const r = review([
      { fixes: "timeline", target: "title", text: "A New Title" },
      { fixes: "timeline", target: "npcs[0].name", text: "Someone" },
      { fixes: "timeline", target: "outcomes[5]", text: "Nowhere." },
      { fixes: "timeline", target: "threats[0].involves", text: "x" },
      { fixes: "timeline", target: "lore", text: "More history." },
    ]);
    expect(r.revisions).toEqual([]);
    expect(r.dropped).toHaveLength(5);
    expect(r.dropped.every((d) => d.includes("not a revisable field"))).toBe(
      true,
    );
  });

  it("drops a revision that invents a name", () => {
    const r = review([
      {
        fixes: "resolution",
        target: "outcomes[0]",
        text: "Saint Ivo returns and breaks the guild.",
      },
    ]);
    expect(r.revisions).toEqual([]);
    expect(r.dropped[0]).toContain("introduces new names: Saint Ivo");
  });

  it("allows names the adventure already uses", () => {
    const r = review([
      {
        fixes: "resolution",
        target: "outcomes[0]",
        text: "The ferry folk take the Weir Mill from Oren Pell.",
      },
    ]);
    expect(r.revisions).toHaveLength(1);
  });

  // Counterexample table for the name heuristic (see patterns.md, Heuristic
  // Prose Checks). Re-run the whole table after any change to it.
  it.each([
    [
      "a new person mid-sentence",
      "The guild hires Saint Ivo to break it.",
      true,
    ],
    [
      "a new place in a list",
      "Thugs wait at the Weir Mill, Old Chapel and the ford.",
      true,
    ],
    ["a new name after a colon", "One witness remains: Captain Morrow.", true],
    ["a new name in quotes", 'The clerk mutters "Black Barge" and runs.', true],
    ["known names only", "Oren Pell holds the Weir Mill until dawn.", false],
    [
      "a sentence-start common word",
      "Meanwhile the guild waits. Nobody comes.",
      false,
    ],
    [
      "a known name after a sentence-start word",
      "When Oren Pell falls, the guild breaks.",
      false,
    ],
    ["a known name with 'the'", "The Weir Mill floods; the toll stays.", false],
  ])("%s: flagged=%s", (_label, revised, flagged) => {
    const r = review([
      { fixes: "resolution", target: "outcomes[0]", text: revised },
    ]);
    expect(r.revisions.length === 0).toBe(flagged);
    if (flagged) expect(r.dropped[0]).toContain("introduces new names");
  });

  it("cannot see new lore written in lower case (known limit)", () => {
    const r = review([
      {
        fixes: "resolution",
        target: "outcomes[0]",
        text: "A hidden tunnel under the ford lets the guild escape.",
      },
    ]);
    expect(r.revisions).toHaveLength(1);
  });

  it("drops empty, unchanged, repeated and overlong revisions", () => {
    const r = review([
      { fixes: "timeline", target: "summary", text: "" },
      {
        fixes: "timeline",
        target: "throughline",
        text: PARTS.situation.throughline,
      },
      {
        fixes: "timeline",
        target: "primaryObjective",
        text: "Recover it within the day.",
      },
      {
        fixes: "timeline",
        target: "primaryObjective",
        text: "Recover it by noon.",
      },
      {
        fixes: "timeline",
        target: "initialSituation",
        text: "x".repeat(MAX_REVISION_LENGTH + 1),
      },
    ]);
    expect(r.revisions.map((x) => x.text)).toEqual([
      "Recover it within the day.",
    ]);
    expect(r.dropped).toHaveLength(4);
  });

  it(`keeps at most ${MAX_REVISIONS} revisions`, () => {
    const targets = [
      "summary",
      "throughline",
      "initialSituation",
      "primaryObjective",
      "threats[0]",
      "outcomes[0]",
      "outcomes[1]",
    ];
    const r = review(
      targets.map((target) => ({
        fixes: "timeline",
        target,
        text: `Revised ${target} text.`,
      })),
    );
    expect(r.revisions).toHaveLength(MAX_REVISIONS);
    expect(r.dropped.at(-1)).toContain("revision limit");
  });

  it("ignores a reply with no checks or revisions", () => {
    const r = readConsistencyReview({}, PARTS, VOCAB);
    expect(r).toEqual({ flagged: [], revisions: [], dropped: [] });
  });
});

describe("applyConsistencyRevisions", () => {
  it("replaces only the revised text and leaves the input untouched", () => {
    const next = applyConsistencyRevisions(PARTS, [
      {
        fixes: "timeline",
        target: "primaryObjective",
        text: "Recover it by noon.",
      },
      {
        fixes: "resolution",
        target: "outcomes[1]",
        text: "Oren Pell bribes the audit.",
      },
      {
        fixes: "agency",
        target: "keyLocations[0].dilemma",
        text: "Speed, stealth or a bargain.",
      },
    ]);
    expect(next.situation.primaryObjective).toBe("Recover it by noon.");
    expect(next.situation.title).toBe("The Tithe of Lantern Ford");
    const outcome = (
      next.consequences.outcomes as Record<string, unknown>[]
    )[1];
    expect(outcome).toEqual({
      title: "Guild Triumphant",
      text: "Oren Pell bribes the audit.",
      involves: ["Oren Pell"],
    });
    const mill = (next.cast.keyLocations as Record<string, unknown>[])[0];
    expect(mill.name).toBe("Weir Mill");
    expect(mill.dilemma).toBe("Speed, stealth or a bargain.");
    expect(PARTS.situation.primaryObjective).toBe(
      "Recover the assay before the audit at dawn.",
    );
  });

  it("skips a revision whose target does not exist", () => {
    const next = applyConsistencyRevisions(PARTS, [
      { fixes: "timeline", target: "outcomes[9]", text: "Nothing." },
    ]);
    expect(next).toEqual(PARTS);
  });
});

describe("consistencyTask", () => {
  it("names all five checks and the no-new-lore rule", () => {
    const task = consistencyTask(PARTS);
    for (const id of [
      "antagonist",
      "causality",
      "resolution",
      "timeline",
      "agency",
    ]) {
      expect(task).toContain(`"${id}"`);
    }
    expect(task).toContain(
      "Only revise material with an identifiable contradiction",
    );
    expect(task).toContain("do not add new places, people, objects or history");
    expect(task).toContain("Recover the assay before the audit at dawn.");
  });
});
