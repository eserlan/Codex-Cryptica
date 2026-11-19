import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FEATURE_FLAGS,
  FeatureFlagsStore,
  type StorageLike,
} from "./feature-flags.svelte";

function createMemoryStorage(
  initial: Record<string, string> = {},
): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("FeatureFlagsStore", () => {
  it("starts with safe defaults and fetches runtime flags for prod or staging", async () => {
    const storage = createMemoryStorage();
    const fetchFn = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            env: "staging",
            flags: { adventureArtwork: true, unknownFlag: true },
            source: "kv",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );

    const store = new FeatureFlagsStore({
      fetchFn,
      storage,
      resolveProxyUrl: () => "https://proxy.test",
      isStaging: () => true,
      isOnline: () => true,
      readBuildEnv: () => undefined,
    });

    expect(store.isEnabled("adventureArtwork")).toBe(
      DEFAULT_FEATURE_FLAGS.adventureArtwork,
    );

    await store.refresh();

    expect(fetchFn).toHaveBeenCalledWith(
      "https://proxy.test/api/flags?env=staging",
      expect.objectContaining({ method: "GET" }),
    );
    expect(store.isEnabled("adventureArtwork")).toBe(true);
    expect(storage.getItem("codex-feature-flags-cache:staging")).toBe(
      JSON.stringify({ adventureArtwork: true }),
    );
  });

  it("hydrates last-known flags from localStorage cache for offline use", () => {
    const storage = createMemoryStorage({
      "codex-feature-flags-cache:prod": JSON.stringify({
        adventureArtwork: true,
      }),
    });

    const store = new FeatureFlagsStore({
      fetchFn: vi.fn(),
      storage,
      resolveProxyUrl: () => "https://proxy.test",
      isStaging: () => false,
      isOnline: () => false,
      readBuildEnv: () => undefined,
    });

    expect(store.isEnabled("adventureArtwork")).toBe(true);
  });

  it("respects precedence: build env > local override > runtime flag > default", async () => {
    const storage = createMemoryStorage({
      "codex-feature-flags-cache:prod": JSON.stringify({
        adventureArtwork: false,
      }),
    });
    let buildValue: string | undefined;

    const store = new FeatureFlagsStore({
      fetchFn: vi.fn(),
      storage,
      resolveProxyUrl: () => "https://proxy.test",
      isStaging: () => false,
      isOnline: () => true,
      readBuildEnv: () => buildValue,
    });

    expect(store.isEnabled("adventureArtwork")).toBe(false);

    // URL query override enables it locally
    store.applyUrlOverrides("?flag=adventureArtwork:1");
    expect(store.isEnabled("adventureArtwork")).toBe(true);

    // Build-time env override takes top precedence
    buildValue = "false";
    expect(store.isEnabled("adventureArtwork")).toBe(false);

    buildValue = undefined;
    expect(store.isEnabled("adventureArtwork")).toBe(true);

    // Clearing local override falls back to runtime/cached value
    store.clearOverride("adventureArtwork");
    expect(store.isEnabled("adventureArtwork")).toBe(false);
  });

  it("skips network fetch when offline and preserves cached flags on HTTP/network errors", async () => {
    const storage = createMemoryStorage({
      "codex-feature-flags-cache:prod": JSON.stringify({
        adventureArtwork: true,
      }),
    });
    const fetchFn = vi.fn(async () => new Response("error", { status: 500 }));
    let online = false;

    const store = new FeatureFlagsStore({
      fetchFn,
      storage,
      resolveProxyUrl: () => "https://proxy.test",
      isStaging: () => false,
      isOnline: () => online,
      readBuildEnv: () => undefined,
    });

    await store.refresh();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(store.isEnabled("adventureArtwork")).toBe(true);

    online = true;
    await store.refresh();
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(store.isEnabled("adventureArtwork")).toBe(true);

    fetchFn.mockRejectedValueOnce(new Error("Network down"));
    await expect(store.refresh()).resolves.toBe(false);
    expect(store.isEnabled("adventureArtwork")).toBe(true);
  });

  it("handles AbortSignal cancellation and corrupt localStorage safely", async () => {
    const storage = createMemoryStorage({
      "codex-feature-flags-cache:prod": "{corrupt-json",
      "codex-feature-flag-overrides": "{corrupt-json",
    });

    const controller = new AbortController();
    controller.abort();

    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      return new Response(
        JSON.stringify({ flags: { adventureArtwork: true } }),
        { status: 200 },
      );
    });

    const store = new FeatureFlagsStore({
      fetchFn,
      storage,
      resolveProxyUrl: () => "https://proxy.test",
      isStaging: () => false,
      isOnline: () => true,
      readBuildEnv: () => undefined,
    });

    expect(store.isEnabled("adventureArtwork")).toBe(false);
    await expect(store.refresh(controller.signal)).resolves.toBe(false);
    expect(store.isEnabled("adventureArtwork")).toBe(false);
  });
});
