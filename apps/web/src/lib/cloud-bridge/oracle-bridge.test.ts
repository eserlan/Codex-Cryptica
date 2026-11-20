import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import * as Comlink from "comlink";

// Mock environment
vi.mock("$app/environment", () => ({
  browser: true,
}));

const { releaseProxySymbol } = vi.hoisted(() => ({
  releaseProxySymbol: Symbol("releaseProxy"),
}));

const {
  apiMock,
  setSessionTokenMock,
  setSessionTokenProviderMock,
  proxyMock,
  generateResponseMock,
  generateAdventureTurnMock,
  cancelAdventureTurnMock,
} = vi.hoisted(() => {
  const setSessionTokenMock = vi.fn();
  const setSessionTokenProviderMock = vi.fn();
  const generateResponseMock = vi.fn().mockResolvedValue("response");
  const generateAdventureTurnMock = vi
    .fn()
    .mockResolvedValue({ kind: "complete" });
  const cancelAdventureTurnMock = vi.fn().mockResolvedValue(undefined);
  return {
    setSessionTokenMock,
    setSessionTokenProviderMock,
    generateResponseMock,
    generateAdventureTurnMock,
    cancelAdventureTurnMock,
    proxyMock: vi.fn((fn: unknown) => fn),
    apiMock: {
      generateResponse: generateResponseMock,
      expandQuery: vi.fn(),
      generateAdventureTurn: generateAdventureTurnMock,
      cancelAdventureTurn: cancelAdventureTurnMock,
      setSessionToken: setSessionTokenMock,
      setSessionTokenProvider: setSessionTokenProviderMock,
      [releaseProxySymbol]: vi.fn(),
    },
  };
});

vi.mock("comlink", () => ({
  wrap: vi.fn(() => apiMock),
  releaseProxy: releaseProxySymbol,
  proxy: proxyMock,
}));

import { OracleBridge } from "./oracle-bridge";

describe("OracleBridge", () => {
  let bridge: OracleBridge;
  let loadWorker: Mock<() => Promise<Worker>>;
  let worker: { terminate: ReturnType<typeof vi.fn> };
  let fallbackTextGeneration: { generateResponse: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    worker = { terminate: vi.fn() };
    loadWorker = vi
      .fn<() => Promise<Worker>>()
      .mockResolvedValue(worker as unknown as Worker);
    fallbackTextGeneration = {
      generateResponse: vi.fn().mockResolvedValue("fallback response"),
    };
    bridge = new OracleBridge({
      loadWorker,
      fallbackTextGeneration: fallbackTextGeneration as any,
    });
  });

  it("does not start a worker on construction", () => {
    expect(loadWorker).not.toHaveBeenCalled();
    expect(Comlink.wrap).not.toHaveBeenCalled();
    expect(bridge.isReady).toBe(true);
  });

  it("starts the worker only when a service method is called", async () => {
    const service = bridge.textGeneration;
    expect(service).toBeDefined();
    expect(loadWorker).not.toHaveBeenCalled();

    const result = await (service as any).generateResponse("a", "b");

    expect(loadWorker).toHaveBeenCalledTimes(1);
    expect(generateResponseMock).toHaveBeenCalledWith("a", "b");
    expect(result).toBe("response");
  });

  it("starts the worker for draftingEngine calls too", async () => {
    await bridge.draftingEngine.expandQuery("q");
    expect(loadWorker).toHaveBeenCalledTimes(1);
    expect(apiMock.expandQuery).toHaveBeenCalledWith("q");
  });

  it("shares one load between simultaneous calls and then calls the worker directly", async () => {
    await Promise.all([
      (bridge.textGeneration as any).generateResponse("1"),
      (bridge.textGeneration as any).generateResponse("2"),
      bridge.cancelAdventureTurn("t"),
    ]);
    expect(loadWorker).toHaveBeenCalledTimes(1);
    expect(Comlink.wrap).toHaveBeenCalledTimes(1);

    await (bridge.textGeneration as any).generateResponse("3");
    expect(loadWorker).toHaveBeenCalledTimes(1);
  });

  it("applies setup calls made before start before the first request", async () => {
    const provider = vi.fn();
    bridge.setTokenProvider(provider);
    bridge.setSessionToken({ token: "old", expiresAt: 1 });
    bridge.setSessionToken({ token: "new", expiresAt: 2 });
    expect(setSessionTokenMock).not.toHaveBeenCalled();

    await (bridge.textGeneration as any).generateResponse("x");

    expect(proxyMock).toHaveBeenCalledWith(provider);
    expect(setSessionTokenProviderMock).toHaveBeenCalledWith(provider);
    expect(setSessionTokenMock).toHaveBeenCalledTimes(1);
    expect(setSessionTokenMock).toHaveBeenCalledWith({
      token: "new",
      expiresAt: 2,
    });
    const order = (m: ReturnType<typeof vi.fn>) =>
      m.mock.invocationCallOrder[0];
    expect(order(setSessionTokenProviderMock)).toBeLessThan(
      order(generateResponseMock),
    );
    expect(order(setSessionTokenMock)).toBeLessThan(
      order(generateResponseMock),
    );
  });

  it("keeps a null session token set before start", async () => {
    bridge.setSessionToken(null);
    await bridge.cancelAdventureTurn("t");
    expect(setSessionTokenMock).toHaveBeenCalledWith(null);
  });

  it("forwards setup calls right away once started", async () => {
    await bridge.cancelAdventureTurn("t");
    const provider = vi.fn();
    bridge.setTokenProvider(provider);
    bridge.setSessionToken({ token: "abc", expiresAt: 123 });
    expect(setSessionTokenProviderMock).toHaveBeenCalledWith(provider);
    expect(setSessionTokenMock).toHaveBeenCalledWith({
      token: "abc",
      expiresAt: 123,
    });
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

  it("falls back for the triggering call and disables the bridge when the load fails", async () => {
    loadWorker.mockRejectedValue(new Error("Init fail"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      (bridge.textGeneration as any).generateResponse("x"),
    ).resolves.toBe("fallback response");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to initialize OracleWorker"),
      expect.any(Error),
    );
    expect(bridge.isReady).toBe(false);
    expect(fallbackTextGeneration.generateResponse).toHaveBeenCalledWith("x");
    expect(() => bridge.textGeneration).toThrow(
      "[OracleBridge] Worker not initialized",
    );
    expect(() => bridge.draftingEngine).toThrow(
      "[OracleBridge] Worker not initialized",
    );
    consoleSpy.mockRestore();
  });

  it("treats a failing Comlink.wrap as a load failure", async () => {
    vi.mocked(Comlink.wrap).mockImplementationOnce(() => {
      throw new Error("wrap fail");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(bridge.cancelAdventureTurn("t")).rejects.toThrow(
      "[OracleBridge] Worker not initialized",
    );
    expect(worker.terminate).toHaveBeenCalled();
    expect(bridge.isReady).toBe(false);
    consoleSpy.mockRestore();
  });

  it("terminates the worker, releases the proxy and never restarts", async () => {
    await bridge.cancelAdventureTurn("t");
    bridge.terminate();

    expect(worker.terminate).toHaveBeenCalled();
    expect(bridge.isReady).toBe(false);
    expect(() => bridge.textGeneration).toThrow(
      "[OracleBridge] Worker not initialized",
    );
    expect(() => bridge.draftingEngine).toThrow(
      "[OracleBridge] Worker not initialized",
    );
    await expect(bridge.cancelAdventureTurn("t")).rejects.toThrow(
      "[OracleBridge] Worker not initialized",
    );
    expect(loadWorker).toHaveBeenCalledTimes(1);
  });

  it("terminate before any start leaves the bridge unready", () => {
    bridge.terminate();
    expect(bridge.isReady).toBe(false);
    expect(loadWorker).not.toHaveBeenCalled();
  });
});
