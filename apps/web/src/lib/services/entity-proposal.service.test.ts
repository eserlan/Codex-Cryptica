import { describe, it, expect, vi } from "vitest";
import { EntityProposalService } from "./entity-proposal.service";

// Mock capability guard to avoid actually calling AI
vi.mock("./ai/capability-guard", () => ({
  isAIEnabled: () => true,
}));

describe("EntityProposalService", () => {
  describe("extractProposals", () => {
    it("should extract proposals correctly filtering existing entities", () => {
      const service = new EntityProposalService();
      const markdown = "We have **Existing** and **New** entities.";
      const existing = new Set(["Existing"]);

      const proposals = service.extractProposals(markdown, existing);
      expect(proposals).toEqual(["New"]);
    });

    it("should return empty if no bold text", () => {
      const service = new EntityProposalService();
      const markdown = "We have no bold text.";

      const proposals = service.extractProposals(markdown, new Set());
      expect(proposals).toEqual([]);
    });
  });

  describe("acceptProposal", () => {
    it("should fall back to default template behavior on AI failure", async () => {
      const mockVault = {
        createEntity: vi
          .fn()
          .mockResolvedValue({ id: "123", title: "Test Entity" }),
      };
      const mockTemplateService = {
        resolveTemplate: vi.fn().mockResolvedValue("# Template Content"),
      };
      const mockAiManager = {
        getModel: vi.fn().mockResolvedValue({
          generateContent: vi.fn().mockRejectedValue(new Error("AI Failed")),
        }),
      };

      const service = new EntityProposalService({
        vault: mockVault,
        entityTemplateService: mockTemplateService,
        aiClientManager: mockAiManager,
      });

      const result = await service.acceptProposal(
        "Test Entity",
        "Source text",
        "api-key",
      );

      expect(mockAiManager.getModel).toHaveBeenCalled();
      expect(mockTemplateService.resolveTemplate).toHaveBeenCalledWith("note"); // default
      expect(mockVault.createEntity).toHaveBeenCalledWith(
        "note",
        "Test Entity",
        {
          content: "# Template Content",
          discoverySource: "Proposed from text",
        },
      );
      expect(result).toEqual({
        entity: { id: "123", title: "Test Entity" },
        categoryInferred: false,
      });
    });

    it("should use guessed category if AI succeeds", async () => {
      const mockVault = {
        createEntity: vi
          .fn()
          .mockResolvedValue({ id: "123", title: "Test Entity" }),
      };
      const mockTemplateService = {
        resolveTemplate: vi.fn().mockResolvedValue("# Character Template"),
      };
      const mockAiManager = {
        getModel: vi.fn().mockResolvedValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "character" },
          }),
        }),
      };

      const service = new EntityProposalService({
        vault: mockVault,
        entityTemplateService: mockTemplateService,
        aiClientManager: mockAiManager,
      });

      const result = await service.acceptProposal(
        "Test Entity",
        "Source text",
        "api-key",
      );

      expect(mockTemplateService.resolveTemplate).toHaveBeenCalledWith(
        "character",
      );
      expect(mockVault.createEntity).toHaveBeenCalledWith(
        "character",
        "Test Entity",
        {
          content: "# Character Template",
          discoverySource: "Proposed from text",
        },
      );
      expect(result).toEqual({
        entity: { id: "123", title: "Test Entity" },
        categoryInferred: true,
      });
    });
  });
});
