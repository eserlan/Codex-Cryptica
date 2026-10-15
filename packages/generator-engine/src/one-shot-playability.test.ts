import { describe, expect, it } from "vitest";
import {
  applyOneShotRepair,
  buildOneShotPrompt,
  buildOneShotRegenPrompt,
  buildOneShotRepairPrompt,
  checkPlayability,
  generateOneShotLocal,
  parseOneShotResponse,
  renderGmSheet,
  renderOneShotMarkdown,
  resolveOneShot,
} from "./public-one-shot";
import { isVague } from "./one-shot-playability";
import type { OneShotAdventure } from "./one-shot-types";

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const local = (options = {}) =>
  generateOneShotLocal(options, seeded()).oneShot!;

/** A structurally valid adventure with every playability field stripped. */
function bare(): OneShotAdventure {
  const a = structuredClone(local({ durationHours: 3 }));
  delete a.solution;
  delete a.clock;
  delete a.briefing.trigger;
  delete a.briefing.questions;
  for (const s of a.scenes) {
    delete s.challenge.success;
    delete s.challenge.otherApproaches;
  }
  return a;
}

describe("checkPlayability", () => {
  it.each([2, 3, 4, 6])(
    "finds nothing missing in a local %ih one-shot",
    (h) => {
      expect(checkPlayability(local({ durationHours: h }))).toEqual([]);
    },
  );

  it("names every part a GM would have to invent", () => {
    const areas = new Set(checkPlayability(bare()).map((g) => g.area));
    expect(areas).toEqual(new Set(["briefing", "solution", "clock", "scene"]));
  });

  it("flags a finale component that is referred to but never given", () => {
    const a = local();
    a.solution!.requirements[0].detail = "The three stolen names";
    expect(checkPlayability(a).map((g) => g.message)).toContainEqual(
      expect.stringMatching(/mentioned but never given/),
    );
  });

  it("flags a finale component found only in an optional scene", () => {
    const a = local();
    const optionalEarly = a.scenes.find(
      (scene) => !scene.essential && scene.kind !== "climax",
    );
    expect(optionalEarly).toBeDefined();
    a.solution!.requirements[0].sceneIds = [optionalEarly!.id];
    expect(checkPlayability(a).map((g) => g.message)).toContainEqual(
      expect.stringMatching(/can't be found before the finale/),
    );
  });

  it("flags a clock with no way to slow the threat", () => {
    const a = local();
    a.clock!.slow = "  ";
    expect(checkPlayability(a).map((g) => g.area)).toContain("clock");
  });

  it("flags a finale component only found in the finale", () => {
    const a = local();
    a.solution!.requirements[0].sceneIds = [a.scenes.at(-1)!.id];
    expect(checkPlayability(a).map((g) => g.message)).toContainEqual(
      expect.stringMatching(/can't be found before the finale/),
    );
  });

  it("flags an NPC who disappears after the opening", () => {
    const a = local();
    const witness = a.npcs[2];
    for (const s of a.scenes.slice(1)) {
      s.npcIds = s.npcIds.filter((id) => id !== witness.id);
    }
    expect(checkPlayability(a)).toContainEqual(
      expect.objectContaining({ area: "npc", id: witness.id }),
    );
  });

  it("treats a quoted or listed fact as stated", () => {
    expect(isVague("The true names")).toBe(true);
    expect(isVague('The true names: "Ysolde", "Maren" and "Aud"')).toBe(false);
    expect(isVague("The correct passages: North, East and West")).toBe(false);
    expect(isVague("")).toBe(true);
  });

  it("does not treat descriptive prose after a colon as the missing fact", () => {
    const text = "The correct passages: they can't be read by mortals";
    expect(isVague(text)).toBe(true);
    const a = local();
    a.solution!.requirements[0].detail = text;
    expect(checkPlayability(a).map((g) => g.message)).toContainEqual(
      expect.stringMatching(/mentioned but never given/),
    );
  });

  it("does not treat an apostrophe in a contraction as a stated fact", () => {
    const text = "The correct passages can't be read by mortals";
    expect(isVague(text)).toBe(true);
    const a = local();
    a.solution!.requirements[0].detail = text;
    expect(checkPlayability(a).map((g) => g.message)).toContainEqual(
      expect.stringMatching(/mentioned but never given/),
    );
  });
});

describe("rendering", () => {
  it("counts the opening inside scene 1 and lists the finale and clock", () => {
    const a = local();
    const md = renderOneShotMarkdown(a);
    expect(md).not.toContain("## Opening");
    expect(md).toContain("counted in its time");
    expect(md).toContain("**First decision:**");
    expect(md).toContain("## How the Finale Works");
    expect(md).toContain(`## ${a.clock!.name}`);
    expect(md).toContain("## Questions Players Will Ask");
    expect(md).toContain("**What counts as success:**");
    expect(md).not.toContain("## Before You Run It");
  });

  it("lists unresolved gaps for the GM", () => {
    expect(renderOneShotMarkdown(bare())).toContain("## Before You Run It");
  });

  it("never shows a skip note on an essential scene", () => {
    const a = local({ durationHours: 4 });
    a.scenes.at(-1)!.skip = "Optional scenes only";
    expect(renderOneShotMarkdown(a)).not.toContain("Optional scenes only");
  });

  it("does not double up 'wants' in the cheat sheet", () => {
    const a = local();
    a.npcs[0].motivation = "He wants the bell silenced.";
    const sheet = renderGmSheet(a);
    expect(sheet).toContain("He wants the bell silenced.");
    expect(sheet).not.toMatch(/wants he wants/i);
  });

  it("uses short clue labels in the clue list and cheat sheet", () => {
    const a = local();
    const sheet = renderGmSheet(a);
    expect(sheet).toContain(a.clues[0].label);
    expect(sheet).not.toContain(a.clues[1].text);
  });
});

describe("AI prompt and parse", () => {
  it("asks for the solution, clock, trigger and a GM walkthrough", () => {
    const { userMessage } = buildOneShotPrompt({ durationHours: 3 });
    expect(userMessage).toContain('"solution"');
    expect(userMessage).toContain('"clock"');
    expect(userMessage).toContain("briefing.trigger");
    expect(userMessage).toContain("essential scene BEFORE the climax");
    expect(userMessage).toContain("walk through running it as the GM");
    expect(userMessage).not.toContain("optional scenes only");
  });

  it("reads the new fields and drops skip notes from essential scenes", () => {
    const resolved = resolveOneShot({ durationHours: 3 }, seeded(1));
    const base = local({ durationHours: 3 });
    const reply = structuredClone(base);
    for (const s of reply.scenes) s.skip = "optional scenes only";
    const a = parseOneShotResponse(JSON.stringify(reply), resolved).oneShot!;
    expect(a.solution?.steps).toEqual(base.solution!.steps);
    expect(a.clock?.ticks).toHaveLength(base.clock!.ticks.length);
    expect(a.briefing.trigger).toBe(base.briefing.trigger);
    expect(a.scenes.every((s) => s.skip === undefined)).toBe(true);
    expect(a.clues[0].label).toBe(base.clues[0].label);
  });
});

describe("repair", () => {
  it("prompts with each gap and the locked fields", () => {
    const a = bare();
    const { userMessage } = buildOneShotRepairPrompt(a, checkPlayability(a));
    expect(userMessage).toContain("Walk through running it scene by scene");
    expect(userMessage).toContain("Give the threat a countdown");
    expect(userMessage).toContain("Keep the premise, title, scene ids");
  });

  it("fills gaps without touching locked fields", () => {
    const a = bare();
    const reply = {
      briefing: {
        trigger: "The bell rang for the first time in 300 years on Sunday.",
        questions: [
          { question: "Why now?", answer: "The binding cracked." },
          { question: "Why us?", answer: "Strangers can enter the shrine." },
          { question: "Why not the reeve?", answer: "He is bound to stay." },
        ],
      },
      clock: {
        name: "The Thirteen Tolls",
        advances: "Every 20 minutes of real time.",
        ticks: [
          { trigger: "Toll 5", effect: "Black tears." },
          { trigger: "Toll 9", effect: "The dead walk." },
          { trigger: "Toll 13", effect: "The Queen wakes." },
        ],
        slow: "Muffle the bell.",
      },
      solution: {
        summary: "Speak the names.",
        requirements: [
          {
            what: "The royal names",
            detail: 'Ysolde, Maren and Aud, read from the "Lament".',
            sceneIds: ["scene-2", "scene-99"],
          },
        ],
        steps: ["Ring the bell once.", "Speak the names."],
        alternatives: ["Shatter the bell."],
        mistakes: ["A wrong name adds a toll."],
      },
      scenes: [
        {
          id: "scene-1",
          minutes: 1,
          title: "Hijacked",
          challenge: {
            success: "Convince the reeve by naming his daughter.",
            otherApproaches: ["Bribery works but costs the reeve's trust."],
          },
        },
      ],
      npcs: [{ id: "npc-1", name: "Renamed", motivation: "Keep the peace." }],
      clues: [
        { id: "clue-1", addRoutes: [{ sceneId: "scene-3", method: "Read" }] },
      ],
    };
    const fixed = applyOneShotRepair(a, JSON.stringify(reply));
    expect(fixed.briefing.trigger).toMatch(/300 years/);
    expect(fixed.clock?.ticks).toHaveLength(3);
    expect(fixed.solution?.requirements[0].sceneIds).toEqual(["scene-2"]);
    expect(fixed.scenes[0].title).toBe(a.scenes[0].title);
    expect(fixed.scenes[0].minutes).toBe(a.scenes[0].minutes);
    expect(fixed.scenes[0].challenge.success).toMatch(/daughter/);
    expect(fixed.scenes[0].challenge.description).toBe(
      a.scenes[0].challenge.description,
    );
    expect(fixed.npcs[0].name).toBe(a.npcs[0].name);
    expect(fixed.npcs[0].motivation).toBe("Keep the peace.");
    expect(fixed.scenes[2].clueIds).toContain("clue-1");
    expect(fixed.clues[0].routes.map((r) => r.sceneId)).toContain("scene-3");
  });

  it("keeps the original for an unreadable reply", () => {
    const a = bare();
    expect(applyOneShotRepair(a, "not json")).toBe(a);
  });

  it("ignores clue routes into scenes that don't exist", () => {
    const a = bare();
    const fixed = applyOneShotRepair(
      a,
      JSON.stringify({
        clues: [{ id: "clue-1", addRoutes: [{ sceneId: "scene-42" }] }],
      }),
    );
    expect(fixed.clues[0].routes).toEqual(a.clues[0].routes);
  });
});

describe("regeneration prompt", () => {
  it("passes a trimmed GM request through and asks for adjudication detail", () => {
    const a = local();
    const { userMessage } = buildOneShotRegenPrompt(
      a,
      { kind: "scene", id: "scene-2" },
      "  make the guard bribable  ",
    );
    expect(userMessage).toContain("GM request");
    expect(userMessage).toContain("make the guard bribable\n");
    expect(userMessage).toContain('"success"');
  });

  it("leaves the request out when it is blank", () => {
    const { userMessage } = buildOneShotRegenPrompt(
      local(),
      { kind: "npc", id: "npc-1" },
      "   ",
    );
    expect(userMessage).not.toContain("GM request");
  });
});
