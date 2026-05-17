import { describe, it, expect, vi } from "vitest";
import { PlotExecutor } from "./plot-executor";

describe("PlotExecutor", () => {
  it("should generate plot analysis for an entity", async () => {
    const executor = new PlotExecutor();
    const search = vi.fn().mockResolvedValue([{ id: "e1" }]);
    const generatePlotAnalysis = vi
      .fn()
      .mockResolvedValue("Plot Analysis Result");
    const addMessage = vi.fn();
    const emit = vi.fn();

    const context = {
      searchService: { search },
      vault: {
        entities: {
          e1: {
            id: "e1",
            title: "Target",
            connections: [{ target: "e2", label: "rival" }],
          },
          e2: { id: "e2", title: "Rival" },
        },
      },
      textGeneration: { generatePlotAnalysis },
      chatHistory: { addMessage },
      eventBus: { emit },
      uiStore: { aiDisabled: false },
      effectiveApiKey: "key",
      modelName: "model",
    } as any;

    const intent = { type: "plot", query: "Target" } as any;

    await executor.execute(intent, context);

    expect(generatePlotAnalysis).toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Plot Analysis Result",
        sources: expect.arrayContaining(["e1", "e2"]),
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORACLE:COMMAND_COMPLETED" }),
    );
  });

  it("should fail if AI is disabled", async () => {
    const executor = new PlotExecutor();
    const emit = vi.fn();
    const context = {
      uiStore: { aiDisabled: true },
      chatHistory: { addMessage: vi.fn() },
      eventBus: { emit },
    } as any;
    const intent = { type: "plot", query: "Target" } as any;

    await executor.execute(intent, context);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ORACLE:COMMAND_FAILED",
        payload: expect.objectContaining({
          error: expect.stringContaining("AI and is disabled"),
        }),
      }),
    );
  });
});
