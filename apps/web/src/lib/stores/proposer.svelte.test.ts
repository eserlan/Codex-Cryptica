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
      },
    ],
    addConnection: vi.fn().mockResolvedValue(true),
    removeConnection: vi.fn().mockResolvedValue(true),
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
  getAllAcceptedProposals: vi.fn().mockResolvedValue([]),
  getAllPendingProposals: vi.fn().mockResolvedValue([]),
  getAllVerifiedProposals: vi.fn().mockResolvedValue([]),
  saveProposals: vi.fn().mockResolvedValue(undefined),
  applyProposal: vi.fn().mockResolvedValue(undefined),
  dismissProposal: vi.fn().mockResolvedValue(undefined),
  verifyProposal: vi.fn().mockResolvedValue(undefined),
  reEvaluateProposal: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@codex/proposer", () => ({
  ProposerService: class {
    constructor() {
      return mockService;
    }
  },
}));

const mockProposal = {
  id: "source:target",
  sourceId: "source",
  targetId: "target",
  type: "related_to",
  context: "context",
  reason: "reason",
  confidence: 0.9,
  status: "pending" as const,
  timestamp: 1,
};

describe("proposerStore", () => {
  beforeEach(() => {
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

  it("loads global proposals for assessment", async () => {
    const pending = [{ ...mockProposal, id: "p1" }];
    const accepted = [
      { ...mockProposal, id: "a1", status: "accepted" as const },
    ];
    const verified = [
      { ...mockProposal, id: "v1", status: "verified" as const },
    ];

    mockService.getAllPendingProposals.mockResolvedValue(pending);
    mockService.getAllAcceptedProposals.mockResolvedValue(accepted);
    mockService.getAllVerifiedProposals.mockResolvedValue(verified);

    const { proposerStore } = await import("./proposer.svelte");
    await proposerStore.loadGlobalProposals();

    expect(proposerStore.allPendingProposals).toEqual(pending);
    expect(proposerStore.allAcceptedProposals).toEqual(accepted);
    expect(proposerStore.allVerifiedProposals).toEqual(verified);
  });

  it("verifies an accepted proposal", async () => {
    const proposal = { ...mockProposal, id: "a1", status: "accepted" as const };
    const { proposerStore } = await import("./proposer.svelte");
    proposerStore.allAcceptedProposals = [proposal];

    await proposerStore.verify(proposal);

    expect(mockService.verifyProposal).toHaveBeenCalledWith(proposal.id);
    expect(proposerStore.allAcceptedProposals).toHaveLength(0);
    expect(proposerStore.allVerifiedProposals).toContainEqual(proposal);
  });

  it("undos an accepted proposal", async () => {
    const proposal = { ...mockProposal, id: "a1", status: "accepted" as const };
    const { proposerStore } = await import("./proposer.svelte");
    proposerStore.allAcceptedProposals = [proposal];

    await proposerStore.undo(proposal);

    expect(mockVault.removeConnection).toHaveBeenCalledWith(
      proposal.sourceId,
      proposal.targetId,
      proposal.type,
    );
    expect(mockService.dismissProposal).toHaveBeenCalledWith(proposal.id);
    expect(proposerStore.allAcceptedProposals).toHaveLength(0);
    expect(proposerStore.history[proposal.sourceId]).toContainEqual(proposal);
  });
});
