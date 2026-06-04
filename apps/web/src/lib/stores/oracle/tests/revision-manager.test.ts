import { describe, it, expect, beforeEach, vi } from "vitest";
import { OracleRevisionManager } from "../revision-manager.svelte";
import type { IOracleStore } from "../types";

describe("OracleRevisionManager", () => {
  let manager: OracleRevisionManager;
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      vault: {
        entities: {
          e1: {
            id: "e1",
            title: "Entity One",
            type: "npc",
            content: "old chronicle",
            lore: "old lore",
            connections: [],
          },
        },
        isGuest: false,
      },
      textGeneration: { reviseEntityUpdate: vi.fn() },
      discoveryPolicyStore: { aiDisabled: false },
      categories: { list: [{ id: "npc", label: "NPC" }] },
      contextRetrieval: { getConsolidatedContext: vi.fn(() => "context") },
      effectiveApiKey: "key",
      modelName: "model",
    };
    manager = new OracleRevisionManager(mockStore as IOracleStore);
  });

  it("revises an entity through the shared revision pipeline", async () => {
    mockStore.textGeneration.reviseEntityUpdate.mockResolvedValue({
      content: "revised chronicle",
      lore: "revised lore",
      categoryId: "npc",
    });

    const result = await manager.reviseEntity({
      source: "revise",
      entityId: "e1",
      instructions: "Make the correction.",
      priority: "instructions-first",
    });

    expect(result).toEqual({
      content: "revised chronicle",
      lore: "revised lore",
      categoryId: "npc",
    });
    expect(mockStore.textGeneration.reviseEntityUpdate).toHaveBeenCalledWith(
      "key",
      "model",
      expect.objectContaining({ id: "e1" }),
      { chronicle: "", lore: "" },
      expect.any(Array),
      [{ id: "npc", label: "NPC" }],
      {
        source: "revise",
        instructions: "Make the correction.",
        priority: "instructions-first",
      },
    );
  });

  it("falls back to existing content when revision cannot use AI", async () => {
    mockStore.discoveryPolicyStore.aiDisabled = true;

    const result = await manager.reviseEntity({
      source: "revise",
      entityId: "e1",
      instructions: "Make the correction.",
    });

    expect(result).toEqual({
      content: "old chronicle",
      lore: "old lore",
    });
    expect(mockStore.textGeneration.reviseEntityUpdate).not.toHaveBeenCalled();
  });
});
