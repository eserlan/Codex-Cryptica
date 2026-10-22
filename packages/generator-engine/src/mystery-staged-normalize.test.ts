import { describe, expect, it } from "vitest";
import { flattenText, normalizeMysteryStage } from "./mystery-staged-normalize";

describe("flattenText", () => {
  it("flattens strings, lists and objects and ignores empty values", () => {
    expect(flattenText("plain")).toBe("plain");
    expect(flattenText(["a", "", "b"])).toBe("a; b");
    expect(flattenText({ when: "At dusk", what: "the bell rang" })).toBe(
      "At dusk — the bell rang",
    );
    expect(flattenText(null)).toBe("");
    expect(flattenText(undefined)).toBe("");
  });
});

describe("normalizeMysteryStage.audit", () => {
  it.each([
    ["consistent", [], "consistent"],
    ["pass", [], "consistent"],
    ["inconsistent", ["a doubt"], "needs-repair"],
    ["needs-repair", ["a doubt"], "needs-repair"],
    ["consistent", ["a doubt"], "needs-repair"],
    ["inconsistent", [], "needs-repair"],
    ["", [], "consistent"],
  ])("maps status %j with issues %j to %s", (status, issues, expected) => {
    expect(normalizeMysteryStage.audit({ status, issues }).status).toBe(
      expected,
    );
  });

  it("drops blank issues", () => {
    expect(
      normalizeMysteryStage.audit({ status: "consistent", issues: ["", "  "] }),
    ).toMatchObject({ status: "consistent", issues: [] });
  });
});

describe("normalizeMysteryStage.clues", () => {
  const clue = (id: string, sourceId: string, supports: unknown) => ({
    id,
    observation: "seen",
    sourceId,
    supports,
    doesNotProve: "nothing",
    leadsTo: ["place-1"],
  });

  it("drops supports that are not locked revelation ids", () => {
    const out = normalizeMysteryStage.clues(
      { clues: [clue("clue-1", "place-1", ["rev-1", "person-1", "clue-2"])] },
      ["rev-1"],
    );
    expect((out.clues as Array<{ supports: string[] }>)[0].supports).toEqual([
      "rev-1",
    ]);
  });

  it("does not invent routes when fewer than two sources support a revelation", () => {
    const out = normalizeMysteryStage.clues(
      {
        clues: [
          clue("clue-1", "place-1", ["rev-1"]),
          clue("clue-2", "place-1", ["rev-1"]),
        ],
        independentPaths: [],
      },
      ["rev-1"],
    );
    expect(out.independentPaths).toEqual([]);
  });

  it("keeps a given route without inventing a second route", () => {
    const given = { revelationId: "rev-1", clueIds: ["clue-1"] };
    const out = normalizeMysteryStage.clues(
      {
        clues: [
          clue("clue-1", "place-1", ["rev-1"]),
          clue("clue-2", "place-2", ["rev-1"]),
          clue("clue-3", "place-3", ["rev-1"]),
        ],
        independentPaths: [given],
      },
      ["rev-1"],
    );
    expect(out.independentPaths).toEqual([given]);
  });

  it("leaves malformed routes for the validator to reject", () => {
    const malformed = { revelationId: "rev-1", clueIds: ["clue-1", "clue-1"] };
    const out = normalizeMysteryStage.clues(
      {
        clues: [
          clue("clue-1", "place-1", ["rev-1"]),
          clue("clue-2", "place-1", ["rev-1"]),
          clue("clue-3", "place-2", ["rev-1"]),
        ],
        independentPaths: [malformed],
      },
      ["rev-1"],
    );

    expect(out.independentPaths).toEqual([malformed]);
  });
});

describe("normalizeMysteryStage.repair", () => {
  const previous = {
    cast: { suspects: [{ id: "person-1", name: "Mara" }], locations: [] },
    clues: { clues: [], independentPaths: [] },
    pressure: { escalation: "The watch seals the archive." },
  };
  const locked = { culpritName: "Mara Quill", revelationIds: [], previous };

  it("keeps the previous object when the repair omits it", () => {
    const out = normalizeMysteryStage.repair({ cast: {} }, locked);
    expect(out.pressure).toMatchObject({
      escalation: "The watch seals the archive.",
    });
    expect(out.clues).toMatchObject({ clues: [] });
  });

  it("lets a repaired field replace the previous one and keeps the locked culprit name", () => {
    const out = normalizeMysteryStage.repair(
      {
        pressure: { escalation: "The watch seals the vault." },
        cast: {
          suspects: [{ id: "person-1", name: "Someone Else", role: "clerk" }],
        },
      },
      locked,
    );
    expect(out.pressure).toMatchObject({
      escalation: "The watch seals the vault.",
    });
    expect(
      (out.cast as { suspects: Array<{ name: string }> }).suspects[0].name,
    ).toBe("Mara Quill");
  });

  it("ignores a repair object that is not an object", () => {
    const out = normalizeMysteryStage.repair({ pressure: "nope" }, locked);
    expect(out.pressure).toMatchObject({
      escalation: "The watch seals the archive.",
    });
  });
});
