/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DetailProposals from "./DetailProposals.svelte";
import { proposerStore } from "$lib/stores/proposer.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";

vi.mock("$lib/stores/proposer.svelte", () => {
  const mockProposerStore = {
    getActiveProposalsForEntity: vi.fn().mockReturnValue([]),
    getActiveHistoryForEntity: vi.fn().mockReturnValue([]),
    isEntityAnalyzing: vi.fn().mockReturnValue(false),
    analyzeEntityById: vi.fn().mockResolvedValue(undefined),
    loadProposals: vi.fn().mockResolvedValue(undefined),
    apply: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
  };
  return { proposerStore: mockProposerStore };
});

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    selectedEntityId: "entity-1",
    status: "idle",
    isGuest: false,
    entities: {
      "entity-1": { id: "entity-1", title: "Entity 1", connections: [] },
      "target-1": { id: "target-1", title: "Target 1" },
      "target-2": { id: "target-2", title: "Target 2" },
      "target-3": { id: "target-3", title: "Target 3" },
      "target-4": { id: "target-4", title: "Target 4" },
      "target-5": { id: "target-5", title: "Target 5" },
    },
    inboundConnections: {} as Record<string, any[]>,
  },
}));

vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: {
    aiDisabled: false,
  },
}));

// Mock ProposalHistory sub-component to simplify tests
vi.mock("./ProposalHistory.svelte", () => ({
  default: vi.fn(),
}));

describe("DetailProposals Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vault.selectedEntityId = "entity-1";
    vault.status = "idle";
    vault.isGuest = false;
    vault.entities["entity-1"] = {
      id: "entity-1",
      title: "Entity 1",
      connections: [],
    };
    vault.inboundConnections = {};
    discoveryPolicyStore.aiDisabled = false;
    (proposerStore.getActiveProposalsForEntity as any).mockReturnValue([]);
    (proposerStore.getActiveHistoryForEntity as any).mockReturnValue([]);
    (proposerStore.isEntityAnalyzing as any).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("calls proposerStore.loadProposals when activeEntityId is set", async () => {
    render(DetailProposals, { isEditing: false });

    // Svelte 5 effects run asynchronously, so let's flush microtasks
    await vi.runAllTimersAsync();

    expect(proposerStore.loadProposals).toHaveBeenCalledWith("entity-1", true);
  });

  it("auto-proposes when total connection count (outbound + inbound) is <= 4", async () => {
    // entity-1 has 2 outbound + 1 inbound = 3 total connections (below threshold)
    vault.entities["entity-1"].connections = [
      { target: "t1" },
      { target: "t2" },
    ];
    vault.inboundConnections["entity-1"] = [{ sourceId: "t3" }];
    const mockProposals = [
      {
        id: "1",
        targetId: "target-1",
        type: "related",
        confidence: 0.9,
        reason: "Reason 1",
      },
    ];
    (proposerStore.getActiveProposalsForEntity as any).mockReturnValue(
      mockProposals,
    );

    render(DetailProposals, { isEditing: false });

    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();

    expect(proposerStore.analyzeEntityById).toHaveBeenCalledWith(
      "entity-1",
      true,
    );
    expect(
      screen.queryByLabelText("Look for connection proposals manually"),
    ).toBeNull();
  });

  it("skips auto-proposing when outbound + inbound connections > 4 and renders manual button", async () => {
    // entity-1 has 3 outbound + 2 inbound = 5 total connections (above threshold)
    vault.entities["entity-1"].connections = [
      { target: "t1" },
      { target: "t2" },
      { target: "t3" },
    ];
    vault.inboundConnections["entity-1"] = [
      { sourceId: "t4" },
      { sourceId: "t5" },
    ];
    const mockProposals = [
      {
        id: "1",
        targetId: "target-1",
        type: "related",
        confidence: 0.9,
        reason: "Reason 1",
      },
    ];
    (proposerStore.getActiveProposalsForEntity as any).mockReturnValue(
      mockProposals,
    );

    render(DetailProposals, { isEditing: false });

    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();

    expect(proposerStore.analyzeEntityById).not.toHaveBeenCalled();

    const button = screen.getByLabelText(
      "Look for connection proposals manually",
    );
    expect(button).toBeTruthy();
    expect(button.textContent).toContain("Look for Connection Proposals");

    await fireEvent.click(button);
    expect(proposerStore.analyzeEntityById).toHaveBeenCalledWith(
      "entity-1",
      true,
      undefined,
      true,
    );
  });

  it("shows loading and disabled state when analyzing is true", async () => {
    vault.entities["entity-1"].connections = [
      { target: "t1" },
      { target: "t2" },
      { target: "t3" },
    ];
    vault.inboundConnections["entity-1"] = [
      { sourceId: "t4" },
      { sourceId: "t5" },
    ];
    const mockProposals = [
      {
        id: "1",
        targetId: "target-1",
        type: "related",
        confidence: 0.9,
        reason: "Reason 1",
      },
    ];
    (proposerStore.getActiveProposalsForEntity as any).mockReturnValue(
      mockProposals,
    );
    (proposerStore.isEntityAnalyzing as any).mockReturnValue(true);

    render(DetailProposals, { isEditing: false });
    await vi.runOnlyPendingTimersAsync();

    const button = screen.getByLabelText(
      "Look for connection proposals manually",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Looking for Proposals...");
  });

  it("renders section with manual button when suppressed but zero pending proposals and history", async () => {
    // 5 total connections → suppressed, but no proposals or history at all
    vault.entities["entity-1"].connections = [
      { target: "t1" },
      { target: "t2" },
      { target: "t3" },
    ];
    vault.inboundConnections["entity-1"] = [
      { sourceId: "t4" },
      { sourceId: "t5" },
    ];
    // both mocks already return [] by default

    render(DetailProposals, { isEditing: false });
    await vi.runOnlyPendingTimersAsync();

    const button = screen.getByLabelText(
      "Look for connection proposals manually",
    );
    expect(button).toBeTruthy();
    expect(button.textContent).toContain("Look for Connection Proposals");
    expect(proposerStore.analyzeEntityById).not.toHaveBeenCalled();
  });

  it("keeps auto-proposing suppressed when connection count drops below 5 mid-session", async () => {
    // Start with 5 total connections (3 outbound + 2 inbound) → suppressed
    vault.entities["entity-1"].connections = [
      { target: "t1" },
      { target: "t2" },
      { target: "t3" },
    ];
    vault.inboundConnections["entity-1"] = [
      { sourceId: "t4" },
      { sourceId: "t5" },
    ];
    const mockProposals = [
      {
        id: "1",
        targetId: "target-1",
        type: "related",
        confidence: 0.9,
        reason: "Reason 1",
      },
    ];
    (proposerStore.getActiveProposalsForEntity as any).mockReturnValue(
      mockProposals,
    );

    const { rerender } = render(DetailProposals, { isEditing: false });

    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();

    expect(proposerStore.analyzeEntityById).not.toHaveBeenCalled();

    // Simulate connections dropping below threshold mid-session
    vault.entities["entity-1"].connections = [{ target: "t1" }];
    vault.inboundConnections["entity-1"] = [];
    await rerender({ isEditing: false });

    vi.advanceTimersByTime(1000);
    await vi.runOnlyPendingTimersAsync();

    // Suppression set on navigation should persist for this session
    expect(proposerStore.analyzeEntityById).not.toHaveBeenCalled();
  });
});
