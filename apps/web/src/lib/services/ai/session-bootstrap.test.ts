import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$app/env", () => ({ browser: true }));
const {
  getSessionTurnstileTokenMock,
  oracleSetTokenProvider,
  proposerSetTokenProvider,
  oracleSetSessionToken,
  proposerSetSessionToken,
  registry,
} = vi.hoisted(() => ({
  getSessionTurnstileTokenMock: vi.fn(async () => "challenge-token"),
  oracleSetTokenProvider: vi.fn(),
  proposerSetTokenProvider: vi.fn(),
  oracleSetSessionToken: vi.fn(),
  proposerSetSessionToken: vi.fn(),
  registry: {
    bridges: [] as unknown[],
    provider: null as unknown,
    token: null as unknown,
  },
}));
vi.mock("#lib/services/publishing/turnstile.js", () => ({
  getSessionTurnstileToken: getSessionTurnstileTokenMock,
}));
vi.mock("#lib/cloud-bridge/worker-session-bridge.js", () => ({
  registerWorkerSessionBridge: (bridge: {
    setSessionToken: (token: unknown) => void;
    setTokenProvider: (provider: unknown) => void;
  }) => {
    registry.bridges.push(bridge);
    bridge.setSessionToken(registry.token);
    if (registry.provider) bridge.setTokenProvider(registry.provider);
  },
  relaySessionToken: (token: unknown) => {
    registry.token = token;
    for (const bridge of registry.bridges as Array<{
      setSessionToken: (value: unknown) => void;
    }>)
      bridge.setSessionToken(token);
  },
  installWorkerTokenProvider: (provider: unknown) => {
    registry.provider = provider;
    for (const bridge of registry.bridges as Array<{
      setTokenProvider: (value: unknown) => void;
    }>)
      bridge.setTokenProvider(provider);
  },
}));

import { requiresCapabilitySession } from "./session-bootstrap";

describe("requiresCapabilitySession", () => {
  it("does not request a capability token from a local development proxy", () => {
    expect(requiresCapabilitySession("http://localhost:8787")).toBe(false);
    expect(requiresCapabilitySession("http://127.0.0.1:8787")).toBe(false);
  });

  it("keeps capability sessions enabled for a hosted proxy", () => {
    expect(
      requiresCapabilitySession("https://oracle-proxy.example.workers.dev"),
    ).toBe(true);
  });
});

describe("session-bootstrap worker token-provider wiring", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    registry.bridges = [];
    registry.provider = null;
    registry.token = null;
    const { registerWorkerSessionBridge } =
      await import("#lib/cloud-bridge/worker-session-bridge.js");
    registerWorkerSessionBridge({
      setSessionToken: oracleSetSessionToken,
      setTokenProvider: oracleSetTokenProvider,
    });
    registerWorkerSessionBridge({
      setSessionToken: proposerSetSessionToken,
      setTokenProvider: proposerSetTokenProvider,
    });
    vi.stubEnv(
      "VITE_ORACLE_PROXY_URL",
      "https://oracle-proxy.example.workers.dev",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("wires a pull-token provider into both bridges without eager challenge or fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { initAiSession } = await import("./session-bootstrap");
    await initAiSession();

    expect(oracleSetTokenProvider).toHaveBeenCalledWith(expect.any(Function));
    expect(proposerSetTokenProvider).toHaveBeenCalledWith(expect.any(Function));
    expect(getSessionTurnstileTokenMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("the wired provider resolves rather than rejecting when the handshake fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network unavailable");
      }),
    );

    const { initAiSession } = await import("./session-bootstrap");
    await initAiSession();

    const provider = proposerSetTokenProvider.mock
      .calls[0][0] as () => Promise<{
      token: string;
      expiresAt: number;
    } | null>;

    // A worker awaiting this pull must never be left stuck: even when the
    // handshake itself fails, the provider resolves null instead of
    // rejecting or hanging.
    await expect(provider()).resolves.toBeNull();

    vi.unstubAllGlobals();
  });

  it("waits for shared session setup before the first proxied model request", async () => {
    let finishConfiguration!: () => void;
    const configured = new Promise<void>((resolve) => {
      finishConfiguration = resolve;
    });
    const configureAIEngine = vi.fn();
    const setSessionManager = vi.fn();
    const getModel = vi.fn(async () => "model");
    vi.doMock("@codex/ai-engine/config", async () => {
      await configured;
      return { configureAIEngine };
    });
    vi.doMock("@codex/ai-engine/client-manager", () => ({
      aiClientManager: { setSessionManager, getModel },
    }));
    vi.doMock("@codex/ai-engine/session-manager", () => ({
      AiSessionManager: class {
        getToken = vi.fn(async () => null);
        getTokenSnapshot = vi.fn(async () => null);
        invalidate = vi.fn();
      },
    }));

    const { createLazyAIClientManager } =
      await import("#lib/services/lazy-ai-client-manager.js");
    const request = createLazyAIClientManager().getModel(
      "",
      "gemini-3.5-flash-lite",
    );
    expect(oracleSetTokenProvider).toHaveBeenCalledWith(expect.any(Function));
    expect(proposerSetTokenProvider).toHaveBeenCalledWith(expect.any(Function));
    const pullToken = oracleSetTokenProvider.mock.calls.at(
      -1,
    )![0] as () => Promise<{ token: string; expiresAt: number } | null>;
    let pullSettled = false;
    const workerFirstRequest = pullToken().finally(() => {
      pullSettled = true;
    });
    await Promise.resolve();
    expect(configureAIEngine).not.toHaveBeenCalled();
    expect(getModel).not.toHaveBeenCalled();
    expect(setSessionManager).not.toHaveBeenCalled();
    expect(pullSettled).toBe(false);

    finishConfiguration();
    await expect(request).resolves.toBe("model");
    await expect(workerFirstRequest).resolves.toBeNull();
    expect(configureAIEngine).toHaveBeenCalledOnce();
    expect(setSessionManager).toHaveBeenCalledOnce();
    expect(getModel).toHaveBeenCalledOnce();
    vi.doUnmock("@codex/ai-engine/config");
    vi.doUnmock("@codex/ai-engine/client-manager");
    vi.doUnmock("@codex/ai-engine/session-manager");
    vi.resetModules();
  });

  it("configures lightweight AI services on localhost without loading session chunks", async () => {
    vi.stubEnv("VITE_ORACLE_PROXY_URL", "http://localhost:8787");
    const configureAIEngine = vi.fn();
    vi.doMock("@codex/ai-engine/config", () => ({ configureAIEngine }));
    const { ensureAiSession } = await import("./session-bootstrap");

    await ensureAiSession();

    expect(configureAIEngine).toHaveBeenCalledOnce();
    expect(oracleSetTokenProvider).toHaveBeenCalledWith(expect.any(Function));
    expect(proposerSetTokenProvider).toHaveBeenCalledWith(expect.any(Function));
    vi.doUnmock("@codex/ai-engine/config");
    vi.resetModules();
  });
});

describe("getAiSessionToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    // A developer's local .env can point the proxy at localhost, which turns
    // sessions off. Pin a hosted URL so this does not depend on that file.
    vi.stubEnv(
      "VITE_ORACLE_PROXY_URL",
      "https://oracle-proxy.example.workers.dev",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mints a token through the shared session and reuses it", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ token: "t1", expiresAt: 4102444800 }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getAiSessionToken } = await import("./session-bootstrap");

    expect(await getAiSessionToken()).toBe("t1");
    expect(await getAiSessionToken()).toBe("t1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("re-handshakes when asked to refresh", async () => {
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ token: `t${++n}`, expiresAt: 4102444800 }),
            { status: 200 },
          ),
      ),
    );
    const { getAiSessionToken } = await import("./session-bootstrap");

    expect(await getAiSessionToken()).toBe("t1");
    expect(await getAiSessionToken(true)).toBe("t2");
    vi.unstubAllGlobals();
  });

  it("resolves null rather than throwing when the handshake fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const { getAiSessionToken } = await import("./session-bootstrap");

    await expect(getAiSessionToken()).resolves.toBeNull();
    vi.unstubAllGlobals();
  });

  it("lazily mints once across concurrent callers and worker pull requests", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ token: "t-lazy", expiresAt: 4102444800 }),
          {
            status: 200,
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { initAiSession, getAiSessionToken } =
      await import("./session-bootstrap");

    await initAiSession();
    expect(getSessionTurnstileTokenMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    const workerProvider = oracleSetTokenProvider.mock
      .calls[0][0] as () => Promise<{
      token: string;
      expiresAt: number;
    } | null>;

    const [t1, t2, workerSnapshot] = await Promise.all([
      getAiSessionToken(),
      getAiSessionToken(),
      workerProvider(),
    ]);

    expect(t1).toBe("t-lazy");
    expect(t2).toBe("t-lazy");
    expect(workerSnapshot).toEqual({ token: "t-lazy", expiresAt: 4102444800 });
    expect(getSessionTurnstileTokenMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("resolves null when the lazy AI session chunk fails to load", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.doMock("@codex/ai-engine/session-manager", () => {
      throw new Error("ai-chunk-unavailable");
    });
    const { getAiSessionToken, initAiSession } =
      await import("./session-bootstrap");

    await expect(initAiSession()).resolves.toBeUndefined();
    await expect(getAiSessionToken()).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      "[AI session] Failed to load capability session support.",
      expect.any(Error),
    );
    vi.doUnmock("@codex/ai-engine/session-manager");
    vi.resetModules();
  });
});
