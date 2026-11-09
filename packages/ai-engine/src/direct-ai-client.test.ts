import { describe, expect, it, vi } from "vitest";
import { DirectAIClient } from "./direct-ai-client";

describe("direct AI client cache", () => {
  it("loads lazily, reuses a client for the same key and replaces it on key changes", async () => {
    const loadSdk = vi.fn(() => import("@google/generative-ai"));
    const cache = new DirectAIClient(loadSdk);
    expect(loadSdk).not.toHaveBeenCalled();
    const first = await cache.getClient("first");
    expect(await cache.getClient("first")).toBe(first);
    const second = await cache.getClient("second");
    expect(second).not.toBe(first);
    expect(await cache.getClient("second")).toBe(second);
    expect(await cache.getClient("first")).not.toBe(first);
    expect(loadSdk).toHaveBeenCalledOnce();
    expect(second.getGenerativeModel({ model: "test" }).apiKey).toBe("second");
  });

  it("shares a pending SDK load across concurrent requests", async () => {
    const loadSdk = vi.fn(() => import("@google/generative-ai"));
    const cache = new DirectAIClient(loadSdk);
    await Promise.all([cache.getClient("first"), cache.getClient("second")]);
    expect(loadSdk).toHaveBeenCalledOnce();
  });

  it("retains a failed SDK load as the original manager did", async () => {
    const error = new Error("SDK unavailable");
    const loadSdk = vi.fn().mockRejectedValue(error);
    const cache = new DirectAIClient(loadSdk);
    await expect(cache.getClient("first")).rejects.toBe(error);
    await expect(cache.getClient("second")).rejects.toBe(error);
    expect(loadSdk).toHaveBeenCalledOnce();
  });
});
