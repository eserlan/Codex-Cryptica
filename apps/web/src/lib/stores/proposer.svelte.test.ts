import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockVault,
  mockOracle,
  mockUiStore,
  mockDebugStore,
  mockAnalyzeEntity,
} = vi.hoisted(() => ({
  mockVault: {
    entities: {
      source: {
        id: "source",
        title: "Source",
        content: "Source content",
        lore: "Source lore",
        connections: [],
      },
      target: {
        id: "target",
        title: "Target",
        content: "Target content",
        lore: "Target lore",
        connections: [],
      },
    },
    inboundConnections: {},
    allEntities: [
      {
        id: "source",
        title: "Source",
        content: "Source content",
        lore: "Source lore",
        connections: [],
      },
      {
        id: "target",
        title: "Target",
        content: "Target content",
        lore: "Target lore",
        connections: [],
      },
    ],
    addConnection: vi.fn().mockResolvedValue(true),
    selectedEntityId: null,
  },
  mockOracle: {
    effectiveApiKey: "test-key",
  },
  mockUiStore: {
    aiDisabled: false,
  },
  mockDebugStore: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  mockAnalyzeEntity: vi.fn(),
}));

vi.mock("./vault.svelte", () => ({
  vault: mockVault,
}));

vi.mock("./oracle.svelte", () => ({
  oracle: mockOracle,
}));

vi.mock("./ui.svelte", () => ({
  uiStore: mockUiStore,
}));

vi.mock("./debug.svelte", () => ({
  debugStore: mockDebugStore,
}));

vi.mock("../cloud-bridge/proposer-bridge", () => ({
  proposerBridge: {
    analyzeEntity: mockAnalyzeEntity,
  },
}));

vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({}),
  DB_NAME: "test-db",
  DB_VERSION: 1,
}));

const mockService = {
  getProposals: vi.fn().mockResolvedValue([]),
  getHistory: vi.fn().mockResolvedValue([]),
  saveProposals: vi.fn().mockResolvedValue(undefined),
  applyProposal: vi.fn().mockResolvedValue(undefined),
  dismissProposal: vi.fn().mockResolvedValue(undefined),
  reEvaluateProposal: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@codex/proposer", () => ({
  ProposerService: class {
    constructor() {
      return mockService;
    }
  },
}));

describe("proposerStore", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockVault.selectedEntityId = null;
  });

  it("logs analysis and application details when applying discovered connections", async () => {
    mockAnalyzeEntity.mockResolvedValue([
      {
        id: "source:target",
        sourceId: "source",
        targetId: "target",
        type: "related_to",
        context: "Source is tied to Target",
        reason: "Semantic overlap",
        confidence: 0.93,
        status: "pending",
        timestamp: 1,
      },
    ]);

    const { proposerStore } = await import("./proposer.svelte");
    const appliedCount =
      await proposerStore.analyzeAndApplyEntityById("source");

    expect(appliedCount).toBe(1);
    expect(mockVault.addConnection).toHaveBeenCalledWith(
      "source",
      "target",
      "related_to",
    );
    expect(mockDebugStore.log).toHaveBeenCalledWith(
      "[ProposerStore] Starting connection analysis",
      expect.objectContaining({
        entityId: "source",
        targetCount: 1,
      }),
    );
    expect(mockDebugStore.log).toHaveBeenCalledWith(
      "[ProposerStore] Connection analysis completed",
      expect.objectContaining({
        entityId: "source",
        rawProposalCount: 1,
        addedProposalCount: 1,
      }),
    );
    expect(mockDebugStore.log).toHaveBeenCalledWith(
      "[ProposerStore] Applied connection proposal",
      expect.objectContaining({
        proposalId: "source:target",
        sourceId: "source",
        targetId: "target",
      }),
    );
    expect(mockDebugStore.log).toHaveBeenCalledWith(
      "[ProposerStore] Finished applying connection proposals",
      expect.objectContaining({
        entityId: "source",
        appliedCount: 1,
        failedCount: 0,
      }),
    );
  });

  it("keeps the global analysis state active until concurrent entity analyses finish", async () => {
    let resolveSource: (value: []) => void = () => {};
    let resolveTarget: (value: []) => void = () => {};

    mockAnalyzeEntity.mockImplementation(
      (_apiKey: string, _modelName: string, entityId: string): Promise<[]> =>
        new Promise((resolve) => {
          if (entityId === "source") {
            resolveSource = resolve;
          } else if (entityId === "target") {
            resolveTarget = resolve;
          }
        }),
    );

    const { proposerStore } = await import("./proposer.svelte");

    const sourceRun = proposerStore.analyzeEntityById("source");
    await vi.waitFor(() => {
      expect(proposerStore.isEntityAnalyzing("source")).toBe(true);
      expect(mockAnalyzeEntity).toHaveBeenCalledWith(
        "test-key",
        expect.any(String),
        "source",
        expect.any(String),
        expect.any(Array),
      );
    });

    const targetRun = proposerStore.analyzeEntityById("target");
    await vi.waitFor(() => {
      expect(proposerStore.isEntityAnalyzing("target")).toBe(true);
      expect(mockAnalyzeEntity).toHaveBeenCalledWith(
        "test-key",
        expect.any(String),
        "target",
        expect.any(String),
        expect.any(Array),
      );
    });

    resolveSource([]);
    await sourceRun;

    expect(proposerStore.isEntityAnalyzing("source")).toBe(false);
    expect(proposerStore.isEntityAnalyzing("target")).toBe(true);
    expect(proposerStore.isAnalyzing).toBe(true);

    resolveTarget([]);
    await targetRun;

    expect(proposerStore.isEntityAnalyzing("target")).toBe(false);
    expect(proposerStore.isAnalyzing).toBe(false);
  });
});
