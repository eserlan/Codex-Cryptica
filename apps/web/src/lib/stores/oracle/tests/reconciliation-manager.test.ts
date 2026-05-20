import { describe, it, expect, beforeEach, vi } from "vitest";
import { OracleReconciliationManager } from "../reconciliation-manager.svelte";
import type { IOracleStore } from "../types";

describe("OracleReconciliationManager", () => {
  let manager: OracleReconciliationManager;
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      vault: { entities: { e1: { id: "e1", content: "old" } } },
      textGeneration: { reconcileEntityUpdate: vi.fn() },
      discoveryPolicyStore: { aiDisabled: false },
      categories: { list: [] },
    };
    manager = new OracleReconciliationManager(mockStore as IOracleStore);
  });

  it("should handle smart apply", async () => {
    // Basic test to ensure it doesn't crash
    const result = await manager.reconcileSmartApply("e1", {
      chronicle: "new",
    });
    expect(result).toBeDefined();
  });
});
