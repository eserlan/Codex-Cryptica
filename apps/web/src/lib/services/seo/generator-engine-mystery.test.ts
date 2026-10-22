import { describe, expect, it, vi } from "vitest";
import { GeneratorEngineMystery } from "./generator-engine-mystery";
import { LANGUAGE_GENERATION_CONFIG } from "./generator-ai-transport";

type RunModel = {
  runModel: (
    instruction: string,
    message: string,
    config?: unknown,
    emitPreview?: boolean,
    signal?: AbortSignal,
  ) => Promise<string>;
};

describe("staged mystery generation transport", () => {
  it("requests JSON mode for each staged model response", async () => {
    const engine = new GeneratorEngineMystery({ getModel: vi.fn() } as never);
    const runModel = vi
      .spyOn(engine as unknown as RunModel, "runModel")
      .mockImplementation(async (_instruction, message) => {
        if (message.includes("STAGE 1 OF 7")) return "{}";
        return JSON.stringify({
          title: "A Bell Out of Time",
          summary: "A keeper vanished before the winter bell.",
          content: "The players compare the bell records.",
          lore: "Mara changed the bell record.",
        });
      });

    await engine.generateMysteryInvestigation({ useAI: true });

    const stagedCalls = runModel.mock.calls.filter(([, message]) =>
      message.includes("STAGE 1 OF 7"),
    );
    expect(stagedCalls).toHaveLength(2);
    for (const call of stagedCalls) {
      expect(call[2]).toBe(LANGUAGE_GENERATION_CONFIG);
      expect(call[3]).toBe(false);
    }
  });
});
