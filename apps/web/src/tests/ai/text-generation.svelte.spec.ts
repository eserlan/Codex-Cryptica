import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/services/search", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

import { DefaultTextGenerationService } from "../../lib/services/ai/text-generation.service";

describe("TextGenerationService", () => {
  let mockModel: any;
  let mockClientManager: any;
  let mockContextRetrieval: any;
  let service: DefaultTextGenerationService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockModel = {
      generateContent: vi.fn(),
      startChat: vi.fn(),
      sendMessageStream: vi.fn(),
    };

    mockClientManager = {
      getModel: vi.fn().mockReturnValue(mockModel),
    };

    mockContextRetrieval = {
      getConsolidatedContext: vi.fn().mockReturnValue("mock context"),
    };

    service = new DefaultTextGenerationService(
      mockClientManager,
      mockContextRetrieval,
    );
  });

  describe("Query Expansion", () => {
    it("should call model to expand query", async () => {
      const mockText = vi.fn().mockReturnValue("Expanded Term");
      mockModel.generateContent.mockResolvedValueOnce({
        response: { text: mockText },
      });

      const result = await service.expandQuery("api-key", "him?", []);
      expect(result).toBe("Expanded Term");
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("him?"),
      );
    });
  });

  describe("Expansion Logic (isExpandRequest)", () => {
    it("should identify expansion keywords correctly", () => {
      const isExpand = (service as any).isExpandRequest.bind(service);

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
