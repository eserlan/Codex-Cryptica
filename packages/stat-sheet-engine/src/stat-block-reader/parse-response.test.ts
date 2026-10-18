import { describe, expect, it } from "vitest";
import { parseStatBlockReadResponse } from "./parse-response";
import { StatBlockReadError } from "./errors";
import {
  AI_RESPONSES,
  BAD_RESPONSES,
  CONVERT_GOBLIN_BOSS_RESPONSE,
} from "./__fixtures__/ai-responses";
import { STAT_BLOCK_FIXTURES, fixtureById } from "./__fixtures__/stat-blocks";
import { prepareStatBlockSource } from "./source";
import type { ImportRequest } from "./types";

const copyRequest = (id: string): ImportRequest => ({
  source: prepareStatBlockSource(fixtureById(id).source),
  mode: "copy",
  reader: "ai",
});

const checkNotes = (r: { notes: { state: string }[] }) =>
  r.notes.filter((n) => n.state === "check");

describe("parseStatBlockReadResponse: clean replies", () => {
  it("gives every expected value with no check notes (clean creature)", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(AI_RESPONSES["clean-hill-brute"]),
      copyRequest("clean-hill-brute"),
    );
    expect(result.outcome).toBe("ok");
    expect(result.values).toMatchObject({ ac: 13, hp: 45, cr: "3" });
    expect(checkNotes(result)).toHaveLength(0);
  });

  it("derives proficiency bonus from CR and marks it as derived", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(AI_RESPONSES["clean-hill-brute"]),
      copyRequest("clean-hill-brute"),
    );
    expect(result.values).toMatchObject({ proficiencyBonus: 2 });
    expect(result.notes).toContainEqual({
      path: "proficiencyBonus",
      state: "derived",
      reason: "from-cr",
    });
  });

  it.each(
    STAT_BLOCK_FIXTURES.filter(
      (f) => f.kind === "creature" || f.kind === "npc",
    ),
  )("reads $id with no check notes", ({ id, kind }) => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(AI_RESPONSES[id]),
      copyRequest(id),
    );
    expect(result.kind).toBe(kind);
    expect(checkNotes(result)).toEqual([]);
  });

  it("parses a reply with prose after the JSON object", () => {
    const result = parseStatBlockReadResponse(
      BAD_RESPONSES.trailingGarbage,
      copyRequest("clean-hill-brute"),
    );
    expect(result.values).toMatchObject({ ac: 13 });
  });
});

describe("parseStatBlockReadResponse: bad values", () => {
  it("marks an AC that is not in the pasted text as check this", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(BAD_RESPONSES.inventedAc),
      copyRequest("clean-hill-brute"),
    );
    expect(result.notes).toContainEqual(
      expect.objectContaining({
        path: "ac",
        state: "check",
        reason: "not-in-source",
      }),
    );
  });

  it("marks an invented language as check this", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(BAD_RESPONSES.inventedLanguage),
      copyRequest("clean-hill-brute"),
    );
    expect(result.notes).toContainEqual(
      expect.objectContaining({ path: "languages", reason: "not-in-source" }),
    );
  });

  it("marks a damage formula the dice parser rejects as malformed", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(BAD_RESPONSES.malformedDamage),
      copyRequest("clean-hill-brute"),
    );
    expect(result.notes).toContainEqual(
      expect.objectContaining({
        path: "actions.0.damageFormula",
        reason: "malformed",
      }),
    );
  });

  it("removes a value of the wrong type and marks it malformed, keeping the rest", () => {
    const reply = {
      ...(AI_RESPONSES["clean-hill-brute"] as object),
      values: {
        ...(AI_RESPONSES["clean-hill-brute"] as { values: object }).values,
        hp: "lots",
      },
    };
    const result = parseStatBlockReadResponse(
      JSON.stringify(reply),
      copyRequest("clean-hill-brute"),
    );
    expect(result.values).not.toHaveProperty("hp");
    expect(result.values).toMatchObject({ ac: 13 });
    expect(result.notes).toContainEqual(
      expect.objectContaining({ path: "hp", reason: "malformed" }),
    );
  });

  it("turns unknown text keys into leftovers", () => {
    const reply = {
      ...(AI_RESPONSES["clean-hill-brute"] as object),
      values: {
        ...(AI_RESPONSES["clean-hill-brute"] as { values: object }).values,
        lair_actions: "The brute can pound the ground.",
      },
    };
    const result = parseStatBlockReadResponse(
      JSON.stringify(reply),
      copyRequest("clean-hill-brute"),
    );
    expect(result.leftovers).toContainEqual({
      label: "Lair actions",
      text: "The brute can pound the ground.",
    });
  });
});

describe("parseStatBlockReadResponse: outcomes", () => {
  it("returns no values for a lore paragraph", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(AI_RESPONSES["no-stat-block-lore"]),
      copyRequest("no-stat-block-lore"),
    );
    expect(result.outcome).toBe("no-stat-block");
    expect(result.values).toEqual({});
  });

  it("returns candidates and no values when there are several creatures", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(AI_RESPONSES["several-goblins"]),
      copyRequest("several-goblins"),
    );
    expect(result.outcome).toBe("several");
    expect(result.candidates.map((c) => c.name)).toEqual([
      "Goblin Scout",
      "Goblin Chief",
    ]);
    expect(result.values).toEqual({});
  });

  it("flags a player character sheet", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(AI_RESPONSES["character-sheet-fighter"]),
      copyRequest("character-sheet-fighter"),
    );
    expect(result.outcome).toBe("character");
  });

  it("reads a 5e stat block as 5e in copy mode", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(AI_RESPONSES["5e-goblin-boss"]),
      { ...copyRequest("5e-goblin-boss") },
    );
    expect(result.looksLike).toBe("5e");
  });
});

describe("parseStatBlockReadResponse: convert-5e", () => {
  it("keeps the converted notes the model gave, with their originals", () => {
    const result = parseStatBlockReadResponse(
      JSON.stringify(CONVERT_GOBLIN_BOSS_RESPONSE),
      {
        source: fixtureById("5e-goblin-boss").source,
        mode: "convert-5e",
        reader: "ai",
      },
    );
    expect(result.notes).toContainEqual({
      path: "doom",
      state: "converted",
      reason: "converted",
      original: null,
    });
    expect(result.notes).toContainEqual(
      expect.objectContaining({
        path: "traits.0.description",
        state: "converted",
        original: expect.stringContaining("Disengage"),
      }),
    );
  });

  it("flags a changed number that has no converted note", () => {
    const reply = {
      ...CONVERT_GOBLIN_BOSS_RESPONSE,
      notes: [],
      values: { ...CONVERT_GOBLIN_BOSS_RESPONSE.values, ac: 16 },
    };
    const result = parseStatBlockReadResponse(JSON.stringify(reply), {
      source: fixtureById("5e-goblin-boss").source,
      mode: "convert-5e",
      reader: "ai",
    });
    expect(result.notes).toContainEqual(
      expect.objectContaining({ path: "ac", reason: "unmarked-change" }),
    );
  });
});

describe("parseStatBlockReadResponse: no JSON", () => {
  it("throws a malformed read error when there is no JSON object", () => {
    expect(() =>
      parseStatBlockReadResponse(
        BAD_RESPONSES.noJson,
        copyRequest("clean-hill-brute"),
      ),
    ).toThrow(StatBlockReadError);
  });
});
