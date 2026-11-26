import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionTurnstileToken } from "./turnstile";

const envMock = vi.hoisted(() => ({ browser: true }));
vi.mock("$app/env", () => envMock);

afterEach(() => {
  envMock.browser = true;
  for (const el of document.head.querySelectorAll("#codex-turnstile-script")) {
    el.remove();
  }
  delete (window as { turnstile?: unknown }).turnstile;
  document.body.innerHTML = "";
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

  it("does not inject the Turnstile script on module import", async () => {
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    delete (window as { turnstile?: unknown }).turnstile;

    await import("./turnstile");

    expect(
      document.head.querySelectorAll("#codex-turnstile-script"),
    ).toHaveLength(0);
  });

  it("lazily injects the script on first demand and solves the challenge after load", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    delete (window as { turnstile?: unknown }).turnstile;

    const { getSessionTurnstileToken: solve } = await import("./turnstile");
    expect(
      document.head.querySelectorAll("#codex-turnstile-script"),
    ).toHaveLength(0);

    const pending = solve();
    const script = document.head.querySelector(
      "#codex-turnstile-script",
    ) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.src).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    );
    expect(script?.async).toBe(true);
    expect(script?.defer).toBe(true);

    const remove = vi.fn();
    let capturedContainer: HTMLElement | undefined;
    let options: Record<string, any> = {};
    window.turnstile = {
      render: vi.fn((container, config) => {
        capturedContainer = container;
        options = config;
        return "lazy-widget";
      }),
      execute: vi.fn(() => {
        options.callback("lazy-token");
      }),
      remove,
    };

    script?.dispatchEvent(new Event("load"));
    await expect(pending).resolves.toBe("lazy-token");
    await vi.runAllTimersAsync();
    expect(remove).toHaveBeenCalledWith("lazy-widget");
    expect(capturedContainer?.isConnected).toBe(false);
  });

  it("deduplicates concurrent script loads into a single script tag", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    delete (window as { turnstile?: unknown }).turnstile;

    const { getSessionTurnstileToken: solve } = await import("./turnstile");
    const first = solve();
    const second = solve();

    const scripts = document.head.querySelectorAll("#codex-turnstile-script");
    expect(scripts).toHaveLength(1);

    let count = 0;
    window.turnstile = {
      render: vi.fn((_container, config) => {
        const id = `widget-${++count}`;
        queueMicrotask(() => config.callback(`token-${id}`));
        return id;
      }),
      execute: vi.fn(),
      remove: vi.fn(),
    };

    scripts[0].dispatchEvent(new Event("load"));
    await expect(Promise.all([first, second])).resolves.toEqual([
      "token-widget-1",
      "token-widget-2",
    ]);
    await vi.runAllTimersAsync();
  });

  it("cleans up dead script on load error and recovers on retry", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    delete (window as { turnstile?: unknown }).turnstile;

    const { getSessionTurnstileToken: solve } = await import("./turnstile");
    const first = solve();
    const firstScript = document.head.querySelector(
      "#codex-turnstile-script",
    ) as HTMLScriptElement;
    firstScript.dispatchEvent(new Event("error"));

    await expect(first).rejects.toThrow("Verification failed to load.");
    expect(document.head.querySelector("#codex-turnstile-script")).toBeNull();

    const retry = solve();
    const retryScript = document.head.querySelector(
      "#codex-turnstile-script",
    ) as HTMLScriptElement;
    expect(retryScript).not.toBeNull();
    expect(retryScript).not.toBe(firstScript);

    window.turnstile = {
      render: vi.fn((_container, config) => {
        queueMicrotask(() => config.callback("recovered-token"));
        return "retry-widget";
      }),
      execute: vi.fn(),
      remove: vi.fn(),
    };
    retryScript.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBe("recovered-token");
    await vi.runAllTimersAsync();
  });

  it("rejects with timeout, removes hung script, and allows retry", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    delete (window as { turnstile?: unknown }).turnstile;

    const { getSessionTurnstileToken: solve } = await import("./turnstile");
    const first = solve();
    const rejected = expect(first).rejects.toThrow(
      "Verification timed out while loading.",
    );
    expect(
      document.head.querySelector("#codex-turnstile-script"),
    ).not.toBeNull();

    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
    expect(document.head.querySelector("#codex-turnstile-script")).toBeNull();

    const retry = solve();
    const retryScript = document.head.querySelector(
      "#codex-turnstile-script",
    ) as HTMLScriptElement;
    expect(retryScript).not.toBeNull();

    window.turnstile = {
      render: vi.fn((_container, config) => {
        queueMicrotask(() => config.callback("post-timeout-token"));
        return "retry-widget";
      }),
      execute: vi.fn(),
      remove: vi.fn(),
    };
    retryScript.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBe("post-timeout-token");
    await vi.runAllTimersAsync();
  });

  it("rejects and removes script when load fires without window.turnstile, then recovers", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    delete (window as { turnstile?: unknown }).turnstile;

    const { getSessionTurnstileToken: solve } = await import("./turnstile");
    const first = solve();
    const firstScript = document.head.querySelector(
      "#codex-turnstile-script",
    ) as HTMLScriptElement;
    firstScript.dispatchEvent(new Event("load"));

    await expect(first).rejects.toThrow("Verification failed to load.");
    expect(document.head.querySelector("#codex-turnstile-script")).toBeNull();

    const retry = solve();
    const retryScript = document.head.querySelector(
      "#codex-turnstile-script",
    ) as HTMLScriptElement;
    window.turnstile = {
      render: vi.fn((_container, config) => {
        queueMicrotask(() => config.callback("after-missing-global"));
        return "retry-widget";
      }),
      execute: vi.fn(),
      remove: vi.fn(),
    };
    retryScript.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBe("after-missing-global");
    await vi.runAllTimersAsync();
  });

  it("rejects cleanly in non-browser environments without touching DOM", async () => {
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    envMock.browser = false;
    delete (window as { turnstile?: unknown }).turnstile;

    const { getSessionTurnstileToken: solve } = await import("./turnstile");
    await expect(solve()).rejects.toThrow(
      "Verification is only available in the browser.",
    );
    expect(
      document.head.querySelectorAll("#codex-turnstile-script"),
    ).toHaveLength(0);
  });

  it("cleans up timeout and container if render throws synchronously", async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    window.turnstile = {
      render: vi.fn(() => {
        throw new Error("boom");
      }),
      execute: vi.fn(),
      remove: vi.fn(),
    };

    const { getSessionTurnstileToken: solve } = await import("./turnstile");
    await expect(solve()).rejects.toThrow("Verification failed");
    await vi.runAllTimersAsync();
    expect(document.body.children).toHaveLength(0);
  });

  it("preloadTurnstile injects script idempotently and swallows load errors", async () => {
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    delete (window as { turnstile?: unknown }).turnstile;

    const { preloadTurnstile } = await import("./turnstile");
    const first = preloadTurnstile();
    const second = preloadTurnstile();

    const scripts = document.head.querySelectorAll("#codex-turnstile-script");
    expect(scripts).toHaveLength(1);

    scripts[0]?.dispatchEvent(new Event("error"));
    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ]);
    expect(document.head.querySelector("#codex-turnstile-script")).toBeNull();
  });
});
