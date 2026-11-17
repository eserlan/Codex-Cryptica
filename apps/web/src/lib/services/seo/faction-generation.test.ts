import { describe, expect, it, vi } from "vitest";
import { FactionGenerationService } from "./faction-generation";
import type { GeneratorOutput } from "./generator-helpers";

describe("FactionGenerationService", () => {
  it("builds faction prompts with session and recent-input context", async () => {
    const runModel = vi.fn().mockResolvedValue(
      JSON.stringify({
        title: "The Ashen Circle",
        summary: "A secret order",
      }),
    );
    const recordInputs = vi.fn();
    const service = new FactionGenerationService({
      runWithAIFallback: async (_useAI, aiAttempt) =>
        (await aiAttempt()) as unknown as GeneratorOutput,
      runModel,
      getSessionContext: () => "Campaign context",
      recentInputs: () => ["genre: gothic"],
      recordInputs,
      summarizeResolvedInputs: () => "genre: gothic",
      formatRecentInputsNote: (inputs) => ` Recent: ${inputs.join(", ")}`,
      isAIAllowed: () => true,
    });

    await service.generateFaction({ theme: "fantasy", useAI: true });

    expect(runModel).toHaveBeenCalledOnce();
    expect(runModel.mock.calls[0][0]).toContain("Campaign context");
    expect(runModel.mock.calls[0][0]).toContain("Recent: genre: gothic");
    expect(recordInputs).toHaveBeenCalledWith("faction", "genre: gothic");
  });

  it("uses the local faction generator when AI is disabled", async () => {
    const service = new FactionGenerationService({
      runWithAIFallback: async (useAI, aiAttempt, local) =>
        (useAI ? await aiAttempt() : local()) as unknown as GeneratorOutput,
      runModel: vi.fn(),
      getSessionContext: () => "",
      recentInputs: () => [],
      recordInputs: vi.fn(),
      summarizeResolvedInputs: () => "",
      formatRecentInputsNote: () => "",
      isAIAllowed: () => true,
    });

    const output = await service.generateFaction({ useAI: false });

    expect(output).toHaveProperty("title");
    expect(output).toHaveProperty("content");
  });

  it("uses local urban fantasy generation without calling AI when disabled", async () => {
    const runModel = vi.fn();
    const service = new FactionGenerationService({
      runWithAIFallback: async (useAI, aiAttempt, local) =>
        (useAI ? await aiAttempt() : local()) as unknown as GeneratorOutput,
      runModel,
      getSessionContext: () => "",
      recentInputs: () => [],
      recordInputs: vi.fn(),
      summarizeResolvedInputs: () => "",
      formatRecentInputsNote: () => "",
      isAIAllowed: () => true,
    });

    const output = await service.generateUrbanFantasyFaction({
      mode: "Street-level magic",
      factionType: "Occult Gang",
      scope: "Neighbourhood",
      moralPosture: "Street-level survivors",
      useAI: false,
    });

    expect(runModel).not.toHaveBeenCalled();
    expect(output.type).toBe("faction");
    expect(output.summary).toContain("occult gang");
    expect(output.content).toContain("### How to use them at the table");
    expect(output.lore).toContain("**Immediate Hook**:");
  });

  it("uses local urban fantasy generation when the global AI policy disallows AI", async () => {
    const runModel = vi.fn();
    const getSessionContext = vi.fn(() => "Private campaign context");
    let requestedAI: boolean | undefined;
    const service = new FactionGenerationService({
      runWithAIFallback: async (useAI, aiAttempt, local) => {
        requestedAI = useAI;
        return (useAI === false
          ? local()
          : await aiAttempt()) as unknown as GeneratorOutput;
      },
      runModel,
      getSessionContext,
      recentInputs: () => [],
      recordInputs: vi.fn(),
      summarizeResolvedInputs: () => "",
      formatRecentInputsNote: () => "",
      isAIAllowed: () => false,
    });

    const output = await service.generateUrbanFantasyFaction({
      campaignContext: "Private campaign input",
      useAI: true,
    });

    expect(requestedAI).toBe(false);
    expect(runModel).not.toHaveBeenCalled();
    expect(getSessionContext).not.toHaveBeenCalled();
    expect(output.type).toBe("faction");
  });
});
