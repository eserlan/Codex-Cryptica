import { describe, expect, it } from "vitest";
import { isValidDice, numberInSource, runLocalChecks } from "./local-checks";
import type { FieldNote, ReadResult } from "./types";

const SOURCE = `Hill Brute
Large giant, chaotic evil
Armor Class 13 (hide armor)
Hit Points 45 (6d10+12)
STR 18 (+4) DEX 8 (-1) CON 14 (+2) INT 6 (-2) WIS 9 (-1) CHA 7 (-2)
Languages Giant
Challenge 3 (Doom 2)`;

function result(
  values: Record<string, unknown>,
  notes: FieldNote[] = [],
  kind: "creature" | "npc" = "creature",
): ReadResult {
  return {
    outcome: "ok",
    candidates: [],
    looksLike: "tov",
    kind,
    name: "Hill Brute",
    values: values as ReadResult["values"],
    notes,
    leftovers: [],
    reader: "ai",
    corrected: [],
  };
}

const reasonsFor = (r: ReadResult, path: string) =>
  r.notes.filter((n) => n.path === path).map((n) => n.reason);

describe("numberInSource", () => {
  it("matches a whole number and not a longer one", () => {
    expect(numberInSource(8, "DEX 8 (-1)")).toBe(true);
    expect(numberInSource(8, "Hit Points 18")).toBe(false);
  });
});

describe("isValidDice", () => {
  it("accepts NdM+K and rejects text after the formula", () => {
    expect(isValidDice("1d10+4")).toBe(true);
    expect(isValidDice("1d10 bludgeoning")).toBe(false);
  });
});

describe("runLocalChecks in copy mode", () => {
  it("flags an AC that is not in the pasted text", () => {
    const checked = runLocalChecks(result({ ac: 15 }), {
      mode: "copy",
      source: SOURCE,
    });
    expect(reasonsFor(checked, "ac")).toEqual(["not-in-source"]);
  });

  it("gives no note to an AC that is in the text", () => {
    const checked = runLocalChecks(result({ ac: 13 }), {
      mode: "copy",
      source: SOURCE,
    });
    expect(checked.notes).toHaveLength(0);
  });

  it("flags an invented language but not one that matches after normalising", () => {
    const invented = runLocalChecks(result({ languages: "Draconic" }), {
      mode: "copy",
      source: SOURCE,
    });
    expect(reasonsFor(invented, "languages")).toEqual(["not-in-source"]);

    const matching = runLocalChecks(result({ languages: "GIANT" }), {
      mode: "copy",
      source: SOURCE,
    });
    expect(matching.notes).toHaveLength(0);
  });

  it("matches a trait name written with a ligature in the source", () => {
    const withLigature = `${SOURCE}\nﬁerce Pursuit. Advantage.`;
    const checked = runLocalChecks(
      result({ traits: [{ name: "Fierce Pursuit", description: "x" }] }),
      { mode: "copy", source: withLigature },
    );
    expect(checked.notes).toHaveLength(0);
  });

  it("flags out-of-range ability scores and Luck", () => {
    const checked = runLocalChecks(result({ abilityScores: { str: 31 } }), {
      mode: "copy",
      source: SOURCE,
    });
    expect(reasonsFor(checked, "abilityScores.str")).toEqual(["out-of-range"]);

    const npc = runLocalChecks(result({ luck: 6 }, [], "npc"), {
      mode: "copy",
      source: SOURCE,
    });
    expect(reasonsFor(npc, "luck")).toEqual(["out-of-range"]);
  });

  it("flags a damage formula the dice parser rejects", () => {
    const checked = runLocalChecks(
      result({
        actions: [{ name: "Greatclub", damageFormula: "1d10 bludgeoning" }],
      }),
      { mode: "copy", source: SOURCE },
    );
    expect(reasonsFor(checked, "actions.0.damageFormula")).toEqual([
      "malformed",
    ]);
  });

  it("only adds notes and never removes the model's own", () => {
    const modelNote: FieldNote = {
      path: "ac",
      state: "check",
      reason: "uncertain",
      source: "AC 13?",
    };
    const checked = runLocalChecks(result({ ac: 13 }, [modelNote]), {
      mode: "copy",
      source: SOURCE,
    });
    expect(checked.notes).toContainEqual(modelNote);
  });
});

describe("runLocalChecks in convert-5e mode", () => {
  it("skips the text check", () => {
    const checked = runLocalChecks(result({ languages: "Draconic" }), {
      mode: "convert-5e",
      source: SOURCE,
    });
    expect(checked.notes.filter((n) => n.path === "languages")).toHaveLength(0);
  });

  it("marks a number changed without a note as an unmarked change", () => {
    const checked = runLocalChecks(result({ ac: 16 }), {
      mode: "convert-5e",
      source: SOURCE,
    });
    expect(reasonsFor(checked, "ac")).toEqual(["unmarked-change"]);
  });

  it("does not flag a number that has a converted note", () => {
    const converted: FieldNote = {
      path: "doom",
      state: "converted",
      reason: "converted",
      original: null,
    };
    const checked = runLocalChecks(result({ doom: 5 }, [converted]), {
      mode: "convert-5e",
      source: SOURCE,
    });
    expect(checked.notes.filter((n) => n.state === "check")).toHaveLength(0);
  });
});

describe("runLocalChecks size", () => {
  it("flags a size that is not a sheet size", () => {
    const checked = runLocalChecks(result({ size: "Colossal" }), {
      mode: "copy",
      source: SOURCE,
    });
    expect(reasonsFor(checked, "size")).toContain("malformed");
  });
});
