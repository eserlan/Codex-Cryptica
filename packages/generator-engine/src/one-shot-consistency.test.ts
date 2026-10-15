import { describe, expect, it } from "vitest";
import { normaliseState } from "./one-shot-state";
import { structurePrompt } from "./one-shot-stage-prompts";
import { renderOneShotMarkdown } from "./one-shot-render";
import {
  buildOneShotPrompt,
  checkPlayability,
  generateOneShotLocal,
  resolveOneShot,
} from "./public-one-shot";
import type { OneShotAdventure } from "./one-shot-types";

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const local = (options = {}): OneShotAdventure =>
  structuredClone(generateOneShotLocal(options, seeded()).oneShot!);
const messages = (a: OneShotAdventure) =>
  checkPlayability(a).map((g) => g.message);

describe("scene exits", () => {
  it("flags a scene that contradicts where the last one left an NPC", () => {
    const a = local();
    const guide = a.npcs[2];
    a.scenes[0].exit = [
      { who: guide.id, kind: "npc", state: "free", where: "with the party" },
    ];
    a.scenes[1].whereabouts = [
      { who: guide.id, kind: "npc", state: "captive", where: "the harbour" },
    ];
    expect(
      messages(a).some(
        (m) => m.includes(guide.name) && /free to captive/.test(m),
      ),
    ).toBe(true);
  });

  it("accepts the change when the next scene says how it happened", () => {
    const a = local();
    const guide = a.npcs[2];
    a.scenes[0].exit = [
      { who: guide.id, kind: "npc", state: "free", where: "with the party" },
    ];
    a.scenes[1].whereabouts = [
      {
        who: guide.id,
        kind: "npc",
        state: "captive",
        where: "the harbour",
        how: "Rook's crew seized him while the party slept.",
      },
    ];
    expect(messages(a).some((m) => /free to captive/.test(m))).toBe(false);
  });

  it("flags an object that turns up somewhere else with no reason", () => {
    const a = local();
    a.scenes[0].exit = [
      {
        who: "the chart",
        kind: "object",
        state: "here",
        where: "with the party",
      },
    ];
    a.scenes[1].whereabouts = [
      { who: "the chart", kind: "object", state: "here", where: "the gallery" },
    ];
    expect(messages(a).some((m) => /the chart moves/.test(m))).toBe(true);
  });
});

describe("one count for the clock", () => {
  const bell = (a: OneShotAdventure) => {
    a.clock!.counts = "bell rings";
    a.clock!.ticks = Array.from({ length: 6 }, (_, i) => ({
      trigger: "",
      effect: `Ring ${i + 1} sounds.`,
    }));
    return a;
  };

  it("flags a total in the story that differs from the ticks", () => {
    const a = bell(local());
    a.briefing.secret = "Three rings open the gate to Vey Below.";
    expect(messages(a).some((m) => /counts bell rings as 3/.test(m))).toBe(
      true,
    );
  });

  it("flags a ring past the last tick", () => {
    const a = bell(local());
    a.clock!.deadline = "On the eighth ring the gate opens.";
    expect(messages(a).some((m) => /as 8/.test(m))).toBe(true);
  });

  it("accepts a story whose count matches the clock", () => {
    const a = bell(local());
    a.briefing.secret = "Six rings open the gate; the first ring has sounded.";
    expect(messages(a).some((m) => /counts bell rings/.test(m))).toBe(false);
  });
});

describe("how the place works", () => {
  it("asks for rules when the adventure goes underwater", () => {
    const a = local();
    a.scenes[1].location = "The streets of Vey Below, underwater";
    expect(messages(a).some((m) => /somewhere underwater/.test(m))).toBe(true);
    a.briefing.environment = "Air pockets fill the chapel and upper streets.";
    expect(messages(a).some((m) => /how the place works/i.test(m))).toBe(false);
    expect(renderOneShotMarkdown(a)).toContain("**How this place works:**");
  });
});

describe("supplies only in Survival", () => {
  it("drops supplies from other emphases", () => {
    const a = local({ emphasis: "Investigation / mystery" });
    a.resources = local({ emphasis: "Survival" }).resources;
    expect(normaliseState(a).resources).toBeUndefined();
  });

  it("asks for supplies only in a Survival prompt", () => {
    const mystery = resolveOneShot(
      { emphasis: "Investigation / mystery" },
      seeded(),
    );
    const survival = resolveOneShot({ emphasis: "Survival" }, seeded());
    expect(structurePrompt(mystery, {}).userMessage).not.toContain(
      '"resources": [',
    );
    expect(structurePrompt(survival, {}).userMessage).toContain(
      '"resources": [',
    );
    expect(buildOneShotPrompt(mystery).userMessage).toContain(
      'Leave "resources" out',
    );
  });
});

describe("genre in play", () => {
  it("asks a Pirate one-shot for ships, not only a coastline", () => {
    const pirate = resolveOneShot({ genre: "Pirate" }, seeded());
    expect(structurePrompt(pirate, {}).userMessage).toMatch(
      /aboard a ship or on the water/,
    );
  });
});
