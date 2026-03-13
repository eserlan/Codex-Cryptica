import { describe, it, expect, vi, beforeEach } from "vitest";
import { textGenerationService } from "../../lib/services/ai/text-generation.service";
import { aiClientManager as _aiClientManager } from "../../lib/services/ai/client-manager";

const mockModel = {
  generateContent: vi.fn(),
  startChat: vi.fn(),
  sendMessageStream: vi.fn(),
};

vi.mock("../../lib/services/ai/client-manager", () => ({
  aiClientManager: {
    getModel: vi.fn().mockReturnValue(mockModel),
  },
}));

describe("TextGenerationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Query Expansion", () => {
    it("should call model to expand query", async () => {
      const mockText = vi.fn().mockReturnValue("Expanded Term");
      mockModel.generateContent.mockResolvedValueOnce({
        response: { text: mockText },
      });

      const result = await textGenerationService.expandQuery("api-key", "him?", []);
      expect(result).toBe("Expanded Term");
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("him?"),
      );
    });
  });

  describe("Expansion Logic (isExpandRequest)", () => {
    it("should identify expansion keywords correctly", () => {
      const isExpand = (textGenerationService as any).isExpandRequest.bind(textGenerationService);

      expect(isExpand("tell me more about the tower")).toBe(true);
      expect(isExpand("expand on Eldrin")).toBe(true);
      expect(isExpand("describe the village")).toBe(true);
      expect(isExpand("elaborate on the plot")).toBe(true);
      expect(isExpand("give me detailed info")).toBe(true);
      expect(isExpand("deep dive into the lore")).toBe(true);
      expect(isExpand("more")).toBe(true);
      expect(isExpand("anything else")).toBe(true);

      expect(isExpand("who is Eldrin?")).toBe(false);
      expect(isExpand("where is the tavern?")).toBe(false);
      expect(isExpand("what happened?")).toBe(false);
    });
  });
});
