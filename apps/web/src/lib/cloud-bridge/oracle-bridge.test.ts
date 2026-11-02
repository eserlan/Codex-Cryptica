import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Comlink from "comlink";

// Mock environment and worker
vi.mock("$app/environment", () => ({
  browser: true,
}));

const { releaseProxySymbol } = vi.hoisted(() => ({
  releaseProxySymbol: Symbol("releaseProxy"),
}));

const {
  setSessionTokenMock,
  setSessionTokenProviderMock,
  proxyMock,
  generateAdventureTurnMock,
  cancelAdventureTurnMock,
} = vi.hoisted(() => ({
  setSessionTokenMock: vi.fn(),
  setSessionTokenProviderMock: vi.fn(),
  proxyMock: vi.fn((fn: unknown) => fn),
  generateAdventureTurnMock: vi.fn().mockResolvedValue({ kind: "complete" }),
  cancelAdventureTurnMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("comlink", () => ({
  wrap: vi.fn().mockReturnValue({
    generateResponse: vi.fn(),
    expandQuery: vi.fn(),
    generateAdventureTurn: generateAdventureTurnMock,
    cancelAdventureTurn: cancelAdventureTurnMock,
    setSessionToken: setSessionTokenMock,
    setSessionTokenProvider: setSessionTokenProviderMock,
    [releaseProxySymbol]: vi.fn(),
  }),
  releaseProxy: releaseProxySymbol,
  proxy: proxyMock,
}));

// Mock worker import
vi.mock("#lib/workers/oracle.worker?worker", () => {
  return {
    default: class MockWorker {
      terminate = vi.fn();
    },
  };
});

import { OracleBridge } from "./oracle-bridge";

describe("OracleBridge", () => {
  let bridge: OracleBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new OracleBridge();
  });

  it("should initialize worker in browser", () => {
    expect(bridge.isReady).toBe(true);
    expect(Comlink.wrap).toHaveBeenCalled();
  });

  it("should provide textGeneration service", () => {
    const service = bridge.textGeneration;
    expect(service).toBeDefined();
    expect(service.generateResponse).toBeDefined();
  });

  it("should provide draftingEngine service", () => {
    const engine = bridge.draftingEngine;
    expect(engine).toBeDefined();
  });

  it("should terminate worker and release proxy", () => {
    bridge.terminate();
    expect(bridge.isReady).toBe(false);
  });

  it("should throw error if textGeneration is accessed before init", () => {
    (bridge as any).api = null;
    expect(() => bridge.textGeneration).toThrow(
      "[OracleBridge] Worker not initialized",
    );
  });

  it("should throw error if draftingEngine is accessed before init", () => {
    (bridge as any).api = null;
    expect(() => bridge.draftingEngine).toThrow(
      "[OracleBridge] Worker not initialized",
    );
  });

  it("should relay a session token to the worker via Comlink", () => {
    bridge.setSessionToken({ token: "abc", expiresAt: 123 });
    expect(setSessionTokenMock).toHaveBeenCalledWith({
      token: "abc",
      expiresAt: 123,
    });
  });

  it("should not throw when relaying a session token before the worker is ready", () => {
    (bridge as any).api = null;
    expect(() => bridge.setSessionToken(null)).not.toThrow();
  });

  it("should wire a Comlink-proxied token provider into the worker", () => {
    const provider = vi.fn().mockResolvedValue({ token: "t", expiresAt: 1 });
    bridge.setTokenProvider(provider);

    expect(proxyMock).toHaveBeenCalledWith(provider);
    expect(setSessionTokenProviderMock).toHaveBeenCalledWith(provider);
  });

  it("should not throw when wiring a token provider before the worker is ready", () => {
    (bridge as any).api = null;
    expect(() => bridge.setTokenProvider(vi.fn())).not.toThrow();
  });

  it("passes adventure narration as a separate proxied worker argument", async () => {
    const request = {
      phase: "action",
      session: { id: "adventure-1" },
      anchors: [],
      relevant: [],
    };
    const narration = vi.fn();

    // The first argument must remain cloneable. A nested function throws
    // DataCloneError in a real postMessage call.
    expect(structuredClone(request)).toEqual(request);
    await bridge.generateAdventureTurn(
      request,
      "turn-1",
      { modelName: "luna-fast" },
      narration,
    );

    expect(proxyMock).toHaveBeenCalledWith(narration);
    expect(generateAdventureTurnMock).toHaveBeenCalledWith(
      request,
      "turn-1",
      { modelName: "luna-fast" },
      narration,
    );
    expect(generateAdventureTurnMock.mock.calls[0]?.[0]).not.toHaveProperty(
      "onNarration",
    );
  });

  it("omits the progress callback for ordinary buffered adventure calls", async () => {
    const request = { phase: "opening", session: { id: "adventure-1" } };
    await bridge.generateAdventureTurn(request, "turn-2");

    expect(generateAdventureTurnMock).toHaveBeenCalledWith(
      request,
      "turn-2",
      undefined,
      undefined,
    );
    expect(proxyMock).not.toHaveBeenCalled();
  });

  it("forwards adventure turn cancellation to the worker", async () => {
    await bridge.cancelAdventureTurn("turn-1");

    expect(cancelAdventureTurnMock).toHaveBeenCalledWith("turn-1");
  });

  it("should handle worker initialization failure", () => {
    vi.mocked(Comlink.wrap).mockImplementationOnce(() => {
      throw new Error("Init fail");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failBridge = new OracleBridge();

    expect(failBridge.isReady).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to initialize OracleWorker"),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
