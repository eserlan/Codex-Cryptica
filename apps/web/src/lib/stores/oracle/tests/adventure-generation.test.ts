import { afterEach, describe, expect, it, vi } from "vitest";
import { adventureTurnGenerationService } from "@codex/ai-engine";
import { oracleBridge } from "#lib/cloud-bridge/oracle-bridge.js";
import {
  abortReason,
  defaultGenerationService,
  clearDefaultGenerationInteraction,
  confirmDefaultGenerationInteraction,
} from "../adventure-generation.svelte";
import { completeProposal } from "./adventure-fixtures";

const bridgeState = vi.hoisted(() => ({ ready: false }));

vi.mock("#lib/cloud-bridge/oracle-bridge.js", () => ({
  oracleBridge: {
    get isReady() {
      return bridgeState.ready;
    },
    generateAdventureTurn: vi.fn(),
    cancelAdventureTurn: vi.fn(async () => undefined),
    clearAdventureInteraction: vi.fn(),
    confirmAdventureInteraction: vi.fn(),
  },
}));
vi.mock("@codex/ai-engine", () => ({
  adventureTurnGenerationService: {
    generate: vi.fn(),
    clearInteraction: vi.fn(),
    confirmInteraction: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  bridgeState.ready = false;
});

describe("adventure generation adapter", () => {
  it("uses the local service while the worker is unavailable", async () => {
    vi.mocked(adventureTurnGenerationService.generate).mockResolvedValue(
      completeProposal,
    );
    const request = { phase: "opening" } as any;
    expect(await defaultGenerationService().generate(request)).toBe(
      completeProposal,
    );
    expect(adventureTurnGenerationService.generate).toHaveBeenCalledWith(
      request,
      undefined,
    );
    await clearDefaultGenerationInteraction("session");
    expect(
      adventureTurnGenerationService.clearInteraction,
    ).toHaveBeenCalledWith("session");
    await confirmDefaultGenerationInteraction("session", 1);
    expect(
      adventureTurnGenerationService.confirmInteraction,
    ).toHaveBeenCalledWith("session", 1);
  });

  it("keeps callbacks and signals outside the cloneable worker request and forwards cancellation", async () => {
    bridgeState.ready = true;
    let finish!: (value: typeof completeProposal) => void;
    vi.mocked(oracleBridge.generateAdventureTurn).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }) as any,
    );
    const controller = new AbortController();
    const onNarration = vi.fn();
    const pending = defaultGenerationService().generate(
      { phase: "action", signal: controller.signal, onNarration } as any,
      { signal: controller.signal },
    );
    const [request, requestId, options, narration] = vi.mocked(
      oracleBridge.generateAdventureTurn,
    ).mock.calls[0];
    expect(request).toEqual({ phase: "action" });
    expect(options).toEqual({});
    expect(narration).toBe(onNarration);
    controller.abort();
    expect(oracleBridge.cancelAdventureTurn).toHaveBeenCalledWith(requestId);
    finish(completeProposal);
    await pending;
    await clearDefaultGenerationInteraction("session");
    expect(oracleBridge.clearAdventureInteraction).toHaveBeenCalledWith(
      "session",
    );
    await confirmDefaultGenerationInteraction("session", 1);
    expect(oracleBridge.confirmAdventureInteraction).toHaveBeenCalledWith(
      "session",
      1,
    );
  });

  it("rejects an already cancelled request before contacting the worker", () => {
    bridgeState.ready = true;
    const controller = new AbortController();
    controller.abort();
    expect(abortReason(controller.signal)).toBe(controller.signal.reason);
    expect(() =>
      defaultGenerationService().generate({ signal: controller.signal } as any),
    ).toThrow("Cancelled");
    expect(oracleBridge.generateAdventureTurn).not.toHaveBeenCalled();
  });

  it("removes the abort listener after a worker failure", async () => {
    bridgeState.ready = true;
    vi.mocked(oracleBridge.generateAdventureTurn).mockRejectedValue(
      new Error("provider-failed"),
    );
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    await expect(
      defaultGenerationService().generate({} as any, {
        signal: controller.signal,
      }),
    ).rejects.toThrow("provider-failed");
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    controller.abort();
    expect(oracleBridge.cancelAdventureTurn).not.toHaveBeenCalled();
  });
});

it.each([false, true])(
  "delivers freshly grounded sources with worker ready=%s",
  async (ready) => {
    const { AdventureGroundingService } =
      await import("#lib/services/adventure/adventure-grounding-service.js");
    const { initialSession } = await import("../adventure-session");
    const { startInput } = await import("./adventure-fixtures");
    bridgeState.ready = ready;
    vi.mocked(adventureTurnGenerationService.generate).mockResolvedValue(
      completeProposal,
    );
    vi.mocked(oracleBridge.generateAdventureTurn).mockResolvedValue(
      completeProposal,
    );
    const sources = [
      {
        recordId: "town",
        displayName: "Town",
        content: "Known town.",
        role: "turn-source" as const,
      },
    ];
    const service = new AdventureGroundingService({
      resolveAnchors: async () => [],
      resolveOpeningRelevant: async () => sources,
      resolveActionRelevant: async () => sources,
    });
    await service.wrap(defaultGenerationService()).generate({
      session: initialSession({
        ...startInput,
        now: "2026-11-03T12:00:00Z",
        idGenerator: () => "session",
      }),
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    const call = ready
      ? vi.mocked(oracleBridge.generateAdventureTurn).mock.calls[0]
      : vi.mocked(adventureTurnGenerationService.generate).mock.calls[0];
    expect(call[0]).toMatchObject({ anchors: [], relevant: sources });
  },
);
