import { describe, expect, it, vi } from "vitest";
import { WorldGenerationService } from "./world-generation";

function createService() {
  const runModel =
    vi.fn<
      (systemInstruction: string, userMessage: string) => Promise<string>
    >();
  const runWithAIFallback = vi.fn(
    async (
      useAI: boolean | undefined,
      aiAttempt: () => Promise<any>,
      local: () => any,
    ) => (useAI === false ? local() : aiAttempt()),
  );
  const service = new WorldGenerationService({
    runWithAIFallback,
    runModel,
    getSessionContext: () => "",
    recentInputs: () => [],
    recordInputs: vi.fn(),
    summarizeResolvedInputs: () => "",
    formatRecentInputsNote: () => "",
  });

  return { service, runModel, runWithAIFallback };
}

describe("WorldGenerationService", () => {
  it("adds a world-appropriate variation cue to a public AI generation", async () => {
    const { service, runModel } = createService();
    runModel.mockResolvedValue(
      JSON.stringify({
        title: "Caldera Nine",
        lore: "A quiet volcanic world.",
      }),
    );
    const output = await service.generateWorld({
      genre: "Hard Sci-Fi",
      worldType: "Volcanic",
      useAI: true,
    });
    expect(output.title).toBe("Caldera Nine");
    const prompt = runModel.mock.calls[0][1];
    expect(prompt).toContain("Optional creative variation:");
    expect(prompt).toContain("Volcanic");
    expect(prompt).toContain("those always take precedence");
  });

  it.each([
    [
      "star system",
      (service: WorldGenerationService) =>
        service.generateStarSystem({ useAI: true }),
    ],
    [
      "constellation",
      (service: WorldGenerationService) =>
        service.generateConstellation({ useAI: true }),
    ],
    [
      "night sky",
      (service: WorldGenerationService) =>
        service.generateConstellation({ mode: "night-sky", useAI: true }),
    ],
    [
      "alien species",
      (service: WorldGenerationService) =>
        service.generateAlienRace({ useAI: true }),
    ],
  ])("adds a variation cue to %s generation", async (_name, generate) => {
    const { service, runModel } = createService();
    runModel.mockRejectedValue(new Error("offline"));
    await expect(generate(service)).rejects.toThrow("offline");
    expect(runModel.mock.calls[0][1]).toContain("Optional creative variation:");
  });

  it("does not call the model for local alien generation", async () => {
    const { service, runModel } = createService();
    await service.generateAlienRace({ useAI: false });
    expect(runModel).not.toHaveBeenCalled();
  });

  it("keeps local world generation offline-first", async () => {
    const { service, runModel, runWithAIFallback } = createService();

    const output = await service.generateWorld({
      worldType: "Ocean World",
      habitability: "Earthlike",
      civilisation: "Colony",
      genre: "Hard Sci-Fi",
      useAI: false,
    });

    expect(output.type).toBe("location");
    expect(output.content).toContain("## World Profile");
    expect(runWithAIFallback).toHaveBeenCalledOnce();
    expect(runModel).not.toHaveBeenCalled();
  });

  it("selects the night-sky workflow for constellation generation", async () => {
    const { service, runModel, runWithAIFallback } = createService();

    const output = await service.generateConstellation({
      mode: "night-sky",
      useAI: false,
    });

    expect(output.type).toBe("note");
    expect(output.content).toContain("## Core Concept");
    expect(runWithAIFallback).toHaveBeenCalledOnce();
    expect(runModel).not.toHaveBeenCalled();
  });
});
