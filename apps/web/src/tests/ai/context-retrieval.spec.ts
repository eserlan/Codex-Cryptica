import { describe, it, expect, vi, beforeEach } from "vitest";
import { contextRetrievalService } from "../../lib/services/ai/context-retrieval.service";
import { searchService } from "../../lib/services/search";

vi.mock("../../lib/services/search", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

describe("ContextRetrievalService", () => {
  let mockVault: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVault = {
      entities: {
        "woods-id": {
          id: "woods-id",
          title: "The Woods",
          content: "Dark woods.",
          connections: [],
          tags: [],
        },
        "crone-id": {
          id: "crone-id",
          title: "The Crone",
          content: "Old woman.",
          connections: [],
          tags: [],
        },
        "guardsman-id": {
          id: "guardsman-id",
          title: "The Guardsman",
          content: "A guard in the woods.",
          connections: [],
          tags: [],
        },
        "ai-id": {
          id: "ai-id",
          title: "AI",
          content: "The Artificial Intelligence.",
          connections: [],
          tags: [],
        },
      },
      selectedEntityId: null,
      inboundConnections: {},
    };

    vi.mocked(searchService.search).mockImplementation(async (q) => {
      const results = [];
      for (const id in mockVault.entities) {
        const entity = mockVault.entities[id];
        const pattern = new RegExp(`\\b${entity.title}\\b`, "i");
        if (pattern.test(q)) {
          results.push({
            id,
            title: entity.title,
            score: 0.9,
            matchType: "title" as const,
            path: "",
          });
        }
      }
      return results;
    });

    (contextRetrievalService as any).clearStyleCache();
  });

  it("should prioritize explicit title matches over active selection", async () => {
    mockVault.selectedEntityId = "crone-id";
    const { primaryEntityId } = await contextRetrievalService.retrieveContext(
      "Tell me about The Woods",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(primaryEntityId).toBe("woods-id");
  });

  it("should match short titles only with word boundaries", async () => {
    const { primaryEntityId: match1 } = await contextRetrievalService.retrieveContext(
      "Tell me about AI",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(match1).toBe("ai-id");

    const { primaryEntityId: match2 } = await contextRetrievalService.retrieveContext(
      "Training is hard",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(match2).not.toBe("ai-id");
  });

  it("should prioritize high-confidence search results over active selection", async () => {
    mockVault.selectedEntityId = "crone-id";
    vi.mocked(searchService.search).mockResolvedValue([
      {
        id: "woods-id",
        title: "The Woods",
        score: 0.9,
        matchType: "title",
        path: "",
      },
    ]);

    const { primaryEntityId } = await contextRetrievalService.retrieveContext(
      "What is in that place?",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(primaryEntityId).toBe("woods-id");
  });

  it("should prioritize high-confidence search over sticky context", async () => {
    vi.mocked(searchService.search).mockResolvedValue([
      {
        id: "crone-id",
        title: "The Crone",
        score: 0.9,
        matchType: "title",
        path: "",
      },
    ]);

    const { primaryEntityId } = await contextRetrievalService.retrieveContext(
      "Tell me about that ancient woman",
      new Set(),
      mockVault,
      "woods-id",
      false,
    );
    expect(primaryEntityId).toBe("crone-id");
  });

  it("should stick to previous context for follow-up questions", async () => {
    mockVault.selectedEntityId = "crone-id";
    const { primaryEntityId } = await contextRetrievalService.retrieveContext(
      "it?",
      new Set(),
      mockVault,
      "woods-id",
      false,
    );
    expect(primaryEntityId).toBe("woods-id");
  });

  it("should ignore low-confidence search results and fallback to active selection", async () => {
    mockVault.selectedEntityId = "crone-id";
    vi.mocked(searchService.search).mockResolvedValue([
      {
        id: "guardsman-id",
        title: "The Guardsman",
        score: 0.4,
        matchType: "content",
        path: "",
      },
    ]);

    const { primaryEntityId } = await contextRetrievalService.retrieveContext(
      "Who is there?",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(primaryEntityId).toBe("crone-id");
  });

  it("should include connection context in the retrieved text", async () => {
    mockVault.entities["woods-id"].connections = [
      { target: "crone-id", type: "inhabited_by", label: "Ancient Dweller" },
    ];
    mockVault.inboundConnections["crone-id"] = [
      {
        sourceId: "woods-id",
        connection: { target: "crone-id", type: "inhabited_by" },
      },
    ];

    const { content: contentOut } = await contextRetrievalService.retrieveContext(
      "The Woods",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(contentOut).toContain("--- Connections ---");
    expect(contentOut).toContain("- The Woods → Ancient Dweller → The Crone");

    const { content: contentIn } = await contextRetrievalService.retrieveContext(
      "The Crone",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(contentIn).toContain("--- Connections ---");
    expect(contentIn).toContain("- The Woods → inhabited_by → The Crone");
  });

  it("should combine Lore and Content in context (Context Fusion)", async () => {
    mockVault.entities["fusion-id"] = {
      id: "fusion-id",
      title: "Fusion Entity",
      content: "This is content.",
      lore: "This is secret lore.",
      connections: [],
      tags: [],
    };

    const { content } = await contextRetrievalService.retrieveContext(
      "Fusion Entity",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(content).toContain("This is secret lore.");
    expect(content).toContain("This is content.");
  });

  it("should populate sourceIds for all consulted entities", async () => {
    vi.mocked(searchService.search).mockResolvedValue([
      {
        id: "woods-id",
        title: "The Woods",
        score: 0.9,
        matchType: "title",
        path: "",
      },
      {
        id: "crone-id",
        title: "The Crone",
        score: 0.8,
        matchType: "title",
        path: "",
      },
    ]);

    const { sourceIds } = await contextRetrievalService.retrieveContext(
      "The Woods and Crone",
      new Set(),
      mockVault,
      undefined,
      false,
    );
    expect(sourceIds).toContain("woods-id");
    expect(sourceIds).toContain("crone-id");
  });
});