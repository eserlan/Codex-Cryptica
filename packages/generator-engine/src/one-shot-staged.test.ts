import { describe, expect, it } from "vitest";
import { runOneShotStages, type OneShotProgressStep } from "./one-shot-staged";
import { isReadableRepair } from "./one-shot-repair";
import type { StagePrompt } from "./one-shot-stage-prompts";
import { generateOneShotLocal } from "./public-one-shot";
import { checkPlayability } from "./one-shot-playability";
import { checkWhereabouts } from "./one-shot-state-checks";
import type { OneShotAdventure } from "./one-shot-types";

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const options = {
  durationHours: 3,
  genre: "Horror",
  emphasis: "Investigation / mystery",
};

/** Stage replies cut from a coherent local adventure. */
function replies(a: OneShotAdventure) {
  const [patron, antagonist, ...supporting] = a.npcs;
  return {
    core: {
      title: "The Drowned Choir",
      briefing: a.briefing,
      antagonist,
      patron,
    },
    structure: {
      scenes: a.scenes.map((s) => ({
        id: s.id,
        title: s.title,
        kind: s.kind,
        essential: s.essential,
        minutes: s.minutes,
        purpose: s.purpose,
        location: s.location,
        npcIds: s.npcIds,
        next: s.next,
        whereabouts: s.whereabouts,
        routes: s.routes,
      })),
      npcs: supporting.map((n) => ({ id: n.id, name: n.name, role: n.role })),
      clues: a.clues,
      clock: a.clock,
      theories: a.theories,
      threads: a.threads,
      runningLate: a.timeBudget.runningLate,
    },
    finale: {
      solution: a.solution,
      endings: a.endings,
      decisions: a.decisions,
      epilogueHook: a.epilogueHook,
    },
    scene: (title: string) => {
      const s = a.scenes.find((x) => title.includes(`"title":"${x.title}"`))!;
      return {
        situation: `AI: ${s.situation}`,
        approaches: s.approaches,
        challenge: s.challenge,
        outcomes: s.outcomes,
        shorten: s.shorten,
        ...(s.kind === "opening"
          ? {
              opening: {
                readAloud: "Rain on the chapel roof.",
                firstDecision: a.opening.firstDecision,
                involvement: a.opening.involvement,
              },
            }
          : {}),
      };
    },
    npcs: {
      npcs: supporting.map((n) => ({
        id: n.id,
        motivation: `AI: ${n.motivation}`,
        knows: n.knows,
        reaction: n.reaction,
        cues: n.cues,
      })),
    },
  };
}

type Stage = "core" | "structure" | "finale" | "scene" | "npcs" | "review";

function stageOf(p: StagePrompt): Stage {
  const first = p.userMessage.split("\n")[0];
  if (first.startsWith("Plan the core")) return "core";
  if (first.startsWith("Plan the scenes")) return "structure";
  if (first.startsWith("Work out how")) return "finale";
  if (first.startsWith("Write one scene")) return "scene";
  if (first.startsWith("Give the supporting")) return "npcs";
  return "review";
}

function fakeModel(
  a: OneShotAdventure,
  failures: Partial<Record<Stage, number>> = {},
) {
  const r = replies(a);
  const calls: Stage[] = [];
  const remaining = { ...failures };
  const call = async (p: StagePrompt) => {
    const stage = stageOf(p);
    calls.push(stage);
    if ((remaining[stage] ?? 0) > 0) {
      remaining[stage]! -= 1;
      throw new Error("timeout");
    }
    if (stage === "scene") return JSON.stringify(r.scene(p.userMessage));
    if (stage === "review") return "{}";
    return JSON.stringify(r[stage]);
  };
  return { call, calls };
}

const local = () =>
  generateOneShotLocal({ ...options, durationHours: 4 }, seeded()).oneShot!;

describe("runOneShotStages", () => {
  it("builds the adventure step by step, each step seeing the earlier ones", async () => {
    const a = local();
    const { call, calls } = fakeModel(a);
    const prompts: StagePrompt[] = [];
    const result = await runOneShotStages(
      { ...options, durationHours: 4 },
      {
        call: (p) => {
          prompts.push(p);
          return call(p);
        },
      },
      "",
      seeded(),
    );
    expect(calls.slice(0, 3)).toEqual(["core", "structure", "finale"]);
    expect(calls.filter((c) => c === "scene")).toHaveLength(a.scenes.length);
    expect(calls.at(-1)).toBe("review");
    // The plan is written knowing the core; scenes know core, plan and finale.
    expect(prompts[1].userMessage).toContain("The Drowned Choir");
    const scene = prompts.find((p) => stageOf(p) === "scene")!;
    expect(scene.userMessage).toContain(a.solution!.summary);
    expect(scene.userMessage).toContain('"label"');

    const out = result.adventure;
    expect(out.title).toBe("The Drowned Choir");
    expect(out.antagonistId).toBe("npc-2");
    expect(out.scenes.every((s) => s.situation.startsWith("AI: "))).toBe(true);
    expect(out.opening.readAloud).toBe("Rain on the chapel roof.");
    expect(out.npcs[2].motivation.startsWith("AI: ")).toBe(true);
    expect(result.fallbackParts).toEqual([]);
    expect(result.reviewSkipped).toBe(false);
    expect(checkPlayability(out)).toEqual([]);
  });

  it("includes only clues, threads, and NPCs linked to each scene", async () => {
    const a = local();
    const stageReplies = replies(a);
    const [first, second, third] = stageReplies.structure.scenes;
    first.npcIds = ["npc-3", "npc-unlisted"];
    second.npcIds = ["npc-4"];
    Reflect.deleteProperty(third, "npcIds");
    stageReplies.structure.npcs = [
      { id: "npc-3", name: "Mara", role: "Bell keeper" },
      { id: "npc-4", name: "Orren", role: "Archivist" },
    ];
    stageReplies.structure.clues = [
      {
        id: "clue-first",
        label: "First clue",
        text: "A cracked bell",
        routes: [
          { sceneId: first.id, method: "search the altar" },
          { sceneId: third.id, method: "inspect the bell rope" },
        ],
      },
      {
        id: "clue-second",
        label: "Second clue",
        text: "A hidden ledger",
        routes: [
          { sceneId: second.id, method: "question the keeper" },
          { sceneId: third.id, method: "read the ledger" },
        ],
      },
      {
        id: "clue-third",
        label: "Third clue",
        text: "The keeper altered the records",
        routes: [
          { sceneId: second.id, method: "compare the entries" },
          { sceneId: third.id, method: "ask the clerk" },
        ],
      },
      {
        id: "clue-no-routes",
        label: "Unplaced clue",
        text: "No scene offers it",
        essential: false,
      },
    ];
    stageReplies.structure.threads = [
      { id: "thread-first", sceneIds: [first.id] },
      { id: "thread-second", sceneIds: [second.id] },
      { id: "thread-empty", sceneIds: [] },
      { id: "thread-unplaced" },
    ];

    const prompts: StagePrompt[] = [];
    const stageCall = async (p: StagePrompt) => {
      prompts.push(p);
      const stage = stageOf(p);
      if (stage === "scene")
        return JSON.stringify(stageReplies.scene(p.userMessage));
      if (stage === "review") return "{}";
      return JSON.stringify(stageReplies[stage]);
    };
    await runOneShotStages(
      { ...options, durationHours: 4 },
      { call: stageCall },
      "",
      seeded(),
    );

    const promptFor = (id: string) =>
      prompts.find(
        (p) =>
          stageOf(p) === "scene" &&
          p.userMessage.includes(`The scene to write: {"id":"${id}"`),
      )!.userMessage;
    const jsonLine = (prompt: string, label: string) =>
      JSON.parse(prompt.split(`${label}: `)[1].split("\n")[0]) as {
        id?: string;
        label?: string;
        foundBy?: string;
      }[];

    const firstPrompt = promptFor(first.id);
    expect(
      jsonLine(firstPrompt, "Clues it must offer (with how they are found)"),
    ).toEqual([
      {
        label: "First clue",
        text: "A cracked bell",
        foundBy: "search the altar",
      },
    ]);
    expect(
      jsonLine(firstPrompt, "Threads it carries").map((thread) => thread.id),
    ).toEqual(["thread-first"]);
    expect(jsonLine(firstPrompt, "NPCs present").map((npc) => npc.id)).toEqual([
      "npc-3",
    ]);

    const secondPrompt = promptFor(second.id);
    expect(
      jsonLine(secondPrompt, "Clues it must offer (with how they are found)"),
    ).toEqual([
      {
        label: "Second clue",
        text: "A hidden ledger",
        foundBy: "question the keeper",
      },
      {
        label: "Third clue",
        text: "The keeper altered the records",
        foundBy: "compare the entries",
      },
    ]);
    expect(
      jsonLine(secondPrompt, "Threads it carries").map((thread) => thread.id),
    ).toEqual(["thread-second"]);
    expect(jsonLine(secondPrompt, "NPCs present").map((npc) => npc.id)).toEqual(
      ["npc-4"],
    );

    expect(
      jsonLine(promptFor(third.id), "NPCs present").map((npc) => npc.id),
    ).toEqual([]);
  });

  it("gives a shared scene separate histories for its reachable routes", async () => {
    const a = generateOneShotLocal(
      { ...options, durationHours: 4, structure: "Five-room adventure" },
      seeded(),
    ).oneShot!;
    const [opening, left, right, shared] = a.scenes;
    opening.next = [left.id, right.id];
    left.next = [shared.id];
    right.next = [shared.id];
    shared.next = [];
    const prompts: StagePrompt[] = [];
    const run = fakeModel(a);

    await runOneShotStages(
      { ...options, durationHours: 4, structure: "Five-room adventure" },
      {
        call: (p) => {
          prompts.push(p);
          return run.call(p);
        },
      },
      "",
      seeded(),
    );

    const sharedPrompt = prompts.find(
      (p) =>
        stageOf(p) === "scene" &&
        p.userMessage.includes(`The scene to write: {"id":"${shared.id}"`),
    )!;
    const historyText = sharedPrompt.userMessage
      .split("Earlier scenes on each route")[1]
      .split("\nRules:")[0];
    const histories = JSON.parse(
      historyText.slice(historyText.indexOf(":") + 1).trim(),
    ) as { id: string }[][];
    expect(histories).toHaveLength(2);
    expect(histories.map((route) => route.map((scene) => scene.id))).toEqual([
      [opening.id, left.id],
      [opening.id, right.id],
    ]);
  });

  it("propagates history and state when a predecessor is listed later", async () => {
    const a = generateOneShotLocal(
      { ...options, durationHours: 4, structure: "Five-room adventure" },
      seeded(),
    ).oneShot!;
    const [opening, branch, merge, climax] = a.scenes;
    opening.next = [branch.id];
    branch.next = [merge.id];
    merge.next = [climax.id];
    climax.next = [];
    a.scenes = [opening, merge, branch, climax];
    const captive = a.npcs[0];
    branch.npcIds = [...new Set([...branch.npcIds, captive.id])];
    branch.exit = [
      { who: captive.id, kind: "npc", state: "captive", where: "the cellar" },
    ];
    merge.npcIds = [...new Set([...merge.npcIds, captive.id])];
    merge.whereabouts = undefined;

    const prompts: StagePrompt[] = [];
    const run = fakeModel(a);
    await runOneShotStages(
      { ...options, durationHours: 4, structure: "Five-room adventure" },
      {
        call: (p) => {
          prompts.push(p);
          return run.call(p).then((reply) => {
            if (
              stageOf(p) !== "scene" ||
              !p.userMessage.includes(
                `The scene to write: {"id":"${branch.id}"`,
              )
            ) {
              return reply;
            }
            return JSON.stringify({ ...JSON.parse(reply), exit: branch.exit });
          });
        },
      },
      "",
      seeded(),
    );

    const mergePrompt = prompts.find(
      (p) =>
        stageOf(p) === "scene" &&
        p.userMessage.includes(`The scene to write: {"id":"${merge.id}"`),
    )!;
    const historyText = mergePrompt.userMessage
      .split("Earlier scenes on each route")[1]
      .split("\nRules:")[0];
    const histories = JSON.parse(
      historyText.slice(historyText.indexOf(":") + 1).trim(),
    ) as { id: string; title: string; exit: unknown }[][];
    expect(histories.map((route) => route.map((scene) => scene.id))).toEqual([
      [opening.id, branch.id],
    ]);
    expect(histories[0][1]).toEqual(
      expect.objectContaining({
        id: branch.id,
        title: branch.title,
        exit: branch.exit,
      }),
    );

    expect(checkWhereabouts(a).map((gap) => gap.message)).toContainEqual(
      expect.stringContaining("still captive from an earlier scene"),
    );
  });

  it("reports progress through every step in order", async () => {
    const a = local();
    const snapshots: OneShotProgressStep[][] = [];
    await runOneShotStages(
      { ...options, durationHours: 4 },
      { call: fakeModel(a).call, onProgress: (s) => snapshots.push(s) },
      "",
      seeded(),
    );
    const first = snapshots[0];
    expect(first.map((s) => s.id)).toEqual([
      "core",
      "structure",
      "finale",
      "scenes",
      "npcs",
      "review",
    ]);
    expect(first[0].status).toBe("active");
    expect(
      snapshots.some((s) => s[3].detail === `2 of ${a.scenes.length}`),
    ).toBe(true);
    expect(snapshots.at(-1)!.every((s) => s.status === "done")).toBe(true);
  });

  it("retries a step once before giving up on it", async () => {
    const a = local();
    const { call, calls } = fakeModel(a, { finale: 1 });
    const result = await runOneShotStages(
      { ...options, durationHours: 4 },
      { call },
      "",
      seeded(),
    );
    expect(calls.filter((c) => c === "finale")).toHaveLength(2);
    expect(result.adventure.solution).toBeDefined();
    expect(result.fallbackParts).toEqual([]);
  });

  it("fills a failed scene from templates and says which one", async () => {
    const a = local();
    const { call } = fakeModel(a, { scene: 2 });
    const snapshots: OneShotProgressStep[][] = [];
    const result = await runOneShotStages(
      { ...options, durationHours: 4, structure: "Three-act" },
      { call, onProgress: (s) => snapshots.push(s) },
      "",
      seeded(),
    );
    const first = result.adventure.scenes[0];
    expect(first.situation.startsWith("AI: ")).toBe(false);
    expect(first.situation.length).toBeGreaterThan(0);
    expect(result.fallbackParts).toEqual([first.title]);
    expect(snapshots.at(-1)![3]).toMatchObject({
      status: "fallback",
      detail: "1 from templates",
    });
  });

  it("keeps template-filled middle scenes distinct after multiple failures", async () => {
    const structure = "Five-room adventure";
    const a = generateOneShotLocal(
      { ...options, durationHours: 4, structure },
      seeded(),
    ).oneShot!;
    const { call } = fakeModel(a, { scene: 6 });
    const result = await runOneShotStages(
      { ...options, durationHours: 4, structure },
      { call },
      "",
      seeded(),
    );
    const middle = result.adventure.scenes.filter(
      (scene) => scene.kind === "middle",
    );

    expect(result.fallbackParts).toHaveLength(3);
    expect(middle.length).toBeGreaterThan(1);
    expect(
      new Set(middle.map((scene) => scene.challenge.description)).size,
    ).toBe(middle.length);
    expect(new Set(middle.map((scene) => scene.situation)).size).toBe(
      middle.length,
    );
  });

  it("avoids a template challenge used by a successful AI scene of another type", async () => {
    const structure = "Five-room adventure";
    const a = generateOneShotLocal(
      { ...options, durationHours: 4, structure },
      seeded(),
    ).oneShot!;

    const runWithSceneFailure = async (reuse?: {
      description: string;
      type: string;
    }) => {
      const { call } = fakeModel(a);
      let sceneCalls = 0;
      return runOneShotStages(
        { ...options, durationHours: 4, structure },
        {
          call: async (prompt) => {
            if (stageOf(prompt) === "scene") {
              sceneCalls += 1;
              if (sceneCalls === 3 || sceneCalls === 4)
                throw new Error("timeout");
            }
            const response = await call(prompt);
            if (sceneCalls !== 2 || !reuse) return response;

            const scene = JSON.parse(response) as {
              challenge: { type: string; description: string };
            };
            scene.challenge.description = reuse.description;
            scene.challenge.type = reuse.type;
            return JSON.stringify(scene);
          },
        },
        "",
        seeded(19),
      );
    };

    const templateFallback = await runWithSceneFailure();
    const middle = templateFallback.adventure.scenes.filter(
      (scene) => scene.kind === "middle",
    );
    const repeatedTemplateDescription =
      middle[1].challenge.description.replaceAll(
        middle[1].location,
        middle[0].location,
      );
    const repeatedTemplateType = middle[1].challenge.type;
    const differentType =
      repeatedTemplateType === "social" ? "combat" : "social";
    const mixed = await runWithSceneFailure({
      description: repeatedTemplateDescription,
      type: differentType,
    });
    const mixedMiddle = mixed.adventure.scenes.filter(
      (scene) => scene.kind === "middle",
    );
    expect(mixedMiddle[0].challenge.type).toBe(differentType);
    expect(
      new Set(mixedMiddle.map((scene) => scene.challenge.description)).size,
    ).toBe(mixedMiddle.length);
  });

  it("keeps going without a finale and says so", async () => {
    const a = local();
    const { call } = fakeModel(a, { finale: 2 });
    const result = await runOneShotStages(
      { ...options, durationHours: 4 },
      { call },
      "",
      seeded(),
    );
    expect(result.fallbackParts).toContain("Finale and endings");
    expect(result.adventure.endings.length).toBeGreaterThanOrEqual(2);
  });

  it("templates the supporting cast when their step fails", async () => {
    const a = local();
    const { call } = fakeModel(a, { npcs: 2 });
    const result = await runOneShotStages(
      { ...options, durationHours: 4 },
      { call },
      "",
      seeded(),
    );
    expect(result.fallbackParts).toContain("Supporting characters");
    expect(result.adventure.npcs[2].motivation.startsWith("AI: ")).toBe(false);
  });

  it("throws when the core can't be written, so the caller falls back", async () => {
    const { call } = fakeModel(local(), { core: 2 });
    const snapshots: OneShotProgressStep[][] = [];
    await expect(
      runOneShotStages(
        options,
        { call, onProgress: (s) => snapshots.push(s) },
        "",
        seeded(),
      ),
    ).rejects.toThrow(/core step did not finish/);
    expect(snapshots.at(-1)![0].status).toBe("fallback");
  });

  it("retries a failed review once before marking it skipped", async () => {
    const a = local();
    const { call } = fakeModel(a, { review: 1 });
    let reviewCalls = 0;
    const result = await runOneShotStages(
      { ...options, durationHours: 4 },
      {
        call: (prompt) => {
          if (stageOf(prompt) === "review") reviewCalls += 1;
          return call(prompt);
        },
      },
      "",
      seeded(),
    );
    expect(reviewCalls).toBe(2);
    expect(result.reviewSkipped).toBe(false);
    expect(result.adventure.title).toBe("The Drowned Choir");
  });

  it("accepts a second review that reduces the remaining gaps", async () => {
    const a = local();
    a.briefing.premise = `${a.briefing.premise} The ruins lie underwater.`;
    a.briefing.environment = undefined;
    const { call } = fakeModel(a);
    let reviews = 0;
    const result = await runOneShotStages(
      { ...options, durationHours: 4 },
      {
        call: async (prompt) => {
          if (stageOf(prompt) !== "review") return call(prompt);
          reviews += 1;
          return reviews === 1
            ? JSON.stringify({ briefing: { prep: "First review prep." } })
            : JSON.stringify({
                briefing: {
                  environment:
                    "The party uses sealed lamps and moves between air pockets.",
                },
              });
        },
      },
      "",
      seeded(),
    );
    expect(reviews).toBe(2);
    expect(result.reviewSkipped).toBe(false);
    expect(result.adventure.briefing.prep).toBe("First review prep.");
    expect(result.adventure.briefing.environment).toContain("sealed lamps");
  });

  it("discards a second review that does not reduce the remaining gaps", async () => {
    const a = local();
    a.briefing.premise = `${a.briefing.premise} The ruins lie underwater.`;
    a.briefing.environment = undefined;
    const { call } = fakeModel(a);
    let reviews = 0;
    const result = await runOneShotStages(
      { ...options, durationHours: 4 },
      {
        call: async (prompt) => {
          if (stageOf(prompt) !== "review") return call(prompt);
          reviews += 1;
          return JSON.stringify({
            briefing: {
              prep:
                reviews === 1 ? "First review prep." : "Rejected second prep.",
            },
          });
        },
      },
      "",
      seeded(),
    );
    expect(reviews).toBe(2);
    expect(result.adventure.briefing.prep).toBe("First review prep.");
    expect(result.adventure.briefing.environment).toBeUndefined();
  });

  it("stops after one review when nothing is left to fix", async () => {
    const { call, calls } = fakeModel(local());
    await runOneShotStages(
      { ...options, durationHours: 4 },
      { call },
      "",
      seeded(),
    );
    expect(calls.filter((c) => c === "review")).toHaveLength(1);
  });

  it("rejects null and array review replies but accepts an empty object", () => {
    expect(isReadableRepair("{}")).toBe(true);
    expect(isReadableRepair("null")).toBe(false);
    expect(isReadableRepair("[]")).toBe(false);
  });

  it("stops queued scene calls when the generation is aborted", async () => {
    const a = local();
    const controller = new AbortController();
    const sceneCalls: string[] = [];
    await expect(
      runOneShotStages(
        { ...options, durationHours: 4 },
        {
          signal: controller.signal,
          call: async (prompt, signal) => {
            if (stageOf(prompt) === "scene") {
              sceneCalls.push(prompt.userMessage);
              controller.abort();
              throw signal?.reason;
            }
            return fakeModel(a).call(prompt);
          },
        },
        "",
        seeded(),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(sceneCalls).toHaveLength(1);
  });

  it("writes scenes one at a time with their reachable route history", async () => {
    const a = local();
    const { call } = fakeModel(a);
    let inFlight = 0;
    let peak = 0;
    const scenePrompts: string[] = [];
    await runOneShotStages(
      { ...options, durationHours: 4 },
      {
        call: async (p) => {
          const isScene = stageOf(p) === "scene";
          if (isScene) {
            scenePrompts.push(p.userMessage);
            inFlight += 1;
            peak = Math.max(peak, inFlight);
          }
          await new Promise((r) => setTimeout(r, 1));
          try {
            return await call(p);
          } finally {
            if (isScene) inFlight -= 1;
          }
        },
      },
      "",
      seeded(),
    );
    expect(peak).toBe(1);
    expect(scenePrompts[0]).not.toContain("Earlier scenes on each route");
    expect(scenePrompts[1]).toContain("Earlier scenes on each route");
    expect(scenePrompts[1]).toContain(a.scenes[0].title);
  });
});
