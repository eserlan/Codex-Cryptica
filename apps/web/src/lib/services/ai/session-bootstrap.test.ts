import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$lib/services/publishing/turnstile", () => ({
  getSessionTurnstileToken: vi.fn(async () => "challenge-token"),
}));

const { oracleSetTokenProvider, proposerSetTokenProvider } = vi.hoisted(() => ({
  oracleSetTokenProvider: vi.fn(),
  proposerSetTokenProvider: vi.fn(),
}));
vi.mock("$lib/cloud-bridge/oracle-bridge", () => ({
  oracleBridge: {
    setSessionToken: vi.fn(),
    setTokenProvider: oracleSetTokenProvider,
  },
}));
vi.mock("$lib/cloud-bridge/proposer-bridge", () => ({
  proposerBridge: {
    setSessionToken: vi.fn(),
    setTokenProvider: proposerSetTokenProvider,
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("wires a pull-token provider into both bridges when the session manager is created", async () => {
    const { initAiSession } = await import("./session-bootstrap");
    initAiSession();

    expect(oracleSetTokenProvider).toHaveBeenCalledWith(expect.any(Function));
    expect(proposerSetTokenProvider).toHaveBeenCalledWith(expect.any(Function));
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
    initAiSession();

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
