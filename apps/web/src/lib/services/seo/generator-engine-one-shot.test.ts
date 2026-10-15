/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultGeneratorEngine } from "./generator-engine";
import { generateOneShotLocal } from "generator-engine";

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

/** A model whose replies come from `replies` in order; `null` throws. */
function modelInSequence(replies: (string | null)[]) {
  const calls: string[] = [];
  let i = 0;
  const next = (prompt: string) => {
    calls.push(prompt);
    const text = replies[Math.min(i++, replies.length - 1)];
    if (text === null) throw new Error("model down");
    return text;
  };
  return {
    calls,
    client: {
      getModel: vi.fn().mockResolvedValue({
        generateContent: async (prompt: unknown) => {
          const text = next(JSON.stringify(prompt));
          return { response: { text: () => text } };
        },
        generateContentStream: async function* (prompt: unknown) {
          const text = next(JSON.stringify(prompt));
          yield { type: "delta", text };
          yield { type: "complete", text };
        },
      }),
    },
  };
}

/** A valid one-shot with no finale solution or clock, as a model might send. */
function gappyReply() {
  const a = structuredClone(
    generateOneShotLocal({ durationHours: 3 }).oneShot!,
  );
  delete a.solution;
  delete a.clock;
  return JSON.stringify(a);
}

describe("DefaultGeneratorEngine one-shot reliability", () => {
  const options = {
    durationHours: 3,
    genre: "Horror",
    emphasis: "Investigation / mystery",
  };

  it("asks for room: a long output cap and JSON mode, on both calls", async () => {
    const draft = JSON.stringify(generateOneShotLocal(options).oneShot);
    const requests: unknown[] = [];
    const client = {
      getModel: vi.fn().mockResolvedValue({
        generateContent: async (request: unknown) => {
          requests.push(request);
          return {
            response: { text: () => (requests.length === 1 ? draft : "{}") },
          };
        },
      }),
    };
    const e = new DefaultGeneratorEngine(client as never);
    await e.generateOneShot({ ...options, useAI: true });
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect((request as any).generationConfig).toMatchObject({
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      });
    }
  });

  it("keeps the draft and flags it when the review call fails", async () => {
    const draft = JSON.stringify(generateOneShotLocal(options).oneShot);
    const { client } = modelInSequence([draft, null]);
    const e = new DefaultGeneratorEngine(client as never);
    const out = await e.generateOneShot({ ...options, useAI: true });
    expect(out.aiFallback).toBeUndefined();
    expect(out.aiReviewSkipped).toBe(true);
    expect(out.oneShot).toBeDefined();
  });

  it("flags unreadable review replies, but not empty objects", async () => {
    const draft = JSON.stringify(generateOneShotLocal(options).oneShot);
    const unreadable = new DefaultGeneratorEngine(
      modelInSequence([draft, "I could not review this."]).client as never,
    );
    expect(
      (await unreadable.generateOneShot({ ...options, useAI: true }))
        .aiReviewSkipped,
    ).toBe(true);
    for (const unreadableJson of ["null", "[]"]) {
      const unreadableJsonEngine = new DefaultGeneratorEngine(
        modelInSequence([draft, unreadableJson]).client as never,
      );
      expect(
        (
          await unreadableJsonEngine.generateOneShot({
            ...options,
            useAI: true,
          })
        ).aiReviewSkipped,
      ).toBe(true);
    }
    const empty = new DefaultGeneratorEngine(
      modelInSequence([draft, "{}"]).client as never,
    );
    expect(
      (await empty.generateOneShot({ ...options, useAI: true }))
        .aiReviewSkipped,
    ).toBeUndefined();
  });

  it("does not flag a reviewed adventure", async () => {
    const draft = JSON.stringify(generateOneShotLocal(options).oneShot);
    const review = JSON.stringify({
      briefing: { trigger: "A bell rang at dawn." },
    });
    const e = new DefaultGeneratorEngine(
      modelInSequence([draft, review]).client as never,
    );
    const out = await e.generateOneShot({ ...options, useAI: true });
    expect(out.aiReviewSkipped).toBeUndefined();
    expect(out.oneShot?.briefing.trigger).toBe("A bell rang at dawn.");
  });
});

describe("DefaultGeneratorEngine one-shot playability", () => {
  it("asks the model to fill the gaps it left, then uses the repair", async () => {
    const { client, calls } = modelInSequence([
      gappyReply(),
      JSON.stringify({
        clock: {
          name: "The Tolls",
          advances: "Every failed challenge.",
          ticks: [
            { trigger: "1", effect: "A warning." },
            { trigger: "2", effect: "A death." },
            { trigger: "3", effect: "The end." },
          ],
          slow: "Muffle the bell.",
        },
      }),
    ]);
    const e = new DefaultGeneratorEngine(client as never);
    const out = await e.generateOneShot({ durationHours: 3, useAI: true });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("Give the threat a countdown");
    expect(out.oneShot?.clock?.name).toBe("The Tolls");
    expect(out.lore).toContain("## The Tolls");
  });

  it("keeps the first draft and lists its gaps when the repair fails", async () => {
    const { client, calls } = modelInSequence([gappyReply(), null]);
    const e = new DefaultGeneratorEngine(client as never);
    const out = await e.generateOneShot({ durationHours: 3, useAI: true });
    expect(calls).toHaveLength(2);
    expect(out.oneShot?.clock).toBeUndefined();
    expect(out.content).toContain("## Before You Run It");
  });

  it("always reviews, and keeps the draft when the review changes nothing", async () => {
    const options = {
      durationHours: 3,
      genre: "Horror",
      emphasis: "Investigation / mystery",
    };
    const draft = generateOneShotLocal(options).oneShot!;
    const { client, calls } = modelInSequence([JSON.stringify(draft), "{}"]);
    const e = new DefaultGeneratorEngine(client as never);
    const out = await e.generateOneShot({ ...options, useAI: true });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("Commitments");
    expect(calls[1]).not.toContain("automatic check found");
    expect(out.oneShot?.title).toBe(draft.title);
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
