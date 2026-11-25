import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$app/env", () => ({ browser: true }));
const {
  getSessionTurnstileTokenMock,
  oracleSetTokenProvider,
  oracleSetSessionToken,
  proposerSetTokenProvider,
  proposerSetSessionToken,
} = vi.hoisted(() => ({
  getSessionTurnstileTokenMock: vi.fn(async () => "challenge-token"),
  oracleSetTokenProvider: vi.fn(),
  oracleSetSessionToken: vi.fn(),
  proposerSetTokenProvider: vi.fn(),
  proposerSetSessionToken: vi.fn(),
}));
vi.mock("#lib/services/publishing/turnstile.js", () => ({
  getSessionTurnstileToken: getSessionTurnstileTokenMock,
}));
vi.mock("#lib/cloud-bridge/oracle-bridge.js", () => ({
  oracleBridge: {
    setSessionToken: oracleSetSessionToken,
    setTokenProvider: oracleSetTokenProvider,
  },
}));
vi.mock("#lib/cloud-bridge/proposer-bridge.js", () => ({
  proposerBridge: {
    setSessionToken: proposerSetSessionToken,
    setTokenProvider: proposerSetTokenProvider,
  },
}));
vi.mock("#lib/cloud-bridge/worker-session-bridge.js", () => ({
  relaySessionToken: vi.fn((token) => {
    oracleSetSessionToken(token);
    proposerSetSessionToken(token);
  }),
  installWorkerTokenProvider: vi.fn((provider) => {
    oracleSetTokenProvider(provider);
    proposerSetTokenProvider(provider);
  }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv(
      "VITE_ORACLE_PROXY_URL",
      "https://oracle-proxy.example.workers.dev",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
});

describe("public-session-bootstrap and public-to-app handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubEnv(
      "VITE_ORACLE_PROXY_URL",
      "https://oracle-proxy.example.workers.dev",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("ensurePublicAiSession attaches a session manager to aiClientManager without touching worker bridges or solving Turnstile", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { aiClientManager } = await import("@codex/ai-engine");
    const setSessionManagerSpy = vi.spyOn(aiClientManager, "setSessionManager");
    const { ensurePublicAiSession } =
      await import("./public-session-bootstrap");

    const manager = ensurePublicAiSession();

    expect(manager).not.toBeNull();
    expect(setSessionManagerSpy).toHaveBeenCalledWith(manager);
    expect(oracleSetTokenProvider).not.toHaveBeenCalled();
    expect(proposerSetTokenProvider).not.toHaveBeenCalled();
    expect(oracleSetSessionToken).not.toHaveBeenCalled();
    expect(proposerSetSessionToken).not.toHaveBeenCalled();
    expect(getSessionTurnstileTokenMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    setSessionManagerSpy.mockRestore();
  });

  it("reuses the public AiSessionManager when initAiSession attaches worker relays and pushes subsequent refreshes/invalidations", async () => {
    let n = 0;
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ token: `t-${++n}`, expiresAt: 4102444800 }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ensurePublicAiSession, getAiSessionToken } =
      await import("./public-session-bootstrap");
    const { initAiSession } = await import("./session-bootstrap");

    // 1. Public marketing page initializes & mints a capability token first.
    const publicManager = ensurePublicAiSession();
    expect(await getAiSessionToken()).toBe("t-1");
    expect(getSessionTurnstileTokenMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 2. Navigating to (app) wires worker relays onto the SAME manager without re-minting.
    await initAiSession();
    expect(oracleSetTokenProvider).toHaveBeenCalledTimes(1);
    expect(proposerSetTokenProvider).toHaveBeenCalledTimes(1);
    expect(await getAiSessionToken()).toBe("t-1");
    expect(getSessionTurnstileTokenMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 3. Subsequent invalidation + refresh pushes cleared (null) and refreshed token to both bridges.
    expect(await getAiSessionToken(true)).toBe("t-2");
    expect(publicManager).not.toBeNull();
    expect(oracleSetSessionToken).toHaveBeenNthCalledWith(1, null);
    expect(proposerSetSessionToken).toHaveBeenNthCalledWith(1, null);
    expect(oracleSetSessionToken).toHaveBeenNthCalledWith(2, {
      token: "t-2",
      expiresAt: 4102444800,
    });
    expect(proposerSetSessionToken).toHaveBeenNthCalledWith(2, {
      token: "t-2",
      expiresAt: 4102444800,
    });
  });
});
