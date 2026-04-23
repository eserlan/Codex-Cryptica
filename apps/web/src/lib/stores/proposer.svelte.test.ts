import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockVault,
  mockOracle,
  mockUiStore,
  mockDebugStore,
  mockAnalyzeEntity,
  mockVaultEventBus,
} = vi.hoisted(() => ({
  mockVault: {
    activeVaultId: "test-vault" as string | null,
    entities: {} as Record<string, any>,
    inboundConnections: {} as Record<string, any>,
    allEntities: [] as any[],
    addConnection: vi.fn().mockResolvedValue(true),
    removeConnection: vi.fn().mockResolvedValue(true),
    selectedEntityId: null as string | null,
  },
  mockOracle: {
    effectiveApiKey: "test-key",
  },
  mockUiStore: {
    aiDisabled: false,
    connectionDiscoveryMode: "suggest",
  },
  mockDebugStore: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  mockAnalyzeEntity: vi.fn(),
  mockVaultEventBus: {
    subscribe: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock("./vault.svelte", () => ({ vault: mockVault }));
vi.mock("./oracle.svelte", () => ({ oracle: mockOracle }));
vi.mock("./ui.svelte", () => ({ uiStore: mockUiStore }));
vi.mock("./debug.svelte", () => ({ debugStore: mockDebugStore }));
vi.mock("./vault/events", () => ({ vaultEventBus: mockVaultEventBus }));
vi.mock("../cloud-bridge/proposer-bridge", () => ({
  proposerBridge: { analyzeEntity: mockAnalyzeEntity },
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
  clearVault: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@codex/proposer", () => ({
  ProposerService: class {
    constructor() {
      return mockService;
    }
  },
}));

const mockProposal = {
  id: "v:s:t",
  vaultId: "test-vault",
  sourceId: "s",
  targetId: "t",
  type: "related_to",
  context: "c",
  reason: "r",
  confidence: 0.9,
  status: "pending" as const,
  timestamp: 1,
};

describe("proposerStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    mockVault.entities = {
      s: { id: "s", title: "S", connections: [] },
      t: { id: "t", title: "T", connections: [] },
    };
    mockVault.allEntities = Object.values(mockVault.entities);
    mockVault.activeVaultId = "test-vault";
    mockVault.selectedEntityId = "s";
    mockUiStore.aiDisabled = false;
    mockAnalyzeEntity.mockResolvedValue([]);

    const { proposerStore } = await import("./proposer.svelte");
    proposerStore.reset();
  });

  it("handles basic lifecycle", async () => {
    const { proposerStore } = await import("./proposer.svelte");
    expect(mockVaultEventBus.subscribe).toHaveBeenCalled();

    mockService.getProposals.mockResolvedValue([mockProposal]);
    await proposerStore.loadProposals("s");
    expect(proposerStore.proposals["s"]).toHaveLength(1);

    await proposerStore.loadGlobalProposals();
    expect(mockService.getAllPendingProposals).toHaveBeenCalled();
  });

  it("handles analysis branches", async () => {
    const { proposerStore } = await import("./proposer.svelte");
    mockAnalyzeEntity.mockResolvedValue([mockProposal]);
    await proposerStore.analyzeEntityById("s");
    expect(proposerStore.proposals["s"]).toHaveLength(1);

    // Skip if disabled
    mockUiStore.aiDisabled = true;
    await proposerStore.analyzeCurrentEntity();
    expect(mockAnalyzeEntity).toHaveBeenCalledTimes(1);

    // Skip if no vault
    mockUiStore.aiDisabled = false;
    mockVault.activeVaultId = null;
    await proposerStore.analyzeEntityById("s");
    expect(mockAnalyzeEntity).toHaveBeenCalledTimes(1);
  });

  it("handles apply and dismiss branches", async () => {
    const { proposerStore } = await import("./proposer.svelte");
    const p = { ...mockProposal, sourceId: "s", targetId: "t" };
    proposerStore.proposals["s"] = [p];

    await proposerStore.apply(p);
    expect(mockVault.addConnection).toHaveBeenCalled();
    expect(proposerStore.proposals["s"]).toHaveLength(0);

    // Dismiss with history
    proposerStore.proposals["s"] = [p];
    await proposerStore.dismiss(p);
    expect(mockService.dismissProposal).toHaveBeenCalled();
    expect(proposerStore.history["s"]).toHaveLength(1);
  });

  it("handles verify and undo branches", async () => {
    const { proposerStore } = await import("./proposer.svelte");
    const p = { ...mockProposal, sourceId: "s", targetId: "t" };
    proposerStore.allAcceptedProposals = [p];
    proposerStore.proposals["s"] = [p];

    await proposerStore.verify(p);
    expect(mockService.verifyProposal).toHaveBeenCalled();
    expect(proposerStore.allVerifiedProposals).toHaveLength(1);

    await proposerStore.undo(p);
    expect(mockVault.removeConnection).toHaveBeenCalled();
  });

  it("handles reEvaluate", async () => {
    const { proposerStore } = await import("./proposer.svelte");
    const p = { ...mockProposal, sourceId: "s", targetId: "t" };
    proposerStore.history["s"] = [p];

    await proposerStore.reEvaluate(p);
    expect(mockService.reEvaluateProposal).toHaveBeenCalled();
    expect(proposerStore.history["s"]).toHaveLength(0);
    expect(proposerStore.proposals["s"]).toHaveLength(1);
  });

  it("handles vault cleanup", async () => {
    const { proposerStore } = await import("./proposer.svelte");
    proposerStore.allPendingProposals = [mockProposal];
    mockVault.activeVaultId = "test-vault";
    await proposerStore.clearVault("test-vault");
    expect(mockService.clearVault).toHaveBeenCalledWith("test-vault");
    expect(proposerStore.allPendingProposals).toHaveLength(0);
  });
});
