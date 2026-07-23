import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProposerBridge } from "./proposer-bridge";

describe("ProposerBridge", () => {
  let mockWorker: any;

  beforeEach(() => {
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
    };
  });

  it("uses injected IdGenerator for worker request IDs", async () => {
    const mockIdGen = { uuid: vi.fn().mockReturnValue("req-proposer-999") };
    const bridge = new ProposerBridge({
      idGenerator: mockIdGen,
      worker: mockWorker,
    });

    const analyzePromise = bridge.analyzeEntity(
      "key",
      "model",
      "vault-1",
      "entity-1",
      "content",
      [],
    );

    expect(mockIdGen.uuid).toHaveBeenCalled();
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: "ANALYZE",
      id: "req-proposer-999",
      payload: {
        apiKey: "key",
        modelName: "model",
        vaultId: "vault-1",
        entityId: "entity-1",
        content: "content",
        availableTargets: [],
      },
    });

    // Simulate successful worker message
    mockWorker.onmessage({
      data: {
        type: "SUCCESS",
        id: "req-proposer-999",
        payload: [{ id: "prop-1" }],
      },
    });

    const result = await analyzePromise;
    expect(result).toEqual([{ id: "prop-1" }]);
  });

  it("handles worker error responses gracefully", async () => {
    const mockIdGen = { uuid: vi.fn().mockReturnValue("req-proposer-err") };
    const bridge = new ProposerBridge({
      idGenerator: mockIdGen,
      worker: mockWorker,
    });

    const analyzePromise = bridge.analyzeEntity(
      "key",
      "model",
      "vault-1",
      "entity-1",
      "content",
      [],
    );

    // Simulate error worker message
    mockWorker.onmessage({
      data: {
        type: "ERROR",
        id: "req-proposer-err",
        payload: "Analysis failed in worker",
      },
    });

    await expect(analyzePromise).rejects.toThrow("Analysis failed in worker");
  });

  it("returns empty array if worker is not initialized", async () => {
    const bridge = new ProposerBridge({ worker: null });
    const result = await bridge.analyzeEntity("key", "model", "v", "e", "c", []);
    expect(result).toEqual([]);
  });

  it("rejects pending requests when terminated", async () => {
    const mockIdGen = { uuid: vi.fn().mockReturnValue("req-term") };
    const bridge = new ProposerBridge({
      idGenerator: mockIdGen,
      worker: mockWorker,
    });

    const promise = bridge.analyzeEntity("key", "model", "v", "e", "c", []);
    bridge.terminate();

    await expect(promise).rejects.toThrow(
      "Proposer worker terminated while request req-term was pending",
    );
  });
});
