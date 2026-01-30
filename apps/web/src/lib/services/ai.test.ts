import { describe, it, expect, vi, beforeEach } from "vitest";
import { aiService } from "./ai";
import { vault } from "../stores/vault.svelte";
import { searchService } from "./search";

vi.mock("../stores/vault.svelte", () => ({
    vault: {
        entities: {},
        selectedEntityId: null,
        inboundConnections: {},
    },
}));

vi.mock("./search", () => ({
    searchService: {
        search: vi.fn(),
    },
}));

vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn(),
    })),
}));

describe("AIService Context Retrieval", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup entities in the mocked vault
        (vault as any).entities = {
            "woods-id": { id: "woods-id", title: "The Woods", content: "Dark woods.", connections: [], tags: [] },
            "crone-id": { id: "crone-id", title: "The Crone", content: "Old woman.", connections: [], tags: [] },
            "guardsman-id": { id: "guardsman-id", title: "The Guardsman", content: "A guard in the woods.", connections: [], tags: [] },
            "ai-id": { id: "ai-id", title: "AI", content: "The Artificial Intelligence.", connections: [], tags: [] },
        };
        (vault as any).selectedEntityId = null;
        (vault as any).inboundConnections = {};
        vi.mocked(searchService.search).mockResolvedValue([]);
        
        // Mock clearStyleCache if it doesn't exist on the instance
        if (!(aiService as any).clearStyleCache) {
            (aiService as any).clearStyleCache = vi.fn();
        }
    });

    it("should prioritize explicit title matches over active selection", async () => {
        (vault as any).selectedEntityId = "crone-id";
        const { primaryEntityId } = await aiService.retrieveContext("Tell me about The Woods", new Set(), undefined, false);
        expect(primaryEntityId).toBe("woods-id");
    });

    it("should match short titles only with word boundaries", async () => {
        // "AI" is length 2.
        // It should match "Tell me about AI"
        const { primaryEntityId: match1 } = await aiService.retrieveContext("Tell me about AI", new Set(), undefined, false);
        expect(match1).toBe("ai-id");

        // It should NOT match "Training" (substring "AI")
        const { primaryEntityId: match2 } = await aiService.retrieveContext("Training is hard", new Set(), undefined, false);
        expect(match2).not.toBe("ai-id");
    });

    it("should prioritize high-confidence search results over active selection", async () => {
        (vault as any).selectedEntityId = "crone-id";
        vi.mocked(searchService.search).mockResolvedValue([
            { id: "woods-id", title: "The Woods", score: 0.9, matchType: "title", path: "" }
        ]);

        // Query doesn't mention the woods directly, so Tier 1 (Explicit Match) fails.
        // Tier 2 (High Confidence Search) should win.
        const { primaryEntityId } = await aiService.retrieveContext("What is in that place?", new Set(), undefined, false);
        expect(primaryEntityId).toBe("woods-id");
    });

    it("should prioritize high-confidence search over sticky context", async () => {
        vi.mocked(searchService.search).mockResolvedValue([
            { id: "crone-id", title: "The Crone", score: 0.9, matchType: "title", path: "" }
        ]);

        // Explicit match fails. High-confidence search says "Crone". Sticky says "Woods".
        // Search should win Tier 2 vs Tier 3.
        const { primaryEntityId } = await aiService.retrieveContext("Tell me about that ancient woman", new Set(), "woods-id", false);
        expect(primaryEntityId).toBe("crone-id");
    });

    it("should stick to previous context for follow-up questions", async () => {
        (vault as any).selectedEntityId = "crone-id";
        // Not an explicit match, no high-confidence search match.
        // Tier 3 (Sticky Follow-up) should win because of "it".
        const { primaryEntityId } = await aiService.retrieveContext("it?", new Set(), "woods-id", false);
        expect(primaryEntityId).toBe("woods-id");
    });

    it("should ignore low-confidence search results and fallback to active selection", async () => {
        (vault as any).selectedEntityId = "crone-id";
        vi.mocked(searchService.search).mockResolvedValue([
            { id: "guardsman-id", title: "The Guardsman", score: 0.4, matchType: "content", path: "" }
        ]);

        // Tier 1 fails, Tier 2 fails (0.4 < 0.6), Tier 3 fails (not a follow-up)
        // Tier 4 (Active View) should win.
        const { primaryEntityId } = await aiService.retrieveContext("Who is there?", new Set(), undefined, false);
        expect(primaryEntityId).toBe("crone-id");
    });

    it("should include connection context in the retrieved text", async () => {
        (vault as any).entities["woods-id"].connections = [
            { target: "crone-id", type: "inhabited_by", label: "Ancient Dweller" }
        ];
        (vault as any).inboundConnections["crone-id"] = [
            { sourceId: "woods-id", connection: { target: "crone-id", type: "inhabited_by" } }
        ];

        // Outbound case
        const { content: contentOut } = await aiService.retrieveContext("The Woods", new Set(), undefined, false);
        expect(contentOut).toContain("--- Connections ---");
        expect(contentOut).toContain("- The Woods → Ancient Dweller → The Crone");

        // Inbound case
        const { content: contentIn } = await aiService.retrieveContext("The Crone", new Set(), undefined, false);
        expect(contentIn).toContain("--- Connections ---");
        expect(contentIn).toContain("- The Woods → inhabited_by → The Crone");
    });

    it("should handle missing entities in connection context gracefully", async () => {
        (vault as any).entities["woods-id"].connections = [
            { target: "missing-id", type: "part_of" }
        ];

        const { content } = await aiService.retrieveContext("The Woods", new Set(), undefined, false);
        expect(content).toContain("[missing entity: missing-id]");
    });

    it("should recognize lone pronouns as follow-ups", async () => {
        (vault as any).selectedEntityId = "crone-id";
        const { primaryEntityId } = await aiService.retrieveContext("it", new Set(), "guardsman-id", false);
        expect(primaryEntityId).toBe("guardsman-id");
    });
});

describe("AIService Prompt Enhancement", () => {
    it("should return the query as is when no context is provided", () => {
        const query = "Draw a dragon";
        const result = aiService.enhancePrompt(query, "");
        expect(result).toBe(query);
    });

    it("should include context in the prompt when provided", () => {
        const query = "Show me what he looks like";
        const context = "--- File: Eldrin ---\nAn old elf with stars.";
        const result = aiService.enhancePrompt(query, context);
        expect(result).toContain("--- File: Eldrin ---");
        expect(result).toContain("User visualization request: Show me what he looks like");
    });
});

describe("AIService Style Caching", () => {
    beforeEach(() => {
        aiService.clearStyleCache();
        vi.mocked(searchService.search).mockClear();
        vi.mocked(searchService.search).mockResolvedValue([]);
    });

    it("should cache the style context after first lookup", async () => {
        vi.mocked(searchService.search).mockResolvedValue([
            { id: "style-id", title: "World Aesthetic", score: 0.9, matchType: "title", path: "" }
        ]);
        (vault as any).entities["style-id"] = { 
            id: "style-id", 
            title: "World Aesthetic", 
            content: "Cyberpunk style.",
            connections: [],
            tags: []
        };

        // First call triggers search
        await aiService.retrieveContext("test", new Set(), undefined, true);
        const callsAfterFirst = vi.mocked(searchService.search).mock.calls.length;
        expect(callsAfterFirst).toBeGreaterThan(0);
        
        // Second call should NOT trigger more search (cached)
        await aiService.retrieveContext("test 2", new Set(), undefined, true);
        expect(vi.mocked(searchService.search).mock.calls.length).toBe(callsAfterFirst + 1); // +1 for the main context search
    });

    it("should clear cache when clearStyleCache is called", async () => {
        vi.mocked(searchService.search).mockResolvedValue([
            { id: "style-id", title: "Style", score: 0.9, matchType: "title", path: "" }
        ]);
        (vault as any).entities["style-id"] = { 
            id: "style-id", 
            title: "Style", 
            content: "...",
            connections: [],
            tags: []
        };

        await aiService.retrieveContext("test", new Set(), undefined, true);
        const calls1 = vi.mocked(searchService.search).mock.calls.length;

        aiService.clearStyleCache();
        
        await aiService.retrieveContext("test 2", new Set(), undefined, true);
        const calls2 = vi.mocked(searchService.search).mock.calls.length;
        expect(calls2).toBeGreaterThan(calls1 + 1); // +1 for main search, +1 for style search
    });
});
