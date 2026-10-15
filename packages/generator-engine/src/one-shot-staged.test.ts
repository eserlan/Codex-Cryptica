import { describe, expect, it } from "vitest";
import { runOneShotStages, type OneShotProgressStep } from "./one-shot-staged";
import type { StagePrompt } from "./one-shot-stage-prompts";
import { generateOneShotLocal } from "./public-one-shot";
import { checkPlayability } from "./one-shot-playability";
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
      })),
      npcs: supporting.map((n) => ({ id: n.id, name: n.name, role: n.role })),
      clues: a.clues,
      clock: a.clock,
      threads: a.threads,
      runningLate: a.timeBudget.runningLate,
    },
    finale: {
      solution: a.solution,
      endings: a.endings,
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
      { call, concurrency: 1, onProgress: (s) => snapshots.push(s) },
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

  it("marks the review skipped when it fails, keeping the draft", async () => {
    const a = local();
    const { call } = fakeModel(a, { review: 1 });
    const result = await runOneShotStages(
      { ...options, durationHours: 4 },
      { call },
      "",
      seeded(),
    );
    expect(result.reviewSkipped).toBe(true);
    expect(result.adventure.title).toBe("The Drowned Choir");
  });

  it("never runs more scene calls at once than allowed", async () => {
    const a = local();
    const { call } = fakeModel(a);
    let inFlight = 0;
    let peak = 0;
    await runOneShotStages(
      { ...options, durationHours: 4 },
      {
        concurrency: 2,
        call: async (p) => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await new Promise((r) => setTimeout(r, 1));
          try {
            return await call(p);
          } finally {
            inFlight -= 1;
          }
        },
      },
      "",
      seeded(),
    );
    expect(peak).toBe(2);
  });
});
