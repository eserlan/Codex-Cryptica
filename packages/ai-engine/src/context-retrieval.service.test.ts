import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultContextRetrievalService } from "./context-retrieval.service";

describe("ContextRetrievalService", () => {
  let mockSearchService: any;
  let service: DefaultContextRetrievalService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearchService = {
      search: vi.fn().mockResolvedValue([]),
    };

    service = new DefaultContextRetrievalService(mockSearchService);
  });

  it("should include drafts in search calls", async () => {
    const mockVault: any = {
      entities: {},
      selectedEntityId: null,
      inboundConnections: {},
    };

    await service.retrieveContext("test query", new Set(), mockVault);

    expect(mockSearchService.search).toHaveBeenCalledWith(
      "test query",
      expect.objectContaining({ includeDrafts: true }),
    );
  });

  it("should include drafts in style search", async () => {
    const mockVault: any = {
      entities: {},
      selectedEntityId: null,
      inboundConnections: {},
    };

    await service.retrieveContext(
      "test query",
      new Set(),
      mockVault,
      undefined,
      true,
    );

    expect(mockSearchService.search).toHaveBeenCalledWith(
      "art style direction visual aesthetic style guide",
      expect.objectContaining({ includeDrafts: true, limit: 3 }),
    );
  });

  it("should use keyword search if main search returns no results", async () => {
    const mockVault: any = {
      entities: {},
      selectedEntityId: null,
      inboundConnections: {},
    };

    mockSearchService.search
      .mockResolvedValueOnce([]) // Style search
      .mockResolvedValueOnce([]) // Main search
      .mockResolvedValueOnce([]); // Keyword search

    await service.retrieveContext(
      "complex multi word query",
      new Set(),
      mockVault,
    );

    expect(mockSearchService.search).toHaveBeenCalledTimes(3);
    expect(mockSearchService.search).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ includeDrafts: true }),
    );
  });

  it("should match explicit subject in query", async () => {
    const mockVault: any = {
      entities: {
        e1: { id: "e1", title: "Elara", content: "Content" },
      },
      selectedEntityId: null,
      inboundConnections: {},
    };

    const result = await service.retrieveContext(
      "Tell me about Elara",
      new Set(),
      mockVault,
    );
    expect(result.primaryEntityId).toBe("e1");
  });

  it("should detect follow-up queries", async () => {
    const mockVault: any = {
      entities: {
        e1: { id: "e1", title: "Elara", content: "Content" },
      },
      selectedEntityId: null,
      inboundConnections: {},
    };

    const result = await service.retrieveContext(
      "tell me more",
      new Set(),
      mockVault,
      "e1",
    );
    expect(result.primaryEntityId).toBe("e1");
  });

  it("should include connections in context", async () => {
    const mockVault: any = {
      entities: {
        e1: {
          id: "e1",
          title: "Elara",
          content: "Lore",
          connections: [{ target: "e2", label: "friend" }],
        },
        e2: { id: "e2", title: "Kael", content: "Content" },
      },
      selectedEntityId: "e1",
      inboundConnections: {
        e1: [{ sourceId: "e2", connection: { type: "enemy" } }],
      },
    };

    const result = await service.retrieveContext("test", new Set(), mockVault);
    expect(result.content).toContain("Elara → friend → Kael");
    expect(result.content).toContain("Kael → enemy → Elara");
  });

  it("should pre-load content if loadEntityContent is provided", async () => {
    const mockVault: any = {
      entities: { e1: { id: "e1", title: "E1" } },
      selectedEntityId: "e1",
      inboundConnections: {},
      loadEntityContent: vi.fn().mockResolvedValue(undefined),
    };

    await service.retrieveContext("test", new Set(), mockVault);
    expect(mockVault.loadEntityContent).toHaveBeenCalledWith("e1");
  });

  it("should use style cache if available", async () => {
    const mockVault: any = {
      entities: {
        s1: { id: "s1", title: "Sci-Fi", content: "Neon aesthetic" },
      },
      selectedEntityId: null,
      inboundConnections: {},
      loadEntityContent: vi.fn(),
    };

    mockSearchService.search.mockResolvedValue([{ id: "s1", score: 0.9 }]);

    // First call fills cache
    await service.retrieveContext(
      "test",
      new Set(),
      mockVault,
      undefined,
      true,
    );
    expect(mockSearchService.search).toHaveBeenCalledWith(
      "art style direction visual aesthetic style guide",
      expect.anything(),
    );

    mockSearchService.search.mockClear();

    // Second call uses cache
    const result = await service.retrieveContext(
      "test",
      new Set(),
      mockVault,
      undefined,
      true,
    );
    expect(mockSearchService.search).not.toHaveBeenCalledWith(
      "art style visual aesthetic",
      expect.anything(),
    );
    expect(result.content).toContain("Neon aesthetic");
  });

  it("should exclude art style entity from regular subject context", async () => {
    const mockVault: any = {
      entities: {
        s1: { id: "s1", title: "Art Style: Neon", content: "Neon vibes" },
        e1: { id: "e1", title: "Neo-Tokyo", content: "The city" },
      },
      selectedEntityId: null,
      inboundConnections: {},
    };

    // Style search finds s1
    mockSearchService.search
      .mockResolvedValueOnce([{ id: "s1", score: 0.9 }]) // Style search
      .mockResolvedValueOnce([
        { id: "e1", score: 0.9 },
        { id: "s1", score: 0.9 },
      ]); // Main search

    const result = await service.retrieveContext("test", new Set(), mockVault);

    // Should be in global style block
    expect(result.content).toContain("--- GLOBAL ART STYLE ---");
    expect(result.content).toContain("Neon vibes");

    // But should NOT be in a regular file block (which would cause the AI to mention it)
    expect(result.content).not.toContain("--- File: Art Style: Neon ---");

    // Regular entity should still be there
    expect(result.content).toContain("--- File: Neo-Tokyo ---");
  });

  it("should still show 'Available Records' fallback when art style is found but query has no other matches", async () => {
    const mockVault: any = {
      entities: {
        s1: { id: "s1", title: "Art Style: Neon", content: "Neon vibes" },
        e1: { id: "e1", title: "Alpha", content: "Content" },
      },
      selectedEntityId: null,
      inboundConnections: {},
    };

    // Style search finds s1, main search finds nothing
    mockSearchService.search
      .mockResolvedValueOnce([{ id: "s1", score: 0.9 }]) // Style search
      .mockResolvedValueOnce([]); // Main search

    const result = await service.retrieveContext(
      "unknown",
      new Set(),
      mockVault,
    );

    // Style should be there
    expect(result.content).toContain("--- GLOBAL ART STYLE ---");
    // Fallback should trigger and list available records
    expect(result.content).toContain("--- Available Records ---");
    expect(result.content).toContain("Alpha");
    // But art style should NOT be in the available records list (natural exclusion)
    expect(result.content).not.toContain("Alpha, Art Style: Neon");
  });

  it("should handle truncation of large context", async () => {
    const longContent = "A".repeat(11000);
    const mockVault: any = {
      entities: { e1: { id: "e1", title: "Large", content: longContent } },
      selectedEntityId: "e1",
      inboundConnections: {},
    };

    const result = await service.retrieveContext("test", new Set(), mockVault);
    expect(result.content.length).toBeLessThanOrEqual(10000 + 500); // 10k limit + some overhead
    expect(result.content).toContain("[truncated content]");
  });

  it("should provide available records if no specific matches found", async () => {
    const mockVault: any = {
      entities: {
        e1: { id: "e1", title: "Alpha", content: "C" },
        e2: { id: "e2", title: "Beta", content: "C" },
      },
      selectedEntityId: null,
      inboundConnections: {},
    };

    mockSearchService.search.mockResolvedValue([]);

    const result = await service.retrieveContext(
      "unknown query",
      new Set(),
      mockVault,
    );
    expect(result.content).toContain("Alpha, Beta");
    expect(result.content).toContain("Available Records");
  });

  it("should filter out hidden entities from 'Available Records' fallback for guest users", async () => {
    const mockVault: any = {
      entities: {
        e1: { id: "e1", title: "Visible", content: "C", labels: ["visible"] },
        e2: { id: "e2", title: "Hidden", content: "C", labels: ["hidden"] },
      },
      allEntities: [
        { id: "e1", title: "Visible", content: "C", labels: ["visible"] },
        { id: "e2", title: "Hidden", content: "C", labels: ["hidden"] },
      ],
      selectedEntityId: null,
      inboundConnections: {},
      isGuest: true,
      defaultVisibility: "visible",
    };

    mockSearchService.search.mockResolvedValue([]);

    const result = await service.retrieveContext(
      "unknown query",
      new Set(),
      mockVault,
    );

    expect(result.content).toContain("Visible");
    expect(result.content).not.toContain("Hidden");
    expect(result.content).toContain("Available Records");
  });

  it("should show all entities in 'Available Records' fallback for non-guest users regardless of labels", async () => {
    const mockVault: any = {
      entities: {
        e1: { id: "e1", title: "Visible", content: "C", labels: ["visible"] },
        e2: { id: "e2", title: "Hidden", content: "C", labels: ["hidden"] },
      },
      allEntities: [
        { id: "e1", title: "Visible", content: "C", labels: ["visible"] },
        { id: "e2", title: "Hidden", content: "C", labels: ["hidden"] },
      ],
      selectedEntityId: null,
      inboundConnections: {},
      isGuest: false,
      defaultVisibility: "visible",
    };

    mockSearchService.search.mockResolvedValue([]);

    const result = await service.retrieveContext(
      "unknown query",
      new Set(),
      mockVault,
    );

    expect(result.content).toContain("Visible");
    expect(result.content).toContain("Hidden");
    expect(result.content).toContain("Available Records");
  });
});

describe("ContextRetrievalService pinned entities (#4052)", () => {
  const entity = (id: string, title: string) => ({
    id,
    title,
    type: "character",
    labels: [],
    connections: [],
    content: `${title} lore`,
  });

  const vault = (): any => ({
    entities: { a: entity("a", "Alpha"), b: entity("b", "Beta") },
    selectedEntityId: null,
    inboundConnections: {},
    isGuest: false,
    defaultVisibility: "visible",
  });

  it("makes the first pinned entity primary, ahead of a stronger search hit", async () => {
    const search = {
      search: vi
        .fn()
        .mockResolvedValue([{ id: "a", score: 0.95, matchType: "title" }]),
    };
    const service = new DefaultContextRetrievalService(search as any);

    const result = await service.retrieveContext(
      "what is their role",
      new Set(),
      vault(),
      undefined,
      false,
      {
        pinnedEntityIds: ["b"],
      },
    );

    expect(result.primaryEntityId).toBe("b");
    expect(result.sourceIds[0]).toBe("b");
    expect(result.content).toContain("Beta lore");
  });

  it("keeps every pinned entity, in mention order, when several are picked", async () => {
    const search = { search: vi.fn().mockResolvedValue([]) };
    const service = new DefaultContextRetrievalService(search as any);
    const many: any = {
      entities: {
        a: entity("a", "Alpha"),
        b: entity("b", "Beta"),
        c: entity("c", "Gamma"),
      },
      selectedEntityId: null,
      inboundConnections: {},
      isGuest: false,
      defaultVisibility: "visible",
    };

    const result = await service.retrieveContext(
      "compare them",
      new Set(),
      many,
      undefined,
      false,
      {
        pinnedEntityIds: ["c", "a", "c", "b"],
      },
    );

    expect(result.primaryEntityId).toBe("c");
    expect(result.sourceIds).toEqual(["c", "a", "b"]);
  });

  it("keeps the existing primary choice when nothing is pinned", async () => {
    const search = {
      search: vi
        .fn()
        .mockResolvedValue([{ id: "a", score: 0.95, matchType: "title" }]),
    };
    const service = new DefaultContextRetrievalService(search as any);

    const result = await service.retrieveContext(
      "who is alpha",
      new Set(),
      vault(),
    );

    expect(result.primaryEntityId).toBe("a");
  });

  it("drops an unknown pinned id and still answers from the normal search", async () => {
    const search = {
      search: vi
        .fn()
        .mockResolvedValue([{ id: "a", score: 0.95, matchType: "title" }]),
    };
    const service = new DefaultContextRetrievalService(search as any);

    const result = await service.retrieveContext(
      "who is alpha",
      new Set(),
      vault(),
      undefined,
      false,
      {
        pinnedEntityIds: ["ghost"],
      },
    );

    expect(result.primaryEntityId).toBe("a");
    expect(result.sourceIds).not.toContain("ghost");
  });

  it("keeps every pin in order when the context cap is reached, marking the trimmed ones", async () => {
    const search = { search: vi.fn().mockResolvedValue([]) };
    const service = new DefaultContextRetrievalService(search as any);
    const big = (id: string, title: string) => ({
      ...entity(id, title),
      content: `${title} ${"x".repeat(6000)}`,
    });
    const crowded: any = {
      entities: {
        a: big("a", "Alpha"),
        b: big("b", "Beta"),
        c: big("c", "Gamma"),
      },
      selectedEntityId: null,
      inboundConnections: {},
      isGuest: false,
      defaultVisibility: "visible",
    };

    const result = await service.retrieveContext(
      "compare them",
      new Set(),
      crowded,
      undefined,
      false,
      { pinnedEntityIds: ["a", "b", "c"] },
    );

    expect(result.primaryEntityId).toBe("a");
    expect(result.sourceIds).toEqual(["a", "b", "c"]);
    expect(result.content).toContain("Alpha");
    expect(result.content).toContain("[truncated content]");
  });
});
