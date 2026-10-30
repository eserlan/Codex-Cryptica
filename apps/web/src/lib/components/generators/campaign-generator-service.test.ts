import { describe, expect, it, vi } from "vitest";
import type { CampaignGeneratorServiceDeps } from "generator-engine";
const captured = vi.hoisted(() => ({
  deps: null as CampaignGeneratorServiceDeps | null,
}));
vi.mock("generator-engine", async () => {
  const actual =
    await vi.importActual<typeof import("generator-engine")>(
      "generator-engine",
    );
  return {
    ...actual,
    CampaignGeneratorService: class {
      constructor(deps: CampaignGeneratorServiceDeps) {
        captured.deps = deps;
      }
    },
  };
});
import { createCampaignGeneratorService } from "./campaign-generator-service";

function setup() {
  const deps = {
    vault: {
      isGuest: false,
      createEntity: vi.fn(async () => "new"),
      addConnection: vi.fn(async () => {}),
    },
    aiGeneratorGateway: {},
    generatorSessionManager: {
      commitInteraction: vi.fn(),
      recordPromptMetrics: vi.fn(),
    },
  };
  let policy = { isEnabled: true, isAvailable: true };
  createCampaignGeneratorService(
    () => policy,
    deps as unknown as Parameters<typeof createCampaignGeneratorService>[1],
  );
  return {
    deps,
    adapter: captured.deps!,
    setPolicy(value: typeof policy) {
      policy = value;
    },
  };
}

describe("campaign generator app adapter", () => {
  it("delegates persistence and reads the current guest and AI policies", async () => {
    const { deps, adapter, setPolicy } = setup();
    expect(adapter.vault!.canWrite()).toBe(true);
    deps.vault.isGuest = true;
    expect(adapter.vault!.canWrite()).toBe(false);
    setPolicy({ isEnabled: false, isAvailable: false });
    expect(adapter.aiPolicy?.isEnabled).toBe(false);
    await adapter.vault!.createEntity("location", "Harbour", { labels: [] });
    await adapter.vault!.addConnection!("one", "two", "related");
    expect(deps.vault.createEntity).toHaveBeenCalledWith(
      "location",
      "Harbour",
      { labels: [] },
    );
    expect(deps.vault.addConnection).toHaveBeenCalledWith(
      "one",
      "two",
      "related",
    );
  });

  it("commits identified interactions and ignores results without an interaction id", () => {
    const { deps, adapter } = setup();
    adapter.onInteractionResult!({ text: "result", usedInteraction: false });
    expect(
      deps.generatorSessionManager.commitInteraction,
    ).not.toHaveBeenCalled();
    adapter.onInteractionResult!({
      text: "result",
      usedInteraction: true,
      interactionId: "turn",
      replayed: true,
    });
    expect(deps.generatorSessionManager.commitInteraction).toHaveBeenCalledWith(
      "turn",
      true,
    );
    const metrics = {} as Parameters<
      NonNullable<CampaignGeneratorServiceDeps["onPromptMetrics"]>
    >[0];
    adapter.onPromptMetrics!(metrics);
    expect(
      deps.generatorSessionManager.recordPromptMetrics,
    ).toHaveBeenCalledWith(metrics);
  });
  it("records staged diagnostics as counts without including generated issue text", () => {
    const { adapter } = setup();
    const log = vi.spyOn(console, "debug").mockImplementation(() => {});
    const stats = {
      outcome: "staged" as const,
      aiCalls: 4,
      elapsedMs: 12,
      repairedStages: [],
      reviewIssues: ["PRIVATE"],
      reviewSkipped: false,
      coherenceRepaired: false,
      remainingIssues: ["PRIVATE"],
    };
    adapter.onDungeonStagedStats!(stats);
    adapter.onAdventureStagedStats!(stats);
    adapter.onHeistStagedStats!(stats);
    adapter.onTomeStagedStats!(stats);
    expect(log).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE");
    log.mockRestore();
  });
});
