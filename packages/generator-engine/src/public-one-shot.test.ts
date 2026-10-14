import { describe, expect, it } from "vitest";
import {
  applyOneShotRegenResponse,
  buildOneShotPrompt,
  generateOneShotLocal,
  oneShotConfig,
  parseOneShotResponse,
  regenerateOneShotLocal,
  renderGmSheet,
  renderOneShotMarkdown,
  resolveOneShot,
  validateOneShot,
} from "./public-one-shot";

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function adventure(options = {}, seed = 7) {
  return generateOneShotLocal(options, seeded(seed)).oneShot!;
}

describe("one-shot local generation", () => {
  it.each([2, 3, 4, 6])("budgets %ih to the minute with a buffer", (h) => {
    const a = adventure({ durationHours: h });
    const scenes = a.scenes.reduce((n, s) => n + s.minutes, 0);
    expect(scenes + a.timeBudget.bufferMinutes).toBe(h * 60);
    expect(a.timeBudget.bufferMinutes).toBeGreaterThan(0);
    expect(validateOneShot(a).filter((i) => i.severity === "error")).toEqual(
      [],
    );
  });

  it.each(oneShotConfig.genres)("is playable for %s", (genre) => {
    const a = adventure({ genre });
    expect(validateOneShot(a)).toEqual([]);
    expect(a.endings.length).toBeGreaterThanOrEqual(2);
    expect(a.scenes[0].kind).toBe("opening");
    expect(a.scenes.at(-1)!.kind).toBe("climax");
  });

  it.each(oneShotConfig.emphases)("supports emphasis %s", (emphasis) => {
    expect(validateOneShot(adventure({ emphasis }))).toEqual([]);
  });

  it("uses five scenes for a five-room structure", () => {
    const a = adventure({ structure: "Five-room adventure", durationHours: 2 });
    expect(a.scenes).toHaveLength(5);
    expect(a.scenes[0].title).toMatch(/^Room 1/);
  });

  it("gives vital clues two routes, one in an essential scene", () => {
    const a = adventure({ durationHours: 6 });
    for (const clue of a.clues) {
      expect(
        new Set(clue.routes.map((r) => r.sceneId)).size,
      ).toBeGreaterThanOrEqual(2);
      expect(
        clue.routes.some(
          (r) => a.scenes.find((s) => s.id === r.sceneId)!.essential,
        ),
      ).toBe(true);
    }
  });

  it("marks optional scenes with a skip instruction and a late path", () => {
    const a = adventure({ durationHours: 4 });
    const optional = a.scenes.filter((s) => !s.essential);
    expect(optional.length).toBeGreaterThan(0);
    for (const s of optional) expect(s.skip).toBeTruthy();
    expect(a.timeBudget.runningLate.join(" ")).toContain("Skip");
  });

  it("is system-neutral by default and notes the GM supplies mechanics otherwise", () => {
    expect(adventure().system).toBe("System-neutral");
    const a = adventure({ system: "D&D 5e", partyLevel: "Level 3" });
    expect(a.briefing.prep).toContain("D&D 5e");
    expect(a.partyLevel).toBe("Level 3");
    expect(adventure({ partyLevel: "Level 3" }).partyLevel).toBeUndefined();
  });

  it("is deterministic for a seed and renders both documents", () => {
    const a = generateOneShotLocal({}, seeded(3));
    const b = generateOneShotLocal({}, seeded(3));
    expect(a).toEqual(b);
    expect(a.content).toBe(renderOneShotMarkdown(a.oneShot!));
    expect(a.lore).toBe(renderGmSheet(a.oneShot!));
    expect(a.content).toContain("## Time Budget");
    expect(a.lore).toContain("Running late");
  });
});

describe("resolveOneShot input hardening", () => {
  it("falls back for NaN and clamps absurd values", () => {
    const bad = resolveOneShot({ durationHours: NaN, partySize: NaN });
    expect(bad.durationMinutes).toBe(180);
    expect(bad.partySize).toBe(4);
    expect(resolveOneShot({ durationHours: 0.1 }).durationMinutes).toBe(60);
    expect(resolveOneShot({ durationHours: 99 }).durationMinutes).toBe(480);
    expect(resolveOneShot({ partySize: 40 }).partySize).toBe(8);
  });

  it.each([1, 8])("still budgets %ih correctly", (h) => {
    const a = adventure({ durationHours: h });
    expect(validateOneShot(a)).toEqual([]);
  });
});

describe("validateOneShot", () => {
  it("flags a broken time budget, single-route clues and missing endings", () => {
    const a = structuredClone(adventure());
    a.scenes[0].minutes += 5;
    a.clues[0].routes = a.clues[0].routes.slice(0, 1);
    a.endings = a.endings.slice(0, 1);
    const messages = validateOneShot(a)
      .map((i) => i.message)
      .join("\n");
    expect(messages).toContain("not the");
    expect(messages).toContain("fewer than two routes");
    expect(messages).toContain("two possible endings");
  });

  it("flags a scene with no fail-forward", () => {
    const a = structuredClone(adventure());
    a.scenes[1].challenge.failForward = " ";
    expect(
      validateOneShot(a).some((i) => i.message.includes("fail-forward")),
    ).toBe(true);
  });
});

describe("regeneration", () => {
  it("rewrites one scene and leaves everything else untouched", () => {
    const a = adventure({ durationHours: 4 });
    const target = a.scenes[1];
    const { adventure: b, warnings } = regenerateOneShotLocal(
      a,
      { kind: "scene", id: target.id },
      seeded(99),
    );
    expect(warnings).toEqual([]);
    const after = b.scenes[1];
    expect(after.id).toBe(target.id);
    expect(after.minutes).toBe(target.minutes);
    expect(after.clueIds).toEqual(target.clueIds);
    expect(after.next).toEqual(target.next);
    expect(after.location).toBe(target.location);
    expect(b.scenes.filter((_, i) => i !== 1)).toEqual(
      a.scenes.filter((_, i) => i !== 1),
    );
    expect(b.clues).toEqual(a.clues);
    expect(b.briefing).toEqual(a.briefing);
    expect(b.timeBudget).toEqual(a.timeBudget);
  });

  it("keeps an NPC's name and role", () => {
    const a = adventure();
    const { adventure: b } = regenerateOneShotLocal(
      a,
      { kind: "npc", id: "npc-3" },
      seeded(5),
    );
    expect(b.npcs[2].name).toBe(a.npcs[2].name);
    expect(b.npcs[2].role).toBe(a.npcs[2].role);
  });

  it("reports an unknown target instead of throwing", () => {
    const a = adventure();
    const result = regenerateOneShotLocal(a, { kind: "scene", id: "nope" });
    expect(result.adventure).toBe(a);
    expect(result.warnings[0]).toContain("no longer exists");
  });

  it("applies an AI reply but warns when a locked NPC disappears", () => {
    const a = adventure();
    const scene = a.scenes[1];
    const reply = JSON.stringify({
      situation: "Something quiet happens here.",
      approaches: ["Wait"],
      challenge: {
        type: "social",
        description: "Talk.",
        failForward: "Move on.",
      },
      outcomes: ["Fine"],
    });
    const { adventure: b, warnings } = applyOneShotRegenResponse(
      a,
      { kind: "scene", id: scene.id },
      reply,
    );
    expect(b.scenes[1].situation).toBe("Something quiet happens here.");
    expect(b.scenes[1].minutes).toBe(scene.minutes);
    expect(warnings.some((w) => w.includes("no longer mentioned"))).toBe(true);
  });

  it("throws on an unparseable AI reply", () => {
    expect(() =>
      applyOneShotRegenResponse(
        adventure(),
        { kind: "scene", id: "scene-2" },
        "not json",
      ),
    ).toThrow();
  });
});

describe("AI prompt and parse", () => {
  it("states the budget rules and consistency pass", () => {
    const { userMessage } = buildOneShotPrompt({
      durationHours: 3,
      boundaries: "no gore",
    });
    expect(userMessage).toContain("must add up to 180");
    expect(userMessage).toContain("consistency pass");
    expect(userMessage).toContain("no gore");
  });

  it("repairs bad arithmetic from the model", () => {
    const resolved = resolveOneShot({ durationHours: 3 }, seeded(1));
    const base = adventure({ durationHours: 3 });
    const bad = {
      ...base,
      scenes: base.scenes.map((s) => ({ ...s, minutes: 7 })),
    };
    const out = parseOneShotResponse(JSON.stringify(bad), resolved);
    const a = out.oneShot!;
    expect(
      a.scenes.reduce((n, s) => n + s.minutes, 0) + a.timeBudget.bufferMinutes,
    ).toBe(180);
  });

  it("rejects a reply that is not playable so callers fall back", () => {
    const resolved = resolveOneShot({}, seeded(1));
    const base = adventure();
    expect(() =>
      parseOneShotResponse(JSON.stringify({ ...base, endings: [] }), resolved),
    ).toThrow(/not playable/);
    expect(() => parseOneShotResponse("garbage", resolved)).toThrow();
    expect(() =>
      parseOneShotResponse(JSON.stringify({ scenes: [] }), resolved),
    ).toThrow(/too few scenes/);
  });

  it("rejects missing or optional-only vital clues", () => {
    const resolved = resolveOneShot({}, seeded(1));
    const base = adventure({ durationHours: 6 });
    expect(() =>
      parseOneShotResponse(JSON.stringify({ ...base, clues: [] }), resolved),
    ).toThrow(/exactly three vital clues/);

    const optional = base.scenes.filter((scene) => !scene.essential);
    expect(optional.length).toBeGreaterThanOrEqual(2);
    const clues = structuredClone(base.clues);
    clues[0].routes = optional.slice(0, 2).map((scene) => ({
      sceneId: scene.id,
      method: "Search",
    }));
    expect(() =>
      parseOneShotResponse(JSON.stringify({ ...base, clues }), resolved),
    ).toThrow(/only found in skippable scenes/);
  });

  it("rejects loops and replies with more than six scenes", () => {
    const resolved = resolveOneShot({}, seeded(1));
    const base = adventure({ durationHours: 6 });
    const looped = structuredClone(base);
    looped.scenes[1].next = [looped.scenes[1].id];
    expect(() =>
      parseOneShotResponse(JSON.stringify(looped), resolved),
    ).toThrow(/scene paths contain a loop/);

    const oversized = structuredClone(base);
    oversized.scenes.push(structuredClone(oversized.scenes[1]));
    expect(() =>
      parseOneShotResponse(JSON.stringify(oversized), resolved),
    ).toThrow(/too many scenes/);
  });
});
