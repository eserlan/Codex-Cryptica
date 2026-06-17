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

  it("uses chronicle (content) not lore for related entity thumbnails", async () => {
    mockStore.vault.entities.e1.connections = [
      { target: "e2", type: "relates" },
    ];
    mockStore.vault.entities.e2 = {
      id: "e2",
      title: "Related Entity",
      type: "npc",
      content: "short chronicle",
      lore: "very long lore that should not appear in related context",
    };
    mockStore.vault.inboundConnections = {};
    mockStore.textGeneration.reviseEntityUpdate.mockResolvedValue({
      content: "new",
      lore: "new",
    });

    await manager.reviseEntity({
      source: "revise",
      entityId: "e1",
      incoming: { chronicle: "", lore: "" },
    });

    const [, , , , relatedContext] =
      mockStore.textGeneration.reviseEntityUpdate.mock.calls[0];
    const related = relatedContext.find(
      (r: any) => r.title === "Related Entity",
    );
    expect(related).toBeDefined();
    expect(related.summary).toBe("short chronicle");
    expect(related.summary).not.toContain("lore that should not appear");
    expect(
      mockStore.contextRetrieval.getConsolidatedContext,
    ).not.toHaveBeenCalled();
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
