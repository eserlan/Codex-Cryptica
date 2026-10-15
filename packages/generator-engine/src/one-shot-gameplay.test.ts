import { describe, expect, it } from "vitest";
import { dedupeOneShot, textOverlap } from "./one-shot-dedupe";
import {
  applyOneShotRepair,
  buildOneShotPrompt,
  buildOneShotRepairPrompt,
  checkPlayability,
  generateOneShotLocal,
  parseOneShotResponse,
  resolveOneShot,
} from "./public-one-shot";
import { finalePrompt, structurePrompt } from "./one-shot-stage-prompts";
import type { OneShotAdventure } from "./one-shot-types";

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const local = (options = {}, seed = 7): OneShotAdventure =>
  structuredClone(generateOneShotLocal(options, seeded(seed)).oneShot!);

const messages = (a: OneShotAdventure) =>
  checkPlayability(a).map((g) => g.message);

describe("de-duplication", () => {
  it("merges an antagonist listed twice under different ids and remaps scenes", () => {
    const a = local({ durationHours: 4 });
    const villain = a.npcs.find((n) => n.id === a.antagonistId)!;
    a.npcs.push({
      ...villain,
      id: "npc-9",
      name: ` ${villain.name.toUpperCase()}.`,
      tactics: "",
      limits: "Will not harm a child.",
    });
    a.scenes[1].npcIds.push("npc-9");
    const d = dedupeOneShot(a);
    expect(d.npcs.filter((n) => n.name === villain.name)).toHaveLength(1);
    const kept = d.npcs.find((n) => n.id === villain.id)!;
    expect(kept.tactics).toBe(villain.tactics);
    expect(kept.limits).toBe("Will not harm a child.");
    expect(d.scenes[1].npcIds).toContain(villain.id);
    expect(d.scenes[1].npcIds).not.toContain("npc-9");
    expect(new Set(d.scenes[1].npcIds).size).toBe(d.scenes[1].npcIds.length);
  });

  it("merges NPC names that differ only by punctuation", () => {
    const a = local({ durationHours: 4 });
    const villain = a.npcs.find((n) => n.id === a.antagonistId)!;
    villain.name = "D'Arcy";
    a.npcs.push({ ...villain, id: "npc-9", name: "Darcy" });

    const d = dedupeOneShot(a);

    expect(d.npcs.find((n) => n.id === villain.id)?.name).toBe("D'Arcy");
    expect(d.npcs).toHaveLength(a.npcs.length - 1);
  });

  it("merges commitments that say the same thing, keeping every payoff scene", () => {
    const a = local({ durationHours: 4 });
    const [first] = a.threads!;
    a.threads!.push({
      setup: `${first.setup.replace(/\.$/, "")}!`,
      payoff: `${first.payoff} The patron pays in full.`,
      sceneIds: [a.scenes[1].id],
    });
    const d = dedupeOneShot(a);
    expect(d.threads).toHaveLength(a.threads!.length - 1);
    const merged = d.threads!.find((t) => t.setup === first.setup)!;
    expect(merged.sceneIds).toEqual(
      expect.arrayContaining([...first.sceneIds, a.scenes[1].id]),
    );
    expect(merged.payoff).toContain("pays in full");
  });

  it("keeps distinct NPCs and commitments, and returns the same object", () => {
    const a = local({ durationHours: 4 });
    expect(dedupeOneShot(a)).toBe(a);
    expect(
      textOverlap("The bell rang at dawn.", "A wolf took the miller's son."),
    ).toBe(0);
  });

  it("de-duplicates a parsed AI reply and a review reply", () => {
    const resolved = resolveOneShot({ durationHours: 3 }, seeded(1));
    const base = local({ durationHours: 3 });
    const reply = structuredClone(base) as OneShotAdventure;
    reply.npcs.push({ ...reply.npcs[1], id: "npc-7" });
    const parsed = parseOneShotResponse(
      JSON.stringify(reply),
      resolved,
    ).oneShot!;
    expect(parsed.npcs).toHaveLength(base.npcs.length);

    const repaired = applyOneShotRepair(
      base,
      JSON.stringify({
        npcs: [{ ...base.npcs[2], id: "npc-8", tactics: "Hides." }],
      }),
    );
    expect(repaired.npcs).toHaveLength(base.npcs.length);
  });
});

describe("clock schedule", () => {
  it("flags a clock that only moves on the party's risks", () => {
    const a = local();
    a.clock!.advances = "Each time the party forces a route or uses violence.";
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/cautious play stops it/),
    );
  });

  it.each([
    "At each sunset, and whenever the party forces a route.",
    "At the end of every essential scene; failures add a tick.",
  ])("accepts a scheduled clock: %s", (advances) => {
    const a = local();
    a.clock!.advances = advances;
    expect(messages(a).filter((m) => /cautious play/.test(m))).toEqual([]);
  });

  it("lets cautious play reach every local fallback clock tick", () => {
    const a = local();
    const scheduledAdvances =
      a.scenes.filter((scene) => scene.essential && scene.kind !== "opening")
        .length + 2;

    expect(a.clock!.ticks).toHaveLength(scheduledAdvances);
    expect(a.clock!.advances).toMatch(
      /end of each essential scene after the opening, when the party reaches the climax, and halfway through the climax/i,
    );
    expect(messages(a).filter((m) => /schedule only advances/.test(m))).toEqual(
      [],
    );
  });

  it("flags a scheduled route that cannot reach the final tick", () => {
    const a = local();
    a.clock!.ticks.push({ trigger: "Extra", effect: "The plan goes further." });

    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        /schedule only advances the clock 4 times.*5 ticks/,
      ),
    );
  });
});

describe("pacing", () => {
  it("flags act timings that disagree with the scene budget", () => {
    const a = local({ durationHours: 3 });
    a.briefing.prep =
      "Act I: 40 minutes. Act II runs 80 minutes. Act III: 60 minutes.";
    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        /act timings add up to 180 minutes, but the scenes add up to/,
      ),
    );
  });

  it("accepts act timings that match, and ignores a single time mention", () => {
    const a = local({ durationHours: 3 });
    const total = a.scenes.reduce((n, s) => n + s.minutes, 0);
    a.briefing.prep = `Act I: ${total - 30} minutes. Act II: 30 minutes.`;
    expect(messages(a).filter((m) => /act timings/.test(m))).toEqual([]);
    a.briefing.prep = "Act I takes about 40 minutes.";
    expect(messages(a).filter((m) => /act timings/.test(m))).toEqual([]);
  });
});

describe("exploration routes", () => {
  it("flags an Exploration corridor with no optional location", () => {
    const a = local({ emphasis: "Exploration", durationHours: 4 });
    a.scenes.forEach((s, i) => {
      s.essential = true;
      s.next = i + 1 < a.scenes.length ? [a.scenes[i + 1].id] : [];
    });
    const found = messages(a);
    expect(found).toContainEqual(
      expect.stringMatching(/leads straight to the next/),
    );
    expect(found).toContainEqual(expect.stringMatching(/no optional location/));
  });

  it("does not ask other emphases, or very short adventures, for branches", () => {
    const action = local({ emphasis: "Action", durationHours: 4 });
    action.scenes.forEach((s, i) => {
      s.next = i + 1 < action.scenes.length ? [action.scenes[i + 1].id] : [];
    });
    expect(messages(action).filter((m) => /Exploration/.test(m))).toEqual([]);
    const short = local({ emphasis: "Exploration", durationHours: 2 });
    expect(short.scenes.length).toBeLessThan(4);
    expect(messages(short).filter((m) => /Exploration/.test(m))).toEqual([]);
  });

  it("lets the review add a route forward, but not backward or to nowhere", () => {
    const a = local({ emphasis: "Exploration", durationHours: 4 });
    const [first, second, third] = a.scenes;
    second.next = [third.id];
    const fixed = applyOneShotRepair(
      a,
      JSON.stringify({
        scenes: [
          {
            id: second.id,
            addNext: [a.scenes.at(-1)!.id, first.id, "scene-99"],
          },
        ],
      }),
    );
    expect(fixed.scenes[1].next).toEqual([third.id, a.scenes.at(-1)!.id]);
  });
});

describe("commitments and endings", () => {
  it("flags a rescue left until after the adventure", () => {
    const a = local();
    a.threads![0].payoff = "The missing drivers are found after the adventure.";
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/only pays off after the adventure/),
    );
  });

  it("flags two endings reached the same way, and the review can sharpen them", () => {
    const a = local();
    a.endings = [
      {
        id: "end-1",
        title: "The Queen Released",
        condition: "The party breaks the royal seal and frees Orsena.",
        consequence: "Peace.",
      },
      {
        id: "end-2",
        title: "The Bell of Reckoning",
        condition:
          "The party breaks the royal seal and frees Orsena from the tomb.",
        consequence: "Catastrophe.",
      },
    ];
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/"The Queen Released" and "The Bell of Reckoning"/),
    );
    const fixed = applyOneShotRepair(
      a,
      JSON.stringify({
        endings: [
          {
            id: "end-2",
            condition:
              "Merovin breaks the seal while Orsena is still lost in grief.",
          },
          { id: "end-9", condition: "Ignored." },
        ],
      }),
    );
    expect(fixed.endings.map((e) => e.title)).toEqual([
      "The Queen Released",
      "The Bell of Reckoning",
    ]);
    expect(fixed.endings[1].condition).toMatch(/still lost in grief/);
    expect(fixed.endings[1].consequence).toBe("Catastrophe.");
    expect(
      messages(fixed).filter((m) => /almost the same way/.test(m)),
    ).toEqual([]);
  });
});

describe("prompts carry the gameplay rules", () => {
  const resolved = resolveOneShot({ emphasis: "Exploration" }, seeded(1));

  it("asks the plan for a scheduled clock, real routes and in-play rescues", () => {
    const { userMessage } = structurePrompt(resolved, {});
    expect(userMessage).toContain("Cautious play must never stop it");
    expect(userMessage).toContain("a small map, not a corridor");
    expect(userMessage).toContain("no rescue is left until after the session");
    expect(userMessage).toContain('scene "minutes" are the only time budget');
  });

  it("asks the finale for endings that differ and NPCs who choose", () => {
    const { userMessage } = finalePrompt({}, {});
    expect(userMessage).toContain("what decides between them");
    expect(userMessage).toContain("never simply dictates it");
  });

  it("puts the same rules in the single-call prompt and the review", () => {
    const single = buildOneShotPrompt({ emphasis: "Exploration" }).userMessage;
    const review = buildOneShotRepairPrompt(
      local({ emphasis: "Exploration" }),
      [],
    ).userMessage;
    for (const text of [single, review]) {
      expect(text).toContain("Cautious play must never stop it");
      expect(text).toContain("what decides between them");
      expect(text).toContain("a small map, not a corridor");
    }
    expect(review).toContain('"addNext"');
    expect(review).toContain('"endings"');
  });
});
