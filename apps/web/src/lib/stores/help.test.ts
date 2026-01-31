import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoist mocks to run before imports
vi.hoisted(() => {
    (global as any).localStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        clear: vi.fn()
    };
});

vi.mock("$app/environment", () => ({
    browser: true
}));

import { helpStore } from "./help.svelte";
import { HELP_ARTICLES } from "$lib/config/help-content";

describe("HelpStore", () => {
    beforeEach(() => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);
        helpStore.init();
        helpStore.setSearchQuery("");
    });

    it("should initialize with all help articles", () => {
        expect(helpStore.searchResults).toHaveLength(HELP_ARTICLES.length);
    });

    it("should search articles by title", () => {
        helpStore.setSearchQuery("Graph");
        expect(helpStore.searchResults.some(a => a.title.includes("Graph"))).toBe(true);
    });

    it("should search articles by content", () => {
        helpStore.setSearchQuery("sovereignty");
        expect(helpStore.searchResults.some(a => a.id === "intro")).toBe(true);
    });

    it("should return empty array for no matches", () => {
        helpStore.setSearchQuery("nonexistent-protocol");
        expect(helpStore.searchResults).toHaveLength(0);
    });

    it("should reset search results when query is cleared", () => {
        helpStore.setSearchQuery("Graph");
        helpStore.setSearchQuery("");
        expect(helpStore.searchResults).toHaveLength(HELP_ARTICLES.length);
    });
});
