import { describe, expect, it, vi } from "vitest";
import { createLazyOracleAIServices } from "./lazy-ai-engine-services.js";

describe("lazy Oracle AI services", () => {
  it("keeps local consolidated context available without loading AI services", async () => {
    const loadModule = vi.fn();
    const services = createLazyOracleAIServices(loadModule as any);

    expect(
      services.contextRetrievalService.getConsolidatedContext({
        lore: "Private lore",
        content: "Public notes",
      }),
    ).toBe("Private lore\n\nPublic notes");
    expect(loadModule).not.toHaveBeenCalled();
  });

  it("loads the requested service on use and forwards the result", async () => {
    const expandQuery = vi.fn().mockResolvedValue("expanded");
    const loadModule = vi.fn().mockResolvedValue({
      textGenerationService: { expandQuery },
    });
    const services = createLazyOracleAIServices(loadModule as any);

    expect(loadModule).not.toHaveBeenCalled();
    await expect(
      services.textGenerationService.expandQuery("key", "query", []),
    ).resolves.toBe("expanded");
    expect(expandQuery).toHaveBeenCalledWith("key", "query", []);
  });

  it("propagates lazy module failures to the existing Oracle action", async () => {
    const services = createLazyOracleAIServices(
      vi.fn().mockRejectedValue(new Error("AI chunk unavailable")) as any,
    );

    await expect(
      services.imageGenerationService.generateImage("key", "prompt", "model"),
    ).rejects.toThrow("AI chunk unavailable");
  });
});
