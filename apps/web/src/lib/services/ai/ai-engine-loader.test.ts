import { beforeEach, describe, expect, it, vi } from "vitest";

describe("loadConfiguredAIEngine", () => {
  beforeEach(() => vi.resetModules());

  it("retries a failed config load and caches only successful configuration", async () => {
    const { loadConfiguredAIEngine } = await import("./ai-engine-loader.js");
    const configureAIEngine = vi.fn();
    const engine = { configureAIEngine };
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("AI config chunk unavailable"))
      .mockResolvedValue(engine);

    await expect(loadConfiguredAIEngine(loader)).rejects.toThrow(
      "AI config chunk unavailable",
    );
    await expect(loadConfiguredAIEngine(loader)).resolves.toBe(engine);
    await expect(loadConfiguredAIEngine(loader)).resolves.toBe(engine);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(configureAIEngine).toHaveBeenCalledOnce();
    expect(configureAIEngine).toHaveBeenCalledWith({
      searchService: expect.anything(),
      templateResolver: expect.any(Function),
    });
  });
});
