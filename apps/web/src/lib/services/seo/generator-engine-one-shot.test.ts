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
