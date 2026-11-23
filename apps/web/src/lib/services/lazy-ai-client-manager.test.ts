import { describe, expect, it, vi } from "vitest";
import { createLazyAIClientManager } from "./lazy-ai-client-manager.js";

describe("lazy AI client manager", () => {
  it("loads the manager only when an AI model is requested", async () => {
    const getModel = vi.fn().mockResolvedValue({ id: "model" });
    const loadManager = vi.fn().mockResolvedValue({ getModel });
    const manager = createLazyAIClientManager(loadManager);

    expect(loadManager).not.toHaveBeenCalled();
    await expect(manager.getModel("key", "model-name")).resolves.toEqual({
      id: "model",
    });
    expect(loadManager).toHaveBeenCalledTimes(1);
    expect(getModel).toHaveBeenCalledWith("key", "model-name");
  });

  it("surfaces a failed lazy load to the existing caller", async () => {
    const loadManager = vi
      .fn()
      .mockRejectedValue(new Error("AI chunk unavailable"));
    const manager = createLazyAIClientManager(loadManager);

    await expect(manager.getModel("key", "model-name")).rejects.toThrow(
      "AI chunk unavailable",
    );
  });
});
