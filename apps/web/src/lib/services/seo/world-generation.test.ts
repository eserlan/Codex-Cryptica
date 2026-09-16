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
