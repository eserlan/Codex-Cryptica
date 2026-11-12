import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionTurnstileToken } from "./turnstile";

vi.mock("$app/env", () => ({ browser: true }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function productionChallenge() {
  vi.resetModules();
  vi.stubEnv("DEV", false);
  vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
  const remove = vi.fn();
  let options: Record<string, any> = {};
  let container: HTMLElement;
  vi.stubGlobal("window", {
    setTimeout,
    clearTimeout,
    turnstile: {
      render: vi.fn((_container, config) => {
        container = _container;
        options = config;
        return "widget";
      }),
      execute: vi.fn(),
      remove,
    },
  });
  const { getSessionTurnstileToken: solve } = await import("./turnstile");
  return { remove, options: () => options, container: () => container, solve };
}

describe("getSessionTurnstileToken", () => {
  it("uses the local development token without loading a hostname-bound challenge", async () => {
    await expect(getSessionTurnstileToken()).resolves.toBe(
      "dev-turnstile-token",
    );
  });

  it.each(["600010", "300030"])(
    "lets transient challenge failure %s retry and then resolve with a token",
    async (code) => {
      vi.useFakeTimers();
      const widget = await productionChallenge();
      const pending = widget.solve();
      await Promise.resolve();
      expect(widget.options()["error-callback"](code)).toBe(false);
      expect(widget.remove).not.toHaveBeenCalled();
      expect(widget.container().getAttribute("aria-hidden")).not.toBe("true");
      widget.options().callback("verified-token");
      await expect(pending).resolves.toBe("verified-token");
      await vi.runAllTimersAsync();
      expect(widget.remove).toHaveBeenCalledWith("widget");
    },
  );

  it("rejects a configuration error and defers widget removal past its callback", async () => {
    vi.useFakeTimers();
    const widget = await productionChallenge();
    const pending = widget.solve();
    await Promise.resolve();
    expect(widget.options()["error-callback"]("110100")).toBe(true);
    await expect(pending).rejects.toThrow("110100");
    expect(widget.remove).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(widget.remove).toHaveBeenCalledWith("widget");
  });

  it("bounds automatic retries with a timeout", async () => {
    vi.useFakeTimers();
    const widget = await productionChallenge();
    const pending = widget.solve();
    const rejected = expect(pending).rejects.toThrow("timed out");
    await Promise.resolve();
    widget.options()["error-callback"]("300030");
    await vi.runAllTimersAsync();
    await rejected;
    expect(widget.remove).toHaveBeenCalledWith("widget");
  });
});
