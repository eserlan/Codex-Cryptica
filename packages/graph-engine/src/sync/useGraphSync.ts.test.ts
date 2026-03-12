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
      didFinalizeLoad: false,
      initialLoaded: false,
      isGuest: false,
    });
    expect(mockCy.elements).toHaveBeenCalled();
  });

  it("should add new nodes", () => {
    const newElements = [{ group: "nodes", data: { id: "node1" } }] as any[];
    syncGraphElements(mockCy as unknown as Core, {
      elements: newElements,
      vaultStatus: "idle",
      didFinalizeLoad: false,
      initialLoaded: false,
      isGuest: false,
    });
    expect(mockCy.add).toHaveBeenCalled();
  });
});
