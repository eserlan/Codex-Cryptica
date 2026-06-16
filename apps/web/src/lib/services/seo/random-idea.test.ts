import { describe, it, expect, vi } from "vitest";
import {
  randomIdeaCategories,
  pickNextCategory,
  pickRandomIdeaTheme,
  themeToHubGenre,
  type RandomIdeaCategory,
} from "./random-idea";
import type { DefaultGeneratorEngine } from "./generator-engine";
import { factionConfig } from "generator-engine";
import { npcThemeConfig } from "generator-engine";
import { socialHubConfig } from "./generators/social-hub";
import { nationConfig } from "./generators/kingdom-nation";

describe("randomIdeaCategories", () => {
  it("contains exactly the standalone generator pool", () => {
    expect(randomIdeaCategories.map((c) => c.key).sort()).toEqual([
      "deity",
      "faction",
      "nation",
      "npc",
      "pantheon",
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

  it("dispatches each category to the matching engine method with the given theme", async () => {
    const engine = {
      generateFaction: vi.fn().mockResolvedValue("faction-result"),
      generateNation: vi.fn().mockResolvedValue("nation-result"),
      generateNPC: vi.fn().mockResolvedValue("npc-result"),
      generateQuestHook: vi.fn().mockResolvedValue("quest-result"),
      generateSocialHub: vi.fn().mockResolvedValue("social-hub-result"),
      generatePantheon: vi.fn().mockResolvedValue("pantheon-result"),
    } as unknown as DefaultGeneratorEngine;
    const theme = "Cyberpunk / Corporate";

    for (const category of randomIdeaCategories) {
      await category.generate(engine, true, theme);
    }

    expect(engine.generateFaction).toHaveBeenCalledWith({
      useAI: true,
      theme,
    });
    expect(engine.generateNation).toHaveBeenCalledWith({
      useAI: true,
      genre: "Cyberpunk",
    });
    expect(engine.generateNPC).toHaveBeenCalledWith(
      expect.objectContaining({
        useAI: true,
        theme,
        ancestry: expect.any(String),
        role: expect.any(String),
        alignment: expect.any(String),
      }),
    );
    expect(engine.generateQuestHook).toHaveBeenCalledWith({
      useAI: true,
      genre: "Cyberpunk",
    });
    expect(engine.generateSocialHub).toHaveBeenCalledWith({
      useAI: true,
      genre: "Cyberpunk",
    });
    expect(engine.generatePantheon).toHaveBeenCalledWith({
      useAI: true,
      genre: theme,
      mode: "pantheon",
    });
    expect(engine.generatePantheon).toHaveBeenCalledWith({
      useAI: true,
      genre: theme,
      mode: "single",
    });
  });

  it("rolls NPC inputs from the given theme's tables", async () => {
    const engine = {
      generateNPC: vi.fn().mockResolvedValue("npc-result"),
    } as unknown as DefaultGeneratorEngine;
    const theme = "Post-Apocalyptic";
    const npc = randomIdeaCategories.find((c) => c.key === "npc")!;

    await npc.generate(engine, true, theme);

    const options = (engine.generateNPC as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(npcThemeConfig.ancestries[theme]).toContain(options.ancestry);
    expect(npcThemeConfig.roles[theme]).toContain(options.role);
    expect(npcThemeConfig.moralities[theme].map((m) => m.id)).toContain(
      options.alignment,
    );
  });

  it("forwards useAI false to the engine", async () => {
    const engine = {
      generateQuestHook: vi.fn().mockResolvedValue("quest-result"),
    } as unknown as DefaultGeneratorEngine;
    const quest = randomIdeaCategories.find((c) => c.key === "quest")!;

    await quest.generate(engine, false, "Classic Fantasy");

    expect(engine.generateQuestHook).toHaveBeenCalledWith(
      expect.objectContaining({ useAI: false }),
    );
  });
});

describe("themeToHubGenre", () => {
  it("maps every canonical theme to a valid social hub and nation genre", () => {
    for (const theme of factionConfig.themes) {
      const genre = themeToHubGenre[theme];
      expect(genre, `missing genre mapping for theme: ${theme}`).toBeDefined();
      expect(socialHubConfig.genres).toContain(genre);
      expect(nationConfig.genres).toContain(genre);
    }
  });
});

describe("pickRandomIdeaTheme", () => {
  it("picks from the canonical theme list", () => {
    expect(pickRandomIdeaTheme(() => 0)).toBe(factionConfig.themes[0]);
    expect(pickRandomIdeaTheme(() => 0.999)).toBe(
      factionConfig.themes[factionConfig.themes.length - 1],
    );
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
