import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Comlink from "comlink";

// Mock environment and worker
vi.mock("$app/environment", () => ({
  browser: true,
}));

const { releaseProxySymbol } = vi.hoisted(() => ({
  releaseProxySymbol: Symbol("releaseProxy")
}));

vi.mock("comlink", () => ({
  wrap: vi.fn().mockReturnValue({
    generateResponse: vi.fn(),
    expandQuery: vi.fn(),
    [releaseProxySymbol]: vi.fn(),
  }),
  releaseProxy: releaseProxySymbol,
}));

// Mock worker import
vi.mock("$lib/workers/oracle.worker?worker", () => {
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
    expect(() => bridge.textGeneration).toThrow("[OracleBridge] Worker not initialized");
  });

  it("should throw error if draftingEngine is accessed before init", () => {
    (bridge as any).api = null;
    expect(() => bridge.draftingEngine).toThrow("[OracleBridge] Worker not initialized");
  });

  it("should handle worker initialization failure", () => {
    vi.mocked(Comlink.wrap).mockImplementationOnce(() => {
      throw new Error("Init fail");
    });
    
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failBridge = new OracleBridge();
    
    expect(failBridge.isReady).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to initialize OracleWorker"), expect.any(Error));
    consoleSpy.mockRestore();
  });
});
