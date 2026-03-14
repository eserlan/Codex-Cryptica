import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoist mocks to run before imports
vi.hoisted(() => {
  (global as any).localStorage = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    clear: vi.fn(),
  };
});

vi.mock("$app/environment", () => ({
  browser: true,
}));

import { helpStore, HelpStore } from "./help.svelte";
import { HELP_ARTICLES } from "$lib/config/help-content";

describe("HelpStore", () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    helpStore.init();
    helpStore.reset();
  });

  it("should support constructor injection for UI and Search stores", () => {
    const mockUiStore = {
      dismissedLandingPage: false,
      closeSettings: vi.fn(),
    } as any;
    const mockSearchStore = { open: vi.fn() } as any;
    const store = new HelpStore(mockUiStore, mockSearchStore);

    // Test that it uses the injected UI store
    const original = (window as any).DISABLE_ONBOARDING;
    (window as any).DISABLE_ONBOARDING = false;
    store.startTour("initial-onboarding");
    expect(mockUiStore.dismissedLandingPage).toBe(true);
    expect(mockUiStore.closeSettings).toHaveBeenCalled();
    (window as any).DISABLE_ONBOARDING = original;
  });

  it("should initialize with all help articles", () => {
    expect(helpStore.searchResults).toHaveLength(HELP_ARTICLES.length);
  });

  it("should search articles by title", () => {
    helpStore.setSearchQuery("Graph");
    expect(helpStore.searchResults.some((a) => a.title.includes("Graph"))).toBe(
      true,
    );
  });

  it("should search articles by content", () => {
    helpStore.setSearchQuery("sovereignty");
    expect(helpStore.searchResults.some((a) => a.id === "intro")).toBe(true);
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
