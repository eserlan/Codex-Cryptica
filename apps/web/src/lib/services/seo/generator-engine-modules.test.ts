import { describe, expect, it, vi } from "vitest";
import { GeneratorEngineBase } from "./generator-engine-base";
import { GeneratorEngineCore } from "./generator-engine-core";
import { GeneratorEngineWorldbuilding } from "./generator-engine-worldbuilding";
import { GeneratorEngineSpecialized } from "./generator-engine-specialized";
import { buildDungeonPrompt } from "generator-engine";

type RunModel = {
  runModel: (instruction: string, message: string) => Promise<string>;
};

function spyOnRunModel(engine: GeneratorEngineSpecialized) {
  return vi.spyOn(engine as unknown as RunModel, "runModel");
}

function adventureResponse(title: string) {
  return JSON.stringify({
    title,
    summary: "A courier carries evidence that could change the city.",
    throughline: "Find the courier before the factions do.",
    initialSituation: "A courier has vanished near the old market.",
    primaryObjective: "Find the courier before sunset.",
    keyLocations: [
      "The crowded Copper Market, where the courier was last seen.",
      {
        name: "Copper Market",
        description: "A crowded bazaar.",
        role: "Search site",
        relation: "The courier was last seen here.",
        leverage: "A stallholder saw the courier leave.",
        dilemma: "Question the stallholder or search the locked stalls.",
      },
    ],
    npcs: [
      {
        name: "Mara Venn",
        role: "Courier",
        relation: "She carries the ledger.",
        goal: "Stay hidden",
        secret: "She has the ledger.",
        leverage: "She knows who hired the rival crew.",
        dilemma: "Trust the party or flee with the evidence.",
      },
    ],
    threats: ["A rival crew is searching the market."],
    discoveries: ["The courier left a coded note."],
    complications: ["The market closes at sunset."],
    rewards: ["The magistrate offers a favour."],
    outcomes: ["The ledger reaches the magistrate."],
    hooks: ["A stranger asks about the missing courier."],
  });
}

function dungeonResponse(title: string, omitHistory = false) {
  const { resolved } = buildDungeonPrompt({
    themeId: "fantasy",
    scale: "Small Lair (1-2 Sectors)",
  });
  const response = {
    title,
    summary: "A sealed complex hides a contested source of power.",
    throughline: "Two factions race to claim the complex.",
    history: resolved.history,
    currentState: resolved.currentStateDetail,
    signatureFeature: resolved.signatureFeature,
    factionSituation: resolved.factionSituation,
    secret: resolved.secret,
    hazards: resolved.hazards,
    treasures: resolved.treasures,
    hooks: resolved.hooks,
    sectors: resolved.sectors.map((sector, index) => ({
      name: `Test Sector ${index + 1}`,
      description: `A chamber containing ${sector.stockDetail}.`,
      stockType: sector.stockType,
      stockDetail: sector.stockDetail,
    })),
    factions: resolved.factions.map((faction) => ({
      ...faction,
      territorySectorIds: [],
    })),
  };
  if (omitHistory) delete (response as Partial<typeof response>).history;
  return JSON.stringify(response);
}

const clientManager = { getModel: vi.fn() };

describe("generator engine modules", () => {
  it("keeps shared preview transport available from the base module", async () => {
    const engine = new GeneratorEngineBase(clientManager as never);
    const preview = vi.fn();
    await expect(
      engine.generateWithPreview(async () => "ready", preview),
    ).resolves.toBe("ready");
    expect(preview).not.toHaveBeenCalled();
  });

  it("provides core generators through its focused module", async () => {
    const engine = new GeneratorEngineCore(clientManager as never);
    expect(engine.generateName()).toEqual(expect.any(String));
    await expect(engine.generateNPC({ useAI: false })).resolves.toHaveProperty(
      "title",
    );
  });

  it("provides worldbuilding generators through its focused module", async () => {
    const engine = new GeneratorEngineWorldbuilding(clientManager as never);
    await expect(
      engine.generateNames({ useAI: false }),
    ).resolves.toHaveProperty("title");
  });

  it("provides specialized generators through its focused module", async () => {
    const engine = new GeneratorEngineSpecialized(clientManager as never);
    await expect(
      engine.generatePlotTwist({ useAI: false }),
    ).resolves.toHaveProperty("title");
  });

  describe.each([
    {
      name: "dungeon",
      generate: (engine: GeneratorEngineSpecialized) =>
        engine.generateDungeon({
          themeId: "fantasy",
          scale: "Small Lair (1-2 Sectors)",
          useAI: true,
          // These cases cover the one-pass baseline route.
          staged: false,
        }),
      clean: dungeonResponse("The Quiet Archive"),
      incomplete: dungeonResponse("The First Archive", true),
      cleanTitle: "The Quiet Archive",
      firstTitle: "The First Archive",
    },
    {
      name: "adventure",
      generate: (engine: GeneratorEngineSpecialized) =>
        engine.generateAdventure({ useAI: true }),
      clean: adventureResponse("The Missing Courier"),
      incomplete: adventureResponse("The First Courier").replace(
        '"throughline":"Find the courier before the factions do.",',
        "",
      ),
      cleanTitle: "The Missing Courier",
      firstTitle: "The First Courier",
    },
  ])(
    "$name repair behavior",
    ({ generate, clean, incomplete, cleanTitle, firstTitle }) => {
      it("does not retry a clean first response", async () => {
        const engine = new GeneratorEngineSpecialized(clientManager as never);
        const runModel = spyOnRunModel(engine).mockResolvedValue(clean);

        const output = await generate(engine);

        expect(runModel).toHaveBeenCalledTimes(1);
        expect(output.title).toBe(cleanTitle);
      });

      it("uses a repair that resolves the first response's problems", async () => {
        const engine = new GeneratorEngineSpecialized(clientManager as never);
        const runModel = spyOnRunModel(engine)
          .mockResolvedValueOnce(incomplete)
          .mockResolvedValueOnce(clean);

        const output = await generate(engine);

        expect(runModel).toHaveBeenCalledTimes(2);
        expect(output.title).toBe(cleanTitle);
      });

      it("preserves the usable first output when the repair is rejected", async () => {
        const engine = new GeneratorEngineSpecialized(clientManager as never);
        const runModel = spyOnRunModel(engine)
          .mockResolvedValueOnce(incomplete)
          .mockResolvedValueOnce("not valid JSON");

        const output = await generate(engine);

        expect(runModel).toHaveBeenCalledTimes(2);
        expect(output.title).toBe(firstTitle);
      });
    },
  );
  describe("staged dungeon generation", () => {
    function stageReply(message: string) {
      const plan = [
        ...new Set([...message.matchAll(/sector-\d+/g)].map((m) => m[0])),
      ];
      if (message.includes("Coherence review")) return { issues: [] };
      if (message.includes("Stage 1 of 3")) {
        return {
          title: "The Bellfound Depths",
          summary: "s",
          throughline: "t",
          history: "h",
          currentState: "c",
          signatureFeature: "sf",
          secret: "x",
          sectorBriefs: plan.map((id) => ({ id, brief: "b" })),
        };
      }
      if (message.includes("Stage 2 of 3")) {
        return {
          sectors: plan.map((id, i) => ({
            id,
            name: `Hollow ${i + 1}`,
            description: "d",
            stockDetail: `idol ${i + 1}`,
          })),
          hazards: ["steam", "a tilted floor"],
          treasures: ["signet", "a maker's mark"],
          hooks: ["bounty", "a missing salvage crew"],
        };
      }
      const faction = (name: string, id: string, goal: string) => ({
        name,
        identity: "i",
        virtue: "Patient",
        vice: "Greedy",
        goal,
        drive: "x",
        obstacle: "steam blocks the way",
        origin: "o",
        belief: "b",
        territorySectorIds: [id],
        presence: [{ sectorId: id, detail: `${name} camp here` }],
        strength: "gear",
        leader: { name: `${name} Lead`, description: "d" },
        notable: { name: `${name} Second`, description: "d" },
        relationship: "stalls",
      });
      return {
        factionSituation: "Both want it.",
        factions: [
          faction("Lantern Wrights", plan[0], "Cap the steam"),
          faction("Weir Wardens", plan[1], "Seal the signet away"),
        ],
      };
    }

    const options = {
      themeId: "fantasy",
      scale: "Small Lair (1-2 Sectors)",
      useAI: true,
    };

    it("builds the delve in stages by default and reports each step", async () => {
      const engine = new GeneratorEngineSpecialized(clientManager as never);
      const runModel = spyOnRunModel(engine).mockImplementation(
        async (_instruction, message) => JSON.stringify(stageReply(message)),
      );
      const onProgress = vi.fn();

      const output = await engine.generateDungeon({ ...options, onProgress });

      // Three stages plus the coherence review.
      expect(runModel).toHaveBeenCalledTimes(4);
      expect(output.title).toBe("The Bellfound Depths");
      expect(
        onProgress.mock.calls
          .at(-1)?.[0]
          .map((s: { status: string }) => s.status),
      ).toEqual(["done", "done", "done", "done"]);
    });

    it("logs staged dungeon counts without generated review text", async () => {
      const engine = new GeneratorEngineSpecialized(clientManager as never);
      const contentSentinel = "PRIVATE_REVIEW_ISSUE_SENTINEL";
      const runModel = spyOnRunModel(engine).mockImplementation(
        async (_instruction, message) => {
          if (message.includes("Coherence review")) {
            return JSON.stringify({ issues: [contentSentinel] });
          }
          if (message.includes("Review these coherence issues")) {
            return "{}";
          }
          return JSON.stringify(stageReply(message));
        },
      );
      const logger = vi.spyOn(console, "debug").mockImplementation(() => {});

      await engine.generateDungeon(options);

      expect(runModel).toHaveBeenCalled();
      expect(logger).toHaveBeenCalledWith(
        "[Generator] staged dungeon run",
        expect.objectContaining({
          outcome: "staged",
          reviewIssueCount: 1,
          remainingIssueCount: 1,
        }),
      );
      expect(JSON.stringify(logger.mock.calls)).not.toContain(contentSentinel);
      logger.mockRestore();
    });

    it("falls back to the one-pass route when a stage cannot be used", async () => {
      const engine = new GeneratorEngineSpecialized(clientManager as never);
      const runModel = spyOnRunModel(engine).mockResolvedValue(
        dungeonResponse("The Quiet Archive"),
      );

      const output = await engine.generateDungeon(options);

      // Two failed foundation attempts, then the clean one-pass response.
      expect(runModel).toHaveBeenCalledTimes(3);
      expect(output.title).toBe("The Quiet Archive");
    });

    it("stops without output when aborted", async () => {
      const engine = new GeneratorEngineSpecialized(clientManager as never);
      const controller = new AbortController();
      const runModel = spyOnRunModel(engine).mockImplementation(async () => {
        controller.abort();
        return "{}";
      });

      await expect(
        engine.generateDungeon({ ...options, signal: controller.signal }),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(runModel).toHaveBeenCalledTimes(1);
    });
  });
});
