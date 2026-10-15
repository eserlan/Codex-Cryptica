import { describe, expect, it } from "vitest";
import {
  applyOneShotRepair,
  buildOneShotPrompt,
  buildOneShotRepairPrompt,
  checkPlayability,
  generateOneShotLocal,
  parseOneShotResponse,
  resolveOneShot,
} from "./public-one-shot";
import { allocateWithCore, coreMinutes } from "./one-shot-validate";
import type { OneShotAdventure } from "./one-shot-types";

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const local = (options = {}, seed = 7) =>
  generateOneShotLocal(options, seeded(seed)).oneShot!;

const messages = (a: OneShotAdventure) =>
  checkPlayability(a).map((g) => g.message);

describe("the two test cases from review", () => {
  it.each([
    { genre: "Horror", emphasis: "Investigation / mystery" },
    { genre: "Classic Fantasy", emphasis: "Action" },
  ])("$genre $emphasis is complete locally", (options) => {
    for (const durationHours of [2, 3, 4, 6]) {
      for (const seed of [1, 7, 42]) {
        const a = local({ ...options, durationHours }, seed);
        expect(messages(a)).toEqual([]);
      }
    }
  });

  it("an Action one-shot fights: most scenes after the opening are combat or hazard", () => {
    const a = local({ emphasis: "Action", durationHours: 4 });
    const later = a.scenes.slice(1);
    const fights = later.filter((s) =>
      ["combat", "hazard"].includes(s.challenge.type),
    );
    expect(fights.length * 2).toBeGreaterThanOrEqual(later.length);
    expect(fights.every((s) => s.challenge.opposition)).toBe(true);
  });
});

describe("antagonist completeness", () => {
  it("flags a missing antagonist profile", () => {
    const a = local();
    delete a.antagonistId;
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/antagonist has no NPC profile/),
    );
  });

  it("flags missing motive, tactics, terms and absence from the finale", () => {
    const a = local();
    const villain = a.npcs.find((n) => n.id === a.antagonistId)!;
    delete villain.backstory;
    delete villain.tactics;
    delete villain.stopIf;
    const climax = a.scenes.at(-1)!;
    climax.npcIds = climax.npcIds.filter((id) => id !== villain.id);
    const found = messages(a).filter((m) => m.startsWith(villain.name));
    expect(found).toHaveLength(4);
  });
});

describe("narrative commitments", () => {
  it("flags a hook with no recorded payoff", () => {
    const a = local();
    a.threads = [];
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/promises the hook and opening make/),
    );
  });

  it("flags a thread that only pays off in the opening", () => {
    const a = local();
    a.threads = [
      {
        setup: "The patron's daughter is trapped below.",
        payoff: "",
        sceneIds: [a.scenes[0].id],
      },
    ];
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/daughter is trapped below.*never paid off/),
    );
  });
});

describe("clock consistency", () => {
  it("flags a count in the fiction that disagrees with the clock", () => {
    const a = local();
    a.clock!.name = "The Bell's Notes";
    a.briefing.stakes = "Three bell notes begin the march on Dunmere.";
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/Three bell notes.*clock has 4 steps/),
    );
  });

  it("accepts a count that matches the ticks", () => {
    const a = local();
    a.clock!.name = "The Bell's Notes";
    a.briefing.stakes = `${a.clock!.ticks.length} bell notes begin the march.`;
    expect(messages(a).filter((m) => /clock has/.test(m))).toEqual([]);
  });

  it("flags a clock without a point of no return", () => {
    const a = local();
    delete a.clock!.deadline;
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/only point of no return/),
    );
  });
});

describe("emphasis and opposition", () => {
  it("flags an Action one-shot made of social and exploration scenes", () => {
    const a = local({ emphasis: "Action" });
    for (const s of a.scenes) s.challenge.type = "exploration";
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/an Action one-shot, but only 0 of/),
    );
  });

  it("flags a fight with no opposition to run", () => {
    const a = local({ emphasis: "Action" });
    const fight = a.scenes.find((s) => s.challenge.type === "combat")!;
    delete fight.challenge.opposition;
    expect(checkPlayability(a)).toContainEqual(
      expect.objectContaining({ area: "scene", id: fight.id }),
    );
  });
});

describe("pacing", () => {
  it("caps optional scenes so the core fills the session", () => {
    for (const h of [3, 4, 6]) {
      const a = local({ durationHours: h });
      const available = a.durationMinutes - a.timeBudget.bufferMinutes;
      expect(available - coreMinutes(a)).toBeLessThanOrEqual(available * 0.2);
    }
  });

  it("rebalances an AI budget that puts a lot of time in an optional scene", () => {
    const minutes = allocateWithCore(
      [30, 40, 50, 60],
      [true, false, true, true],
      160,
    );
    expect(minutes.reduce((a, b) => a + b, 0)).toBe(160);
    expect(minutes[1]).toBeLessThanOrEqual(30);
  });

  it("leaves a budget alone when no scene is essential", () => {
    expect(allocateWithCore([1, 1], [false, false], 60)).toEqual([30, 30]);
  });
});

describe("prompts and parsing", () => {
  it("asks for the antagonist, threads, deadline, opposition and intent rule", () => {
    const { userMessage } = buildOneShotPrompt({ emphasis: "Action" });
    expect(userMessage).toContain('"antagonistId"');
    expect(userMessage).toContain('"threads"');
    expect(userMessage).toContain('"deadline"');
    expect(userMessage).toContain('"opposition"');
    expect(userMessage).toContain("Never require reciting exact words");
    expect(userMessage).toContain("at least half the scenes after the opening");
    expect(userMessage).toContain("at most a fifth of the time");
  });

  it("reads the new fields, remapping thread scenes", () => {
    const resolved = resolveOneShot({ durationHours: 3 }, seeded(1));
    const base = local({ durationHours: 3 });
    const reply = structuredClone(base) as unknown as Record<string, unknown>;
    (reply.threads as { sceneIds: string[] }[])[0].sceneIds.push("scene-99");
    const a = parseOneShotResponse(JSON.stringify(reply), resolved).oneShot!;
    expect(a.antagonistId).toBe(base.antagonistId);
    expect(a.threads?.[0].sceneIds).toEqual(base.threads![0].sceneIds);
    expect(a.clock?.deadline).toBe(base.clock!.deadline);
    const villain = a.npcs.find((n) => n.id === a.antagonistId)!;
    expect(villain.tactics).toBeTruthy();
  });

  it("guesses the antagonist from the role when the id is missing", () => {
    const resolved = resolveOneShot({ durationHours: 3 }, seeded(1));
    const base = structuredClone(local({ durationHours: 3 }));
    delete base.antagonistId;
    base.npcs[2].role = "fallen knight and villain";
    const a = parseOneShotResponse(JSON.stringify(base), resolved).oneShot!;
    expect(a.antagonistId).toBe(base.npcs[2].id);
  });
});

describe("review and repair", () => {
  it("always reviews for commitments, the clock, emphasis and compression", () => {
    const a = local();
    const { userMessage } = buildOneShotRepairPrompt(a, []);
    expect(userMessage).toContain("Commitments");
    expect(userMessage).toContain("that count IS the ticks");
    expect(userMessage).toContain("Emphasis");
    expect(userMessage).toContain("Compression");
    expect(userMessage).not.toContain("automatic check found");
  });

  it("adds a missing antagonist and puts them in the finale", () => {
    const a = structuredClone(local());
    a.npcs = a.npcs.filter((n) => n.id !== a.antagonistId);
    for (const s of a.scenes)
      s.npcIds = s.npcIds.filter((id) => id !== "npc-2");
    delete a.antagonistId;
    const climax = a.scenes.at(-1)!;
    const fixed = applyOneShotRepair(
      a,
      JSON.stringify({
        antagonistId: "npc-9",
        npcs: [
          {
            id: "npc-9",
            name: "Sir Garran Vey",
            role: "disgraced knight",
            motivation: "An army that cannot die.",
            knows: "Where the bell is.",
            reaction: "Contempt.",
            cues: "Never sits.",
            backstory:
              "Stripped of rank for a massacre he was ordered to commit.",
            tactics:
              "Holds the stair with two sworn blades; rings the bell when losing.",
            stopIf: "His old commander admits the order was theirs.",
          },
        ],
        scenes: [{ id: climax.id, addNpcIds: ["npc-9", "npc-404"] }],
      }),
    );
    expect(fixed.antagonistId).toBe("npc-9");
    expect(fixed.npcs.at(-1)!.name).toBe("Sir Garran Vey");
    expect(fixed.scenes.at(-1)!.npcIds).toContain("npc-9");
    expect(fixed.scenes.at(-1)!.npcIds).not.toContain("npc-404");
    expect(messages(fixed).filter((m) => /antagonist|Garran/.test(m))).toEqual(
      [],
    );
  });

  it("keeps the adventure for an empty review", () => {
    const a = local();
    expect(applyOneShotRepair(a, "{}")).toBe(a);
  });

  it("does not let a review rename an existing NPC or ignore unknown antagonists", () => {
    const a = local();
    const fixed = applyOneShotRepair(
      a,
      JSON.stringify({
        antagonistId: "npc-77",
        npcs: [{ id: "npc-1", name: "Renamed", tactics: "Hides." }],
      }),
    );
    expect(fixed.npcs[0].name).toBe(a.npcs[0].name);
    expect(fixed.npcs[0].tactics).toBe("Hides.");
    expect(fixed.antagonistId).toBe(a.antagonistId);
  });
});
