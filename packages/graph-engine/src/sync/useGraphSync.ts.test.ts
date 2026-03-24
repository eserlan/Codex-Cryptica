import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncGraphElements } from "./useGraphSync";
import type { Core } from "cytoscape";

describe("syncGraphElements", () => {
  let mockCy: any;

  beforeEach(() => {
    mockCy = {
      elements: vi.fn().mockReturnValue([]),
      remove: vi.fn(),
      add: vi.fn().mockReturnValue([]),
      batch: vi.fn((cb) => cb()),
      collection: vi.fn(),
      width: vi.fn().mockReturnValue(1000),
      height: vi.fn().mockReturnValue(800),
      viewport: vi.fn(),
      $id: vi.fn().mockReturnValue({ nonempty: vi.fn().mockReturnValue(true) }),
    };
  });

  it("should attempt to sync elements", () => {
    syncGraphElements(mockCy as unknown as Core, {
      elements: [],
      vaultStatus: "idle",
      initialLoaded: false,
      isTemporalMetadataEqual: (a, b) =>
        JSON.stringify(a) === JSON.stringify(b),
    });
    expect(mockCy.elements).toHaveBeenCalled();
  });

  it("should add new nodes", () => {
    const newElements = [{ group: "nodes", data: { id: "node1" } }] as any[];
    syncGraphElements(mockCy as unknown as Core, {
      elements: newElements,
      vaultStatus: "idle",
      initialLoaded: false,
      isTemporalMetadataEqual: (a, b) =>
        JSON.stringify(a) === JSON.stringify(b),
    });
    expect(mockCy.add).toHaveBeenCalled();
  });

  it("should apply label filtering in OR mode", () => {
    const mockNode1 = {
      id: vi.fn().mockReturnValue("node1"),
      data: vi.fn().mockReturnValue({ labels: ["faction-a"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };
    const mockNode2 = {
      id: vi.fn().mockReturnValue("node2"),
      data: vi.fn().mockReturnValue({ labels: ["faction-b"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };
    const mockNode3 = {
      id: vi.fn().mockReturnValue("node3"),
      data: vi.fn().mockReturnValue({ labels: ["faction-a", "faction-b"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };

    mockCy.elements.mockReturnValue([mockNode1, mockNode2, mockNode3]);

    const elements = [
      { group: "nodes", data: { id: "node1", labels: ["faction-a"] } },
      { group: "nodes", data: { id: "node2", labels: ["faction-b"] } },
      {
        group: "nodes",
        data: { id: "node3", labels: ["faction-a", "faction-b"] },
      },
    ] as any[];

    syncGraphElements(mockCy as unknown as Core, {
      elements,
      vaultStatus: "idle",
      initialLoaded: true,
      isTemporalMetadataEqual: (a, b) =>
        JSON.stringify(a) === JSON.stringify(b),
      activeLabels: new Set(["faction-a"]),
      labelFilterMode: "OR",
    });

    // Node1 and Node3 have "faction-a", should be visible (removeClass)
    expect(mockNode1.removeClass).toHaveBeenCalledWith("filtered-out");
    expect(mockNode3.removeClass).toHaveBeenCalledWith("filtered-out");
    // Node2 doesn't have "faction-a", should be hidden (addClass)
    expect(mockNode2.addClass).toHaveBeenCalledWith("filtered-out");
  });

  it("should apply label filtering in AND mode", () => {
    const mockNode1 = {
      id: vi.fn().mockReturnValue("node1"),
      data: vi.fn().mockReturnValue({ labels: ["faction-a"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };
    const mockNode2 = {
      id: vi.fn().mockReturnValue("node2"),
      data: vi.fn().mockReturnValue({ labels: ["faction-b"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };
    const mockNode3 = {
      id: vi.fn().mockReturnValue("node3"),
      data: vi.fn().mockReturnValue({ labels: ["faction-a", "faction-b"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };

    mockCy.elements.mockReturnValue([mockNode1, mockNode2, mockNode3]);

    const elements = [
      { group: "nodes", data: { id: "node1", labels: ["faction-a"] } },
      { group: "nodes", data: { id: "node2", labels: ["faction-b"] } },
      {
        group: "nodes",
        data: { id: "node3", labels: ["faction-a", "faction-b"] },
      },
    ] as any[];

    syncGraphElements(mockCy as unknown as Core, {
      elements,
      vaultStatus: "idle",
      initialLoaded: true,
      isTemporalMetadataEqual: (a, b) =>
        JSON.stringify(a) === JSON.stringify(b),
      activeLabels: new Set(["faction-a", "faction-b"]),
      labelFilterMode: "AND",
    });

    // Only Node3 has both labels
    expect(mockNode3.removeClass).toHaveBeenCalledWith("filtered-out");
    expect(mockNode1.addClass).toHaveBeenCalledWith("filtered-out");
    expect(mockNode2.addClass).toHaveBeenCalledWith("filtered-out");
  });

  it("should show all nodes when no active labels", () => {
    const mockNode1 = {
      id: vi.fn().mockReturnValue("node1"),
      data: vi.fn().mockReturnValue({ labels: ["faction-a"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };
    const mockNode2 = {
      id: vi.fn().mockReturnValue("node2"),
      data: vi.fn().mockReturnValue({ labels: [] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };

    mockCy.elements.mockReturnValue([mockNode1, mockNode2]);

    const elements = [
      { group: "nodes", data: { id: "node1", labels: ["faction-a"] } },
      { group: "nodes", data: { id: "node2", labels: [] } },
    ] as any[];

    syncGraphElements(mockCy as unknown as Core, {
      elements,
      vaultStatus: "idle",
      initialLoaded: true,
      isTemporalMetadataEqual: (a, b) =>
        JSON.stringify(a) === JSON.stringify(b),
      activeLabels: new Set([]), // No active filters
    });

    // All nodes should be visible when no filter is active
    expect(mockNode1.removeClass).toHaveBeenCalledWith("filtered-out");
    expect(mockNode2.removeClass).toHaveBeenCalledWith("filtered-out");
  });

  it("should hide nodes without labels when filter is active", () => {
    const mockNodeWithLabel = {
      id: vi.fn().mockReturnValue("node1"),
      data: vi.fn().mockReturnValue({ labels: ["important"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };
    const mockNodeWithoutLabel = {
      id: vi.fn().mockReturnValue("node2"),
      data: vi.fn().mockReturnValue({ labels: [] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };

    mockCy.elements.mockReturnValue([mockNodeWithLabel, mockNodeWithoutLabel]);

    const elements = [
      { group: "nodes", data: { id: "node1", labels: ["important"] } },
      { group: "nodes", data: { id: "node2", labels: [] } },
    ] as any[];

    syncGraphElements(mockCy as unknown as Core, {
      elements,
      vaultStatus: "idle",
      initialLoaded: true,
      isTemporalMetadataEqual: (a, b) =>
        JSON.stringify(a) === JSON.stringify(b),
      activeLabels: new Set(["important"]),
    });

    expect(mockNodeWithLabel.removeClass).toHaveBeenCalledWith("filtered-out");
    expect(mockNodeWithoutLabel.addClass).toHaveBeenCalledWith("filtered-out");
  });

  it("should handle nodes with undefined labels", () => {
    const mockNode = {
      id: vi.fn().mockReturnValue("node1"),
      data: vi.fn().mockReturnValue({ labels: undefined }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };

    mockCy.elements.mockReturnValue([mockNode]);

    const elements = [
      { group: "nodes", data: { id: "node1", labels: undefined } },
    ] as any[];

    syncGraphElements(mockCy as unknown as Core, {
      elements,
      vaultStatus: "idle",
      initialLoaded: true,
      isTemporalMetadataEqual: (a, b) =>
        JSON.stringify(a) === JSON.stringify(b),
      activeLabels: new Set(["important"]),
    });

    // Node without labels should be hidden when filter is active
    expect(mockNode.addClass).toHaveBeenCalledWith("filtered-out");
  });

  it("should handle case-insensitive label matching", () => {
    const mockNode1 = {
      id: vi.fn().mockReturnValue("node1"),
      data: vi.fn().mockReturnValue({ labels: ["FACTION-A"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };
    const mockNode2 = {
      id: vi.fn().mockReturnValue("node2"),
      data: vi.fn().mockReturnValue({ labels: ["Faction-B"] }),
      addClass: vi.fn(),
      removeClass: vi.fn(),
    };

    mockCy.elements.mockReturnValue([mockNode1, mockNode2]);

    const elements = [
      { group: "nodes", data: { id: "node1", labels: ["FACTION-A"] } },
      { group: "nodes", data: { id: "node2", labels: ["Faction-B"] } },
    ] as any[];

    syncGraphElements(mockCy as unknown as Core, {
      elements,
      vaultStatus: "idle",
      initialLoaded: true,
      isTemporalMetadataEqual: (a, b) =>
        JSON.stringify(a) === JSON.stringify(b),
      activeLabels: new Set(["faction-a"]), // lowercase filter
    });

    // Should match despite case difference
    expect(mockNode1.removeClass).toHaveBeenCalledWith("filtered-out");
    expect(mockNode2.addClass).toHaveBeenCalledWith("filtered-out");
  });
});
