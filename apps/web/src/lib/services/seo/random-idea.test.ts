import { describe, it, expect, vi } from "vitest";
import {
  randomIdeaCategories,
  pickNextCategory,
  type RandomIdeaCategory,
} from "./random-idea";
import type { DefaultGeneratorEngine } from "./generator-engine";

describe("randomIdeaCategories", () => {
  it("contains exactly the standalone generator pool", () => {
    expect(randomIdeaCategories.map((c) => c.key).sort()).toEqual([
      "faction",
      "nation",
      "npc",
      "quest",
      "social-hub",
    ]);
  });

  it("never includes name generators or context-dependent generators", () => {
    const keys = randomIdeaCategories.map((c) => c.key as string);
    expect(keys).not.toContain("names");
    expect(keys).not.toContain("fantasy-names");
    expect(keys).not.toContain("session-context");
  });

  it("dispatches each category to the matching engine method with randomised inputs", async () => {
    const engine = {
      generateFaction: vi.fn().mockResolvedValue("faction-result"),
      generateNation: vi.fn().mockResolvedValue("nation-result"),
      generateNPC: vi.fn().mockResolvedValue("npc-result"),
      generateQuestHook: vi.fn().mockResolvedValue("quest-result"),
      generateSocialHub: vi.fn().mockResolvedValue("social-hub-result"),
    } as unknown as DefaultGeneratorEngine;

    for (const category of randomIdeaCategories) {
      await category.generate(engine, true);
    }

    expect(engine.generateFaction).toHaveBeenCalledWith(
      expect.objectContaining({ useAI: true, theme: expect.any(String) }),
    );
    expect(engine.generateNation).toHaveBeenCalledWith({ useAI: true });
    expect(engine.generateNPC).toHaveBeenCalledWith(
      expect.objectContaining({
        useAI: true,
        theme: expect.any(String),
        ancestry: expect.any(String),
        role: expect.any(String),
        alignment: expect.any(String),
      }),
    );
    expect(engine.generateQuestHook).toHaveBeenCalledWith({ useAI: true });
    expect(engine.generateSocialHub).toHaveBeenCalledWith({ useAI: true });
  });

  it("forwards useAI false to the engine", async () => {
    const engine = {
      generateQuestHook: vi.fn().mockResolvedValue("quest-result"),
    } as unknown as DefaultGeneratorEngine;
    const quest = randomIdeaCategories.find((c) => c.key === "quest")!;

    await quest.generate(engine, false);

    expect(engine.generateQuestHook).toHaveBeenCalledWith({ useAI: false });
  });
});

describe("pickNextCategory", () => {
  const byKey = (key: RandomIdeaCategory["key"]) =>
    randomIdeaCategories.find((c) => c.key === key)!;

  it("picks from the full pool on the first roll", () => {
    expect(pickNextCategory(null, false, () => 0)).toBe(
      randomIdeaCategories[0],
    );
    expect(pickNextCategory(null, false, () => 0.999)).toBe(
      randomIdeaCategories[randomIdeaCategories.length - 1],
    );
  });

  it("keeps the current category for the regenerate-category flow", () => {
    const current = byKey("quest");
    expect(pickNextCategory(current, true)).toBe(current);
  });

  it("falls back to a random pick when keep is requested without a current category", () => {
    expect(pickNextCategory(null, true, () => 0)).toBe(randomIdeaCategories[0]);
  });

  it("never repeats the current category on reroll everything", () => {
    const current = byKey("faction");
    for (let i = 0; i < 50; i++) {
      expect(pickNextCategory(current, false).key).not.toBe("faction");
    }
  });
});
