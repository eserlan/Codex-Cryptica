import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/services/search.svelte", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

import { DefaultTextGenerationService } from "@codex/ai-engine";

describe("TextGenerationService", () => {
  let mockModel: any;
  let mockClientManager: any;
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

    service = new DefaultTextGenerationService(mockClientManager);
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
});
