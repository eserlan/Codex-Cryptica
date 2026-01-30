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
        search: vi.fn().mockResolvedValue([]),
    },
}));

const mockModel = {
    generateContent: vi.fn(),
    startChat: vi.fn(),
    sendMessageStream: vi.fn(),
};

vi.mock("@google/generative-ai", () => {
    return {
        GoogleGenerativeAI: vi.fn().mockImplementation(function () {
            return {
                getGenerativeModel: vi.fn().mockReturnValue(mockModel),
            };
        }),
    };
});

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

        // Default search mock: return match if query includes title with word boundaries
        vi.mocked(searchService.search).mockImplementation(async (q) => {
            const results = [];
            for (const id in (vault as any).entities) {
                const entity = (vault as any).entities[id];
                const pattern = new RegExp(`\\b${entity.title}\\b`, "i");
                if (pattern.test(q)) {
                    results.push({ id, title: entity.title, score: 0.9, matchType: "title" as const, path: "" });
                }
            }
            return results;
        });

        // Mock clearStyleCache if it doesn't exist on the instance
        if (!(aiService as any).clearStyleCache) {
            (aiService as any).clearStyleCache = vi.fn();
        }
    });

    it("should prioritize explicit title matches over active selection", async () => {
        (vault as any).selectedEntityId = "crone-id";
        const { primaryEntityId } = await aiService.retrieveContext("Tell me about The Woods", new Set(), vault, undefined, false);
        expect(primaryEntityId).toBe("woods-id");
    });

    it("should match short titles only with word boundaries", async () => {
        // "AI" is length 2.
        // It should match "Tell me about AI"
        const { primaryEntityId: match1 } = await aiService.retrieveContext("Tell me about AI", new Set(), vault, undefined, false);
        expect(match1).toBe("ai-id");

        // It should NOT match "Training" (substring "AI")
        const { primaryEntityId: match2 } = await aiService.retrieveContext("Training is hard", new Set(), vault, undefined, false);
        expect(match2).not.toBe("ai-id");
    });

    it("should prioritize high-confidence search results over active selection", async () => {
        (vault as any).selectedEntityId = "crone-id";
        vi.mocked(searchService.search).mockResolvedValue([
            { id: "woods-id", title: "The Woods", score: 0.9, matchType: "title", path: "" }
        ]);

        // Query doesn't mention the woods directly, so Tier 1 (Explicit Match) fails.
        // Tier 2 (High Confidence Search) should win.
        const { primaryEntityId } = await aiService.retrieveContext("What is in that place?", new Set(), vault, undefined, false);
        expect(primaryEntityId).toBe("woods-id");
    });

    it("should prioritize high-confidence search over sticky context", async () => {
        vi.mocked(searchService.search).mockResolvedValue([
            { id: "crone-id", title: "The Crone", score: 0.9, matchType: "title", path: "" }
        ]);

        // Explicit match fails. High-confidence search says "Crone". Sticky says "Woods".
        // Search should win Tier 2 vs Tier 3.
        const { primaryEntityId } = await aiService.retrieveContext("Tell me about that ancient woman", new Set(), vault, "woods-id", false);
        expect(primaryEntityId).toBe("crone-id");
    });

    it("should stick to previous context for follow-up questions", async () => {
        (vault as any).selectedEntityId = "crone-id";
        // Not an explicit match, no high-confidence search match.
        // Tier 3 (Sticky Follow-up) should win because of "it".
        const { primaryEntityId } = await aiService.retrieveContext("it?", new Set(), vault, "woods-id", false);
        expect(primaryEntityId).toBe("woods-id");
    });

    it("should ignore low-confidence search results and fallback to active selection", async () => {
        (vault as any).selectedEntityId = "crone-id";
        vi.mocked(searchService.search).mockResolvedValue([
            { id: "guardsman-id", title: "The Guardsman", score: 0.4, matchType: "content", path: "" }
        ]);

        // Tier 1 fails, Tier 2 fails (0.4 < 0.6), Tier 3 fails (not a follow-up)
        // Tier 4 (Active View) should win.
        const { primaryEntityId } = await aiService.retrieveContext("Who is there?", new Set(), vault, undefined, false);
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
        const { content: contentOut } = await aiService.retrieveContext("The Woods", new Set(), vault, undefined, false);
        expect(contentOut).toContain("--- Connections ---");
        expect(contentOut).toContain("- The Woods → Ancient Dweller → The Crone");

        // Inbound case
        const { content: contentIn } = await aiService.retrieveContext("The Crone", new Set(), vault, undefined, false);
        expect(contentIn).toContain("--- Connections ---");
        expect(contentIn).toContain("- The Woods → inhabited_by → The Crone");
    });

    it("should handle missing entities in connection context gracefully", async () => {
        (vault as any).entities["woods-id"].connections = [
            { target: "missing-id", type: "part_of" }
        ];

        const { content } = await aiService.retrieveContext("The Woods", new Set(), vault, undefined, false);
        expect(content).toContain("[missing entity: missing-id]");
    });

    it("should recognize lone pronouns as follow-ups", async () => {
        (vault as any).selectedEntityId = "crone-id";
        const { primaryEntityId } = await aiService.retrieveContext("it", new Set(), vault, "guardsman-id", false);
        expect(primaryEntityId).toBe("guardsman-id");
    });

    describe("Context Fusion & Prioritization", () => {
        it("should combine Lore and Content in context (Context Fusion)", async () => {
            (vault as any).entities["fusion-id"] = {
                id: "fusion-id",
                title: "Fusion Entity",
                content: "This is content.",
                lore: "This is secret lore.",
                connections: [],
                tags: []
            };

            const { content } = await aiService.retrieveContext("Fusion Entity", new Set(), vault, undefined, false);
            expect(content).toContain("This is secret lore.");
            expect(content).toContain("This is content.");
        });

        it("should respect 10k character limit and prioritize selected entity", async () => {
            const longText = "A".repeat(6000);
            (vault as any).entities["active-id"] = {
                id: "active-id",
                title: "Active",
                content: longText,
                connections: [],
                tags: []
            };
            (vault as any).entities["match-id"] = {
                id: "match-id",
                title: "Match",
                content: longText,
                connections: [],
                tags: []
            };

            (vault as any).selectedEntityId = "active-id";
            vi.mocked(searchService.search).mockResolvedValue([
                { id: "match-id", title: "Match", score: 0.9, matchType: "title", path: "" }
            ]);

            const { content, sourceIds } = await aiService.retrieveContext("query", new Set(), vault, undefined, false);

            // Total should be around 10k
            expect(content.length).toBeLessThanOrEqual(10100); // Allow for headers/newlines
            expect(sourceIds).toContain("active-id");
            expect(sourceIds).toContain("match-id");
            // Active should be full, Match should be truncated
            expect(content).toContain("Active");
            expect(content).toContain("Match");
            expect(content).toContain("[truncated content]");
        });

        it("should populate sourceIds for all consulted entities", async () => {
            vi.mocked(searchService.search).mockResolvedValue([
                { id: "woods-id", title: "The Woods", score: 0.9, matchType: "title", path: "" },
                { id: "crone-id", title: "The Crone", score: 0.8, matchType: "title", path: "" }
            ]);

            const { sourceIds } = await aiService.retrieveContext("The Woods and Crone", new Set(), vault, undefined, false);
            expect(sourceIds).toContain("woods-id");
            expect(sourceIds).toContain("crone-id");
        });
    });

    describe("Query Expansion", () => {
        it("should call Lite model to expand query", async () => {
            const mockText = vi.fn().mockReturnValue("Expanded Term");
            mockModel.generateContent.mockResolvedValueOnce({
                response: { text: mockText }
            });

            const result = await aiService.expandQuery("api-key", "him?", []);
            expect(result).toBe("Expanded Term");
            expect(mockModel.generateContent).toHaveBeenCalledWith(expect.stringContaining("him?"));
        });
    });

    describe("Neighborhood Enrichment", () => {
        it("should include linked entity chronicles (Neighborhood Enrichment)", async () => {
            (vault as any).entities["location-id"] = {
                id: "location-id",
                title: "The Tavern",
                content: "A cozy tavern.",
                connections: [{ target: "npc-id", type: "owner" }],
                tags: []
            };
            (vault as any).entities["npc-id"] = {
                id: "npc-id",
                title: "The Owner",
                content: "Barnaby the barkeep.",
                connections: [],
                tags: []
            };

            vi.mocked(searchService.search).mockResolvedValue([
                { id: "location-id", title: "The Tavern", score: 0.9, matchType: "title", path: "" }
            ]);

            const { content, sourceIds } = await aiService.retrieveContext("Where is Barnaby?", new Set(), vault, undefined, false);

            expect(sourceIds).toContain("location-id");
            expect(sourceIds).toContain("npc-id");
            expect(content).toContain("Barnaby the barkeep.");
        });
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
        await aiService.retrieveContext("test", new Set(), vault, undefined, true);
        const callsAfterFirst = vi.mocked(searchService.search).mock.calls.length;
        expect(callsAfterFirst).toBeGreaterThan(0);

        // Second call should NOT trigger more search (cached)
        await aiService.retrieveContext("test 2", new Set(), vault, undefined, true);
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

        await aiService.retrieveContext("test", new Set(), vault, undefined, true);
        const calls1 = vi.mocked(searchService.search).mock.calls.length;

        aiService.clearStyleCache();

        await aiService.retrieveContext("test 2", new Set(), vault, undefined, true);
        const calls2 = vi.mocked(searchService.search).mock.calls.length;
        expect(calls2).toBeGreaterThan(calls1 + 1); // +1 for main search, +1 for style search
    });
});
