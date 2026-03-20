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

  it("should manage tour lifecycle (next, prev, skip, complete)", () => {
    helpStore.startTour("initial-onboarding");
    expect(helpStore.activeTour).toBeDefined();
    expect(helpStore.activeTour?.currentStepIndex).toBe(0);

    helpStore.nextStep();
    expect(helpStore.activeTour?.currentStepIndex).toBe(1);

    helpStore.prevStep();
    expect(helpStore.activeTour?.currentStepIndex).toBe(0);

    helpStore.skipTour();
    expect(helpStore.activeTour).toBeNull();
    expect(helpStore.hasSeen("initial-onboarding")).toBe(true);
  });

  it("should handle persistence and initialization from localStorage", () => {
    const savedState = JSON.stringify({
      completedTours: ["test-tour"],
      dismissedHints: ["test-hint"],
      lastSeenVersion: "0.0.1",
    });
    vi.mocked(localStorage.getItem).mockReturnValue(savedState);

    helpStore.init();
    expect(helpStore.hasSeen("test-tour")).toBe(true);
    expect(helpStore.isHintDismissed("test-hint")).toBe(true);
  });

  it("should handle help center operations", () => {
    helpStore.toggleArticle("intro");
    expect((helpStore as any).expandedId).toBe("intro");

    helpStore.toggleArticle("intro");
    expect((helpStore as any).expandedId).toBeNull();

    const mockUiStore = (helpStore as any).uiStore;
    mockUiStore.openSettings = vi.fn();
    helpStore.openHelpToArticle("intro");
    expect((helpStore as any).expandedId).toBe("intro");
    expect(mockUiStore.openSettings).toHaveBeenCalledWith("help");
  });

  it("should open help window", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    helpStore.openHelpWindow();
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.mock.calls[0][0]).toContain("/help");
  });

  it("should copy share link", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText: writeTextSpy },
    });

    await helpStore.copyShareLink("intro");
    expect(writeTextSpy).toHaveBeenCalled();
    expect(writeTextSpy.mock.calls[0][0]).toContain("#help/intro");
  });

  it("should manage hint dismissal", () => {
    expect(helpStore.isHintDismissed("hint-1")).toBe(false);
    helpStore.dismissHint("hint-1");
    expect(helpStore.isHintDismissed("hint-1")).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it("should force rebuild index", () => {
    helpStore.buildIndex(true);
    // Verify no crash, internal count updated
    expect((helpStore as any).indexedCount).toBe(HELP_ARTICLES.length);
  });
});
