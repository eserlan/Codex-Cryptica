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

  it("traces Director delivery for enabled, disabled, retained, stateless fallback, and retry recovery (#5195)", async () => {
    const { buildAdventurePrompt } = await import("@codex/adventure-engine");
    const { computeDirectorDeliveryTrace } =
      await import("./adventure-interaction-input");

    // 1. Director enabled (stateless): included with deliveredChars > 0
    const statelessService = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
    });
    const enabledRes = await statelessService.generate(request);
    expect(enabledRes.generationInfo?.directorDelivery).toMatchObject({
      status: "included",
      reason: "delivered",
      recoveryReason: "none",
    });
    expect(
      enabledRes.generationInfo?.directorDelivery?.deliveredChars,
    ).toBeGreaterThan(0);

    // 2. Director disabled: omitted with reason "disabled" and deliveredChars 0
    const disabledRes = await statelessService.generate({
      ...request,
      directorEnabled: false,
    });
    expect(disabledRes.generationInfo?.directorDelivery).toMatchObject({
      status: "omitted",
      reason: "disabled",
      deliveredChars: 0,
    });

    // 3. Budget-truncated and budget-omitted prompts
    const built = buildAdventurePrompt({
      ...request,
      directorEnabled: true,
    });
    const parsedState = JSON.parse(built.state) as Record<string, unknown>;
    const truncatedPrompt = {
      ...built,
      directorMeta: { ...built.directorMeta!, truncatedByBudget: true },
    };
    expect(
      computeDirectorDeliveryTrace(
        truncatedPrompt,
        { state: parsedState },
        parsedState,
        false,
      ),
    ).toMatchObject({ status: "truncated", reason: "budget" });

    const { "GM-ONLY director brief": _drop, ...withoutBrief } = parsedState;
    const omittedPrompt = {
      ...built,
      directorMeta: { ...built.directorMeta!, omittedByBudget: true },
    };
    expect(
      computeDirectorDeliveryTrace(
        omittedPrompt,
        { state: withoutBrief },
        withoutBrief,
        false,
      ),
    ).toMatchObject({ status: "omitted", reason: "budget", deliveredChars: 0 });

    // 4. Retained interaction (delta unchanged -> retained; expiry retry -> included)
    let calls = 0;
    const interactionService = new AdventureTurnGenerationService({
      getModel: async () => ({
        async generateContent() {
          return { response: { text: () => completeResponse } };
        },
      }),
      sendInteraction: vi.fn(async () => {
        calls += 1;
        if (calls === 2) throw new InteractionExpiredError("expired");
        return { id: `int-${calls}`, text: completeResponse };
      }),
    });
    const first = await interactionService.generate(request);
    expect(first.generationInfo?.directorDelivery?.status).toBe("included");
    interactionService.confirmInteraction(session.id, session.revision + 1);

    // Second call expires on attempt 1 and succeeds on attempt 2 (full state resent)
    const retried = await interactionService.generate({
      ...request,
      session: { ...session, revision: session.revision + 1 },
      phase: "action",
      playerAction: "Look around",
    });
    expect(retried.generationInfo?.directorDelivery?.status).toBe("included");
    expect(
      retried.generationInfo?.directorDelivery?.deliveredChars,
    ).toBeGreaterThan(0);
    interactionService.confirmInteraction(session.id, session.revision + 2);

    // Third call with identical brief in delta -> retained
    const continued = await interactionService.generate({
      ...request,
      session: { ...session, revision: session.revision + 2 },
      phase: "action",
      playerAction: "Look around",
    });
    expect(continued.generationInfo?.directorDelivery).toMatchObject({
      status: "retained",
      reason: "retained-unchanged",
      deliveredChars: 0,
    });
  });
});
