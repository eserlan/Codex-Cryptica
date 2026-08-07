import { describe, expect, it, vi, beforeEach } from "vitest";
import { AiSessionManager, RelayedSessionToken } from "./session-manager";
import { DefaultAIClientManager } from "./client-manager";

const PROXY_URL = "https://proxy.example";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    get size() {
      return map.size;
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * A session endpoint that hands out a fresh token per call.
 *
 * `now` must match whatever clock the manager under test was given, or the
 * issued expiry lands in a different epoch than the one being compared to.
 */
function sessionFetcher(
  expiresInSeconds = 1_800,
  now: () => number = () => Date.now(),
) {
  let issued = 0;
  const fetcher = vi.fn(async () =>
    jsonResponse({
      token: `token-${++issued}`,
      expiresAt: now() / 1000 + expiresInSeconds,
    }),
  );
  return fetcher;
}

describe("AiSessionManager", () => {
  it("exchanges a solved challenge for a token", async () => {
    const solveChallenge = vi.fn(async () => "challenge-abc");
    const fetcher = sessionFetcher();
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge,
      fetcher: fetcher as unknown as typeof fetch,
      storage: memoryStorage(),
    });

    expect(await manager.getToken()).toBe("token-1");
    expect(fetcher).toHaveBeenCalledWith(
      `${PROXY_URL}/api/session`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ turnstileToken: "challenge-abc" }),
      }),
    );
  });

  it("reuses the cached token instead of re-solving a challenge", async () => {
    const solveChallenge = vi.fn(async () => "challenge-abc");
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge,
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: memoryStorage(),
    });

    await manager.getToken();
    await manager.getToken();
    await manager.getToken();

    expect(solveChallenge).toHaveBeenCalledTimes(1);
  });

  it("queues concurrent callers onto one handshake", async () => {
    // The behaviour behind "requests made before the handshake finishes are
    // queued": they all await the same in-flight promise rather than each
    // firing its own Turnstile solve.
    let release!: (token: string) => void;
    const solveChallenge = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge,
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: memoryStorage(),
    });

    const pending = Promise.all([
      manager.getToken(),
      manager.getToken(),
      manager.getToken(),
    ]);
    release("challenge-abc");

    expect(await pending).toEqual(["token-1", "token-1", "token-1"]);
    expect(solveChallenge).toHaveBeenCalledTimes(1);
  });

  it("re-handshakes after invalidate", async () => {
    const solveChallenge = vi.fn(async () => "challenge-abc");
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge,
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: memoryStorage(),
    });

    expect(await manager.getToken()).toBe("token-1");
    manager.invalidate();
    expect(await manager.getToken()).toBe("token-2");
  });

  it("mints a new token once the cached one nears expiry", async () => {
    let now = 1_000_000_000;
    const clock = () => now;
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => "challenge-abc",
      fetcher: sessionFetcher(60, clock) as unknown as typeof fetch,
      storage: memoryStorage(),
      now: clock,
    });

    expect(await manager.getToken()).toBe("token-1");
    now += 61_000;
    expect(await manager.getToken()).toBe("token-2");
  });

  it("resolves null rather than throwing when the challenge fails", async () => {
    // Generation must not be blocked by a failed handshake — the proxy is the
    // authority on whether a token is required.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => {
        throw new Error("widget failed");
      },
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: memoryStorage(),
    });

    expect(await manager.getToken()).toBeNull();
  });

  it("resolves null when the proxy rejects the handshake", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => "challenge-abc",
      fetcher: (async () =>
        jsonResponse({ error: {} }, 403)) as unknown as typeof fetch,
      storage: memoryStorage(),
    });

    expect(await manager.getToken()).toBeNull();
  });

  it("retries the handshake after a failure instead of caching the miss", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const solveChallenge = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue("challenge-abc");
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge,
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: memoryStorage(),
    });

    expect(await manager.getToken()).toBeNull();
    expect(await manager.getToken()).toBe("token-1");
  });

  it("restores a stored token without a fresh challenge", async () => {
    const storage = memoryStorage();
    const solveChallenge = vi.fn(async () => "challenge-abc");
    const first = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge,
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage,
    });
    await first.getToken();

    const second = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge,
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage,
    });

    expect(await second.getToken()).toBe("token-1");
    expect(solveChallenge).toHaveBeenCalledTimes(1);
  });

  it("clears stored state on invalidate", async () => {
    const storage = memoryStorage();
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => "challenge-abc",
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage,
    });

    await manager.getToken();
    expect(storage.size).toBe(1);
    manager.invalidate();
    expect(storage.size).toBe(0);
  });

  it("works with no storage available at all", async () => {
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => "challenge-abc",
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: null,
    });

    expect(await manager.getToken()).toBe("token-1");
  });

  it("fires onTokenChange with the minted token after a successful handshake", async () => {
    const onTokenChange = vi.fn();
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => "challenge-abc",
      fetcher: sessionFetcher(
        1_800,
        () => 1_000_000_000,
      ) as unknown as typeof fetch,
      storage: memoryStorage(),
      now: () => 1_000_000_000,
      onTokenChange,
    });

    await manager.getToken();

    expect(onTokenChange).toHaveBeenCalledWith({
      token: "token-1",
      expiresAt: 1_000_000_000 / 1000 + 1_800,
    });
  });

  it("fires onTokenChange with null on invalidate", async () => {
    const onTokenChange = vi.fn();
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => "challenge-abc",
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: memoryStorage(),
      onTokenChange,
    });

    await manager.getToken();
    onTokenChange.mockClear();
    manager.invalidate();

    expect(onTokenChange).toHaveBeenCalledWith(null);
  });

  it("does not fire onTokenChange when a handshake fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const onTokenChange = vi.fn();
    const manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => {
        throw new Error("widget failed");
      },
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: memoryStorage(),
      onTokenChange,
    });

    await manager.getToken();

    expect(onTokenChange).not.toHaveBeenCalled();
  });
});

describe("RelayedSessionToken", () => {
  it("returns null until a token is relayed", async () => {
    const relay = new RelayedSessionToken();
    expect(await relay.getToken()).toBeNull();
  });

  it("returns the relayed token once set", async () => {
    const relay = new RelayedSessionToken();
    relay.setToken({ token: "relayed-1", expiresAt: 9_999_999_999 });
    expect(await relay.getToken()).toBe("relayed-1");
  });

  it("returns null once the relayed token is expiring, same skew as AiSessionManager", async () => {
    let now = 1_000_000_000;
    const relay = new RelayedSessionToken(() => now);
    relay.setToken({ token: "relayed-1", expiresAt: now / 1000 + 10 });

    now += 5_000; // still outside the 30s skew window
    expect(await relay.getToken()).toBeNull();
  });

  it("clears the relayed token on invalidate", async () => {
    const relay = new RelayedSessionToken();
    relay.setToken({ token: "relayed-1", expiresAt: 9_999_999_999 });
    relay.invalidate();
    expect(await relay.getToken()).toBeNull();
  });

  it("relaying null clears any previously set token", async () => {
    const relay = new RelayedSessionToken();
    relay.setToken({ token: "relayed-1", expiresAt: 9_999_999_999 });
    relay.setToken(null);
    expect(await relay.getToken()).toBeNull();
  });
});

describe("DefaultAIClientManager token attachment", () => {
  let manager: AiSessionManager;

  beforeEach(() => {
    manager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => "challenge-abc",
      fetcher: sessionFetcher() as unknown as typeof fetch,
      storage: memoryStorage(),
    });
  });

  it("attaches the bearer token to interaction requests", async () => {
    const fetcher = vi.fn(async (_input: any, _init?: RequestInit) =>
      jsonResponse({ id: "i-1", text: "hi" }),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      manager,
    );

    await client.sendInteraction({ model: "luna-fast", input: "hello" });

    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-1");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("attaches the bearer token to operation-pipeline generation", async () => {
    const fetcher = vi.fn(async (_input: any, _init?: RequestInit) =>
      jsonResponse({ content: "generated", modelKey: "luna" }),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      manager,
    );

    const model = await client.getModel("", "gemini-2.5-flash");
    await (model as any).generateContent("write me a tavern");

    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("attaches the bearer token to the legacy passthrough path", async () => {
    const fetcher = vi.fn(async (_input: any, _init?: RequestInit) =>
      jsonResponse({ candidates: [{ content: { parts: [{ text: "x" }] } }] }),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      manager,
    );

    const model = await client.getModel("", "gemini-2.5-flash");
    // Non-text output keeps this off the operation pipeline.
    await (model as any).generateContent({
      contents: [{ role: "user", parts: [{ text: "draw" }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    });

    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("sends requests unauthenticated when no session manager is wired", async () => {
    const fetcher = vi.fn(async (_input: any, _init?: RequestInit) =>
      jsonResponse({ id: "i-1", text: "hi" }),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
    );

    await client.sendInteraction({ model: "luna-fast", input: "hello" });

    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("refreshes and replays once when the token has expired", async () => {
    const fetcher = vi
      .fn<(input: any, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "SESSION_TOKEN_EXPIRED" } }, 401),
      )
      .mockResolvedValue(jsonResponse({ id: "i-1", text: "recovered" }));
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      manager,
    );

    const result = await client.sendInteraction({
      model: "luna-fast",
      input: "hello",
    });

    expect(result.text).toBe("recovered");
    expect(fetcher).toHaveBeenCalledTimes(2);
    const replayHeaders = new Headers(fetcher.mock.calls[1][1]?.headers);
    expect(replayHeaders.get("Authorization")).toBe("Bearer token-2");
  });

  it("does not retry a second time when the replay also 401s", async () => {
    // A persistently rejected token means something is genuinely wrong;
    // looping would hammer Turnstile and the proxy for nothing.
    const fetcher = vi.fn(async () =>
      jsonResponse({ error: { code: "SESSION_TOKEN_EXPIRED" } }, 401),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      manager,
    );

    await expect(
      client.sendInteraction({ model: "luna-fast", input: "hello" }),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not refresh on a 401 that is not an expiry", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ error: { code: "SESSION_TOKEN_INVALID" } }, 401),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      manager,
    );

    await expect(
      client.sendInteraction({ model: "luna-fast", input: "hello" }),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("passes non-401 failures straight through untouched", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ error: { message: "upstream down" } }, 502),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      manager,
    );

    await expect(
      client.sendInteraction({ model: "luna-fast", input: "hello" }),
    ).rejects.toThrow(/upstream down/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("accepts a RelayedSessionToken as a drop-in sessionManager (the worker-side case)", async () => {
    const relay = new RelayedSessionToken();
    relay.setToken({ token: "worker-relayed-1", expiresAt: 9_999_999_999 });

    const fetcher = vi.fn(async (_input: any, _init?: RequestInit) =>
      jsonResponse({ id: "i-1", text: "hi" }),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      relay,
    );

    await client.sendInteraction({ model: "luna-fast", input: "hello" });

    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer worker-relayed-1");
  });

  it("still surfaces an expired interaction id as a typed error", async () => {
    // The 409 path predates session tokens and must not be swallowed by the
    // new 401 handling.
    const fetcher = vi.fn(async () =>
      jsonResponse({ error: { code: "INTERACTION_NOT_FOUND" } }, 409),
    );
    const client = new DefaultAIClientManager(
      fetcher as unknown as typeof fetch,
      manager,
    );

    await expect(
      client.sendInteraction({
        model: "luna-fast",
        input: "hello",
        previousInteractionId: "old",
      }),
    ).rejects.toThrow(/Interaction expired/);
  });
});
