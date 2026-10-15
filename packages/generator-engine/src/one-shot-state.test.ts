import { describe, expect, it } from "vitest";
import { dedupeOneShot } from "./one-shot-dedupe";
import { simulateClock } from "./one-shot-clock";
import {
  normaliseClock,
  normaliseState,
  parseDecisions,
  parseTheories,
  parseVerdicts,
  scheduleSentence,
  whereaboutsTimeline,
} from "./one-shot-state";
import {
  applyOneShotRepair,
  buildOneShotPrompt,
  buildOneShotRepairPrompt,
  checkPlayability,
  generateOneShotLocal,
  parseOneShotResponse,
  resolveOneShot,
} from "./public-one-shot";
import { renderGmSheet, renderOneShotMarkdown } from "./one-shot-render";
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

describe("clock schedule as data", () => {
  it("writes the local clock from its schedule, with two ticks to spare", () => {
    const a = local({ durationHours: 4 });
    expect(a.clock!.schedule).toEqual([
      "scene-end-after-opening",
      "finale-start",
    ]);
    expect(a.clock!.advances).toBe(
      "It advances at the end of each essential scene after the opening, and when the party reaches the finale, whatever the party does. Failing a challenge or resting also advances it; forcing a risky shortcut adds a complication instead.",
    );
    const sim = simulateClock(a)!;
    expect(a.clock!.ticks.length - (sim.beforeFinale + sim.inFinale)).toBe(2);
  });

  it("trims the moments that bite the finale when the ticks would run out", () => {
    const a = local({ durationHours: 4 });
    const clock = {
      ...a.clock!,
      schedule: [
        "start",
        "scene-end",
        "finale-start",
        "finale-middle",
      ] as NonNullable<typeof a.clock>["schedule"],
      ticks: a.clock!.ticks.slice(0, 4),
    };
    const fixed = normaliseClock(clock, a.scenes);
    const sim = simulateClock({ ...a, clock: fixed })!;
    expect(fixed.schedule).not.toContain("finale-middle");
    expect(sim.beforeFinale + sim.inFinale).toBeLessThan(4);
    expect(fixed.advances).toBe(scheduleSentence(fixed));
  });

  it("counts a late start and a mid-finale moment from the data", () => {
    const a = local({ durationHours: 4 });
    a.clock = {
      ...a.clock!,
      schedule: ["scene-end", "finale-middle"],
      startsAt: 3,
    };
    const sim = simulateClock(a)!;
    expect(sim.steps.slice(0, 2)).toEqual([
      "already ticked when play begins",
      "already ticked when play begins",
    ]);
    expect(sim.inFinale).toBe(1);
    expect(scheduleSentence(a.clock)).toContain("starts on tick 3");
  });

  it("reads schedule, start tick and pushes from an AI reply, ignoring unknown moments", () => {
    const resolved = resolveOneShot({ durationHours: 3 }, seeded(1));
    const base = local({ durationHours: 3 });
    const reply = {
      ...base,
      clock: {
        ...base.clock,
        advances: "",
        schedule: ["Start", "scene-end", "whenever", "finale-start"],
        startsAt: 9,
        pushes: "A failed roll adds one.",
      },
    };
    const parsed = parseOneShotResponse(
      JSON.stringify(reply),
      resolved,
    ).oneShot!;
    expect(parsed.clock!.startsAt).toBeUndefined();
    expect(parsed.clock!.pushes).toBe("A failed roll adds one.");
    expect(parsed.clock!.schedule).not.toContain("whenever");
    expect(parsed.clock!.advances).toContain("A failed roll adds one.");
  });
});

describe("who is where", () => {
  /** The witness is free in the opening; change them in the next scene. */
  const witness = (a: OneShotAdventure, extra: Record<string, unknown>) => {
    for (const scene of a.scenes) {
      scene.whereabouts = scene.whereabouts?.filter((w) => w.who !== "npc-3");
    }
    a.scenes[0].whereabouts = [
      ...(a.scenes[0].whereabouts ?? []),
      { who: "npc-3", kind: "npc", state: "free", where: "the stove" },
    ];
    a.scenes[1].whereabouts = [
      ...(a.scenes[1].whereabouts ?? []),
      {
        who: "npc-3",
        kind: "npc",
        state: "trapped",
        where: "under the cart",
        ...extra,
      },
    ];
    return a;
  };

  it("flags a change from free to trapped with no reason, and accepts one with a reason", () => {
    const a = witness(local(), {});
    const name = a.npcs.find((n) => n.id === "npc-3")!.name;
    expect(messages(a)).toContainEqual(
      `${name} goes from free to trapped in "${a.scenes[1].title}" with no explanation. Say how it happened.`,
    );
    const fixed = witness(local(), { how: "The cart tipped as they ran." });
    expect(messages(fixed).filter((m) => /no explanation/.test(m))).toEqual([]);
  });

  it("flags an object that changes place without a reason", () => {
    const a = local();
    const climax = a.scenes.at(-1)!;
    const item = climax.whereabouts!.find((w) => w.kind === "object")!;
    expect(item.how).toBeTruthy();
    item.how = undefined;
    expect(messages(a)).toContainEqual(
      expect.stringContaining(`moves from ${a.scenes[0].location} to `),
    );
  });

  it("flags someone in a scene who is still captive from an earlier one", () => {
    const a = local({ durationHours: 4 });
    a.scenes[0].whereabouts = [{ who: "npc-3", kind: "npc", state: "captive" }];
    a.scenes[1].whereabouts = undefined;
    a.scenes[1].npcIds = [...new Set([...a.scenes[1].npcIds, "npc-3"])];
    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        /is in ".*" but is still captive from an earlier scene/,
      ),
    );
  });

  it("carries a state forward and lists present NPCs, in a timeline", () => {
    const a = witness(local(), { how: "Dragged under." });
    a.scenes[2].whereabouts = undefined;
    const rows = whereaboutsTimeline(a);
    const later = rows[2].entries.find((e) => e.who === "npc-3")!;
    expect(later).toMatchObject({ state: "trapped", carried: true });
    expect(rows[0].entries.find((e) => e.who === "npc-1")?.state).toBe("free");
  });

  it("drops entries for NPCs that do not exist and repeats", () => {
    const a = local();
    a.scenes[0].whereabouts!.push(
      { who: "npc-99", kind: "npc", state: "trapped" },
      { who: "npc-1", kind: "npc", state: "hiding" },
    );
    const fixed = normaliseState(a);
    const who = fixed.scenes[0].whereabouts!.map((w) => w.who);
    expect(who).not.toContain("npc-99");
    expect(who.filter((id) => id === "npc-1")).toHaveLength(1);
    expect(
      fixed.scenes[0].whereabouts!.find((w) => w.who === "npc-1")!.state,
    ).toBe("hiding");
  });

  it("shows where everyone is on the GM sheet", () => {
    const sheet = renderGmSheet(
      witness(local(), { how: "The cart tipped as they ran." }),
    );
    expect(sheet).toContain("## Where Everyone Is");
    expect(sheet).toMatch(
      /trapped, under the cart; The cart tipped as they ran/,
    );
  });
});

describe("endings as decisions", () => {
  it("drops duplicate decision IDs so each question has its own key", () => {
    expect(
      parseDecisions([
        { id: "choice", question: "Save the witness?" },
        { id: "choice", question: "Keep the evidence?" },
        { id: "other", question: "Expose the culprit?" },
      ]),
    ).toEqual([
      { id: "choice", question: "Save the witness?" },
      { id: "other", question: "Expose the culprit?" },
    ]);
  });

  it("covers every combination of the local decisions exactly once", () => {
    const a = local();
    expect(a.decisions!.map((d) => d.id)).toEqual(["stopped", "clean"]);
    expect(
      messages(a).filter((m) => /ending|No ending|both happen/.test(m)),
    ).toEqual([]);
  });

  it("flags a combination that no ending covers", () => {
    const a = local();
    a.endings = a.endings.filter((e) => e.id !== "end-3");
    expect(messages(a)).toContainEqual(
      "No ending happens when stopped no, clean yes.",
    );
  });

  it("flags two endings that both happen, and several endings that depend on nothing", () => {
    const a = local();
    a.endings[2].requires = { stopped: true };
    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        /"The Truth Out" and "Too Late" both happen when stopped yes, clean yes/,
      ),
    );
    const b = local();
    b.endings.forEach((e) => (e.requires = undefined));
    expect(messages(b)).toContainEqual(
      expect.stringMatching(
        /depend on no decision, so either could be the result/,
      ),
    );
  });

  it("asks for decisions when there are none, and ignores unknown decision ids", () => {
    const a = local();
    a.decisions = undefined;
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/Name the 2–4 yes-or-no decisions/),
    );
    const b = local();
    b.endings[0].requires = { stopped: true, ghost: true };
    expect(normaliseState(b).endings[0].requires).toEqual({ stopped: true });
  });

  it("lets the review set the answers that lead to an ending", () => {
    const a = local();
    const fixed = applyOneShotRepair(
      a,
      JSON.stringify({
        endings: [{ id: "end-2", requires: { stopped: true, clean: true } }],
      }),
    );
    expect(fixed.endings[1].requires).toEqual({ stopped: true, clean: true });
    expect(messages(fixed)).toContainEqual(
      expect.stringMatching(/both happen when stopped yes, clean yes/),
    );
  });

  it("shows the decisions behind each ending", () => {
    const a = local();
    expect(renderOneShotMarkdown(a)).toMatch(
      /Does the party stop .* before the clock runs out\? Yes/,
    );
    expect(renderGmSheet(a)).toMatch(
      /The Truth Out:\*\* .* _\(Does the party stop/,
    );
  });
});

describe("theories and clues", () => {
  it("drops duplicate theory IDs so clue verdicts select one theory", () => {
    const theories = parseTheories([
      { id: "suspect", name: "The steward", isTrue: false },
      { id: "suspect", name: "The magistrate", isTrue: true },
    ]);

    expect(theories).toEqual([
      {
        id: "suspect",
        name: "The steward",
        summary: "",
        isTrue: false,
        obvious: undefined,
      },
    ]);
    expect(parseVerdicts(["suspect", "unknown"], theories)).toEqual([
      "suspect",
    ]);
  });

  const mystery = () => local({ emphasis: "Investigation / mystery" });

  it("gives a local investigation an obvious wrong theory that clues overturn", () => {
    const a = mystery();
    expect(a.theories).toHaveLength(2);
    expect(a.theories!.filter((t) => t.isTrue)).toHaveLength(1);
    expect(
      messages(a).filter((m) => /theor|clue (supports|rule)|overturn/i.test(m)),
    ).toEqual([]);
    expect(local({ emphasis: "Action" }).theories).toBeUndefined();
  });

  it("asks an investigation for theories", () => {
    const a = mystery();
    a.theories = undefined;
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/List at least two competing theories/),
    );
    const action = local({ emphasis: "Action" });
    expect(messages(action).filter((m) => /theories/.test(m))).toEqual([]);
  });

  it("flags an obvious theory nothing overturns, an unbacked theory and a thin truth", () => {
    const a = mystery();
    a.clues.forEach((c) => (c.contradicts = undefined));
    a.clues.slice(1).forEach((c) => (c.supports = undefined));
    const found = messages(a);
    expect(found).toContainEqual(
      expect.stringMatching(
        /overturns the obvious theory, "A simple misfortune"/,
      ),
    );
    expect(found).toContainEqual(
      expect.stringMatching(
        /No clue supports or rules out "A simple misfortune"/,
      ),
    );
    expect(found).toContainEqual(
      expect.stringMatching(/at least two clues that support it/),
    );
  });

  it("flags a mystery with no true theory", () => {
    const a = mystery();
    a.theories!.forEach((t) => (t.isTrue = false));
    expect(messages(a)).toContainEqual(
      "Exactly one theory must be the true one.",
    );
  });

  it("keeps verdicts on real theories only, and the review can change them", () => {
    const resolved = resolveOneShot(
      { emphasis: "Investigation / mystery", durationHours: 3 },
      seeded(1),
    );
    const base = local({
      emphasis: "Investigation / mystery",
      durationHours: 3,
    });
    base.clues[0].supports = ["theory-2", "theory-9"];
    const parsed = parseOneShotResponse(
      JSON.stringify(base),
      resolved,
    ).oneShot!;
    expect(parsed.clues[0].supports).toEqual(["theory-2"]);
    const fixed = applyOneShotRepair(
      base,
      JSON.stringify({
        clues: [{ id: "clue-3", contradicts: ["theory-1", "theory-7"] }],
      }),
    );
    expect(fixed.clues[2].contradicts).toEqual(["theory-1"]);
  });

  it("shows theories on the GM sheet", () => {
    const sheet = renderGmSheet(mystery());
    expect(sheet).toContain("## Theories");
    expect(sheet).toMatch(/A simple misfortune\*\* \(false, obvious\)/);
    expect(sheet).toContain("Ruled out by: Who is behind it");
  });
});

describe("routes", () => {
  const exploring = () => local({ emphasis: "Exploration", durationHours: 6 });

  it("gives every branching local scene a different risk and find per route", () => {
    const a = exploring();
    const branching = a.scenes.filter((s) => s.next.length > 1);
    expect(branching.length).toBeGreaterThan(0);
    for (const s of branching) expect(s.routes).toHaveLength(s.next.length);
    expect(messages(a).filter((m) => /onward|routes risk/.test(m))).toEqual([]);
  });

  it("flags an Exploration branch with a missing or look-alike route", () => {
    const a = exploring();
    const scene = a.scenes.find((s) => s.next.length > 1)!;
    const kept = scene.routes![0];
    scene.routes = [kept];
    expect(messages(a)).toContainEqual(
      expect.stringMatching(
        /say what each way onward risks and finds \(missing /,
      ),
    );
    scene.routes = scene.next.map((to) => ({ ...kept, to }));
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/its routes risk or find almost the same thing/),
    );
  });

  it("does not ask other emphases for route trade-offs, and drops routes that are not in next", () => {
    const action = local({ emphasis: "Action", durationHours: 6 });
    action.scenes.forEach((s) => (s.routes = undefined));
    expect(messages(action).filter((m) => /onward/.test(m))).toEqual([]);
    const a = exploring();
    const scene = a.scenes.find((s) => s.next.length > 1)!;
    scene.routes!.push({ to: "scene-99", risk: "x", find: "y" });
    expect(
      normaliseState(a).scenes.find((s) => s.id === scene.id)!.routes,
    ).toHaveLength(scene.next.length);
  });

  it("shows the ways onward in the adventure", () => {
    expect(renderOneShotMarkdown(exploring())).toMatch(
      /\*\*Ways onward\*\*\n- \*\*.*:\*\* risks .*; finds /,
    );
  });
});

describe("promises about someone", () => {
  const rescue = (about?: string) => {
    const a = local();
    a.threads = [
      {
        about,
        kind: "rescue",
        setup: "Tovin is missing.",
        payoff: "Tovin is freed in the granary.",
        sceneIds: [a.scenes[1].id],
      },
    ];
    return a;
  };

  it("flags a rescue that does not say who", () => {
    expect(messages(rescue())).toContainEqual(
      expect.stringMatching(/does not say who is to be rescued/),
    );
  });

  it("flags a rescue of someone no scene shows in danger, and accepts one that is", () => {
    const a = rescue("npc-3");
    a.scenes.forEach((s) => (s.whereabouts = undefined));
    expect(messages(a).filter((m) => /to be rescued/.test(m))).toEqual([]);
    a.scenes[1].whereabouts = [{ who: "npc-3", kind: "npc", state: "free" }];
    a.scenes[0].whereabouts = [{ who: "npc-1", kind: "npc", state: "free" }];
    expect(messages(a)).toContainEqual(
      expect.stringMatching(/no scene shows them trapped, captive or missing/),
    );
    a.scenes[1].whereabouts = [
      {
        who: "npc-3",
        kind: "npc",
        state: "trapped",
        how: "Pinned by the cart.",
      },
    ];
    expect(messages(a).filter((m) => /to be rescued/.test(m))).toEqual([]);
  });

  it("merges two promises about the same person even when worded differently", () => {
    const a = local();
    a.threads = [
      {
        about: "npc-3",
        kind: "rescue",
        setup: "The driver is missing after the procession.",
        payoff: "Freed.",
        sceneIds: [a.scenes[1].id],
      },
      {
        about: "npc-3",
        kind: "rescue",
        setup: "Somebody must find the lost carter before dawn.",
        payoff: "Freed in the granary after a struggle.",
        sceneIds: [a.scenes[2].id],
      },
    ];
    const d = dedupeOneShot(a);
    expect(d.threads).toHaveLength(1);
    expect(d.threads![0].sceneIds).toEqual([a.scenes[1].id, a.scenes[2].id]);
    expect(d.threads![0].payoff).toContain("granary");
  });
});

describe("prompts ask for the structured parts", () => {
  const resolved = resolveOneShot(
    { emphasis: "Investigation / mystery" },
    seeded(1),
  );

  it("asks the plan for schedule, whereabouts, routes, theories and promise subjects", () => {
    const text = structurePrompt(resolved, {}).userMessage;
    for (const part of [
      '"schedule"',
      '"whereabouts"',
      '"routes"',
      '"theories"',
      '"kind": "rescue"',
      '"supports"',
    ]) {
      expect(text).toContain(part);
    }
  });

  it("asks the finale for decisions and the answers behind each ending", () => {
    const text = finalePrompt({}, {}).userMessage;
    expect(text).toContain('"decisions"');
    expect(text).toContain('"requires"');
    expect(text).toContain(
      "Every combination of answers must lead to exactly one ending",
    );
  });

  it("puts the same parts in the single-call prompt and the review", () => {
    const single = buildOneShotPrompt({ emphasis: "Exploration" }).userMessage;
    const review = buildOneShotRepairPrompt(local(), []).userMessage;
    for (const text of [single, review]) {
      expect(text).toContain('"schedule"');
      expect(text).toContain('"whereabouts"');
      expect(text).toContain('"requires"');
      expect(text).toContain('"theories"');
    }
  });
});
