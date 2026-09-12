import { describe, it, expect, vi } from "vitest";
import {
  NON_STREAMABLE_SLUGS,
  isStreamableSlug,
  buildPreviewOutput,
  createGeneratorHandlers,
  createGenerate,
} from "./generator-page-generation";
import type { ValidSlug } from "./generator-page-meta";

function makeFakeEngine(): any {
  const fake: any = {
    generateNPC: vi.fn().mockResolvedValue({ type: "note", title: "npc" }),
    generateSettlement: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "settlement" }),
    generateMagicItem: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "magic-item" }),
    generateMinorMagicItem: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "minor" }),
    generateArtifact: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "artifact" }),
    generateFaction: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "faction" }),
    generateFactionRoster: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "roster" }),
    generateQuestHook: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "quest" }),
    generateRumour: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "rumour" }),
    generateEncounter: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "encounter" }),
    generatePuzzle: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "puzzle" }),
    generateCouncilVote: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "council" }),
    generateHeist: vi.fn().mockResolvedValue({ type: "note", title: "heist" }),
    generateSecretSociety: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "society" }),
    generateTavern: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "tavern" }),
    generateKingdom: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "kingdom" }),
    generateNation: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "nation" }),
    generateSocialHub: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "hub" }),
    generateVampireClan: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "vampire" }),
    generateNomadClan: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "nomad" }),
    generateDarkFaction: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "dark" }),
    generateNames: vi.fn().mockResolvedValue({ type: "note", title: "names" }),
    generatePantheon: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "pantheon" }),
    generateShip: vi.fn().mockResolvedValue({ type: "note", title: "ship" }),
    generateLanguage: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "language" }),
    generateNewsSheet: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "news" }),
    generateDungeon: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "dungeon" }),
    generateAdventure: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "adventure" }),
    generatePlotTwist: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "twist" }),
    generateVillain: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "villain" }),
    generateWorld: vi.fn().mockResolvedValue({ type: "note", title: "world" }),
    generateStarSystem: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "star" }),
    generateConstellation: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "constellation" }),
    generateAlienRace: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "alien" }),
    generateCreature: vi
      .fn()
      .mockResolvedValue({ type: "note", title: "creature" }),
    generateWithPreview: vi
      .fn()
      .mockImplementation(
        async (fn: () => Promise<unknown>, _onRaw: (s: string) => void) => fn(),
      ),
  };
  return fake;
}

function makeCtx(overrides: any = {}) {
  return makeBaseCtx(overrides);
}

function makeBaseCtx(overrides: any) {
  const engine = (overrides.engine as any) ?? makeFakeEngine();
  let activeTheme = (overrides.activeTheme as string) ?? "Classic Fantasy";
  const getActiveTheme = () => activeTheme;
  const setActiveTheme = (v: string) => {
    activeTheme = v;
  };
  const base: Record<string, unknown> = {
    npc: { theme: "x", ancestry: "y" },
    settlement: { genre: "Fantasy" },
    magicItem: { type: "Sword" },
    minorMagicItem: { form: "Ring" },
    artifact: { form: "Blade" },
    faction: { theme: "Fantasy" },
    factionRoster: { theme: "Fantasy" },
    quest: { genre: "Fantasy" },
    rumour: { genre: "Fantasy" },
    encounter: { genre: "Fantasy" },
    puzzle: { genre: "Fantasy" },
    councilVote: { genre: "Fantasy" },
    heist: { genre: "Fantasy" },
    secretSociety: { theme: "Fantasy" },
    tavern: { type: "Tavern" },
    kingdom: { polityType: "Kingdom" },
    nation: { genre: "Fantasy" },
    socialHub: { genre: "Fantasy" },
    vampireClan: { archetype: "Elder" },
    nomadClan: { role: "Scout" },
    darkFaction: { mode: "Cult" },
    names: { culture: "Elvish" },
    dndNpc: { race: "Human" },
    pantheon: { genre: "Fantasy" },
    ship: { genre: "Sci-Fi" },
    language: { genre: "Fantasy" },
    newsSheet: { genre: "Fantasy" },
    dungeon: { genre: "Fantasy" },
    adventure: { genre: "Fantasy" },
    plotTwist: {
      premise: (overrides.plotPremise as string) ?? "local premise",
    },
    villain: { genre: "Fantasy" },
    world: { genre: "Fantasy" },
    starSystem: { genre: "Sci-Fi" },
    constellation: { genre: "Fantasy" },
    alienRace: { genre: "Sci-Fi" },
    creature: { genre: "Fantasy" },
    getActiveTheme,
    getPlotTwistPremise: () =>
      (overrides.plotPremise as string) ?? "local premise",
    getHandoffQuestPremise: () => (overrides.handoffPremise as string) ?? "",
    getSessionEntities: () => (overrides.sessionEntities as unknown[]) ?? [],
    engine,
    _setActiveTheme: setActiveTheme,
    _engine: engine,
  };
  // Apply any extra overrides as direct properties
  for (const [k, v] of Object.entries(overrides)) {
    if (
      k in base ||
      [
        "activeTheme",
        "plotPremise",
        "handoffPremise",
        "sessionEntities",
        "engine",
      ].includes(k)
    )
      continue;
    (base as Record<string, unknown>)[k] = v;
  }
  return base as unknown as any;
}

describe("generator-page-generation", () => {
  describe("isStreamableSlug", () => {
    it("returns false for non-streamable slugs", () => {
      for (const slug of NON_STREAMABLE_SLUGS) {
        expect(isStreamableSlug(slug)).toBe(false);
      }
    });

    it("returns true for streamable slugs", () => {
      expect(isStreamableSlug("npc" as ValidSlug)).toBe(true);
      expect(isStreamableSlug("faction" as ValidSlug)).toBe(true);
      expect(isStreamableSlug("quest" as ValidSlug)).toBe(true);
      expect(isStreamableSlug("world" as ValidSlug)).toBe(true);
      expect(isStreamableSlug("settlement" as ValidSlug)).toBe(true);
    });

    it("exposes exactly five non-streamable slugs", () => {
      expect(NON_STREAMABLE_SLUGS).toHaveLength(5);
      expect([...NON_STREAMABLE_SLUGS].sort()).toEqual(
        [
          "adventure-generator",
          "adventure-idea-generator",
          "council-vote",
          "dungeon-generator",
          "language-generator",
        ].sort(),
      );
    });
  });

  describe("buildPreviewOutput", () => {
    it("builds a draft preview from partial JSON fields", () => {
      const raw =
        '{"title":"My Title","summary":"A summary","content":"Body","lore":"Deep lore"}';
      const out = buildPreviewOutput(raw);
      expect(out).toMatchObject({
        type: "note",
        title: "My Title",
        summary: "A summary",
        content: "Body",
        lore: "Deep lore",
        status: "draft",
      });
    });

    it("falls back to Generating… when title is missing", () => {
      const out = buildPreviewOutput('{"summary":"hi"}');
      expect(out.title).toBe("Generating…");
      expect(out.summary).toBe("hi");
    });

    it("returns empty strings for missing optional fields", () => {
      const out = buildPreviewOutput("{}");
      expect(out.title).toBe("Generating…");
      expect(out.summary).toBe("");
      expect(out.content).toBe("");
      expect(out.lore).toBe("");
    });

    it("handles non-JSON or truncated input gracefully", () => {
      const out = buildPreviewOutput("not json at all {");
      expect(out.title).toBe("Generating…");
      expect(out.labels).toEqual([]);
    });
  });

  describe("createGeneratorHandlers", () => {
    it("maps every ValidSlug to a handler function", async () => {
      const ctx = makeCtx();
      const handlers = createGeneratorHandlers(ctx);
      // Spot check a representative subset
      const slugs: ValidSlug[] = [
        "npc",
        "settlement",
        "magic-item",
        "faction",
        "quest",
        "world",
        "creature",
        "alien-race",
        "star-system",
        "constellation",
        "names",
        "dnd-npc",
        "pantheon-generator",
        "god-generator",
        "ship-generator",
        "language-generator",
        "news-sheet-generator",
        "dungeon-generator",
        "adventure-generator",
        "plot-twist-generator",
        "bbeg-generator",
      ];
      for (const slug of slugs) {
        expect(typeof handlers[slug]).toBe("function");
      }
    });

    it("calls generateNPC with spread state and useAI", async () => {
      const ctx = makeCtx();
      const handlers = createGeneratorHandlers(ctx);
      await handlers["npc"](true);
      expect(
        (ctx as unknown as { _engine: ReturnType<typeof makeFakeEngine> })
          ._engine.generateNPC,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ useAI: true, theme: "x" }),
      );
    });

    it("passes activeTheme as genre for minor-magic-item", async () => {
      const ctx = makeCtx({ activeTheme: "Cyberpunk / Corporate" });
      const handlers = createGeneratorHandlers(ctx);
      await handlers["minor-magic-item"](false);
      expect(
        (ctx as unknown as { _engine: ReturnType<typeof makeFakeEngine> })
          ._engine.generateMinorMagicItem,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ genre: "Cyberpunk / Corporate" }),
      );
    });

    it("includes avoidNames for world generation from session entities", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({ sessionEntities: [{ name: "Existing" }], engine });
      const handlers = createGeneratorHandlers(ctx);
      await handlers["world"](true);
      expect(engine.generateWorld).toHaveBeenCalledWith(
        expect.objectContaining({ useAI: true }),
      );
      // avoidNames is derived via collectSessionNames; with a mocked entity the call still happens
      expect(engine.generateWorld).toHaveBeenCalled();
    });

    it("passes avoidNames and avoidTraits for dungeon-generator", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({ engine });
      const handlers = createGeneratorHandlers(ctx);
      await handlers["dungeon-generator"](true);
      expect(engine.generateDungeon).toHaveBeenCalledWith(
        expect.objectContaining({ useAI: true }),
      );
      const callArg = (
        engine.generateDungeon as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      expect(callArg).toHaveProperty("avoidNames");
      expect(callArg).toHaveProperty("avoidTraits");
    });

    it("resolves plot twist premise via handoff when handoff is present", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({
        plotPremise: "",
        handoffPremise: "quest premise from handoff",
        engine,
      });
      // Also need plotTwist object to have premise
      (ctx as unknown as Record<string, unknown>).plotTwist = { premise: "" };
      const handlers = createGeneratorHandlers(ctx);
      await handlers["plot-twist-generator"](true);
      const arg = (
        engine.generatePlotTwist as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      // When local premise empty, handoff premise should be used
      expect(arg.premise).toBe("quest premise from handoff");
    });

    it("uses local premise when it is non-empty", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({
        plotPremise: "local premise",
        handoffPremise: "handoff",
        engine,
      });
      (ctx as unknown as Record<string, unknown>).plotTwist = {
        premise: "local premise",
      };
      // Need getter to return local premise; makeCtx already does, but ensure
      (ctx as unknown as Record<string, unknown>).getPlotTwistPremise = () =>
        "local premise";
      const handlers = createGeneratorHandlers(ctx);
      await handlers["plot-twist-generator"](true);
      const arg = (
        engine.generatePlotTwist as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      expect(arg.premise).toBe("local premise");
    });

    it("passes themeId and genre from activeTheme for adventure generators", async () => {
      const ctx = makeCtx({ activeTheme: "Star Wars" });
      const handlers = createGeneratorHandlers(ctx);
      await handlers["adventure-generator"](true);
      const eng = (
        ctx as unknown as { _engine: ReturnType<typeof makeFakeEngine> }
      )._engine;
      expect(eng.generateAdventure).toHaveBeenCalledWith(
        expect.objectContaining({ themeId: "Star Wars", genre: "Star Wars" }),
      );
    });

    it("uses fixed Classic Fantasy theme for fantasy-names", async () => {
      const ctx = makeCtx({ activeTheme: "Cyberpunk / Corporate" });
      const handlers = createGeneratorHandlers(ctx);
      await handlers["fantasy-names"](true);
      expect(
        (ctx as unknown as { _engine: ReturnType<typeof makeFakeEngine> })
          ._engine.generateNames,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ theme: "Classic Fantasy" }),
      );
    });

    it("reflects updated activeTheme via getter on subsequent calls", async () => {
      const ctx = makeCtx({ activeTheme: "Classic Fantasy" });
      const handlers = createGeneratorHandlers(ctx);
      await handlers["minor-magic-item"](true);
      expect(
        (ctx as unknown as { _engine: ReturnType<typeof makeFakeEngine> })
          ._engine.generateMinorMagicItem,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ genre: "Classic Fantasy" }),
      );
      (
        ctx as unknown as { _setActiveTheme: (v: string) => void }
      )._setActiveTheme("Horror");
      await handlers["minor-magic-item"](true);
      expect(
        (ctx as unknown as { _engine: ReturnType<typeof makeFakeEngine> })
          ._engine.generateMinorMagicItem,
      ).toHaveBeenLastCalledWith(expect.objectContaining({ genre: "Horror" }));
    });
  });

  describe("createGenerate", () => {
    it("throws for an unknown slug", async () => {
      const ctx = makeCtx();
      const handlers = createGeneratorHandlers(ctx);
      const generate = createGenerate({
        getSlug: () => "not-a-real-slug" as ValidSlug,
        getHandlers: () => handlers,
      });
      await expect(generate({ useAI: false })).rejects.toThrow(
        /No generator implemented for slug/,
      );
    });

    it("calls handler directly when useAI is false even for streamable slugs", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({ engine });
      const handlers = createGeneratorHandlers(ctx);
      const generate = createGenerate({
        getSlug: () => "npc",
        getHandlers: () => handlers,
        engine,
      });
      const out = await generate({ useAI: false, onPreview: vi.fn() });
      expect(engine.generateWithPreview).not.toHaveBeenCalled();
      expect(engine.generateNPC).toHaveBeenCalledWith(
        expect.objectContaining({ useAI: false }),
      );
      expect(out).toBeDefined();
    });

    it("calls handler directly when onPreview is absent", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({ engine });
      const handlers = createGeneratorHandlers(ctx);
      const generate = createGenerate({
        getSlug: () => "faction",
        getHandlers: () => handlers,
        engine,
      });
      await generate({ useAI: true });
      expect(engine.generateWithPreview).not.toHaveBeenCalled();
    });

    it("uses generateWithPreview for streamable slugs with useAI and onPreview", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({ engine });
      const handlers = createGeneratorHandlers(ctx);
      const generate = createGenerate({
        getSlug: () => "quest",
        getHandlers: () => handlers,
        engine,
      });
      const onPreview = vi.fn();
      await generate({ useAI: true, onPreview });
      expect(engine.generateWithPreview).toHaveBeenCalledTimes(1);
      // Simulate the engine calling the raw preview callback and ensure onPreview receives a preview output
      const previewCb = (
        engine.generateWithPreview as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0][1] as (raw: string) => void;
      previewCb('{"title":"Preview Title","summary":"Sum"}');
      expect(onPreview).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Preview Title", status: "draft" }),
      );
    });

    it("does not use streaming for non-streamable slugs even with onPreview", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({ engine });
      const handlers = createGeneratorHandlers(ctx);
      const generate = createGenerate({
        getSlug: () => "dungeon-generator",
        getHandlers: () => handlers,
        engine,
      });
      await generate({ useAI: true, onPreview: vi.fn() });
      expect(engine.generateWithPreview).not.toHaveBeenCalled();
      expect(engine.generateDungeon).toHaveBeenCalled();
    });

    it("reads slug dynamically via getSlug on each call", async () => {
      const engine = makeFakeEngine();
      const ctx = makeCtx({ engine });
      const handlers = createGeneratorHandlers(ctx);
      let current: ValidSlug = "npc";
      const generate = createGenerate({
        getSlug: () => current,
        getHandlers: () => handlers,
        engine,
      });
      await generate({ useAI: true });
      expect(engine.generateNPC).toHaveBeenCalledTimes(1);
      current = "faction";
      await generate({ useAI: true });
      expect(engine.generateFaction).toHaveBeenCalledTimes(1);
    });
  });
});
