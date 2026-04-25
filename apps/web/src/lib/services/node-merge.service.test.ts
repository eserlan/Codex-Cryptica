import { describe, it, expect, vi, beforeEach } from "vitest";
import { NodeMergeService } from "./node-merge.service";
import { vault } from "../stores/vault.svelte";
import { oracle } from "../stores/oracle.svelte";
import { textGenerationService } from "./ai/text-generation.service";

// Mock the dependencies
vi.mock("../stores/vault.svelte", () => ({
  vault: {
    status: "idle",
    selectedEntityId: null,
    entities: {},
    updateEntity: vi.fn().mockResolvedValue(undefined),
    batchUpdate: vi.fn().mockResolvedValue(undefined),
    deleteEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../stores/oracle.svelte", () => ({
  oracle: {
    effectiveApiKey: "test-key",
    tier: "lite",
  },
}));

vi.mock("./ai/text-generation.service", () => ({
  textGenerationService: {
    generateMergeProposal: vi.fn(),
  },
}));

vi.mock(
  "../../../../../packages/editor-core/src/operations/merge-utils",
  () => ({
    mergeFrontmatter: vi.fn((t, _s) => ({ ...t.frontmatter })),
    concatenateBody: vi.fn(
      (t, s) => t.body + s.map((src: any) => src.body).join(""),
    ),
  }),
);

describe("NodeMergeService", () => {
  let service: NodeMergeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NodeMergeService();

    // Reset vault state
    (vault as any).entities = {};
    (vault as any).status = "idle";
    (vault as any).selectedEntityId = null;
  });

  describe("fetchNodeContent", () => {
    it("should fetch content for existing nodes", async () => {
      vault.entities["n1"] = {
        id: "n1",
        title: "Node 1",
        type: "npc",
        tags: ["tag1"],
        labels: [],
        lore: "lore1",
        connections: [{ target: "n2", label: "knows" }],
        content: "content1",
      } as any;

      const results = await service.fetchNodeContent(["n1", "missing"]);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("n1");
      expect(results[0].frontmatter.title).toBe("Node 1");
      expect(results[0].connections).toHaveLength(1);
      expect(results[0].connections[0].source).toBe("n1");
    });
  });

  describe("proposeMerge", () => {
    it("should propose merge using concat strategy", async () => {
      vault.entities["t"] = {
        id: "t",
        title: "Target",
        connections: [],
        content: "T",
      } as any;
      vault.entities["s"] = {
        id: "s",
        title: "Source",
        connections: [{ target: "x" }],
        content: "S",
      } as any;

      const proposal = await service.proposeMerge({
        sourceNodeIds: ["t", "s"],
        targetNodeId: "t",
        strategy: "concat",
      });

      expect(proposal.targetId).toBe("t");
      expect(proposal.suggestedBody).toBe("TS");
      expect(proposal.outgoingConnections).toHaveLength(1);
      expect(proposal.outgoingConnections[0].source).toBe("t");
    });

    it("should throw if target node not found", async () => {
      await expect(
        service.proposeMerge({
          sourceNodeIds: ["s1"],
          targetNodeId: "t",
          strategy: "concat",
        }),
      ).rejects.toThrow("Target node t not found");
    });

    it("should propose merge using AI strategy", async () => {
      vault.entities["t"] = {
        id: "t",
        title: "Target",
        connections: [],
        content: "T",
      } as any;
      vault.entities["s"] = {
        id: "s",
        title: "Source",
        connections: [],
        content: "S",
      } as any;

      vi.mocked(textGenerationService.generateMergeProposal).mockResolvedValue({
        body: "AI Body",
        lore: "AI Lore",
      });

      const proposal = await service.proposeMerge({
        sourceNodeIds: ["t", "s"],
        targetNodeId: "t",
        strategy: "ai",
      });

      expect(proposal.suggestedBody).toBe("AI Body");
      expect(proposal.suggestedFrontmatter.lore).toBe("AI Lore");
      expect(textGenerationService.generateMergeProposal).toHaveBeenCalled();
    });

    it("should allow AI merge even if AI key is missing (fallback to proxy)", async () => {
      (oracle as any).effectiveApiKey = null;
      vault.entities["t"] = {
        id: "t",
        title: "T",
        connections: [],
        tags: [],
        labels: [],
        content: "T",
      } as any;
      vault.entities["s"] = {
        id: "s",
        title: "S",
        connections: [],
        tags: [],
        labels: [],
        content: "S",
      } as any;

      vi.mocked(textGenerationService.generateMergeProposal).mockResolvedValue({
        body: "AI Result",
      });

      const proposal = await service.proposeMerge({
        sourceNodeIds: ["t", "s"],
        targetNodeId: "t",
        strategy: "ai",
      });

      expect(proposal.suggestedBody).toBe("AI Result");
      expect(textGenerationService.generateMergeProposal).toHaveBeenCalledWith(
        "",
        expect.any(String),
        expect.any(Object),
        expect.any(Array),
      );
    });
  });

  describe("checkUnsavedChanges", () => {
    it("should return true if vault is not idle", () => {
      (vault as any).status = "saving";
      expect(service.checkUnsavedChanges(["n1"])).toBe(true);
    });

    it("should return true if a node is selected", () => {
      (vault as any).selectedEntityId = "n1";
      expect(service.checkUnsavedChanges(["n1", "n2"])).toBe(true);
    });

    it("should return false if vault is idle and no nodes selected", () => {
      (vault as any).selectedEntityId = "other";
      expect(service.checkUnsavedChanges(["n1"])).toBe(false);
    });
  });

  describe("executeMerge", () => {
    it("should update target and delete sources", async () => {
      vault.entities["t"] = { id: "t", title: "T", connections: [] } as any;
      vault.entities["s"] = { id: "s", title: "S", connections: [] } as any;

      const proposal = {
        targetId: "t",
        suggestedFrontmatter: { title: "New T" },
        suggestedBody: "New Body",
        outgoingConnections: [{ target: "x", label: "ref" }],
      } as any;

      await service.executeMerge(proposal, ["t", "s"]);

      expect(vault.updateEntity).toHaveBeenCalledWith(
        "t",
        expect.objectContaining({
          content: "New Body",
        }),
      );
      expect(vault.deleteEntity).toHaveBeenCalledWith("s");
    });

    it("should filter out self-references and deleted sources from connections", async () => {
      vault.entities["t"] = { id: "t", title: "T", connections: [] } as any;

      const proposal = {
        targetId: "t",
        suggestedFrontmatter: {},
        suggestedBody: "Body",
        outgoingConnections: [
          { target: "s", label: "was-source" },
          { target: "t", label: "self" },
          { target: "other", label: "valid" },
        ],
      } as any;

      await service.executeMerge(proposal, ["t", "s"]);

      const updates = vi.mocked(vault.updateEntity).mock.calls[0][1];
      expect(updates.connections!).toHaveLength(1);
      expect(updates.connections![0].target).toBe("other");
    });
  });

  describe("updateBacklinks", () => {
    it("should remap connections from other entities", async () => {
      vault.entities["t"] = { id: "t", title: "Target" } as any;
      vault.entities["s"] = { id: "s", title: "Source" } as any;
      vault.entities["o"] = {
        id: "o",
        title: "Other",
        connections: [{ target: "s", label: "points-to-source" }],
      } as any;

      await service.updateBacklinks(["s"], "t");

      expect(vault.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          o: expect.objectContaining({
            connections: [{ target: "t", label: "points-to-source" }],
          }),
        }),
      );
    });

    it("should handle mixed connections (some remapped, some not)", async () => {
      vault.entities["t"] = { id: "t", title: "Target" } as any;
      vault.entities["s"] = { id: "s", title: "Source" } as any;
      vault.entities["o"] = {
        id: "o",
        title: "Other",
        connections: [
          { target: "s", label: "points-to-source" },
          { target: "valid", label: "stable" },
        ],
      } as any;

      await service.updateBacklinks(["s"], "t");

      expect(vault.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          o: expect.objectContaining({
            connections: [
              { target: "t", label: "points-to-source" },
              { target: "valid", label: "stable" },
            ],
          }),
        }),
      );
    });

    it("should handle entities without connections", async () => {
      vault.entities["t"] = { id: "t", title: "T" } as any;
      vault.entities["o"] = { id: "o", title: "O" } as any; // No connections array

      await expect(
        service.updateBacklinks(["s"], "t"),
      ).resolves.toBeUndefined();
    });

    it("should preserve dollar signs in target titles when rewriting wikilinks", async () => {
      vault.entities["t"] = { id: "t", title: "Cost $1" } as any;
      vault.entities["s"] = { id: "s", title: "Source" } as any;
      vault.entities["o"] = {
        id: "o",
        title: "Other",
        content: "See [[Source]] for details.",
      } as any;

      await service.updateBacklinks(["s"], "t");

      expect(vault.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          o: expect.objectContaining({
            content: "See [[Cost $1]] for details.",
          }),
        }),
      );
    });
  });
});
