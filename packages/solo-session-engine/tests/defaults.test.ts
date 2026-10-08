import { describe, expect, it } from "bun:test";
import {
  normaliseSceneName,
  resolveDefaultMap,
  buildOracleShortcutPrompt,
  resolveQuickRoll,
  suggestCategory,
} from "../src/defaults";

describe("resolveDefaultMap", () => {
  it("returns the last map when it is still in the vault", () => {
    expect(resolveDefaultMap("m2", ["m1", "m2"])).toBe("m2");
  });

  it("falls back to the first map when the last one is gone", () => {
    expect(resolveDefaultMap("gone", ["m1", "m2"])).toBe("m1");
  });

  it("falls back to the first map when there is no last map", () => {
    expect(resolveDefaultMap(null, ["m1"])).toBe("m1");
  });

  it("returns null for a vault with no maps", () => {
    expect(resolveDefaultMap("m1", [])).toBeNull();
    expect(resolveDefaultMap(null, [])).toBeNull();
  });
});

describe("normaliseSceneName", () => {
  it("trims the name", () => {
    expect(normaliseSceneName("  Arrival  ")).toEqual({
      ok: true,
      name: "Arrival",
    });
  });

  it("rejects empty and whitespace-only names", () => {
    expect(normaliseSceneName("")).toEqual({ ok: false });
    expect(normaliseSceneName("   ")).toEqual({ ok: false });
  });

  it("clamps names to 80 characters", () => {
    const result = normaliseSceneName("x".repeat(120));
    expect(result).toEqual({ ok: true, name: "x".repeat(80) });
  });
});

describe("resolveQuickRoll", () => {
  it("uses typed input, trimmed", () => {
    expect(resolveQuickRoll("  2d6+1 ", "d20")).toBe("2d6+1");
  });

  it("repeats the last expression on empty input", () => {
    expect(resolveQuickRoll("", "d20")).toBe("d20");
    expect(resolveQuickRoll("   ", "d20")).toBe("d20");
  });

  it("returns null when empty with no last roll", () => {
    expect(resolveQuickRoll("", null)).toBeNull();
  });
});

describe("suggestCategory", () => {
  const cats = ["character", "location", "item", "faction", "event", "note"];

  it("suggests a character for a generated NPC", () => {
    expect(suggestCategory("generated-result", "npc", cats)).toBe("character");
  });

  it("suggests a note for a rumour", () => {
    expect(suggestCategory("generated-result", "rumour", cats)).toBe("note");
  });

  it("suggests an event for an encounter, or a note when the vault has no Event category", () => {
    expect(suggestCategory("generated-result", "encounter", cats)).toBe(
      "event",
    );
    expect(suggestCategory("generated-result", "encounter", ["note"])).toBe(
      "note",
    );
  });

  it("suggests a note for table results, dice rolls and unknown types", () => {
    expect(suggestCategory("table-result", null, cats)).toBe("note");
    expect(suggestCategory("dice-roll", null, cats)).toBe("note");
    expect(suggestCategory("something-new", null, cats)).toBe("note");
  });
});

describe("buildOracleShortcutPrompt (Solo Play Loop, FR-018 to FR-021)", () => {
  const ctx = {
    sceneName: "The flooded crypt",
    mapName: "Greyhollow",
    partyNames: ["Kael", "Brother Ivo"],
    recent: ["Tavern patrons → a one-eyed smuggler"],
  };

  it("starts each kind with its question", () => {
    expect(
      buildOracleShortcutPrompt("npc-reaction", ctx).startsWith(
        "How does this NPC react?",
      ),
    ).toBe(true);
    expect(
      buildOracleShortcutPrompt("complication", ctx).startsWith(
        "Add a complication",
      ),
    ).toBe(true);
    expect(
      buildOracleShortcutPrompt("place-knowledge", ctx).startsWith(
        "What is known about this place?",
      ),
    ).toBe(true);
    expect(
      buildOracleShortcutPrompt("what-next", ctx).startsWith(
        "What happens next?",
      ),
    ).toBe(true);
  });

  it("never cuts a line in half: long context drops whole lines and stays within the limit", () => {
    const long = {
      ...ctx,
      recent: Array.from(
        { length: 10 },
        (_, i) => `Result ${i}: ${"x".repeat(120)}`,
      ),
    };
    const prompt = buildOracleShortcutPrompt("npc-reaction", long);
    expect(prompt.length).toBeLessThanOrEqual(1200);
    for (const line of prompt.split("\n")) {
      expect(
        line === "How does this NPC react?" ||
          line.startsWith("Context: ") ||
          /^Recent: Result \d: x+$/.test(line),
      ).toBe(true);
    }
    expect(prompt).toContain("Recent: Result 0:");
  });

  it("includes the scene, place, party and recent results", () => {
    const prompt = buildOracleShortcutPrompt("npc-reaction", ctx);
    expect(prompt).toContain('scene "The flooded crypt"');
    expect(prompt).toContain('place "Greyhollow"');
    expect(prompt).toContain("party Kael and Brother Ivo");
    expect(prompt).toContain("Tavern patrons → a one-eyed smuggler");
  });

  it("leaves out context lines for parts that are not present", () => {
    const prompt = buildOracleShortcutPrompt("what-next", {
      sceneName: "",
      mapName: null,
      partyNames: [],
      recent: [],
    });
    expect(prompt).not.toContain("scene");
    expect(prompt).not.toContain("place");
    expect(prompt).not.toContain("party");
  });

  it("shows at most 10 recent results, each clamped to 120 characters", () => {
    const recent = Array.from(
      { length: 12 },
      (_, i) => `r${i} ${"x".repeat(200)}`,
    );
    const prompt = buildOracleShortcutPrompt("what-next", { ...ctx, recent });
    expect(
      prompt.split("\n").filter((line) => line.includes("r")).length,
    ).toBeLessThanOrEqual(12);
    expect(prompt).not.toContain("r10");
    expect(prompt).not.toContain("x".repeat(121));
  });

  it("keeps the whole prompt within 1,200 characters", () => {
    const recent = Array.from({ length: 10 }, () => "y".repeat(120));
    const prompt = buildOracleShortcutPrompt("npc-reaction", {
      sceneName: "s".repeat(80),
      mapName: "m".repeat(80),
      partyNames: Array.from(
        { length: 12 },
        (_, i) => `Member ${i} ${"n".repeat(40)}`,
      ),
      recent,
    });
    expect(prompt.length).toBeLessThanOrEqual(1200);
  });

  it("never asks the Oracle to act as game master or run the game", () => {
    for (const kind of [
      "npc-reaction",
      "complication",
      "place-knowledge",
      "what-next",
    ] as const) {
      const prompt = buildOracleShortcutPrompt(kind, ctx).toLowerCase();
      expect(prompt).not.toContain("game master");
      expect(prompt).not.toMatch(/\bgm\b/);
      expect(prompt).not.toContain("run the game");
    }
  });
});
