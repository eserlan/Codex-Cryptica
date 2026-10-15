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
import { simulateClock } from "./one-shot-clock";
import { renderGmSheet } from "./one-shot-render";
import {
  finalePrompt,
  scenePrompt,
  structurePrompt,
} from "./one-shot-stage-prompts";
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

  it("brings a cautious party to the local finale with ticks to spare", () => {
    for (const durationHours of [2, 4, 6]) {
      const a = local({ durationHours });
      const schedule = simulateClock(a)!;
      expect(schedule.inFinale).toBe(0);
      expect(a.clock!.ticks.length - schedule.beforeFinale).toBe(2);
      expect(messages(a).filter((m) => /clock/i.test(m))).toEqual([]);
    }
  });

  /** Every scene essential: opening, middles, climax. */
  const allEssential = (advances: string, ticks: number) => {
    const a = local({ durationHours: 4 });
    a.scenes.forEach((s) => (s.essential = true));
    a.clock!.advances = advances;
    a.clock!.ticks = Array.from({ length: ticks }, (_, i) => ({
      trigger: `Tick ${i + 1}`,
      effect: "Worse.",
    }));
    return a;
  };
  const beforeClimax = (a: OneShotAdventure) =>
    a.scenes.filter((s) => s.kind !== "climax").length;

  it("flags a deadline that lands as the party reaches the finale", () => {
    const probe = local({ durationHours: 4 });
    const ticks = beforeClimax(probe) + 1;
    const a = allEssential(
      "When the adventure begins, and as each essential scene concludes.",
      ticks,
    );
    expect(simulateClock(a)!.beforeFinale).toBe(ticks);
    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `last tick before the finale even starts: it advances ${ticks} times on schedule \\(the start of the adventure, the end of "`,
        ),
      ),
    );
  });

  it("flags a deadline that lands halfway through the finale, counting a late start", () => {
    const probe = local({ durationHours: 4 });
    const ticks = beforeClimax(probe) + 2;
    const a = allEssential(
      "The bell already rang, so it starts on tick 2. It advances at the end of each essential scene, and halfway through the finale.",
      ticks,
    );
    const schedule = simulateClock(a)!;
    expect(schedule.steps[0]).toBe("already ticked when play begins");
    expect(schedule.inFinale).toBe(1);
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/before the party can finish the finale/),
    );
    a.clock!.ticks.push({ trigger: "Spare", effect: "Worse." });
    expect(messages(a).filter((m) => /last tick/.test(m))).toEqual([]);
  });

  it("flags a counted schedule that leaves the clock mostly unused, unless time also drives it", () => {
    const a = allEssential("When the party reaches the finale.", 6);
    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        /schedule only advances the clock 1 time .*6 ticks, so the pressure never builds/,
      ),
    );
    a.clock!.advances =
      "At each sunset, and when the party reaches the finale.";
    expect(messages(a).filter((m) => /clock/i.test(m))).toEqual([]);
  });

  it("does not treat a deadline duration as a time-triggered clock advance", () => {
    const a = allEssential(
      "At the end of each essential scene; the party has six hours before the deadline.",
      8,
    );

    expect(simulateClock(a)!.alsoTimed).toBe(false);
    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        /schedule only advances the clock \d+ times .*8 ticks, so the pressure never builds/,
      ),
    );
  });
});

describe("NPC continuity", () => {
  const withWitness = (later: string) => {
    const a = local({ durationHours: 4 });
    const witness = a.npcs.find((n) => n.id === "npc-3")!;
    witness.name = "Tovin Marr";
    a.scenes[0].npcIds = [...new Set([...a.scenes[0].npcIds, witness.id])];
    a.scenes[1].situation = later;
    return a;
  };

  it("flags someone free in the opening and trapped in the next scene", () => {
    const a = withWitness(
      "Frost coats the granary. Tovin lies pinned beneath the grain cart, calling for help.",
    );
    expect(messages(a)).toContainEqual(
      `Tovin Marr is present and free in "${a.scenes[0].title}" but pinned in "${a.scenes[1].title}". Say in that scene how it happened, or make them two different people.`,
    );
  });

  it.each([
    "Tovin followed the party here and was dragged under the cart; now Tovin is trapped.",
    "If the party never freed him, Tovin is still trapped.",
    "Tovin says the drivers are missing and points to the cart.",
    "A stranger lies pinned beneath the cart.",
  ])(
    "accepts a scene that explains it or says nothing about him: %s",
    (later) => {
      const a = withWitness(later);
      expect(messages(a).filter((m) => /Tovin/.test(m))).toEqual([]);
    },
  );

  it("does not let an unrelated explanation sentence excuse a confinement transition", () => {
    const a = withWitness(
      "Tovin remains trapped in the cellar. The party was dragged here by floodwaters.",
    );

    expect(messages(a)).toContainEqual(
      `Tovin Marr is present and free in "${a.scenes[0].title}" but trapped in "${a.scenes[1].title}". Say in that scene how it happened, or make them two different people.`,
    );
  });
});

describe("finale requirement kinds", () => {
  const climaxOnly = (kind?: "clue" | "action" | "outcome", ids?: string[]) => {
    const a = local({ durationHours: 4 });
    a.solution!.requirements = [
      {
        ...(kind ? { kind } : {}),
        what: "Ysabet's consent",
        detail: "Ysabet agrees to let one wagon pass.",
        sceneIds: ids ?? [a.scenes.at(-1)!.id],
      },
    ];
    return a;
  };

  it("expects a clue before the finale, and says how to mark an action or outcome", () => {
    for (const kind of [undefined, "clue"] as const) {
      expect(messages(climaxOnly(kind))).toContainEqual(
        expect.stringMatching(
          /"Ysabet's consent" can't be found before the finale\..*mark it "action".*mark it "outcome"/,
        ),
      );
    }
  });

  it("lets an action happen in the finale and an outcome need no scene", () => {
    const solutionGaps = (a: OneShotAdventure) =>
      messages(a).filter((m) => /Ysabet's consent/.test(m));
    expect(solutionGaps(climaxOnly("action"))).toEqual([]);
    expect(solutionGaps(climaxOnly("outcome", []))).toEqual([]);
    expect(solutionGaps(climaxOnly("action", []))).toEqual([
      `"Ysabet's consent": say in which scene the party does it.`,
    ]);
  });

  it("reads the kind from a reply, ignores unknown kinds and shows it on the GM sheet", () => {
    const base = local({ durationHours: 3 });
    const climax = base.scenes.at(-1)!.id;
    const fixed = applyOneShotRepair(
      base,
      JSON.stringify({
        solution: {
          ...base.solution,
          requirements: [
            {
              kind: "Outcome",
              what: "Public restoration",
              detail: "The reeve restores her name.",
              sceneIds: [],
            },
            {
              kind: "action",
              what: "Ysabet's consent",
              detail: "She agrees.",
              sceneIds: [climax],
            },
            {
              kind: "guess",
              what: "The ledger",
              detail: "Aldren's erased entry.",
              sceneIds: [base.scenes[1].id],
            },
          ],
        },
      }),
    );
    expect(fixed.solution!.requirements.map((r) => r.kind)).toEqual([
      "outcome",
      "action",
      undefined,
    ]);
    const sheet = renderGmSheet(fixed);
    expect(sheet).toContain("_(a result of the finale)_");
    expect(sheet).toContain(`_(done in ${base.scenes.at(-1)!.title})_`);
    expect(sheet).toContain(`_(found in ${base.scenes[1].title})_`);
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

describe("ending consequences", () => {
  it("flags two endings reached differently but ending the same way", () => {
    const a = local();
    a.endings = [
      {
        id: "end-1",
        title: "The Crown Restored",
        condition: "Ysabet consents and the reeve reads her name aloud.",
        consequence: "The haunting ends and the road to the hill opens again.",
      },
      {
        id: "end-2",
        title: "A Crown Left Beneath the Hill",
        condition: "Ysabet allows one passage but the town keeps its silence.",
        consequence: "The haunting ends and the road to the hill opens again.",
      },
    ];
    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        /"The Crown Restored" and "A Crown Left Beneath the Hill" end almost the same way/,
      ),
    );
    a.endings[1].consequence =
      "One wagon passes each harvest; any other crossing wakes the procession.";
    expect(messages(a).filter((m) => /end almost/.test(m))).toEqual([]);
  });
});

describe("prompts carry the gameplay rules", () => {
  it("asks the plan for whereabouts and every scene writer to follow them", () => {
    const resolved = resolveOneShot({}, seeded(1));
    const plan = structurePrompt(resolved, {}).userMessage;
    expect(plan).toContain('"whereabouts"');
    expect(plan).toContain("in one place at a time");
    const scene = scenePrompt(
      resolved,
      { core: {}, structure: {}, finale: {} },
      { scene: {}, clues: [], threads: [], npcs: [], isOpening: false },
    ).userMessage;
    expect(scene).toContain('follows the plan\'s "whereabouts"');
    expect(scene).toContain("in one place at a time");
  });

  it("asks every finale writer for requirement kinds", () => {
    const finale = finalePrompt({}, {}).userMessage;
    const single = buildOneShotPrompt({}).userMessage;
    const review = buildOneShotRepairPrompt(local(), []).userMessage;
    for (const text of [finale, single, review]) {
      expect(text).toContain('"kind": "clue"');
      expect(text).toContain('"outcome" for a result of the finale');
    }
    for (const text of [single, review]) {
      expect(text).toContain("in one place at a time");
    }
  });

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
