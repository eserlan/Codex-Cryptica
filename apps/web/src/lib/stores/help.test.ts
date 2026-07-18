import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

import { HelpStore } from "./help.svelte";
import { HELP_ARTICLES } from "$lib/config/help-content";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

describe("HelpStore", () => {
  let mockStorage: any;
  let helpStore: HelpStore;

  beforeEach(async () => {
    mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    helpStore = new HelpStore(undefined, undefined, undefined, mockStorage);
    await helpStore.init();
    helpStore.reset();
  });

  it("should support constructor injection for UI, Search, and Storage stores", () => {
    const mockOnboardingStore = {
      dismissedLandingPage: false,
    } as any;
    const mockModalUIStore = { closeSettings: vi.fn() } as any;
    const mockSearchStore = { open: vi.fn() } as any;
    const customMockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as any;

    const store = new HelpStore(
      mockOnboardingStore,
      mockModalUIStore,
      mockSearchStore,
      customMockStorage,
    );

    // Test that it uses the injected UI store
    store.startTour("initial-onboarding");
    expect(mockOnboardingStore.dismissedLandingPage).toBe(true);
    expect(mockModalUIStore.closeSettings).toHaveBeenCalled();

    // Test that persistence goes through the injected storage, not the global
    store.dismissHint("injection-check");
    expect(customMockStorage.setItem).toHaveBeenCalledWith(
      "codex-cryptica-help-state",
      expect.stringContaining("injection-check"),
    );
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

  it("should search articles by a word prefix", () => {
    helpStore.setSearchQuery("fam");
    expect(helpStore.searchResults.some((a) => a.id === "family-tree")).toBe(
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

  it("should handle persistence and initialization from injected storage", async () => {
    const savedState = JSON.stringify({
      completedTours: ["test-tour"],
      dismissedHints: ["test-hint"],
      lastSeenVersion: "0.0.1",
    });
    mockStorage.getItem.mockReturnValue(savedState);

    const store = new HelpStore(undefined, undefined, undefined, mockStorage);
    await store.init();
    expect(store.hasSeen("test-tour")).toBe(true);
    expect(store.isHintDismissed("test-hint")).toBe(true);
  });

  it("should handle help center operations", () => {
    helpStore.toggleArticle("intro");
    expect((helpStore as any).expandedId).toBe("intro");

    helpStore.toggleArticle("intro");
    expect((helpStore as any).expandedId).toBeNull();

    modalUIStore.openSettings = vi.fn();
    helpStore.openHelpToArticle("intro");
    expect((helpStore as any).expandedId).toBe("intro");
    expect(modalUIStore.openSettings).toHaveBeenCalledWith("help");
  });

  it("should safely reject an unknown direct Help article", () => {
    helpStore.selectArticle("intro");
    expect(helpStore.selectArticle("missing-article")).toBe(false);
    expect((helpStore as any).expandedId).toBeNull();
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
    expect(mockStorage.setItem).toHaveBeenCalled();
  });

  it("should force rebuild index", async () => {
    await helpStore.buildIndex(true);
    // Verify no crash, internal count updated
    expect((helpStore as any).indexedCount).toBe(HELP_ARTICLES.length);
  });

  // T060: in-app generators help article is registered (US5)
  it("in-app-generators help article is present in HELP_ARTICLES", () => {
    expect(HELP_ARTICLES.some((a) => a.id === "in-app-generators")).toBe(true);
  });

  it("in-app-generators article is discoverable by search", () => {
    helpStore.setSearchQuery("generator");
    expect(
      helpStore.searchResults.some((a) => a.id === "in-app-generators"),
    ).toBe(true);
  });
});
