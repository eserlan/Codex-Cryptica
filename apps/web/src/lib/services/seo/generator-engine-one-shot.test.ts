/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultGeneratorEngine } from "./generator-engine";
import { generateOneShotLocal } from "generator-engine";
import {
  generationNameHistoryStore,
  generationSeedHistoryStore,
} from "./generation-input-history";

function modelReplying(text: string) {
  return {
    getModel: vi.fn().mockResolvedValue({
      generateContent: async () => ({ response: { text: () => text } }),
      generateContentStream: async function* () {
        yield { type: "delta", text };
        yield { type: "complete", text };
      },
    }),
  };
}

type Stage =
  "seed" | "core" | "structure" | "finale" | "scene" | "npcs" | "review";

function stageOf(prompt: string): Stage {
  if (prompt.includes("adventure seeds") || prompt.includes("case seeds"))
    return "seed";
  if (prompt.includes("Plan the core")) return "core";
  if (prompt.includes("Plan the scenes")) return "structure";
  if (prompt.includes("Work out how this one-shot")) return "finale";
  if (prompt.includes("Write one scene")) return "scene";
  if (prompt.includes("Give the supporting NPCs")) return "npcs";
  return "review";
}

const SEED_LOCK = "Case seed, chosen before writing and locked.";

const seedCandidates = [
  "A lighthouse keeper hides a stranded smuggler from the harbour watch.",
  "A choir master needs a stolen hymnal back before the winter vigil.",
  "A cartographer's apprentice finds a map of a street that does not exist.",
  "A miller's guild suspects its new partner of poisoning the grain.",
  "A retired duellist is challenged by someone wearing her old mask.",
].map((premise, i) => ({
  premise,
  stake: `Stake ${i + 1}`,
  setting: `Setting ${i + 1}`,
  distinctiveElement: `Element ${i + 1}`,
  titleIdea: `Title Idea ${i + 1}`,
}));

const stagedOptions = {
  durationHours: 3,
  genre: "Horror",
  emphasis: "Investigation / mystery",
};

/** Stage replies cut from a coherent local adventure. */
function stageReplies(): Record<Stage, (prompt: string) => string> {
  const a = generateOneShotLocal(stagedOptions).oneShot!;
  const [patron, antagonist, ...supporting] = a.npcs;
  return {
    seed: () => JSON.stringify({ candidates: seedCandidates }),
    core: () =>
      JSON.stringify({
        title: "The Drowned Choir",
        briefing: a.briefing,
        antagonist,
        patron,
      }),
    structure: () =>
      JSON.stringify({
        scenes: a.scenes.map(({ id, title, kind, essential, minutes }) => ({
          id,
          title,
          kind,
          essential,
          minutes,
          location: "",
          npcIds: a.scenes.find((s) => s.id === id)!.npcIds,
          next: a.scenes.find((s) => s.id === id)!.next,
        })),
        npcs: supporting.map(({ id, name, role }) => ({ id, name, role })),
        clues: a.clues,
        clock: a.clock,
        threads: a.threads,
      }),
    finale: () => JSON.stringify({ solution: a.solution, endings: a.endings }),
    scene: (prompt) => {
      const s = a.scenes.find((x) =>
        prompt.includes(`The scene to write: {\\"id\\":\\"${x.id}\\"`),
      )!;
      return JSON.stringify({
        situation: `AI: ${s.situation}`,
        approaches: s.approaches,
        challenge: s.challenge,
        outcomes: s.outcomes,
      });
    },
    npcs: () =>
      JSON.stringify({
        npcs: supporting.map((n) => ({ ...n, motivation: n.motivation })),
      }),
    review: () => "{}",
  };
}

/**
 * A model that answers each stage of staged one-shot generation. `override`
 * replaces a stage's reply; returning null makes that stage's calls throw.
 */
function stagedModel(
  override: Partial<Record<Stage, (prompt: string) => string | null>> = {},
) {
  const replies = stageReplies();
  const calls: { stage: Stage; request: any }[] = [];
  const answer = (request: any) => {
    const prompt = JSON.stringify(request);
    const stage = stageOf(prompt);
    calls.push({ stage, request });
    const text = (override[stage] ?? replies[stage])(prompt);
    if (text === null) throw new Error("model down");
    return text;
  };
  return {
    calls,
    client: {
      getModel: vi.fn().mockResolvedValue({
        generateContent: async (request: unknown) => {
          const text = answer(request);
          return { response: { text: () => text } };
        },
      }),
    },
  };
}

describe("DefaultGeneratorEngine staged one-shot", () => {
  // Accepted seeds are remembered for the session; start each test clean.
  beforeEach(() => sessionStorage.clear());

  it("generates in stages, each with a long output cap and JSON mode", async () => {
    const { client, calls } = stagedModel();
    const e = new DefaultGeneratorEngine(client as never);
    const out = await e.generateOneShot({ ...stagedOptions, useAI: true });
    expect(out.aiFallback).toBeUndefined();
    expect(out.title).toBe("The Drowned Choir");
    expect(
      out.oneShot!.scenes.every((sc) => sc.situation.startsWith("AI: ")),
    ).toBe(true);
    expect(calls.map((c) => c.stage).slice(0, 4)).toEqual([
      "seed",
      "core",
      "structure",
      "finale",
    ]);
    expect(calls.at(-1)!.stage).toBe("review");
    for (const { request } of calls) {
      expect(request.generationConfig).toMatchObject({
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      });
    }
  });

  it("locks the chosen case seed into the core stage", async () => {
    const { client, calls } = stagedModel();
    const e = new DefaultGeneratorEngine(client as never);
    await e.generateOneShot({ ...stagedOptions, useAI: true });
    expect(calls.filter((c) => c.stage === "seed")).toHaveLength(1);
    const corePrompt = JSON.stringify(
      calls.find((c) => c.stage === "core")!.request,
    );
    expect(corePrompt).toContain(SEED_LOCK);
    expect(
      seedCandidates.some(({ premise }) => corePrompt.includes(premise)),
    ).toBe(true);
  });

  it("falls back to the rolled concept when no seed candidates are usable", async () => {
    const { client, calls } = stagedModel({ seed: () => "no seeds here" });
    const e = new DefaultGeneratorEngine(client as never);
    const out = await e.generateOneShot({ ...stagedOptions, useAI: true });
    expect(out.aiFallback).toBeUndefined();
    expect(out.title).toBe("The Drowned Choir");
    expect(calls.map((c) => c.stage).slice(0, 5)).toEqual([
      "seed",
      "seed",
      "core",
      "structure",
      "finale",
    ]);
    const corePrompt = JSON.stringify(
      calls.find((c) => c.stage === "core")!.request,
    );
    expect(corePrompt).not.toContain(SEED_LOCK);
  });

  it("forwards each step's progress to the page", async () => {
    const onProgress = vi.fn();
    const e = new DefaultGeneratorEngine(stagedModel().client as never);
    await e.generateOneShot({ ...stagedOptions, useAI: true, onProgress });
    const first = onProgress.mock.calls[0]![0];
    expect(first).toHaveLength(6);
    expect(
      first.every((step: { status: string }) => step.status === "pending"),
    ).toBe(true);
    const active = onProgress.mock.calls
      .map(([steps]) => steps)
      .find((steps) => steps[0]?.id === "core" && steps[0].status === "active");
    expect(active?.[0]).toMatchObject({ id: "core", status: "active" });
    const last = onProgress.mock.calls.at(-1)![0];
    expect(last.every((s: { status: string }) => s.status === "done")).toBe(
      true,
    );
  });

  it("names parts written from templates when their step fails", async () => {
    const e = new DefaultGeneratorEngine(
      stagedModel({ npcs: () => null }).client as never,
    );
    const out = await e.generateOneShot({ ...stagedOptions, useAI: true });
    expect(out.aiFallback).toBeUndefined();
    expect(out.aiPartialFallback).toEqual(["Supporting characters"]);
  });

  it("flags the review as skipped when it fails or can't be read", async () => {
    const replies = [() => null, () => "I could not review this."];
    for (const review of [...replies, () => "null", () => "[]"]) {
      const e = new DefaultGeneratorEngine(
        stagedModel({ review }).client as never,
      );
      const out = await e.generateOneShot({ ...stagedOptions, useAI: true });
      expect(out.aiReviewSkipped).toBe(true);
      expect(out.title).toBe("The Drowned Choir");
    }
  });

  it("treats an empty review as reviewed", async () => {
    const e = new DefaultGeneratorEngine(
      stagedModel({ review: () => "{}" }).client as never,
    );
    const out = await e.generateOneShot({ ...stagedOptions, useAI: true });
    expect(out.aiReviewSkipped).toBeUndefined();
  });

  it("uses the review's changes", async () => {
    const e = new DefaultGeneratorEngine(
      stagedModel({
        review: () =>
          JSON.stringify({ briefing: { trigger: "A bell rang at dawn." } }),
      }).client as never,
    );
    const out = await e.generateOneShot({ ...stagedOptions, useAI: true });
    expect(out.aiReviewSkipped).toBeUndefined();
    expect(out.oneShot?.briefing.trigger).toBe("A bell rang at dawn.");
  });

  it("falls back to a whole local adventure when the core can't be written", async () => {
    const { client, calls } = stagedModel({ core: () => null });
    const e = new DefaultGeneratorEngine(client as never);
    const out = await e.generateOneShot({ ...stagedOptions, useAI: true });
    expect(out.aiFallback).toBe(true);
    expect(calls.map((c) => c.stage)).toEqual(["seed", "core", "core"]);
    expect(out.oneShot?.scenes.length).toBeGreaterThanOrEqual(3);
  });

  it("seeds the adventure with emphasis, anti-tropes, and tracks NPC names across sessions", async () => {
    const storageMap = new Map<string, string>();
    const fakeSessionStorage = {
      getItem: (k: string) => storageMap.get(k) ?? null,
      setItem: (k: string, v: string) => storageMap.set(k, v),
      removeItem: (k: string) => storageMap.delete(k),
    };
    (globalThis as unknown as { sessionStorage: unknown }).sessionStorage =
      fakeSessionStorage;

    const { client, calls } = stagedModel();
    const e = new DefaultGeneratorEngine(client as never);
    await e.generateOneShot({ ...stagedOptions, useAI: true });

    const seedCall = calls.find((c) => c.stage === "seed");
    expect(seedCall).toBeDefined();
    const promptText = JSON.stringify(seedCall!.request);
    expect(promptText).toContain("adventure seeds for a tabletop RPG scenario");
    expect(promptText).toContain("scenario emphasis (Investigation / mystery)");
    expect(promptText).toContain(
      "tavern notice board; missing merchant caravan",
    );

    expect(generationSeedHistoryStore.recent("one-shot")).toHaveLength(1);
    expect(
      generationNameHistoryStore.recent("one-shot").length,
    ).toBeGreaterThan(0);
  });
});

describe("DefaultGeneratorEngine one-shot revise", () => {
  it("leaves the part alone when a revise request can't reach the AI", async () => {
    const original = generateOneShotLocal({}).oneShot!;
    const e = new DefaultGeneratorEngine(modelReplying("nope") as never);
    const result = await e.regenerateOneShotPart(
      original,
      { kind: "scene", id: "scene-2" },
      { useAI: true, instruction: "make it a chase" },
    );
    expect(result.adventure).toBe(original);
    expect(result.warnings[0]).toMatch(/wasn't applied/);
  });
});

describe("DefaultGeneratorEngine one-shot", () => {
  let engine: DefaultGeneratorEngine;

  beforeEach(() => {
    engine = new DefaultGeneratorEngine({ getModel: vi.fn() } as never);
  });

  it("generates a playable local one-shot when AI is off", async () => {
    const out = await engine.generateOneShot({
      durationHours: 3,
      useAI: false,
    });
    expect(out.oneShot).toBeDefined();
    const a = out.oneShot!;
    expect(
      a.scenes.reduce((n, s) => n + s.minutes, 0) + a.timeBudget.bufferMinutes,
    ).toBe(180);
    expect(out.content).toContain("## GM Briefing");
    expect(out.lore).toContain("Cheat Sheet");
  });

  it("falls back to a local one-shot when the model reply is unusable", async () => {
    const e = new DefaultGeneratorEngine(modelReplying("not json") as never);
    const out = await e.generateOneShot({ useAI: true });
    expect(out.oneShot?.endings.length).toBeGreaterThanOrEqual(2);
  });

  it("regenerates one scene locally and leaves the rest alone", async () => {
    const original = generateOneShotLocal({ durationHours: 4 }).oneShot!;
    const result = await engine.regenerateOneShotPart(original, {
      kind: "scene",
      id: "scene-2",
    });
    expect(result.adventure.scenes[1].minutes).toBe(original.scenes[1].minutes);
    expect(result.adventure.clues).toEqual(original.clues);
    expect(result.adventure.scenes[0]).toEqual(original.scenes[0]);
  });

  it("uses the model reply for a regeneration when AI is on", async () => {
    const original = generateOneShotLocal({ durationHours: 3 }).oneShot!;
    const npc = original.npcs[0];
    const e = new DefaultGeneratorEngine(
      modelReplying(
        JSON.stringify({
          motivation: "Wants peace.",
          knows: "Nothing.",
          reaction: "Calm.",
          cues: "Hums.",
        }),
      ) as never,
    );
    const result = await e.regenerateOneShotPart(
      original,
      { kind: "npc", id: npc.id },
      { useAI: true },
    );
    expect(result.adventure.npcs[0].motivation).toBe("Wants peace.");
    expect(result.adventure.npcs[0].name).toBe(npc.name);
  });

  it("keeps the original when an AI regeneration reply is broken", async () => {
    const original = generateOneShotLocal({}).oneShot!;
    const e = new DefaultGeneratorEngine(modelReplying("nope") as never);
    const result = await e.regenerateOneShotPart(
      original,
      { kind: "scene", id: "scene-2" },
      { useAI: true },
    );
    expect(result.adventure.scenes).toHaveLength(original.scenes.length);
    expect(result.adventure.scenes[1].id).toBe("scene-2");
  });
});
