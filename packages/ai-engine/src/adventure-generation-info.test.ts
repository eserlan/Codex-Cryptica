import { describe, expect, it, vi } from "vitest";
import { AdventureTurnGenerationService } from "./adventure-turn-generation.service";
import { InteractionExpiredError } from "./client-manager";
import {
  session,
  completeResponse,
} from "./adventure-generation.test-fixtures";

if (typeof navigator === "undefined") {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    writable: true,
  });
}

const request = {
  session,
  phase: "opening" as const,
  anchors: [],
  relevant: [],
};

describe("generation info classification (#5112)", () => {
  it("classifies stateless generation when no interaction client exists", async () => {
    const service = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
    });
    const result = await service.generate(request);
    expect(result.generationInfo).toMatchObject({
      transport: "stateless",
      modelKey: "luna-fast",
      threadMode: "new",
    });
    expect(result.generationInfo?.requestChars).toBeGreaterThan(0);
    expect(result.generationInfo?.sourceCounts).toEqual({
      anchors: 0,
      relevant: 0,
    });
    expect(result.generationInfo?.scenarioIds).toEqual([]);
  });

  it("classifies stateless fallback after a retained-history failure", async () => {
    const service = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
      sendInteraction: vi.fn(async () => {
        throw new Error("interaction-stream-unavailable");
      }),
    });
    const result = await service.generate(request);
    expect(result.generationInfo).toMatchObject({
      transport: "stateless",
      modelKey: "luna-fast",
      threadMode: "new",
    });
  });

  it("classifies interaction generation with its effective reasoning effort", async () => {
    const service = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
      sendInteraction: vi.fn(async () => ({
        id: "interaction-1",
        text: completeResponse,
      })),
    });
    const result = await service.generate(request, {
      reasoningEffort: "high",
    });
    expect(result.generationInfo).toMatchObject({
      transport: "interaction",
      modelKey: "luna-fast",
      reasoningEffort: "high",
      threadMode: "new",
    });
  });

  it("defaults interaction reasoning effort to the service default", async () => {
    const service = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
      sendInteraction: vi.fn(async () => ({
        id: "interaction-1",
        text: completeResponse,
      })),
    });
    const result = await service.generate(request);
    expect(result.generationInfo).toMatchObject({
      transport: "interaction",
      modelKey: "luna-fast",
      reasoningEffort: "low",
      threadMode: "new",
    });
  });

  it("reports continued provider history only after the prior turn is confirmed", async () => {
    const service = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
      sendInteraction: vi.fn(async () => ({
        id: "interaction-1",
        text: completeResponse,
      })),
    });

    const first = await service.generate(request);
    expect(first.generationInfo?.threadMode).toBe("new");
    service.confirmInteraction(session.id, 1);
    const second = await service.generate({
      ...request,
      session: { ...session, revision: 1 },
    });

    expect(second.generationInfo).toMatchObject({
      transport: "interaction",
      threadMode: "continued",
    });
  });

  it("reports a provider-expiry reset when a fresh interaction succeeds", async () => {
    let calls = 0;
    const service = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
      sendInteraction: vi.fn(async () => {
        calls += 1;
        if (calls === 1) throw new InteractionExpiredError("expired");
        return { id: "interaction-fresh", text: completeResponse };
      }),
    });

    const result = await service.generate(request);

    expect(result.generationInfo).toMatchObject({
      transport: "interaction",
      threadMode: "reset",
      resetReason: "provider-expiry",
    });
    expect(calls).toBe(2);
  });

  it("records nothing extra on the proposal beyond generationInfo", async () => {
    const service = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
    });
    const result = await service.generate(request);
    expect(result.kind).toBe("complete");
    expect(Object.keys(result)).not.toContain("modelKey");
  });
});
